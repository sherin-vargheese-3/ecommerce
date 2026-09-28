package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.example.shop.dto.OrderResponse;
import com.example.shop.exception.BusinessRuleException;
import com.example.shop.model.Cart;
import com.example.shop.model.Order;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Product;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repository.CartRepository;
import com.example.shop.repository.OrderRepository;
import com.example.shop.repository.ProductRepository;
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
class OrderServiceTest {

    @Mock
    OrderRepository orders;

    @Mock
    CartRepository carts;

    @Mock
    ProductRepository products;

    @InjectMocks
    OrderService orderService;

    User jane = new User("jane@example.com", "hash", "Jane", Role.CUSTOMER);
    Cart cart = new Cart(jane);
    Product lamp = product(10L, "Lamp", "2499.00", 5);
    Product mouse = product(11L, "Mouse", "999.50", 10);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jane, "id", 1L);
        when(carts.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(carts.findProductIdsByUserId(1L)).thenAnswer(inv -> cart.getItems().stream().map(i -> i.getProduct().getId()).toList());
        when(products.findAllForUpdate(anyCollection())).thenReturn(List.of(lamp, mouse));
        when(orders.saveAndFlush(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Product product(Long id, String name, String price, int stock) {
        Product product = new Product(name, null, new BigDecimal(price), stock, null);
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }

    @Test
    void placeOrderSnapshotsPricesDecrementsStockAndEmptiesCart() {
        cart.addItem(lamp, 2);
        cart.addItem(mouse, 1);

        OrderResponse order = orderService.placeOrder(1L);

        assertThat(order.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.total()).isEqualByComparingTo("5997.50");
        assertThat(order.itemCount()).isEqualTo(3);
        assertThat(order.items()).extracting("productName").containsExactly("Lamp", "Mouse");
        assertThat(lamp.getStock()).isEqualTo(3);
        assertThat(mouse.getStock()).isEqualTo(9);
        assertThat(cart.getItems()).isEmpty();
    }

    @Test
    void placeOrderFailsWhenStockIsInsufficient() {
        cart.addItem(lamp, 6);

        assertThatThrownBy(() -> orderService.placeOrder(1L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Only 5 of Lamp");
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void placeOrderFailsForRemovedProducts() {
        cart.addItem(lamp, 1);
        lamp.setActive(false);

        assertThatThrownBy(() -> orderService.placeOrder(1L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    void placeOrderFailsForEmptyCart() {
        assertThatThrownBy(() -> orderService.placeOrder(1L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Your cart is empty");
    }

    @Test
    void cancellingRestoresStock() {
        Order order = new Order(jane);
        order.addItem(lamp, 2);
        when(orders.findWithItemsById(5L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.updateStatus(5L, OrderStatus.CANCELLED);

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(lamp.getStock()).isEqualTo(7);
    }

    @Test
    void invalidTransitionsAreRejected() {
        Order order = new Order(jane);
        order.addItem(lamp, 1);
        when(orders.findWithItemsById(5L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(5L, OrderStatus.DELIVERED))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("from PENDING to DELIVERED");
    }

    @Test
    void customersCanOnlyCancelPendingOrders() {
        Order order = new Order(jane);
        order.addItem(lamp, 1);
        order.setStatus(OrderStatus.CONFIRMED);
        when(orders.findWithItemsByIdAndUserId(5L, 1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.cancelForCustomer(1L, 5L)).isInstanceOf(BusinessRuleException.class);
        assertThat(lamp.getStock()).isEqualTo(5);
    }
}
