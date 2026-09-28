import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { callTo, emptyCatalog, mockApi, page, product, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

describe('ProductListPage', () => {
  it('shows the catalog with prices and stock badges', async () => {
    mockApi({
      'GET /api/products': {
        status: 200,
        body: page([product(), product({ id: 2, name: 'Webcam', price: 59.99, stock: 0 })]),
      },
    })
    renderApp('/')

    const lamp = (await screen.findByRole('heading', { name: 'Desk Lamp' })).closest('article')!
    expect(within(lamp).getByText('₹49.90')).toBeInTheDocument()
    const webcam = screen.getByRole('heading', { name: 'Webcam' }).closest('article')!
    expect(within(webcam).getByText('Out of stock')).toBeInTheDocument()
    expect(within(lamp).getByRole('link')).toHaveAttribute('href', '/products/1')
  })

  it('searches, sorts and pages through the API', async () => {
    const fetch = mockApi({
      'GET /api/products': { status: 200, body: page([product()], { totalPages: 3, totalElements: 30 }) },
    })
    renderApp('/')
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Desk Lamp' })

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'lamp')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await vi.waitFor(() => expect(callTo(fetch, 'GET /api/products', 1)?.url.searchParams.get('q')).toBe('lamp'))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price,asc')
    await vi.waitFor(() => expect(callTo(fetch, 'GET /api/products', 2)?.url.searchParams.get('sort')).toBe('price,asc'))

    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await vi.waitFor(() => {
      const params = callTo(fetch, 'GET /api/products', 3)?.url.searchParams
      expect(params?.get('page')).toBe('1')
      expect(params?.get('q')).toBe('lamp')
      expect(params?.get('sort')).toBe('price,asc')
    })
  })

  it('shows an empty state', async () => {
    mockApi(emptyCatalog)
    renderApp('/?q=zzz')
    expect(await screen.findByText('No products match “zzz”.')).toBeInTheDocument()
  })
})
