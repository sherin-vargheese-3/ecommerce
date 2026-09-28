package com.example.shop.controller;

import org.springframework.security.oauth2.jwt.Jwt;

/** Helpers for reading the authenticated user from the JWT principal. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Long id(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
