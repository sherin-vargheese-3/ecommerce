package com.example.shop.model;

import java.util.Set;

/**
 * Order lifecycle: PENDING → CONFIRMED → SHIPPED → DELIVERED, with CANCELLED possible
 * until the order ships. DELIVERED and CANCELLED are final.
 */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    public Set<OrderStatus> nextStatuses() {
        return switch (this) {
            case PENDING -> Set.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> Set.of(SHIPPED, CANCELLED);
            case SHIPPED -> Set.of(DELIVERED);
            case DELIVERED, CANCELLED -> Set.of();
        };
    }

    public boolean canTransitionTo(OrderStatus next) {
        return nextStatuses().contains(next);
    }
}
