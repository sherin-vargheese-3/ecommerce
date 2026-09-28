package com.example.shop.service;

import java.util.Set;
import com.example.shop.dto.PageResponse;
import com.example.shop.dto.ProductRequest;
import com.example.shop.dto.ProductResponse;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Product;
import com.example.shop.repository.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private static final Set<String> SORTABLE = Set.of("name", "price", "createdAt", "stock");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");

    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> browse(String query, Pageable pageable) {
        return PageResponse.from(
                products.findByActiveTrueAndNameContainingIgnoreCase(normalize(query), sanitize(pageable)),
                ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse getActive(Long id) {
        return products.findByIdAndActiveTrue(id).map(ProductResponse::from)
                .orElseThrow(() -> NotFoundException.of("Product", id));
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> adminList(String query, Pageable pageable) {
        return PageResponse.from(products.findByNameContainingIgnoreCase(normalize(query), sanitize(pageable)),
                ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse adminGet(Long id) {
        return ProductResponse.from(find(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = new Product(request.name().trim(), blankToNull(request.description()), request.price(),
                request.stock(), blankToNull(request.imageUrl()));
        if (request.active() != null) {
            product.setActive(request.active());
        }
        return ProductResponse.from(products.saveAndFlush(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = find(id);
        product.setName(request.name().trim());
        product.setDescription(blankToNull(request.description()));
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setImageUrl(blankToNull(request.imageUrl()));
        if (request.active() != null) {
            product.setActive(request.active());
        }
        return ProductResponse.from(products.saveAndFlush(product));
    }

    /** Soft delete: the product disappears from the catalog but stays referenced by past orders. */
    @Transactional
    public void delete(Long id) {
        find(id).setActive(false);
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> NotFoundException.of("Product", id));
    }

    /** Drops unknown sort properties so arbitrary client input can't cause query errors. */
    private static Pageable sanitize(Pageable pageable) {
        Sort sort = Sort.by(pageable.getSort().stream().filter(o -> SORTABLE.contains(o.getProperty())).toList());
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort.isSorted() ? sort : DEFAULT_SORT);
    }

    private static String normalize(String query) {
        return query == null ? "" : query.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
