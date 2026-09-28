import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { useCart } from '../cart/useCart'
import type { Product } from '../types/product'
import { QuantityInput } from './QuantityInput'

const MAX_PER_ITEM = 99

export function AddToCart({ product }: { product: Product }) {
  const { user } = useAuth()
  const { cart, addItem } = useCart()
  const location = useLocation()
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user?.role === 'ADMIN') return null
  if (!user) {
    return (
      <p>
        <Link to="/login" state={{ from: location.pathname }}>Log in</Link> to add this to your cart.
      </p>
    )
  }
  if (product.stock === 0) return <button type="button" disabled>Out of stock</button>

  const inCart = cart?.items.find((i) => i.productId === product.id)?.quantity ?? 0
  const max = Math.max(0, Math.min(product.stock, MAX_PER_ITEM) - inCart)

  const handleAdd = async () => {
    setMessage(null)
    setSubmitting(true)
    try {
      await addItem(product.id, quantity)
      setMessage({ text: `Added ${quantity} to your cart.`, error: false })
      setQuantity(1)
    } catch (err) {
      setMessage({ text: err instanceof ApiError ? err.message : 'Could not add to cart.', error: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="add-to-cart">
      {max > 0 ? (
        <div className="toolbar">
          <QuantityInput value={Math.min(quantity, max)} max={max} onChange={setQuantity} label="Quantity" />
          <button type="button" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      ) : (
        <p className="muted">You have all available stock in your cart.</p>
      )}
      {inCart > 0 && <p className="muted"><Link to="/cart">{inCart} in your cart</Link></p>}
      {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'error' : 'success'}>{message.text}</p>}
    </div>
  )
}
