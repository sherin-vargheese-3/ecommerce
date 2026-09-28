package com.example.shop.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import com.example.shop.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class OrderControllerIntegrationTest extends IntegrationTestSupport {

    private void addToCart(String token, long productId, int quantity) throws Exception {
        mvc.perform(post("/api/cart/items").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\": %d, \"quantity\": %d}".formatted(productId, quantity)))
                .andExpect(status().isOk());
    }

    private ResultActions checkout(String token) throws Exception {
        return mvc.perform(post("/api/orders").header("Authorization", bearer(token)));
    }

    private long placeOrder(String token, long productId, int quantity) throws Exception {
        addToCart(token, productId, quantity);
        String body = checkout(token).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions setStatus(String adminToken, long orderId, String status) throws Exception {
        return mvc.perform(patch("/api/admin/orders/" + orderId + "/status").header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"%s\"}".formatted(status)));
    }

    private int stockOf(long productId) throws Exception {
        String body = mvc.perform(get("/api/admin/products/" + productId).header("Authorization", bearer(adminToken())))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.stock");
    }

    @Test
    void checkoutCreatesOrderDecrementsStockAndEmptiesCart() throws Exception {
        String customer = customerToken();
        long lamp = createProduct("Order Lamp", "2499.00", 10);
        long mouse = createProduct("Order Mouse", "999.50", 10);
        addToCart(customer, lamp, 2);
        addToCart(customer, mouse, 1);

        String body = checkout(customer)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.total").value(5997.50))
                .andExpect(jsonPath("$.itemCount").value(3))
                .andExpect(jsonPath("$.items[0].productName").value("Order Lamp"))
                .andExpect(jsonPath("$.items[0].lineTotal").value(4998.00))
                .andExpect(jsonPath("$.nextStatuses", containsInAnyOrder("CONFIRMED", "CANCELLED")))
                .andReturn().getResponse().getContentAsString();
        long orderId = ((Number) JsonPath.read(body, "$.id")).longValue();

        assertThat(stockOf(lamp)).isEqualTo(8);
        assertThat(stockOf(mouse)).isEqualTo(9);
        mvc.perform(get("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/orders").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(orderId))
                .andExpect(jsonPath("$.content[0].itemCount").value(3));
        checkout(customer).andExpect(status().isUnprocessableContent());
    }

    @Test
    void orderKeepsPurchasePriceAndNameAfterCatalogChanges() throws Exception {
        String customer = customerToken();
        long product = createProduct("Snapshot Item", "100.00", 5);
        long orderId = placeOrder(customer, product, 2);

        mvc.perform(put("/api/admin/products/" + product).header("Authorization", bearer(adminToken()))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "Renamed Item", "price": 999.00, "stock": 3}
                        """)).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/products/" + product).header("Authorization", bearer(adminToken())));

        mvc.perform(get("/api/orders/" + orderId).header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items[0].productName").value("Snapshot Item"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(100.00))
                .andExpect(jsonPath("$.total").value(200.00));
    }

    @Test
    void checkoutFailsAtomicallyWhenAnyItemIsUnavailable() throws Exception {
        String customer = customerToken();
        long plenty = createProduct("Plenty", "10.00", 10);
        long scarce = createProduct("Scarce", "10.00", 3);
        addToCart(customer, plenty, 2);
        addToCart(customer, scarce, 3);

        // Stock drops after the item went into the cart.
        mvc.perform(put("/api/admin/products/" + scarce).header("Authorization", bearer(adminToken()))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name": "Scarce", "price": 10.00, "stock": 1}
                        """));

        checkout(customer).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Only 1 of Scarce left in stock"));
        assertThat(stockOf(plenty)).isEqualTo(10);
        mvc.perform(get("/api/cart").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/orders").header("Authorization", bearer(customer)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void concurrentCheckoutsCannotOversellTheLastUnit() throws Exception {
        long lastOne = createProduct("Last One", "50.00", 1);
        int buyers = 5;
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < buyers; i++) {
            String token = customerToken();
            addToCart(token, lastOne, 1);
            tokens.add(token);
        }

        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(buyers)) {
            for (String token : tokens) {
                Callable<Integer> attempt = () -> {
                    start.await();
                    return checkout(token).andReturn().getResponse().getStatus();
                };
                results.add(pool.submit(attempt));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get());
            }
            assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
            assertThat(statuses).filteredOn(s -> s == 422).hasSize(buyers - 1);
        }
        assertThat(stockOf(lastOne)).isZero();
    }

    @Test
    void adminMovesOrderThroughItsLifecycle() throws Exception {
        String admin = adminToken();
        long orderId = placeOrder(customerToken(), createProduct("Lifecycle", "10.00", 5), 1);

        setStatus(admin, orderId, "SHIPPED").andExpect(status().isUnprocessableContent());
        setStatus(admin, orderId, "CONFIRMED").andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStatuses", containsInAnyOrder("SHIPPED", "CANCELLED")));
        setStatus(admin, orderId, "SHIPPED").andExpect(jsonPath("$.nextStatuses", containsInAnyOrder("DELIVERED")));
        setStatus(admin, orderId, "CANCELLED").andExpect(status().isUnprocessableContent());
        setStatus(admin, orderId, "DELIVERED").andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStatuses.length()").value(0));
        setStatus(admin, orderId, "BOGUS").andExpect(status().isBadRequest());
    }

    @Test
    void cancellingRestoresStock() throws Exception {
        String admin = adminToken();
        String customer = customerToken();
        long product = createProduct("Restock", "10.00", 5);

        long adminCancelled = placeOrder(customer, product, 2);
        setStatus(admin, adminCancelled, "CONFIRMED");
        setStatus(admin, adminCancelled, "CANCELLED").andExpect(status().isOk());
        assertThat(stockOf(product)).isEqualTo(5);

        long customerCancelled = placeOrder(customer, product, 3);
        assertThat(stockOf(product)).isEqualTo(2);
        mvc.perform(post("/api/orders/" + customerCancelled + "/cancel").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(stockOf(product)).isEqualTo(5);
        mvc.perform(post("/api/orders/" + customerCancelled + "/cancel").header("Authorization", bearer(customer)))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void customersSeeOnlyTheirOwnOrders() throws Exception {
        String alice = customerToken();
        String bob = customerToken();
        long aliceOrder = placeOrder(alice, createProduct("Private", "10.00", 5), 1);

        mvc.perform(get("/api/orders/" + aliceOrder).header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/orders/" + aliceOrder + "/cancel").header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/orders").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void adminListsAndFiltersAllOrders() throws Exception {
        String admin = adminToken();
        long product = createProduct("Filterable", "10.00", 10);
        long confirmed = placeOrder(customerToken(), product, 1);
        setStatus(admin, confirmed, "CONFIRMED");
        placeOrder(customerToken(), product, 1);

        mvc.perform(get("/api/admin/orders").param("status", "CONFIRMED").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].status", everyItem(is("CONFIRMED"))))
                .andExpect(jsonPath("$.content[?(@.id == %d)]".formatted(confirmed)).exists());
        mvc.perform(get("/api/admin/orders/" + confirmed).header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.customer.email").exists())
                .andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void rolesAreEnforced() throws Exception {
        mvc.perform(post("/api/orders")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/orders").header("Authorization", bearer(adminToken()))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/orders").header("Authorization", bearer(customerToken())))
                .andExpect(status().isForbidden());
    }
}
