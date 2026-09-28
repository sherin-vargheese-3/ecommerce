package com.example.shop.dto;

import java.math.BigDecimal;
import com.example.shop.model.OrderItem;

public record OrderItemResponse(Long productId, String productName, BigDecimal unitPrice, int quantity,
        BigDecimal lineTotal) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(item.getProduct().getId(), item.getProductName(), item.getUnitPrice(),
                item.getQuantity(), item.lineTotal());
    }
}
