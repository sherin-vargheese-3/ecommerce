import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from '../App'
import { AppProviders } from '../components/AppProviders'
import type { Cart, CartItem } from '../types/cart'
import type { DashboardSummary } from '../types/dashboard'
import type { Order, OrderSummary } from '../types/order'
import type { Page, Product } from '../types/product'

/** Renders the full app at the given URL. */
export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  )
}

type MockResponse = { status: number; body?: unknown }
type RouteHandler = MockResponse | ((url: URL, init?: RequestInit) => MockResponse)

/**
 * Replaces global fetch. Routes are keyed by "METHOD /path" (query string ignored);
 * unmatched requests get a 404 so missing mocks show up as failures.
 */
export function mockApi(routes: Record<string, RouteHandler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input.toString(), 'http://localhost')
    const handler = routes[`${init?.method ?? 'GET'} ${url.pathname}`]
    const { status, body } = handler === undefined
      ? { status: 404, body: { detail: 'Not mocked' } }
      : typeof handler === 'function' ? handler(url, init) : handler
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

/** The URL and parsed JSON body of the n-th call matching "METHOD /path". */
export function callTo(fetch: ReturnType<typeof mockApi>, route: string, n = 0) {
  const [method, path] = route.split(' ')
  const calls = fetch.mock.calls
    .map(([input, init]) => ({ url: new URL(input.toString(), 'http://localhost'), init }))
    .filter(({ url, init }) => url.pathname === path && (init?.method ?? 'GET') === method)
  const call = calls[n]
  if (!call) return undefined
  return { url: call.url, body: call.init?.body ? JSON.parse(call.init.body as string) : undefined }
}

export const customer = { id: 1, email: 'jane@example.com', name: 'Jane', role: 'CUSTOMER' as const }
export const admin = { id: 2, email: 'admin@shop.local', name: 'Administrator', role: 'ADMIN' as const }

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Desk Lamp',
    description: 'A bright lamp',
    price: 49.9,
    stock: 20,
    imageUrl: null,
    active: true,
    createdAt: '2026-09-25T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
    ...overrides,
  }
}

export function page<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return { content, page: 0, size: 12, totalElements: content.length, totalPages: 1, ...overrides }
}

export const emptyCatalog = { 'GET /api/products': { status: 200, body: page([]) } }

export function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  const item = {
    id: 100, productId: 1, name: 'Desk Lamp', imageUrl: null, unitPrice: 2499, quantity: 1, stock: 20,
    available: true, ...overrides,
  }
  return { lineTotal: item.unitPrice * item.quantity, ...item, ...overrides }
}

export function cart(items: CartItem[]): Cart {
  const available = items.filter((i) => i.available)
  return {
    items,
    itemCount: available.reduce((n, i) => n + i.quantity, 0),
    total: available.reduce((sum, i) => sum + i.lineTotal, 0),
  }
}

export const emptyCart = { 'GET /api/cart': { status: 200, body: cart([]) } }

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: 'PENDING',
    nextStatuses: ['CONFIRMED', 'CANCELLED'],
    total: 4998,
    itemCount: 2,
    items: [{ productId: 1, productName: 'Desk Lamp', unitPrice: 2499, quantity: 2, lineTotal: 4998 }],
    customer: { id: 1, name: 'Jane', email: 'jane@example.com' },
    createdAt: '2026-09-25T10:30:00Z',
    updatedAt: '2026-09-25T10:30:00Z',
    ...overrides,
  }
}

export function orderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  const { id, status, total, itemCount, customer, createdAt } = order(overrides as Partial<Order>)
  return { id, status, total, itemCount, customer, createdAt }
}

export function dashboard(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    products: { total: 10, active: 8, inactive: 2, outOfStock: 1, lowStock: 2, lowStockThreshold: 5 },
    orders: {
      total: 6,
      byStatus: { PENDING: 3, CONFIRMED: 1, SHIPPED: 1, DELIVERED: 1, CANCELLED: 0 },
      revenue: 17497.5,
    },
    recentOrders: [],
    lowStockProducts: [],
    ...overrides,
  }
}

export const dashboardApi = { 'GET /api/admin/dashboard/summary': { status: 200, body: dashboard() } }
