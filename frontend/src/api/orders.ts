import type { Order, OrderStatus, OrderSummary } from '../types/order'
import type { Page } from '../types/product'
import { apiFetch } from './client'

function pageSearch(page: number, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export const ordersApi = {
  /** Checkout: turns the current cart into an order. */
  place: () => apiFetch<Order>('/orders', { method: 'POST' }),
  list: (page = 0) => apiFetch<Page<OrderSummary>>(`/orders${pageSearch(page)}`),
  get: (id: number | string) => apiFetch<Order>(`/orders/${id}`),
  cancel: (id: number | string) => apiFetch<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
}

export const adminOrdersApi = {
  list: (page = 0, status?: OrderStatus) =>
    apiFetch<Page<OrderSummary>>(`/admin/orders${pageSearch(page, { status })}`),
  get: (id: number | string) => apiFetch<Order>(`/admin/orders/${id}`),
  updateStatus: (id: number | string, status: OrderStatus) =>
    apiFetch<Order>(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
