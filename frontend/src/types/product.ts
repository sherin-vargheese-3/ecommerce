export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  imageUrl: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductRequest {
  name: string
  description: string | null
  price: number
  stock: number
  imageUrl: string | null
  active?: boolean
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageQuery {
  q?: string
  page?: number
  size?: number
  sort?: string
}
