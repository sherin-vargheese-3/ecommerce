package com.example.shop.service;

import com.example.shop.dto.AuthResponse;
import com.example.shop.dto.LoginRequest;
import com.example.shop.dto.RegisterRequest;
import com.example.shop.dto.UserResponse;
import com.example.shop.exception.ConflictException;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final LoginAttemptLimiter loginLimiter;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokenService,
            LoginAttemptLimiter loginLimiter) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.loginLimiter = loginLimiter;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email is already registered");
        }
        // Self-registration always creates a customer; admins are provisioned separately.
        User user = users.save(new User(email, passwordEncoder.encode(request.password()), request.name().trim(), Role.CUSTOMER));
        return new AuthResponse(tokenService.issue(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim();
        loginLimiter.check(email);
        User user = users.findByEmailIgnoreCase(email)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            loginLimiter.recordFailure(email);
            throw new BadCredentialsException("Invalid credentials");
        }
        loginLimiter.reset(email);
        return new AuthResponse(tokenService.issue(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return users.findById(userId).map(UserResponse::from)
                .orElseThrow(() -> NotFoundException.of("User", userId));
    }
}
