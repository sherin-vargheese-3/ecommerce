package com.example.shop.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import com.example.shop.IntegrationTestSupport;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AdminDashboardControllerIntegrationTest extends IntegrationTestSupport {

    private DocumentContext summary(String admin) throws Exception {
        return JsonPath.parse(mvc.perform(get("/api/admin/dashboard/summary").header("Authorization", bearer(admin)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private static long num(DocumentContext doc, String path) {
        return ((Number) doc.read(path)).longValue();
    }

    private static BigDecimal money(DocumentContext doc, String path) {
        return new BigDecimal(doc.read(path).toString());
    }

    private long order(String customer, long productId, int quantity) throws Exception {
        mvc.perform(post("/api/cart/items").header("Authorization", bearer(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\": %d, \"quantity\": %d}".formatted(productId, quantity)));
        String body = mvc.perform(post("/api/orders").header("Authorization", bearer(customer)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    @Test
    void summaryReflectsProductsOrdersAndRevenue() throws Exception {
        String admin = adminToken();
        DocumentContext before = summary(admin);

        long plenty = createProduct("Dash Plenty", "1000.00", 50);
        long low = createProduct("Dash Low", "10.00", 8);
        createProduct("Dash Empty", "10.00", 0);
        long removed = createProduct("Dash Removed", "10.00", 10);
        mvc.perform(delete("/api/admin/products/" + removed).header("Authorization", bearer(admin)));

        String customer = customerToken();
        order(customer, plenty, 2);
        order(customer, low, 5); // leaves 3 → low stock
        long cancelled = order(customer, plenty, 1);
        mvc.perform(patch("/api/admin/orders/" + cancelled + "/status").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"CANCELLED\"}"));

        DocumentContext after = summary(admin);

        assertThat(num(after, "$.products.total") - num(before, "$.products.total")).isEqualTo(4);
        assertThat(num(after, "$.products.active") - num(before, "$.products.active")).isEqualTo(3);
        assertThat(num(after, "$.products.inactive") - num(before, "$.products.inactive")).isEqualTo(1);
        assertThat(num(after, "$.products.outOfStock") - num(before, "$.products.outOfStock")).isEqualTo(1);
        assertThat(num(after, "$.products.lowStock") - num(before, "$.products.lowStock")).isEqualTo(1);
        assertThat(num(after, "$.products.lowStockThreshold")).isEqualTo(5);

        assertThat(num(after, "$.orders.total") - num(before, "$.orders.total")).isEqualTo(3);
        assertThat(num(after, "$.orders.byStatus.PENDING") - num(before, "$.orders.byStatus.PENDING")).isEqualTo(2);
        assertThat(num(after, "$.orders.byStatus.CANCELLED") - num(before, "$.orders.byStatus.CANCELLED")).isEqualTo(1);
        // Cancelled order (1000.00) is excluded: 2 × 1000 + 5 × 10.
        assertThat(money(after, "$.orders.revenue").subtract(money(before, "$.orders.revenue")))
                .isEqualByComparingTo("2050.00");

        assertThat(after.<Integer>read("$.recentOrders.length()")).isLessThanOrEqualTo(5);
        assertThat(num(after, "$.recentOrders[0].id")).isEqualTo(cancelled);
        java.util.List<Integer> lowStock = after.read("$.lowStockProducts[*].stock");
        assertThat(lowStock).isNotEmpty().hasSizeLessThanOrEqualTo(5).allMatch(s -> s <= 5).isSorted();
        assertThat(after.<java.util.List<Boolean>>read("$.lowStockProducts[*].active")).containsOnly(true);
        assertThat(after.<java.util.List<String>>read("$.lowStockProducts[*].name")).doesNotContain("Dash Removed");
    }

    @Test
    void byStatusAlwaysListsEveryStatus() throws Exception {
        mvc.perform(get("/api/admin/dashboard/summary").header("Authorization", bearer(adminToken())))
                .andExpect(jsonPath("$.orders.byStatus.PENDING").exists())
                .andExpect(jsonPath("$.orders.byStatus.CONFIRMED").exists())
                .andExpect(jsonPath("$.orders.byStatus.SHIPPED").exists())
                .andExpect(jsonPath("$.orders.byStatus.DELIVERED").exists())
                .andExpect(jsonPath("$.orders.byStatus.CANCELLED").exists());
    }

    @Test
    void dashboardIsAdminOnly() throws Exception {
        mvc.perform(get("/api/admin/dashboard/summary")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/dashboard/summary").header("Authorization", bearer(customerToken())))
                .andExpect(status().isForbidden());
    }
}
