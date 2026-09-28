package com.example.shop.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.example.shop.dto.OrderResponse;
import com.example.shop.dto.OrderSummaryResponse;
import com.example.shop.dto.PageResponse;
import com.example.shop.exception.BusinessRuleException;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Cart;
import com.example.shop.model.CartItem;
import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Product;
import com.example.shop.repository.CartRepository;
import com.example.shop.repository.OrderRepository;
import com.example.shop.repository.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final OrderRepository orders;
    private final CartRepository carts;
    private final ProductRepository products;

    public OrderService(OrderRepository orders, CartRepository carts, ProductRepository products) {
        this.orders = orders;
        this.carts = carts;
        this.products = products;
    }

    /**
     * Turns the customer's cart into an order in one transaction: locks the products, checks
     * availability, decrements stock, copies names and prices onto the order and empties the cart.
     * Any failure rolls everything back.
     */
    @Transactional
    public OrderResponse placeOrder(Long userId) {
        // Lock before loading the cart: Hibernate won't refresh products already in the persistence
        // context, so loading them first would read stock as it was before acquiring the lock.
        Map<Long, Product> locked = lockProducts(carts.findProductIdsByUserId(userId));
        Cart cart = carts.findByUserId(userId).filter(c -> !c.getItems().isEmpty())
                .orElseThrow(() -> new BusinessRuleException("Your cart is empty"));

        Order order = new Order(cart.getUser());
        for (CartItem item : cart.getItems()) {
            Product product = locked.get(item.getProduct().getId());
            if (!product.isActive()) {
                throw new BusinessRuleException(product.getName() + " is no longer available; remove it from your cart");
            }
            if (product.getStock() < item.getQuantity()) {
                throw new BusinessRuleException(product.getStock() == 0
                        ? product.getName() + " is out of stock"
                        : "Only " + product.getStock() + " of " + product.getName() + " left in stock");
            }
            product.setStock(product.getStock() - item.getQuantity());
            order.addItem(product, item.getQuantity());
        }
        cart.clear();
        return OrderResponse.from(orders.saveAndFlush(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> listForCustomer(Long userId, Pageable pageable) {
        return PageResponse.from(orders.findByUserId(userId, newestFirst(pageable)), OrderSummaryResponse::from);
    }

    /** Other customers' orders are reported as not found rather than forbidden, to avoid leaking ids. */
    @Transactional(readOnly = true)
    public OrderResponse getForCustomer(Long userId, Long orderId) {
        return orders.findWithItemsByIdAndUserId(orderId, userId).map(OrderResponse::from)
                .orElseThrow(() -> NotFoundException.of("Order", orderId));
    }

    /** Customers may cancel their own order while it is still pending. */
    @Transactional
    public OrderResponse cancelForCustomer(Long userId, Long orderId) {
        Order order = orders.findWithItemsByIdAndUserId(orderId, userId)
                .orElseThrow(() -> NotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessRuleException("Only pending orders can be cancelled; contact support for help");
        }
        return OrderResponse.from(transition(order, OrderStatus.CANCELLED));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> listAll(OrderStatus status, Pageable pageable) {
        Pageable page = newestFirst(pageable);
        return PageResponse.from(status == null ? orders.findAll(page) : orders.findByStatus(status, page),
                OrderSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long orderId) {
        return OrderResponse.from(find(orderId));
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus status) {
        return OrderResponse.from(transition(find(orderId), status));
    }

    private Order transition(Order order, OrderStatus next) {
        if (!order.getStatus().canTransitionTo(next)) {
            throw new BusinessRuleException("Cannot change order status from " + order.getStatus() + " to " + next);
        }
        if (next == OrderStatus.CANCELLED) {
            restock(order);
        }
        order.setStatus(next);
        return orders.saveAndFlush(order);
    }

    private void restock(Order order) {
        Map<Long, Product> locked = lockProducts(order.getItems().stream().map(i -> i.getProduct().getId()).toList());
        for (OrderItem item : order.getItems()) {
            Product product = locked.get(item.getProduct().getId());
            product.setStock(product.getStock() + item.getQuantity());
        }
    }

    private Map<Long, Product> lockProducts(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return products.findAllForUpdate(ids).stream().collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    private Order find(Long orderId) {
        return orders.findWithItemsById(orderId).orElseThrow(() -> NotFoundException.of("Order", orderId));
    }

    private static Pageable newestFirst(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), NEWEST_FIRST);
    }
}
