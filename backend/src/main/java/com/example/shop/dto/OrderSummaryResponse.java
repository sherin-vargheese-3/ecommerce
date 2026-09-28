package com.example.shop.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.example.shop.model.Order;
import com.example.shop.model.OrderStatus;

public record OrderSummaryResponse(Long id, OrderStatus status, BigDecimal total, int itemCount,
        CustomerSummary customer, Instant createdAt) {

    public static OrderSummaryResponse from(Order order) {
        return new OrderSummaryResponse(order.getId(), order.getStatus(), order.getTotalAmount(), order.itemCount(),
                CustomerSummary.from(order.getUser()), order.getCreatedAt());
    }
}
