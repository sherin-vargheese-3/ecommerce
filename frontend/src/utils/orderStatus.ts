import type { OrderStatus } from '../types/order'

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export function statusLabel(status: OrderStatus) {
  return LABELS[status]
}
