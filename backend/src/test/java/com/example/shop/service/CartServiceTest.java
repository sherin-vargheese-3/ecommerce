package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import com.example.shop.dto.AddCartItemRequest;
import com.example.shop.dto.CartResponse;
import com.example.shop.exception.BusinessRuleException;
import com.example.shop.exception.NotFoundException;
import com.example.shop.model.Cart;
import com.example.shop.model.Product;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repository.CartRepository;
import com.example.shop.repository.ProductRepository;
import com.example.shop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CartServiceTest {

    @Mock
    CartRepository carts;

    @Mock
    ProductRepository products;

    @Mock
    UserRepository users;

    @InjectMocks
    CartService cartService;

    Cart cart;
    Product lamp;

    @BeforeEach
    void setUp() {
        cart = new Cart(new User("jane@example.com", "hash", "Jane", Role.CUSTOMER));
        lamp = product(10L, "Lamp", "2499.00", 5);
        when(carts.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(carts.saveAndFlush(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(products.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(lamp));
    }

    private static Product product(Long id, String name, String price, int stock) {
        Product product = new Product(name, null, new BigDecimal(price), stock, null);
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }

    @Test
    void addingTheSameProductTwiceMergesQuantities() {
        cartService.addItem(1L, new AddCartItemRequest(10L, 2));
        CartResponse response = cartService.addItem(1L, new AddCartItemRequest(10L, 1));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().quantity()).isEqualTo(3);
        assertThat(response.total()).isEqualByComparingTo("7497.00");
        assertThat(response.itemCount()).isEqualTo(3);
    }

    @Test
    void addingMoreThanStockIsRejected() {
        cartService.addItem(1L, new AddCartItemRequest(10L, 4));

        assertThatThrownBy(() -> cartService.addItem(1L, new AddCartItemRequest(10L, 2)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Only 5");
    }

    @Test
    void addingInactiveOrUnknownProductIsNotFound() {
        when(products.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(1L, new AddCartItemRequest(99L, 1)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void totalsExcludeItemsThatBecameUnavailable() {
        Product mouse = product(11L, "Mouse", "999.50", 10);
        when(products.findByIdAndActiveTrue(11L)).thenReturn(Optional.of(mouse));
        cartService.addItem(1L, new AddCartItemRequest(10L, 1));
        cartService.addItem(1L, new AddCartItemRequest(11L, 2));

        lamp.setActive(false);
        CartResponse response = cartService.get(1L);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().getFirst().available()).isFalse();
        assertThat(response.total()).isEqualByComparingTo("1999.00");
        assertThat(response.itemCount()).isEqualTo(2);
    }

    @Test
    void totalsUseTheCurrentPrice() {
        cartService.addItem(1L, new AddCartItemRequest(10L, 2));

        lamp.setPrice(new BigDecimal("1999.00"));

        assertThat(cartService.get(1L).total()).isEqualByComparingTo("3998.00");
    }

    @Test
    void emptyCartWhenCustomerHasNone() {
        when(carts.findByUserId(2L)).thenReturn(Optional.empty());

        CartResponse response = cartService.get(2L);

        assertThat(response.items()).isEmpty();
        assertThat(response.total()).isEqualByComparingTo("0");
    }
}
