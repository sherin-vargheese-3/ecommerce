import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { admin, dashboardApi, customer, emptyCatalog, mockApi, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', async () => {
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('keeps customers out of the admin area', async () => {
    localStorage.setItem('shop.token', 'customer-token')
    mockApi({ ...emptyCatalog, 'GET /api/auth/me': { status: 200, body: customer } })
    renderApp('/admin/products')
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Manage products' })).not.toBeInTheDocument()
  })

  it('restores an admin session from the stored token', async () => {
    localStorage.setItem('shop.token', 'admin-token')
    const fetch = mockApi({ ...dashboardApi, 'GET /api/auth/me': { status: 200, body: admin } })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    const init = fetch.mock.calls[0][1]
    expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer admin-token')
  })

  it('clears an expired token and sends the user to login', async () => {
    localStorage.setItem('shop.token', 'expired-token')
    mockApi({ 'GET /api/auth/me': { status: 401 } })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(localStorage.getItem('shop.token')).toBeNull()
  })
})
