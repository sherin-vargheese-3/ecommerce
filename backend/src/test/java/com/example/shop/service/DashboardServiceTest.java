package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import com.example.shop.dto.DashboardSummary;
import com.example.shop.model.OrderStatus;
import com.example.shop.repository.OrderRepository;
import com.example.shop.repository.OrderRepository.StatusCount;
import com.example.shop.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    ProductRepository products;

    @Mock
    OrderRepository orders;

    @InjectMocks
    DashboardService dashboardService;

    private static StatusCount count(OrderStatus status, long count) {
        return new StatusCount() {
            public OrderStatus getStatus() {
                return status;
            }

            public long getCount() {
                return count;
            }
        };
    }

    @Test
    void fillsMissingStatusesWithZeroInLifecycleOrderAndTotalsThem() {
        when(products.countByActiveTrue()).thenReturn(8L);
        when(products.countByActiveFalse()).thenReturn(2L);
        when(products.countByActiveTrueAndStock(0)).thenReturn(1L);
        when(products.countByActiveTrueAndStockBetween(1, 5)).thenReturn(3L);
        when(orders.countByStatus()).thenReturn(List.of(count(OrderStatus.SHIPPED, 2), count(OrderStatus.PENDING, 4)));
        when(orders.sumRevenue()).thenReturn(new BigDecimal("12345.50"));
        when(orders.findAll(any(Pageable.class))).thenReturn(Page.empty());
        when(products.findTop5ByActiveTrueAndStockLessThanEqualOrderByStockAscNameAsc(5)).thenReturn(List.of());

        DashboardSummary summary = dashboardService.summary();

        assertThat(summary.products().total()).isEqualTo(10);
        assertThat(summary.products().outOfStock()).isEqualTo(1);
        assertThat(summary.products().lowStock()).isEqualTo(3);
        assertThat(summary.orders().byStatus()).containsExactly(
                org.assertj.core.api.Assertions.entry(OrderStatus.PENDING, 4L),
                org.assertj.core.api.Assertions.entry(OrderStatus.CONFIRMED, 0L),
                org.assertj.core.api.Assertions.entry(OrderStatus.SHIPPED, 2L),
                org.assertj.core.api.Assertions.entry(OrderStatus.DELIVERED, 0L),
                org.assertj.core.api.Assertions.entry(OrderStatus.CANCELLED, 0L));
        assertThat(summary.orders().total()).isEqualTo(6);
        assertThat(summary.orders().revenue()).isEqualByComparingTo("12345.50");
    }
}
