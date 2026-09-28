package com.example.shop.controller;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import com.example.shop.IntegrationTestSupport;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ProductControllerIntegrationTest extends IntegrationTestSupport {

    private String createProduct(String adminToken, String name, String price) throws Exception {
        String body = mvc.perform(post("/api/admin/products").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "%s", "description": "A thing", "price": %s, "stock": 10}
                                """.formatted(name, price)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id").toString();
    }

    @Test
    void adminCanCreateUpdateAndSoftDeleteProducts() throws Exception {
        String admin = adminToken();
        String name = "Gadget " + UUID.randomUUID();
        String id = createProduct(admin, name, "19.99");

        mvc.perform(get("/api/products/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.price").value(19.99))
                .andExpect(jsonPath("$.active").value(true));

        mvc.perform(put("/api/admin/products/" + id).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "%s v2", "price": 24.50, "stock": 3, "imageUrl": "https://example.com/g.png"}
                                """.formatted(name)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name + " v2"))
                .andExpect(jsonPath("$.stock").value(3))
                .andExpect(jsonPath("$.imageUrl").value("https://example.com/g.png"));

        mvc.perform(delete("/api/admin/products/" + id).header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());

        // Hidden from the public catalog, still visible (inactive) to admins.
        mvc.perform(get("/api/products/" + id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/products").param("q", name))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/admin/products/" + id).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Admin can restore it.
        mvc.perform(put("/api/admin/products/" + id).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "%s", "price": 24.50, "stock": 3, "active": true}
                                """.formatted(name)))
                .andExpect(jsonPath("$.active").value(true));
        mvc.perform(get("/api/products/" + id)).andExpect(status().isOk());
    }

    @Test
    void anonymousUsersCanBrowseWithSearchPagingAndSorting() throws Exception {
        String admin = adminToken();
        String tag = UUID.randomUUID().toString().substring(0, 8);
        createProduct(admin, "Browse " + tag + " cheap", "5.00");
        createProduct(admin, "Browse " + tag + " pricey", "500.00");
        createProduct(admin, "Browse " + tag + " middle", "50.00");

        mvc.perform(get("/api/products").param("q", tag.toUpperCase()).param("sort", "price,asc").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.content[0].price").value(5.00))
                .andExpect(jsonPath("$.content[1].price").value(50.00));

        mvc.perform(get("/api/products").param("q", tag).param("sort", "price,asc").param("page", "1").param("size", "2"))
                .andExpect(jsonPath("$.content[0].price").value(500.00));
    }

    @Test
    void seededCatalogIsAvailable() throws Exception {
        mvc.perform(get("/api/products").param("q", "Mechanical Keyboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name", hasItem("Mechanical Keyboard")))
                .andExpect(jsonPath("$.content[*].active", everyItem(org.hamcrest.Matchers.is(true))));
    }

    @Test
    void customersCannotManageProducts() throws Exception {
        String customer = customerToken();
        mvc.perform(post("/api/admin/products").header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "Nope", "price": 1, "stock": 1}
                                """))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/products/1").header("Authorization", bearer(customer)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/products").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createValidatesInput() throws Exception {
        mvc.perform(post("/api/admin/products").header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "", "price": -1, "stock": -5, "imageUrl": "ftp://nope"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.price").exists())
                .andExpect(jsonPath("$.errors.stock").exists())
                .andExpect(jsonPath("$.errors.imageUrl").exists());
    }

    @Test
    void unknownProductReturns404() throws Exception {
        mvc.perform(get("/api/products/999999")).andExpect(status().isNotFound());
        mvc.perform(put("/api/admin/products/999999").header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name": "X", "price": 1, "stock": 1}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidSortIsIgnoredRatherThanFailing() throws Exception {
        mvc.perform(get("/api/products").param("sort", "passwordHash,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name", not(hasItem((Object) null))));
    }
}
