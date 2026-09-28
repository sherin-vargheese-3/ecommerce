import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callTo, customer, emptyCart, mockApi, order, orderSummary, page, renderApp } from '../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'customer-token'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const base = { ...emptyCart, 'GET /api/auth/me': { status: 200, body: customer } }

describe('OrdersPage', () => {
  it('lists the customer’s orders', async () => {
    mockApi({
      ...base,
      'GET /api/orders': {
        status: 200,
        body: page([orderSummary({ id: 7, status: 'SHIPPED', total: 12497, itemCount: 3 }), orderSummary({ id: 5 })]),
      },
    })
    renderApp('/orders')

    const row = (await screen.findByText('Order #7')).closest('a')!
    expect(row).toHaveAttribute('href', '/orders/7')
    expect(within(row).getByText('Shipped')).toBeInTheDocument()
    expect(within(row).getByText('₹12,497.00')).toBeInTheDocument()
    expect(within(row).getByText('3 items')).toBeInTheDocument()
    expect(screen.getByText('Order #5')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockApi({ ...base, 'GET /api/orders': { status: 200, body: page([]) } })
    renderApp('/orders')
    expect(await screen.findByText('You haven’t placed any orders yet.')).toBeInTheDocument()
  })
})

describe('OrderDetailPage', () => {
  it('shows the purchased items and lets the customer cancel a pending order', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetch = mockApi({
      ...base,
      'GET /api/orders/1': { status: 200, body: order() },
      'POST /api/orders/1/cancel': { status: 200, body: order({ status: 'CANCELLED', nextStatuses: [] }) },
    })
    renderApp('/orders/1')

    expect(await screen.findByRole('heading', { name: 'Order #1' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Desk Lamp' })).toBeInTheDocument()
    expect(screen.getAllByText('₹4,998.00')).toHaveLength(2)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel order' }))

    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    expect(callTo(fetch, 'POST /api/orders/1/cancel')).toBeDefined()
  })

  it('does not offer cancellation once confirmed', async () => {
    mockApi({ ...base, 'GET /api/orders/1': { status: 200, body: order({ status: 'CONFIRMED' }) } })
    renderApp('/orders/1')
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
  })

  it('shows not found for other customers’ orders', async () => {
    mockApi({ ...base, 'GET /api/orders/99': { status: 404, body: { detail: 'Order 99 not found' } } })
    renderApp('/orders/99')
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument()
  })
})
