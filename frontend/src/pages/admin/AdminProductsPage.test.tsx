import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, mockApi, page, product, renderApp } from '../../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'admin-token'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const me = { 'GET /api/auth/me': { status: 200, body: admin } }

describe('AdminProductsPage', () => {
  it('lists active and removed products', async () => {
    mockApi({
      ...me,
      'GET /api/admin/products': {
        status: 200,
        body: page([product(), product({ id: 2, name: 'Old Mouse', active: false })]),
      },
    })
    renderApp('/admin/products')

    const lampRow = (await screen.findByRole('cell', { name: 'Desk Lamp' })).closest('tr')!
    expect(within(lampRow).getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    expect(within(lampRow).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/admin/products/1/edit')
    const oldRow = screen.getByRole('cell', { name: 'Old Mouse' }).closest('tr')!
    expect(within(oldRow).getByText('Removed')).toBeInTheDocument()
    expect(within(oldRow).getByRole('button', { name: 'Restore' })).toBeInTheDocument()
  })

  it('removes a product after confirmation and reloads the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetch = mockApi({
      ...me,
      'GET /api/admin/products': { status: 200, body: page([product()]) },
      'DELETE /api/admin/products/1': { status: 204 },
    })
    renderApp('/admin/products')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Remove' }))

    await vi.waitFor(() => expect(callTo(fetch, 'GET /api/admin/products', 1)).toBeDefined())
    expect(callTo(fetch, 'DELETE /api/admin/products/1')).toBeDefined()
  })

  it('does nothing when removal is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetch = mockApi({ ...me, 'GET /api/admin/products': { status: 200, body: page([product()]) } })
    renderApp('/admin/products')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Remove' }))

    expect(callTo(fetch, 'DELETE /api/admin/products/1')).toBeUndefined()
  })
})
