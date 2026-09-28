import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, customer, dashboard, emptyCart, emptyCatalog, mockApi, orderSummary, product, renderApp } from '../../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'admin-token'))
afterEach(() => vi.unstubAllGlobals())

const me = { 'GET /api/auth/me': { status: 200, body: admin } }

function tile(label: string) {
  return screen.getByText(label, { selector: '.stat-label' }).closest('.stat-tile') as HTMLElement
}

describe('AdminDashboardPage', () => {
  it('shows KPI tiles with the headline numbers', async () => {
    mockApi({ ...me, 'GET /api/admin/dashboard/summary': { status: 200, body: dashboard() } })
    renderApp('/admin')

    await screen.findByText('Revenue', { selector: '.stat-label' })
    expect(within(tile('Revenue')).getByText('₹17,497.50')).toBeInTheDocument()
    expect(within(tile('Orders')).getByText('6')).toBeInTheDocument()
    expect(within(tile('Orders')).getByText('3 pending')).toBeInTheDocument()
    expect(tile('Orders')).toHaveAttribute('href', '/admin/orders')
    expect(within(tile('Active products')).getByText('8')).toBeInTheDocument()
    expect(within(tile('Stock alerts')).getByText('3')).toBeInTheDocument()
    expect(within(tile('Stock alerts')).getByText('1 out of stock · 2 low')).toBeInTheDocument()
  })

  it('compacts large revenue and keeps the exact amount visible', async () => {
    const summary = dashboard()
    summary.orders.revenue = 1234567
    mockApi({ ...me, 'GET /api/admin/dashboard/summary': { status: 200, body: summary } })
    renderApp('/admin')

    await screen.findByText('Revenue', { selector: '.stat-label' })
    expect(within(tile('Revenue')).getByText('₹12.3L')).toBeInTheDocument()
    expect(within(tile('Revenue')).getByText('₹12,34,567.00')).toBeInTheDocument()
  })

  it('charts orders by status with links, tooltips and a table view', async () => {
    mockApi({ ...me, 'GET /api/admin/dashboard/summary': { status: 200, body: dashboard() } })
    renderApp('/admin')
    const user = userEvent.setup()

    const pending = await screen.findByRole('link', { name: 'Pending: 3 orders, 50% of all orders' })
    expect(pending).toHaveAttribute('href', '/admin/orders?status=PENDING')
    expect(screen.getByRole('link', { name: 'Cancelled: 0 orders, 0% of all orders' })).toBeInTheDocument()

    await user.hover(pending)
    expect(screen.getByRole('tooltip')).toHaveTextContent('3 orders · 50% of all orders')
    await user.unhover(pending)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View as table' }))
    const row = screen.getByRole('link', { name: 'Pending' }).closest('tr')!
    expect(within(row).getByText('3')).toBeInTheDocument()
    expect(within(row).getByText('50%')).toBeInTheDocument()
  })

  it('lists stock alerts with a label, not just a colour, and recent orders', async () => {
    mockApi({
      ...me,
      'GET /api/admin/dashboard/summary': {
        status: 200,
        body: dashboard({
          lowStockProducts: [product({ id: 4, name: 'Webcam', stock: 0 }), product({ id: 5, name: 'Lamp', stock: 3 })],
          recentOrders: [orderSummary({ id: 9, total: 2499, status: 'SHIPPED' })],
        }),
      },
    })
    renderApp('/admin')

    const webcam = (await screen.findByRole('link', { name: 'Webcam' })).closest('li')!
    expect(within(webcam).getByText('Out of stock')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Webcam' })).toHaveAttribute('href', '/admin/products/4/edit')
    expect(within(screen.getByRole('link', { name: 'Lamp' }).closest('li')!).getByText('3 left')).toBeInTheDocument()

    const order = screen.getByRole('link', { name: '#9' }).closest('tr')!
    expect(within(order).getByText('Shipped')).toBeInTheDocument()
    expect(within(order).getByText('₹2,499.00')).toBeInTheDocument()
  })

  it('handles an empty store', async () => {
    mockApi({
      ...me,
      'GET /api/admin/dashboard/summary': {
        status: 200,
        body: dashboard({
          orders: { total: 0, revenue: 0, byStatus: { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 } },
        }),
      },
    })
    renderApp('/admin')

    expect(await screen.findAllByText('No orders yet.')).toHaveLength(2)
    expect(screen.getByText('All active products are well stocked.')).toBeInTheDocument()
  })

  it('reloads on refresh', async () => {
    const fetch = mockApi({ ...me, 'GET /api/admin/dashboard/summary': { status: 200, body: dashboard() } })
    renderApp('/admin')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh' }))

    await vi.waitFor(() => expect(callTo(fetch, 'GET /api/admin/dashboard/summary', 1)).toBeDefined())
  })

  it('is not available to customers', async () => {
    localStorage.setItem('shop.token', 'customer-token')
    mockApi({ ...emptyCatalog, ...emptyCart, 'GET /api/auth/me': { status: 200, body: customer } })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })
})
