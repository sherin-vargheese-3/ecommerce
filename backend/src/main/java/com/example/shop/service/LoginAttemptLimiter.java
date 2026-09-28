package com.example.shop.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import com.example.shop.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

/**
 * Blocks logins for an email after {@value #MAX_FAILURES} failed attempts within {@link #WINDOW},
 * slowing down password guessing.
 *
 * <p>Keyed by email rather than IP: behind the nginx proxy every request shares one client address, and
 * X-Forwarded-For can be forged. The trade-off is that someone can temporarily lock out a known email;
 * the window is kept short for that reason. State is in memory, so it resets on restart and is per instance;
 * a multi-instance deployment would move this to a shared store such as Redis.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int PRUNE_THRESHOLD = 10_000;

    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Throws if the email is currently blocked. */
    public void check(String email) {
        Deque<Instant> attempts = failures.get(key(email));
        if (attempts == null) {
            return;
        }
        synchronized (attempts) {
            Instant now = clock.instant();
            dropExpired(attempts, now);
            if (attempts.size() >= MAX_FAILURES) {
                Duration retryAfter = Duration.between(now, attempts.peekFirst().plus(WINDOW));
                throw new TooManyRequestsException("Too many failed login attempts. Try again later.", retryAfter);
            }
        }
    }

    public void recordFailure(String email) {
        if (failures.size() > PRUNE_THRESHOLD) {
            prune();
        }
        Deque<Instant> attempts = failures.computeIfAbsent(key(email), k -> new ArrayDeque<>());
        synchronized (attempts) {
            attempts.addLast(clock.instant());
        }
    }

    public void reset(String email) {
        failures.remove(key(email));
    }

    private void prune() {
        Instant now = clock.instant();
        failures.values().removeIf(attempts -> {
            synchronized (attempts) {
                dropExpired(attempts, now);
                return attempts.isEmpty();
            }
        });
    }

    private static void dropExpired(Deque<Instant> attempts, Instant now) {
        while (!attempts.isEmpty() && !attempts.peekFirst().plus(WINDOW).isAfter(now)) {
            attempts.pollFirst();
        }
    }

    private static String key(String email) {
        return email.trim().toLowerCase();
    }
}
