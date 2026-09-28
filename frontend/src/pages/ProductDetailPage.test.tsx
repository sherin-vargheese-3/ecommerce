import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, product, renderApp } from '../test/utils'

afterEach(() => vi.unstubAllGlobals())

describe('ProductDetailPage', () => {
  it('shows product details', async () => {
    mockApi({ 'GET /api/products/1': { status: 200, body: product() } })
    renderApp('/products/1')

    expect(await screen.findByRole('heading', { name: 'Desk Lamp' })).toBeInTheDocument()
    expect(screen.getByText('₹49.90')).toBeInTheDocument()
    expect(screen.getByText('20 in stock')).toBeInTheDocument()
    expect(screen.getByText('A bright lamp')).toBeInTheDocument()
  })

  it('shows not found for missing or removed products', async () => {
    mockApi({ 'GET /api/products/99': { status: 404, body: { detail: 'Product 99 not found' } } })
    renderApp('/products/99')

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
  })
})
