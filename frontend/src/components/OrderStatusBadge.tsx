import type { OrderStatus } from '../types/order'
import { statusLabel } from '../utils/orderStatus'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusLabel(status)}</span>
}
