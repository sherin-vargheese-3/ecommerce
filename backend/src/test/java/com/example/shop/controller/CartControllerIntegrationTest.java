package com.example.shop.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class CartControllerIntegrationTest extends IntegrationTestSupport {

    private ResultActions add(String token, long productId, int quantity) throws Exception {
        return mvc.perform(post("/api/cart/items").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\": %d, \"quantity\": %d}".formatted(productId, quantity)));
    }

    private ResultActions update(String token, Object itemId, int quantity) throws Exception {
        return mvc.perform(put("/api/cart/items/" + itemId).header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\": %d}".formatted(quantity)));
    }

    @Test
    void customerManagesCartWithServerComputedTotals() throws Exception {
        String customer = customerToken();
        long lamp = createProduct("Cart Lamp", "2499.00", 10);
        long mouse = createProduct("Cart Mouse", "999.50", 10);

        mvc.perform(get("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.total").value(0));

        add(customer, lamp, 1).andExpect(status().isOk());
        add(customer, lamp, 2).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].quantity").value(3));
        String body = add(customer, mouse, 2)
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.itemCount").value(5))
                .andExpect(jsonPath("$.total").value(9496.00))
                .andReturn().getResponse().getContentAsString();
        Object lampItem = JsonPath.read(body, "$.items[0].id");
        Object mouseItem = JsonPath.read(body, "$.items[1].id");

        update(customer, lampItem, 1)
                .andExpect(jsonPath("$.items[0].lineTotal").value(2499.00))
                .andExpect(jsonPath("$.total").value(4498.00));

        mvc.perform(delete("/api/cart/items/" + mouseItem).header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.total").value(2499.00));

        mvc.perform(delete("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void stockAndQuantityLimitsAreEnforced() throws Exception {
        String customer = customerToken();
        long scarce = createProduct("Scarce Item", "100.00", 2);

        add(customer, scarce, 3).andExpect(status().isUnprocessableContent());
        String body = add(customer, scarce, 2).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        add(customer, scarce, 1).andExpect(status().isUnprocessableContent());
        update(customer, JsonPath.read(body, "$.items[0].id"), 5).andExpect(status().isUnprocessableContent());
        update(customer, JsonPath.read(body, "$.items[0].id"), 0).andExpect(status().isBadRequest());
        add(customer, scarce, 0).andExpect(status().isBadRequest());
    }

    @Test
    void removedProductsCannotBeAddedAndDropOutOfTheTotal() throws Exception {
        String customer = customerToken();
        long gone = createProduct("Soon Gone", "500.00", 5);
        long kept = createProduct("Kept", "100.00", 5);
        add(customer, gone, 1);
        add(customer, kept, 1);

        mvc.perform(delete("/api/admin/products/" + gone).header("Authorization", bearer(adminToken())));

        mvc.perform(get("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].available").value(false))
                .andExpect(jsonPath("$.total").value(100.00))
                .andExpect(jsonPath("$.itemCount").value(1));
        add(customer, gone, 1).andExpect(status().isNotFound());
    }

    @Test
    void customersCannotTouchEachOthersCartItems() throws Exception {
        String alice = customerToken();
        String bob = customerToken();
        long product = createProduct("Shared Product", "10.00", 10);
        String body = add(alice, product, 1).andReturn().getResponse().getContentAsString();
        Object aliceItem = JsonPath.read(body, "$.items[0].id");

        add(bob, product, 1);
        update(bob, aliceItem, 5).andExpect(status().isNotFound());
        mvc.perform(delete("/api/cart/items/" + aliceItem).header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/cart").header("Authorization", bearer(alice)))
                .andExpect(jsonPath("$.items[0].quantity").value(1));
    }

    @Test
    void cartRequiresCustomerRole() throws Exception {
        mvc.perform(get("/api/cart")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/cart").header("Authorization", bearer(adminToken()))).andExpect(status().isForbidden());
    }
}
