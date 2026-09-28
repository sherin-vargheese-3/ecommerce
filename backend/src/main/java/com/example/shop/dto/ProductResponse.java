package com.example.shop.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.example.shop.model.Product;

public record ProductResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        int stock,
        String imageUrl,
        boolean active,
        Instant createdAt,
        Instant updatedAt) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(product.getId(), product.getName(), product.getDescription(), product.getPrice(),
                product.getStock(), product.getImageUrl(), product.isActive(), product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
