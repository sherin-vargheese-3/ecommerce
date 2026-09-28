import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(() => vi.restoreAllMocks())

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error('boom')
  return <p>Recovered</p>
}

describe('ErrorBoundary', () => {
  it('shows a fallback instead of a blank page and can retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    shouldThrow = true
    render(<ErrorBoundary><Flaky /></ErrorBoundary>)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()

    shouldThrow = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})
