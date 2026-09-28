import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { admin, dashboardApi, callTo, customer, emptyCatalog, mockApi, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  it('shows the rate-limit message from the server', async () => {
    mockApi({ 'POST /api/auth/login': { status: 429, body: { detail: 'Too many failed login attempts. Try again later.' } } })
    renderApp('/login')

    await fillAndSubmit('jane@example.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed login attempts')
  })

  it('explains when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderApp('/login')

    await fillAndSubmit('jane@example.com', 'password123')

    expect(await screen.findByRole('alert')).toHaveTextContent('Can’t reach the server')
  })

  it('sets the page title', () => {
    renderApp('/login')
    expect(document.title).toBe('Log in · Shop')
  })

  it('logs a customer in, stores the token and goes to the catalog', async () => {
    const fetch = mockApi({
      ...emptyCatalog,
      'POST /api/auth/login': { status: 200, body: { token: 'jwt-token', user: customer } },
    })
    renderApp('/login')

    await fillAndSubmit('jane@example.com', 'password123')

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
    expect(localStorage.getItem('shop.token')).toBe('jwt-token')
    expect(callTo(fetch, 'POST /api/auth/login')?.body).toEqual({ email: 'jane@example.com', password: 'password123' })
  })

  it('sends admins to the admin area', async () => {
    mockApi({ ...dashboardApi, 'POST /api/auth/login': { status: 200, body: { token: 'jwt-token', user: admin } } })
    renderApp('/login')

    await fillAndSubmit('admin@shop.local', 'admin12345')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows an error for invalid credentials', async () => {
    mockApi({ 'POST /api/auth/login': { status: 401, body: { detail: 'Invalid email or password' } } })
    renderApp('/login')

    await fillAndSubmit('jane@example.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(localStorage.getItem('shop.token')).toBeNull()
  })
})
