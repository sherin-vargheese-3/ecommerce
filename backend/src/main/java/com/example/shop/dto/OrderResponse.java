package com.example.shop.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import com.example.shop.model.Order;
import com.example.shop.model.OrderStatus;

/** {@code nextStatuses} lists the statuses an admin may move this order to, so clients don't duplicate the rules. */
public record OrderResponse(
        Long id,
        OrderStatus status,
        Set<OrderStatus> nextStatuses,
        BigDecimal total,
        int itemCount,
        List<OrderItemResponse> items,
        CustomerSummary customer,
        Instant createdAt,
        Instant updatedAt) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getStatus(), order.getStatus().nextStatuses(),
                order.getTotalAmount(), order.itemCount(), order.getItems().stream().map(OrderItemResponse::from).toList(),
                CustomerSummary.from(order.getUser()), order.getCreatedAt(), order.getUpdatedAt());
    }
}
