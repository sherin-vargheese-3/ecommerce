package com.example.shop.model;

import static com.example.shop.model.OrderStatus.CANCELLED;
import static com.example.shop.model.OrderStatus.CONFIRMED;
import static com.example.shop.model.OrderStatus.DELIVERED;
import static com.example.shop.model.OrderStatus.PENDING;
import static com.example.shop.model.OrderStatus.SHIPPED;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OrderStatusTest {

    @Test
    void happyPathMovesForwardOneStepAtATime() {
        assertThat(PENDING.nextStatuses()).containsExactlyInAnyOrder(CONFIRMED, CANCELLED);
        assertThat(CONFIRMED.nextStatuses()).containsExactlyInAnyOrder(SHIPPED, CANCELLED);
        assertThat(SHIPPED.nextStatuses()).containsExactly(DELIVERED);
    }

    @Test
    void cannotSkipStepsGoBackwardsOrCancelAfterShipping() {
        assertThat(PENDING.canTransitionTo(SHIPPED)).isFalse();
        assertThat(SHIPPED.canTransitionTo(CONFIRMED)).isFalse();
        assertThat(SHIPPED.canTransitionTo(CANCELLED)).isFalse();
        assertThat(PENDING.canTransitionTo(PENDING)).isFalse();
    }

    @Test
    void deliveredAndCancelledAreFinal() {
        assertThat(DELIVERED.nextStatuses()).isEmpty();
        assertThat(CANCELLED.nextStatuses()).isEmpty();
    }
}
