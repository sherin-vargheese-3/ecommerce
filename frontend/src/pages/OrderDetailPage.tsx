import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { ordersApi } from '../api/orders'
import { OrderItemsTable } from '../components/OrderItemsTable'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { useAsync } from '../hooks/useAsync'
import type { Order } from '../types/order'
import { formatDate } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const justPlaced = (location.state as { placed?: boolean } | null)?.placed === true
  const { data, error, loading } = useAsync(() => ordersApi.get(id), [id])
  const [updated, setUpdated] = useState<Order | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const order = updated ?? data
  useDocumentTitle(order ? `Order #${order.id}` : 'Order')

  if (loading) return <p className="muted">Loading…</p>
  if (error || !order) {
    return (
      <section>
        <h1>{error instanceof ApiError && error.status === 404 ? 'Order not found' : 'Could not load order'}</h1>
        <Link to="/orders">Back to your orders</Link>
      </section>
    )
  }

  const handleCancel = async () => {
    if (!window.confirm(`Cancel order #${order.id}?`)) return
    setActionError(null)
    setCancelling(true)
    try {
      setUpdated(await ordersApi.cancel(order.id))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not cancel the order.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <section className="order-detail">
      <Link to="/orders" className="muted">← Your orders</Link>
      {justPlaced && !updated && (
        <p role="status" className="card notice success">Thank you! Your order has been placed.</p>
      )}
      <div className="page-header">
        <h1>Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="muted">Placed {formatDate(order.createdAt)}</p>
      {actionError && <p role="alert" className="error">{actionError}</p>}
      <OrderItemsTable order={order} />
      {order.status === 'PENDING' && (
        <div className="form-actions">
          <button type="button" className="secondary" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
          <span className="muted">You can cancel until the order is confirmed.</span>
        </div>
      )}
    </section>
  )
}
