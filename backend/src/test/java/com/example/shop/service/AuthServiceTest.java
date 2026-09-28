package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import com.example.shop.dto.AuthResponse;
import com.example.shop.dto.LoginRequest;
import com.example.shop.dto.RegisterRequest;
import com.example.shop.exception.ConflictException;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    UserRepository users;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    TokenService tokenService;

    @Mock
    LoginAttemptLimiter loginLimiter;

    @InjectMocks
    AuthService authService;

    @Test
    void registerCreatesCustomerWithNormalizedEmailAndHashedPassword() {
        when(users.existsByEmailIgnoreCase("jane@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tokenService.issue(any(User.class))).thenReturn("token");

        AuthResponse response = authService.register(new RegisterRequest("  Jane@Example.com ", "secret123", " Jane "));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("jane@example.com");
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hashed");
        assertThat(saved.getValue().getName()).isEqualTo("Jane");
        assertThat(saved.getValue().getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(response.token()).isEqualTo("token");
        assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmailIgnoreCase("jane@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(new RegisterRequest("jane@example.com", "secret123", "Jane")))
                .isInstanceOf(ConflictException.class);
        verify(users, never()).save(any());
    }

    @Test
    void loginReturnsTokenForValidCredentials() {
        User user = new User("jane@example.com", "hashed", "Jane", Role.CUSTOMER);
        when(users.findByEmailIgnoreCase("jane@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        when(tokenService.issue(user)).thenReturn("token");

        AuthResponse response = authService.login(new LoginRequest("jane@example.com", "secret123"));

        verify(loginLimiter).reset("jane@example.com");
        assertThat(response.token()).isEqualTo("token");
        assertThat(response.user().email()).isEqualTo("jane@example.com");
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = new User("jane@example.com", "hashed", "Jane", Role.CUSTOMER);
        when(users.findByEmailIgnoreCase("jane@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("jane@example.com", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
        verify(loginLimiter).recordFailure("jane@example.com");
    }

    @Test
    void blockedEmailsAreRejectedBeforeCheckingThePassword() {
        org.mockito.Mockito.doThrow(new com.example.shop.exception.TooManyRequestsException("blocked", java.time.Duration.ofMinutes(1)))
                .when(loginLimiter).check("jane@example.com");

        assertThatThrownBy(() -> authService.login(new LoginRequest("jane@example.com", "secret123")))
                .isInstanceOf(com.example.shop.exception.TooManyRequestsException.class);
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void loginRejectsUnknownEmail() {
        when(users.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "secret123")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
