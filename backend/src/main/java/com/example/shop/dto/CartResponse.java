package com.example.shop.dto;

import java.math.BigDecimal;
import java.util.List;
import com.example.shop.model.Cart;

/** Totals only count available items, i.e. what checkout would actually charge. */
public record CartResponse(List<CartItemResponse> items, int itemCount, BigDecimal total) {

    public static final CartResponse EMPTY = new CartResponse(List.of(), 0, BigDecimal.ZERO.setScale(2));

    public static CartResponse from(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream().map(CartItemResponse::from).toList();
        List<CartItemResponse> available = items.stream().filter(CartItemResponse::available).toList();
        int itemCount = available.stream().mapToInt(CartItemResponse::quantity).sum();
        BigDecimal total = available.stream().map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        return new CartResponse(items, itemCount, total);
    }
}
