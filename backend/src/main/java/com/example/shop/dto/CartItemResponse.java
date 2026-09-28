package com.example.shop.dto;

import java.math.BigDecimal;
import com.example.shop.model.CartItem;
import com.example.shop.model.Product;

/**
 * A cart line priced at the product's current price.
 * {@code available} is false when the product was removed from the catalog or no longer has enough stock.
 */
public record CartItemResponse(
        Long id,
        Long productId,
        String name,
        String imageUrl,
        BigDecimal unitPrice,
        int quantity,
        int stock,
        boolean available,
        BigDecimal lineTotal) {

    public static CartItemResponse from(CartItem item) {
        Product product = item.getProduct();
        return new CartItemResponse(item.getId(), product.getId(), product.getName(), product.getImageUrl(),
                product.getPrice(), item.getQuantity(), product.getStock(), isAvailable(item), item.lineTotal());
    }

    static boolean isAvailable(CartItem item) {
        return item.getProduct().isActive() && item.getQuantity() <= item.getProduct().getStock();
    }
}
