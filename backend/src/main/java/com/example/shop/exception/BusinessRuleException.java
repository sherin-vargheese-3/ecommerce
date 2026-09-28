package com.example.shop.exception;

/** A request that is well-formed but violates a domain rule (e.g. insufficient stock). */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
