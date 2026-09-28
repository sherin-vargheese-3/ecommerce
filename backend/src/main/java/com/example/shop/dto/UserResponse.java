package com.example.shop.dto;

import com.example.shop.model.Role;
import com.example.shop.model.User;

public record UserResponse(Long id, String email, String name, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}
