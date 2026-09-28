import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, cart, cartItem, customer, emptyCart, mockApi, product, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

const lampPage = { 'GET /api/products/1': { status: 200, body: product({ stock: 5 }) } }

function asCustomer() {
  localStorage.setItem('shop.token', 'customer-token')
  return { 'GET /api/auth/me': { status: 200, body: customer } }
}

describe('AddToCart', () => {
  it('adds the chosen quantity and updates the cart badge', async () => {
    const fetch = mockApi({
      ...asCustomer(), ...lampPage, ...emptyCart,
      'POST /api/cart/items': { status: 200, body: cart([cartItem({ quantity: 2 })]) },
    })
    renderApp('/products/1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Increase quantity' }))
    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Added 2 to your cart.')
    expect(callTo(fetch, 'POST /api/cart/items')?.body).toEqual({ productId: 1, quantity: 2 })
    expect(screen.getByLabelText('2 items')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2 in your cart' })).toBeInTheDocument()
  })

  it('limits the quantity to stock not already in the cart', async () => {
    mockApi({ ...asCustomer(), ...lampPage, 'GET /api/cart': { status: 200, body: cart([cartItem({ quantity: 4 })]) } })
    renderApp('/products/1')

    await screen.findByRole('link', { name: '4 in your cart' })
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
  })

  it('shows the server error message', async () => {
    mockApi({
      ...asCustomer(), ...lampPage, ...emptyCart,
      'POST /api/cart/items': { status: 422, body: { detail: 'Only 5 of Desk Lamp in stock' } },
    })
    renderApp('/products/1')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Add to cart' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 5 of Desk Lamp in stock')
  })

  it('asks anonymous users to log in', async () => {
    mockApi(lampPage)
    renderApp('/products/1')
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
  })

  it('is hidden for admins and disabled when out of stock', async () => {
    localStorage.setItem('shop.token', 'admin-token')
    mockApi({ 'GET /api/auth/me': { status: 200, body: admin }, ...lampPage })
    const { unmount } = renderApp('/products/1')
    await screen.findByRole('heading', { name: 'Desk Lamp' })
    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
    unmount()

    mockApi({ ...asCustomer(), ...emptyCart, 'GET /api/products/1': { status: 200, body: product({ stock: 0 }) } })
    renderApp('/products/1')
    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled()
  })
})
