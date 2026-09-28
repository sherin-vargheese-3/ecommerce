package com.example.shop.repository;

import java.util.List;
import java.util.Optional;
import com.example.shop.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<Cart> findByUserId(Long userId);

    /** Product ids in a customer's cart, without loading any entities. */
    @Query("select i.product.id from CartItem i where i.cart.user.id = :userId")
    List<Long> findProductIdsByUserId(Long userId);
}
