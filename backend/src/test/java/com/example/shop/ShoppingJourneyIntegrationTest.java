package com.example.shop;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.UUID;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * The whole story in one test, the way a real customer and admin would use the API:
 * admin stocks a product → customer registers, finds it, fills a cart, checks out →
 * admin fulfils the order → customer sees it delivered → dashboard reflects the sale.
 */
class ShoppingJourneyIntegrationTest extends IntegrationTestSupport {

    private DocumentContext json(String body) {
        return JsonPath.parse(body);
    }

    private String body(org.springframework.test.web.servlet.ResultActions actions) throws Exception {
        return actions.andReturn().getResponse().getContentAsString();
    }

    @Test
    void customerBuysAndAdminFulfils() throws Exception {
        String admin = adminToken();
        String name = "Journey Speaker " + UUID.randomUUID().toString().substring(0, 6);
        BigDecimal revenueBefore = new BigDecimal(json(body(mvc.perform(get("/api/admin/dashboard/summary")
                .header("Authorization", bearer(admin))))).read("$.orders.revenue").toString());

        // Admin adds a product.
        long productId = ((Number) json(body(mvc.perform(post("/api/admin/products").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "%s", "description": "Portable speaker", "price": 3499.00, "stock": 4}
                        """.formatted(name))).andExpect(status().isCreated()))).read("$.id")).longValue();

        // Customer registers and finds it by search.
        String email = "journey-" + UUID.randomUUID() + "@example.com";
        String customer = json(body(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email": "%s", "password": "password123", "name": "Journey Customer"}
                """.formatted(email))).andExpect(status().isCreated()))).read("$.token");
        mvc.perform(get("/api/products").param("q", name))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(productId));

        // Fills the cart, changes their mind on quantity, checks out.
        String cart = body(mvc.perform(post("/api/cart/items").header("Authorization", bearer(customer))
                .contentType(MediaType.APPLICATION_JSON).content("{\"productId\": %d, \"quantity\": 3}".formatted(productId))));
        Object itemId = json(cart).read("$.items[0].id");
        mvc.perform(put("/api/cart/items/" + itemId).header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\": 2}"))
                .andExpect(jsonPath("$.total").value(6998.00));
        long orderId = ((Number) json(body(mvc.perform(post("/api/orders").header("Authorization", bearer(customer)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(6998.00)))).read("$.id")).longValue();

        // Stock reserved, cart empty.
        mvc.perform(get("/api/products/" + productId)).andExpect(jsonPath("$.stock").value(2));
        mvc.perform(get("/api/cart").header("Authorization", bearer(customer))).andExpect(jsonPath("$.itemCount").value(0));

        // Admin finds the pending order and fulfils it.
        mvc.perform(get("/api/admin/orders").param("status", "PENDING").header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.content[?(@.id == %d)].customer.email".formatted(orderId)).value(email));
        for (String next : new String[] {"CONFIRMED", "SHIPPED", "DELIVERED"}) {
            mvc.perform(patch("/api/admin/orders/" + orderId + "/status").header("Authorization", bearer(admin))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"%s\"}".formatted(next)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(next));
        }

        // Customer sees it delivered; can no longer cancel.
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.items[0].productName").value(name));
        mvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", bearer(customer)))
                .andExpect(status().isUnprocessableContent());

        // Dashboard counts the sale.
        DocumentContext dashboard = json(body(mvc.perform(get("/api/admin/dashboard/summary")
                .header("Authorization", bearer(admin)))));
        assertThat(new BigDecimal(dashboard.read("$.orders.revenue").toString()).subtract(revenueBefore))
                .isEqualByComparingTo("6998.00");
        assertThat(((Number) dashboard.read("$.recentOrders[0].id")).longValue()).isEqualTo(orderId);
    }
}
