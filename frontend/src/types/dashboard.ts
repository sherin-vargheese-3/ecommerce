import type { OrderStatus, OrderSummary } from './order'
import type { Product } from './product'

export interface DashboardSummary {
  products: {
    total: number
    active: number
    inactive: number
    outOfStock: number
    lowStock: number
    lowStockThreshold: number
  }
  orders: {
    total: number
    /** Every status is present, in lifecycle order. */
    byStatus: Record<OrderStatus, number>
    /** Value of all orders that weren't cancelled. */
    revenue: number
  }
  recentOrders: OrderSummary[]
  lowStockProducts: Product[]
}
