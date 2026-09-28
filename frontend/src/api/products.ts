import type { Page, PageQuery, Product, ProductRequest } from '../types/product'
import { apiFetch } from './client'

function toSearch({ q, page, size, sort }: PageQuery): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page) params.set('page', String(page))
  if (size) params.set('size', String(size))
  if (sort) params.set('sort', sort)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export const productsApi = {
  browse: (query: PageQuery = {}) => apiFetch<Page<Product>>(`/products${toSearch(query)}`),
  get: (id: number | string) => apiFetch<Product>(`/products/${id}`),
}

export const adminProductsApi = {
  list: (query: PageQuery = {}) => apiFetch<Page<Product>>(`/admin/products${toSearch(query)}`),
  get: (id: number | string) => apiFetch<Product>(`/admin/products/${id}`),
  create: (body: ProductRequest) =>
    apiFetch<Product>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number | string, body: ProductRequest) =>
    apiFetch<Product>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number | string) => apiFetch<void>(`/admin/products/${id}`, { method: 'DELETE' }),
}
