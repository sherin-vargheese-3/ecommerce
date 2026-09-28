package com.example.shop.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.example.shop.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByActiveTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    Optional<Product> findByIdAndActiveTrue(Long id);

    long countByActiveTrue();

    long countByActiveFalse();

    long countByActiveTrueAndStock(int stock);

    long countByActiveTrueAndStockBetween(int min, int max);

    /** Active products at or below the threshold, most urgent first. */
    List<Product> findTop5ByActiveTrueAndStockLessThanEqualOrderByStockAscNameAsc(int threshold);

    /**
     * Locks the rows (SELECT ... FOR UPDATE) so concurrent checkouts can't oversell stock.
     * Ordered by id so transactions always lock in the same order and can't deadlock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> findAllForUpdate(Collection<Long> ids);
}
