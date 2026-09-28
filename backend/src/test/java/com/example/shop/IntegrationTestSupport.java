package com.example.shop;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.UUID;
import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Base class for full-stack tests against a Testcontainers PostgreSQL. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTestSupport {

    @Autowired
    protected MockMvc mvc;

    protected String adminToken() throws Exception {
        return token(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email": "admin@shop.local", "password": "admin12345"}
                """)).andReturn().getResponse().getContentAsString());
    }

    /** Registers a fresh customer and returns their token. */
    protected String customerToken() throws Exception {
        String email = "customer-" + UUID.randomUUID() + "@example.com";
        return token(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email": "%s", "password": "password123", "name": "Customer"}
                """.formatted(email))).andReturn().getResponse().getContentAsString());
    }

    /** Creates an active product as admin and returns its id. */
    protected long createProduct(String name, String price, int stock) throws Exception {
        String body = mvc.perform(post("/api/admin/products").header("Authorization", bearer(adminToken()))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "%s", "price": %s, "stock": %d}
                        """.formatted(name, price, stock))).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String token(String authResponse) {
        return JsonPath.read(authResponse, "$.token");
    }
}
