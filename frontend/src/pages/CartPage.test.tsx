import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, cart, cartItem, customer, emptyCatalog, mockApi, order, renderApp } from '../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'customer-token'))
afterEach(() => vi.unstubAllGlobals())

const me = { 'GET /api/auth/me': { status: 200, body: customer } }
const lamp = cartItem({ id: 100, name: 'Desk Lamp', unitPrice: 2499, quantity: 2 })
const mouse = cartItem({ id: 101, productId: 2, name: 'Mouse', unitPrice: 999.5, quantity: 1 })

describe('CartPage', () => {
  it('shows items, line totals and the server total', async () => {
    mockApi({ ...me, 'GET /api/cart': { status: 200, body: cart([lamp, mouse]) } })
    renderApp('/cart')

    const lampRow = (await screen.findByRole('link', { name: 'Desk Lamp' })).closest('li')!
    expect(within(lampRow).getByText('₹2,499.00 each')).toBeInTheDocument()
    expect(within(lampRow).getByText('₹4,998.00')).toBeInTheDocument()
    expect(screen.getByText('₹5,997.50')).toBeInTheDocument()
    expect(screen.getByLabelText('3 items')).toBeInTheDocument()
  })

  it('changes quantities and removes items using the server response', async () => {
    const fetch = mockApi({
      ...me,
      'GET /api/cart': { status: 200, body: cart([lamp, mouse]) },
      'PUT /api/cart/items/100': { status: 200, body: cart([{ ...lamp, quantity: 3, lineTotal: 7497 }, mouse]) },
      'DELETE /api/cart/items/101': { status: 200, body: cart([{ ...lamp, quantity: 3, lineTotal: 7497 }]) },
    })
    renderApp('/cart')
    const user = userEvent.setup()

    const lampRow = (await screen.findByRole('link', { name: 'Desk Lamp' })).closest('li')!
    await user.click(within(lampRow).getByRole('button', { name: 'Increase quantity' }))
    expect(await screen.findByText('₹8,496.50')).toBeInTheDocument()
    expect(callTo(fetch, 'PUT /api/cart/items/100')?.body).toEqual({ quantity: 3 })

    await user.click(screen.getByRole('button', { name: 'Remove Mouse' }))
    expect(await screen.findAllByText('₹7,497.00')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Mouse' })).not.toBeInTheDocument()
  })

  it('shows the server error when stock runs out', async () => {
    mockApi({
      ...me,
      'GET /api/cart': { status: 200, body: cart([lamp]) },
      'PUT /api/cart/items/100': { status: 422, body: { detail: 'Only 2 of Desk Lamp in stock' } },
    })
    renderApp('/cart')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Increase quantity' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 2 of Desk Lamp in stock')
  })

  it('flags unavailable items and excludes them from the total', async () => {
    const removed = cartItem({ id: 102, productId: 3, name: 'Old Webcam', unitPrice: 3999, available: false })
    mockApi({ ...me, 'GET /api/cart': { status: 200, body: cart([lamp, removed]) } })
    renderApp('/cart')

    const row = (await screen.findByRole('link', { name: 'Old Webcam' })).closest('li')!
    expect(within(row).getByText('No longer available')).toBeInTheDocument()
    expect(screen.getByText('Remove or adjust unavailable items before checking out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
    expect(screen.getAllByText('₹4,998.00')).toHaveLength(2)
  })

  it('places an order and shows the confirmation', async () => {
    const fetch = mockApi({
      ...me,
      'GET /api/cart': (() => {
        let calls = 0
        return () => ({ status: 200, body: calls++ === 0 ? cart([lamp]) : cart([]) })
      })(),
      'POST /api/orders': { status: 201, body: order({ id: 42 }) },
      'GET /api/orders/42': { status: 200, body: order({ id: 42 }) },
    })
    renderApp('/cart')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Place order' }))

    expect(await screen.findByRole('heading', { name: 'Order #42' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your order has been placed')
    expect(callTo(fetch, 'POST /api/orders')).toBeDefined()
    expect(screen.queryByLabelText(/items$/)).not.toBeInTheDocument()
  })

  it('keeps the cart and shows why checkout failed', async () => {
    mockApi({
      ...me,
      'GET /api/cart': { status: 200, body: cart([lamp]) },
      'POST /api/orders': { status: 422, body: { detail: 'Only 1 of Desk Lamp left in stock' } },
    })
    renderApp('/cart')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Place order' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 1 of Desk Lamp left in stock')
    expect(screen.getByRole('link', { name: 'Desk Lamp' })).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockApi({ ...me, 'GET /api/cart': { status: 200, body: cart([]) } })
    renderApp('/cart')
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument()
  })

  it('is not available to admins', async () => {
    localStorage.setItem('shop.token', 'admin-token')
    mockApi({ ...emptyCatalog, 'GET /api/auth/me': { status: 200, body: admin } })
    renderApp('/cart')
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument()
  })
})
