import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useCart } from '../cart/useCart'
import { ProductImage } from '../components/ProductImage'
import { QuantityInput } from '../components/QuantityInput'
import type { CartItem } from '../types/cart'
import { formatPrice } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const MAX_PER_ITEM = 99

export function CartPage() {
  useDocumentTitle('Your cart')
  const { cart, updateQuantity, removeItem, clear, checkout, refresh } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)

  // Re-price on every visit so totals reflect current prices and stock.
  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (itemId: number | null, action: () => Promise<unknown>) => {
    setError(null)
    setBusyItem(itemId)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.')
      await refresh()
    } finally {
      setBusyItem(null)
    }
  }

  if (!cart) return <p className="muted">Loading your cart…</p>

  if (cart.items.length === 0) {
    return (
      <section>
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty.</p>
        <Link to="/" className="button">Browse products</Link>
      </section>
    )
  }

  const hasUnavailable = cart.items.some((i) => !i.available)

  const handleCheckout = async () => {
    setError(null)
    setPlacing(true)
    try {
      const order = await checkout()
      navigate(`/orders/${order.id}`, { state: { placed: true } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place your order, please try again.')
      await refresh()
      setPlacing(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Your cart</h1>
        <button type="button" className="link danger" onClick={() => run(null, clear)}>Empty cart</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      <div className="cart-layout">
        <ul className="cart-items">
          {cart.items.map((item) => (
            <CartLine key={item.id} item={item} busy={busyItem === item.id}
              onQuantity={(q) => run(item.id, () => updateQuantity(item.id, q))}
              onRemove={() => run(item.id, () => removeItem(item.id))} />
          ))}
        </ul>

        <aside className="card cart-summary">
          <h2>Summary</h2>
          <dl>
            <dt>Items</dt>
            <dd>{cart.itemCount}</dd>
            <dt>Total</dt>
            <dd className="total">{formatPrice(cart.total)}</dd>
          </dl>
          {hasUnavailable && (
            <p className="muted">Remove or adjust unavailable items before checking out.</p>
          )}
          <button type="button" onClick={handleCheckout} disabled={hasUnavailable || placing || busyItem !== null || cart.itemCount === 0}>
            {placing ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </div>
    </section>
  )
}

interface LineProps {
  item: CartItem
  busy: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}

function CartLine({ item, busy, onQuantity, onRemove }: LineProps) {
  const removed = !item.available && item.quantity <= item.stock
  const max = Math.max(1, Math.min(item.stock, MAX_PER_ITEM))
  return (
    <li className={`card cart-item${item.available ? '' : ' unavailable'}`}>
      <ProductImage src={item.imageUrl} alt={item.name} className="thumb" />
      <div className="cart-item-info">
        <Link to={`/products/${item.productId}`}><strong>{item.name}</strong></Link>
        <span className="muted">{formatPrice(item.unitPrice)} each</span>
        {!item.available && (
          <span className="error">
            {removed || item.stock === 0 ? 'No longer available' : `Only ${item.stock} in stock, please reduce the quantity`}
          </span>
        )}
      </div>
      <QuantityInput value={item.quantity} max={Math.max(max, item.quantity)} label={`Quantity for ${item.name}`}
        disabled={busy || removed || item.stock === 0} onChange={(q) => q !== item.quantity && onQuantity(Math.min(q, max))} />
      <strong className="line-total">{formatPrice(item.lineTotal)}</strong>
      <button type="button" className="link danger" disabled={busy} onClick={onRemove}
        aria-label={`Remove ${item.name}`}>Remove</button>
    </li>
  )
}
