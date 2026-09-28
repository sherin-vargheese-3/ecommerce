package com.example.shop.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import com.example.shop.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Every error, from MVC or the security filter chain, comes back as ProblemDetail JSON. */
class ErrorHandlingIntegrationTest extends IntegrationTestSupport {

    @Test
    void malformedJsonIs400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void badPathVariableAndEnumParameterAre400() throws Exception {
        mvc.perform(get("/api/products/abc")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/orders").param("status", "LOST").header("Authorization", bearer(adminToken())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownRouteIs404AndWrongMethodIs405() throws Exception {
        mvc.perform(get("/api/nope").header("Authorization", bearer(customerToken())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mvc.perform(delete("/api/products/1")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/auth/me").header("Authorization", bearer(customerToken())))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void securityErrorsHaveProblemDetailBodies() throws Exception {
        mvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Please log in to continue."))
                .andExpect(jsonPath("$.instance").value("/api/cart"));

        mvc.perform(get("/api/cart").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(containsString("expired")));

        mvc.perform(get("/api/admin/orders").header("Authorization", bearer(customerToken())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.detail").value("You do not have permission to do this"));
    }

    @Test
    void repeatedFailedLoginsAreRateLimited() throws Exception {
        String email = "limited-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email": "%s", "password": "password123", "name": "Limited"}
                """.formatted(email))).andExpect(status().isCreated());
        String wrong = """
                {"email": "%s", "password": "wrong-password"}
                """.formatted(email);
        String right = """
                {"email": "%s", "password": "password123"}
                """.formatted(email);

        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        // Even the correct password is refused while blocked.
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(right))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.detail").value(containsString("Too many failed login attempts")));
    }

    @Test
    void successfulLoginResetsTheFailureCount() throws Exception {
        String email = "reset-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email": "%s", "password": "password123", "name": "Reset"}
                """.formatted(email)));
        String wrong = "{\"email\": \"%s\", \"password\": \"nope-nope\"}".formatted(email);
        String right = "{\"email\": \"%s\", \"password\": \"password123\"}".formatted(email);

        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong));
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(right))
                .andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void errorsDoNotLeakInternals() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(content().string(not(containsString("Exception"))))
                .andExpect(content().string(not(containsString("at com."))));
    }
}
