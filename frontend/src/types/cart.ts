export interface CartItem {
  id: number
  productId: number
  name: string
  imageUrl: string | null
  unitPrice: number
  quantity: number
  stock: number
  /** False when the product was removed or no longer has enough stock; excluded from totals. */
  available: boolean
  lineTotal: number
}

export interface Cart {
  items: CartItem[]
  itemCount: number
  total: number
}
