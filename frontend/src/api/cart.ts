import type { Cart } from '../types/cart'
import { apiFetch } from './client'

export const cartApi = {
  get: () => apiFetch<Cart>('/cart'),
  add: (productId: number, quantity: number) =>
    apiFetch<Cart>('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  update: (itemId: number, quantity: number) =>
    apiFetch<Cart>(`/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  remove: (itemId: number) => apiFetch<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => apiFetch<Cart>('/cart', { method: 'DELETE' }),
}
