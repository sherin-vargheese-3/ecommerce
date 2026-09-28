package com.example.shop.service;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import com.example.shop.dto.DashboardSummary;
import com.example.shop.dto.DashboardSummary.OrderStats;
import com.example.shop.dto.DashboardSummary.ProductStats;
import com.example.shop.dto.OrderSummaryResponse;
import com.example.shop.dto.ProductResponse;
import com.example.shop.model.OrderStatus;
import com.example.shop.repository.OrderRepository;
import com.example.shop.repository.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    static final int LOW_STOCK_THRESHOLD = 5;
    private static final int RECENT_ORDERS = 5;

    private final ProductRepository products;
    private final OrderRepository orders;

    public DashboardService(ProductRepository products, OrderRepository orders) {
        this.products = products;
        this.orders = orders;
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary() {
        long active = products.countByActiveTrue();
        long inactive = products.countByActiveFalse();
        ProductStats productStats = new ProductStats(active + inactive, active, inactive,
                products.countByActiveTrueAndStock(0),
                products.countByActiveTrueAndStockBetween(1, LOW_STOCK_THRESHOLD),
                LOW_STOCK_THRESHOLD);

        Map<OrderStatus, Long> counts = new EnumMap<>(OrderStatus.class);
        orders.countByStatus().forEach(c -> counts.put(c.getStatus(), c.getCount()));
        Map<OrderStatus, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus status : OrderStatus.values()) {
            byStatus.put(status, counts.getOrDefault(status, 0L));
        }
        long totalOrders = byStatus.values().stream().mapToLong(Long::longValue).sum();
        OrderStats orderStats = new OrderStats(totalOrders, byStatus, orders.sumRevenue());

        var recent = orders.findAll(PageRequest.of(0, RECENT_ORDERS,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        var lowStock = products.findTop5ByActiveTrueAndStockLessThanEqualOrderByStockAscNameAsc(LOW_STOCK_THRESHOLD);

        return new DashboardSummary(productStats, orderStats,
                recent.map(OrderSummaryResponse::from).toList(),
                lowStock.stream().map(ProductResponse::from).toList());
    }
}
