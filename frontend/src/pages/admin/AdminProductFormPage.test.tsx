import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, mockApi, page, product, renderApp } from '../../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'admin-token'))
afterEach(() => vi.unstubAllGlobals())

const base = {
  'GET /api/auth/me': { status: 200, body: admin },
  'GET /api/admin/products': { status: 200, body: page([]) },
}

describe('AdminProductFormPage', () => {
  it('validates before submitting', async () => {
    const fetch = mockApi(base)
    renderApp('/admin/products/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Price'), '1.999')
    await user.clear(screen.getByLabelText('Stock'))
    await user.type(screen.getByLabelText('Stock'), '-1')
    await user.type(screen.getByLabelText('Image URL'), 'not a url')
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Use at most 2 decimal places')).toBeInTheDocument()
    expect(screen.getByText('Enter a whole number of 0 or more')).toBeInTheDocument()
    expect(screen.getByText('Must be an http(s) URL')).toBeInTheDocument()
    expect(callTo(fetch, 'POST /api/admin/products')).toBeUndefined()
  })

  it('creates a product and returns to the list', async () => {
    const fetch = mockApi({ ...base, 'POST /api/admin/products': { status: 201, body: product() } })
    renderApp('/admin/products/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Name'), ' Desk Lamp ')
    await user.type(screen.getByLabelText('Price'), '49.90')
    await user.clear(screen.getByLabelText('Stock'))
    await user.type(screen.getByLabelText('Stock'), '20')
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    expect(await screen.findByRole('heading', { name: 'Manage products' })).toBeInTheDocument()
    expect(callTo(fetch, 'POST /api/admin/products')?.body).toEqual({
      name: 'Desk Lamp', description: null, price: 49.9, stock: 20, imageUrl: null, active: true,
    })
  })

  it('loads an existing product and saves changes', async () => {
    const fetch = mockApi({
      ...base,
      'GET /api/admin/products/1': { status: 200, body: product() },
      'PUT /api/admin/products/1': { status: 200, body: product({ price: 39.9 }) },
    })
    renderApp('/admin/products/1/edit')
    const user = userEvent.setup()

    const price = await screen.findByLabelText('Price')
    expect(screen.getByLabelText('Name')).toHaveValue('Desk Lamp')
    expect(price).toHaveValue('49.90')
    await user.clear(price)
    await user.type(price, '39.90')
    await user.click(screen.getByRole('checkbox', { name: 'Visible in catalog' }))
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    await screen.findByRole('heading', { name: 'Manage products' })
    expect(callTo(fetch, 'PUT /api/admin/products/1')?.body).toMatchObject({ price: 39.9, active: false })
  })

  it('shows server-side field errors', async () => {
    mockApi({
      ...base,
      'POST /api/admin/products': { status: 400, body: { detail: 'Validation failed', errors: { name: 'size must be between 0 and 255' } } },
    })
    renderApp('/admin/products/new')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Name'), 'X')
    await user.type(screen.getByLabelText('Price'), '1')
    await user.click(screen.getByRole('button', { name: 'Save product' }))

    expect(await screen.findByText('size must be between 0 and 255')).toBeInTheDocument()
  })
})
