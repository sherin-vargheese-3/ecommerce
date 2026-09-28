export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export interface OrderItem {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface CustomerSummary {
  id: number
  name: string
  email: string
}

export interface Order {
  id: number
  status: OrderStatus
  /** Statuses an admin may move this order to next (decided by the server). */
  nextStatuses: OrderStatus[]
  total: number
  itemCount: number
  items: OrderItem[]
  customer: CustomerSummary
  createdAt: string
  updatedAt: string
}

export interface OrderSummary {
  id: number
  status: OrderStatus
  total: number
  itemCount: number
  customer: CustomerSummary
  createdAt: string
}
