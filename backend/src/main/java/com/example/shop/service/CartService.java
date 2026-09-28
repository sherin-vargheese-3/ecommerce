package com.example.shop.service;

import com.example.shop.dto.AddCartItemRequest;
import com.example.shop.dto.CartResponse;
import com.example.shop.exception.BusinessRuleException;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Cart;
import com.example.shop.model.CartItem;
import com.example.shop.model.Product;
import com.example.shop.repository.CartRepository;
import com.example.shop.repository.ProductRepository;
import com.example.shop.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    static final int MAX_QUANTITY_PER_ITEM = 99;

    private final CartRepository carts;
    private final ProductRepository products;
    private final UserRepository users;

    public CartService(CartRepository carts, ProductRepository products, UserRepository users) {
        this.carts = carts;
        this.products = products;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public CartResponse get(Long userId) {
        return carts.findByUserId(userId).map(CartResponse::from).orElse(CartResponse.EMPTY);
    }

    /** Adds a product, merging with an existing line for the same product. */
    @Transactional
    public CartResponse addItem(Long userId, AddCartItemRequest request) {
        Product product = products.findByIdAndActiveTrue(request.productId())
                .orElseThrow(() -> NotFoundException.of("Product", request.productId()));
        Cart cart = carts.findByUserId(userId).orElseGet(() -> carts.save(new Cart(users.getReferenceById(userId))));

        cart.findItemForProduct(product.getId()).ifPresentOrElse(
                item -> item.setQuantity(checkQuantity(product, item.getQuantity() + request.quantity())),
                () -> cart.addItem(product, checkQuantity(product, request.quantity())));
        return CartResponse.from(carts.saveAndFlush(cart));
    }

    @Transactional
    public CartResponse updateItem(Long userId, Long itemId, int quantity) {
        Cart cart = findCart(userId);
        CartItem item = findItem(cart, itemId);
        if (!item.getProduct().isActive()) {
            throw new BusinessRuleException(item.getProduct().getName() + " is no longer available");
        }
        item.setQuantity(checkQuantity(item.getProduct(), quantity));
        return CartResponse.from(carts.saveAndFlush(cart));
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long itemId) {
        Cart cart = findCart(userId);
        cart.removeItem(findItem(cart, itemId));
        return CartResponse.from(carts.saveAndFlush(cart));
    }

    @Transactional
    public CartResponse clear(Long userId) {
        carts.findByUserId(userId).ifPresent(Cart::clear);
        return CartResponse.EMPTY;
    }

    private Cart findCart(Long userId) {
        return carts.findByUserId(userId).orElseThrow(() -> new NotFoundException("Cart is empty"));
    }

    /** Items are looked up within the caller's own cart, so other users' items are simply not found. */
    private static CartItem findItem(Cart cart, Long itemId) {
        return cart.findItem(itemId).orElseThrow(() -> NotFoundException.of("Cart item", itemId));
    }

    private static int checkQuantity(Product product, int quantity) {
        if (quantity > MAX_QUANTITY_PER_ITEM) {
            throw new BusinessRuleException("You can add at most " + MAX_QUANTITY_PER_ITEM + " of an item");
        }
        if (quantity > product.getStock()) {
            throw new BusinessRuleException(product.getStock() == 0
                    ? product.getName() + " is out of stock"
                    : "Only " + product.getStock() + " of " + product.getName() + " in stock");
        }
        return quantity;
    }
}
