import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { admin, callTo, mockApi, order, orderSummary, page, renderApp } from '../../test/utils'

beforeEach(() => localStorage.setItem('shop.token', 'admin-token'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const me = { 'GET /api/auth/me': { status: 200, body: admin } }

describe('AdminOrdersPage', () => {
  it('lists orders and filters by status', async () => {
    const fetch = mockApi({
      ...me,
      'GET /api/admin/orders': { status: 200, body: page([orderSummary({ id: 3, status: 'CONFIRMED' })]) },
    })
    renderApp('/admin/orders')

    const row = (await screen.findByRole('link', { name: '#3' })).closest('tr')!
    expect(within(row).getByText('Jane')).toBeInTheDocument()
    expect(within(row).getByText('Confirmed')).toBeInTheDocument()

    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'SHIPPED')
    await vi.waitFor(() =>
      expect(callTo(fetch, 'GET /api/admin/orders', 1)?.url.searchParams.get('status')).toBe('SHIPPED'))
  })
})

describe('AdminOrderDetailPage', () => {
  it('offers only the allowed next statuses and applies them', async () => {
    const fetch = mockApi({
      ...me,
      'GET /api/admin/orders/1': { status: 200, body: order() },
      'PATCH /api/admin/orders/1/status': {
        status: 200, body: order({ status: 'CONFIRMED', nextStatuses: ['SHIPPED', 'CANCELLED'] }),
      },
    })
    renderApp('/admin/orders/1')
    const user = userEvent.setup()

    expect(await screen.findByText('Jane (jane@example.com)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as shipped' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm order' }))

    expect(await screen.findByRole('button', { name: 'Mark as shipped' })).toBeInTheDocument()
    expect(callTo(fetch, 'PATCH /api/admin/orders/1/status')?.body).toEqual({ status: 'CONFIRMED' })
  })

  it('asks before cancelling', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetch = mockApi({ ...me, 'GET /api/admin/orders/1': { status: 200, body: order() } })
    renderApp('/admin/orders/1')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancel order' }))

    expect(confirm).toHaveBeenCalled()
    expect(callTo(fetch, 'PATCH /api/admin/orders/1/status')).toBeUndefined()
  })

  it('shows final orders without actions', async () => {
    mockApi({ ...me, 'GET /api/admin/orders/1': { status: 200, body: order({ status: 'DELIVERED', nextStatuses: [] }) } })
    renderApp('/admin/orders/1')
    const notice = await screen.findByText('This order is delivered; no further changes.')
    expect(within(notice.closest('section')!).queryByRole('button')).toBeNull()
  })

  it('shows the server error for a rejected change', async () => {
    mockApi({
      ...me,
      'GET /api/admin/orders/1': { status: 200, body: order() },
      'PATCH /api/admin/orders/1/status': { status: 409, body: { detail: 'The resource was modified concurrently, please retry' } },
    })
    renderApp('/admin/orders/1')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Confirm order' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('modified concurrently')
  })
})
