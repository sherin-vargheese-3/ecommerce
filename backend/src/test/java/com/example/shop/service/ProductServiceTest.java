package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.example.shop.dto.ProductRequest;
import com.example.shop.dto.ProductResponse;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Product;
import com.example.shop.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    ProductRepository products;

    @InjectMocks
    ProductService productService;

    @Test
    void createTrimsInputAndDefaultsToActive() {
        when(products.saveAndFlush(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductResponse response = productService.create(
                new ProductRequest("  Lamp  ", "  ", new BigDecimal("19.99"), 5, "", null));

        assertThat(response.name()).isEqualTo("Lamp");
        assertThat(response.description()).isNull();
        assertThat(response.imageUrl()).isNull();
        assertThat(response.active()).isTrue();
    }

    @Test
    void updateChangesFieldsAndKeepsActiveWhenNotProvided() {
        Product product = new Product("Old", "Old desc", new BigDecimal("1.00"), 1, null);
        product.setActive(false);
        when(products.findById(7L)).thenReturn(Optional.of(product));
        when(products.saveAndFlush(product)).thenReturn(product);

        ProductResponse response = productService.update(7L,
                new ProductRequest("New", "New desc", new BigDecimal("2.50"), 9, "https://img/x.png", null));

        assertThat(response.name()).isEqualTo("New");
        assertThat(response.price()).isEqualByComparingTo("2.50");
        assertThat(response.stock()).isEqualTo(9);
        assertThat(response.active()).isFalse();
    }

    @Test
    void deleteIsSoft() {
        Product product = new Product("Lamp", null, BigDecimal.TEN, 1, null);
        when(products.findById(3L)).thenReturn(Optional.of(product));

        productService.delete(3L);

        assertThat(product.isActive()).isFalse();
    }

    @Test
    void getActiveThrowsWhenMissingOrInactive() {
        when(products.findByIdAndActiveTrue(3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getActive(3L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void browseDropsUnknownSortPropertiesAndFallsBackToNewestFirst() {
        Page<Product> empty = new PageImpl<>(List.of());
        when(products.findByActiveTrueAndNameContainingIgnoreCase(eq("lamp"), any(Pageable.class))).thenReturn(empty);

        productService.browse(" lamp ", PageRequest.of(0, 12, Sort.by("passwordHash")));

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(products).findByActiveTrueAndNameContainingIgnoreCase(eq("lamp"), pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }
}
