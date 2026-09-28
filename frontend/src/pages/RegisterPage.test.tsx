import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { customer, emptyCatalog, mockApi, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Name'), 'Jane')
  await user.type(screen.getByLabelText('Email'), 'jane@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Register' }))
}

describe('RegisterPage', () => {
  it('validates input before calling the API', async () => {
    const fetch = mockApi({})
    renderApp('/register')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('registers and signs the user in', async () => {
    mockApi({
      ...emptyCatalog,
      'POST /api/auth/register': { status: 201, body: { token: 'jwt-token', user: customer } },
    })
    renderApp('/register')

    await fillAndSubmit()

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
    expect(localStorage.getItem('shop.token')).toBe('jwt-token')
  })

  it('shows a message when the email is taken', async () => {
    mockApi({ 'POST /api/auth/register': { status: 409, body: { detail: 'Email is already registered' } } })
    renderApp('/register')

    await fillAndSubmit()

    expect(await screen.findByText('This email is already registered')).toBeInTheDocument()
  })
})
