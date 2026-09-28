package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import com.example.shop.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

class LoginAttemptLimiterTest {

    /** A clock the test can move forward. */
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-09-28T10:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    MutableClock clock = new MutableClock();
    LoginAttemptLimiter limiter = new LoginAttemptLimiter(clock);

    private void fail(String email, int times) {
        for (int i = 0; i < times; i++) {
            limiter.recordFailure(email);
        }
    }

    @Test
    void blocksAfterMaxFailuresAndReportsRetryAfter() {
        fail("jane@example.com", LoginAttemptLimiter.MAX_FAILURES - 1);
        assertThatCode(() -> limiter.check("jane@example.com")).doesNotThrowAnyException();

        fail("jane@example.com", 1);
        assertThatThrownBy(() -> limiter.check("jane@example.com"))
                .isInstanceOfSatisfying(TooManyRequestsException.class,
                        ex -> assertThat(ex.getRetryAfter()).isEqualTo(LoginAttemptLimiter.WINDOW));
    }

    @Test
    void emailsAreCaseInsensitiveAndIndependent() {
        fail("Jane@Example.com ", LoginAttemptLimiter.MAX_FAILURES);

        assertThatThrownBy(() -> limiter.check("jane@example.com")).isInstanceOf(TooManyRequestsException.class);
        assertThatCode(() -> limiter.check("bob@example.com")).doesNotThrowAnyException();
    }

    @Test
    void failuresExpireAfterTheWindow() {
        fail("jane@example.com", LoginAttemptLimiter.MAX_FAILURES);
        clock.advance(LoginAttemptLimiter.WINDOW.minusSeconds(1));
        assertThatThrownBy(() -> limiter.check("jane@example.com")).isInstanceOf(TooManyRequestsException.class);

        clock.advance(Duration.ofSeconds(1));
        assertThatCode(() -> limiter.check("jane@example.com")).doesNotThrowAnyException();
    }

    @Test
    void resetClearsFailures() {
        fail("jane@example.com", LoginAttemptLimiter.MAX_FAILURES);
        limiter.reset("jane@example.com");
        assertThatCode(() -> limiter.check("jane@example.com")).doesNotThrowAnyException();
    }
}
