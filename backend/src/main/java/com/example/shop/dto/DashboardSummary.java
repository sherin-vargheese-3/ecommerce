package com.example.shop.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import com.example.shop.model.OrderStatus;

public record DashboardSummary(ProductStats products, OrderStats orders, List<OrderSummaryResponse> recentOrders,
        List<ProductResponse> lowStockProducts) {

    /**
     * {@code outOfStock} and {@code lowStock} count active products only;
     * low stock means 1..{@code lowStockThreshold} units left.
     */
    public record ProductStats(long total, long active, long inactive, long outOfStock, long lowStock,
            int lowStockThreshold) {
    }

    /** {@code byStatus} has an entry for every status (zero when none), in lifecycle order. */
    public record OrderStats(long total, Map<OrderStatus, Long> byStatus, BigDecimal revenue) {
    }
}
