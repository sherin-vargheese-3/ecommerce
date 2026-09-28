package com.example.shop.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.example.shop.model.Order;
import com.example.shop.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"items", "user"})
    Optional<Order> findWithItemsById(Long id);

    interface StatusCount {
        OrderStatus getStatus();

        long getCount();
    }

    @Query("select o.status as status, count(o) as count from ShopOrder o group by o.status")
    List<StatusCount> countByStatus();

    /** Value of all orders that weren't cancelled. */
    @Query("select coalesce(sum(o.totalAmount), 0) from ShopOrder o where o.status <> com.example.shop.model.OrderStatus.CANCELLED")
    BigDecimal sumRevenue();

    @EntityGraph(attributePaths = {"items", "user"})
    Optional<Order> findWithItemsByIdAndUserId(Long id, Long userId);
}
