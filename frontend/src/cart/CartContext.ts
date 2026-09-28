import { createContext } from 'react'
import type { Cart } from '../types/cart'
import type { Order } from '../types/order'

export interface CartContextValue {
  /** Null when there is no customer session or the cart hasn't loaded. */
  cart: Cart | null
  addItem: (productId: number, quantity: number) => Promise<Cart>
  updateQuantity: (itemId: number, quantity: number) => Promise<Cart>
  removeItem: (itemId: number) => Promise<Cart>
  clear: () => Promise<Cart>
  /** Places an order from the cart; the cart is empty afterwards. */
  checkout: () => Promise<Order>
  refresh: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)
