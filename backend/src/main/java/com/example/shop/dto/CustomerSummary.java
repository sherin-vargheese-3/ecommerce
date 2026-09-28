package com.example.shop.dto;

import com.example.shop.model.User;

public record CustomerSummary(Long id, String name, String email) {

    public static CustomerSummary from(User user) {
        return new CustomerSummary(user.getId(), user.getName(), user.getEmail());
    }
}
