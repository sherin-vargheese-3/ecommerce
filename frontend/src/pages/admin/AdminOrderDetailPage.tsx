import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { adminOrdersApi } from '../../api/orders'
import { OrderItemsTable } from '../../components/OrderItemsTable'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { useAsync } from '../../hooks/useAsync'
import type { Order, OrderStatus } from '../../types/order'
import { formatDate } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Mark as pending',
  CONFIRMED: 'Confirm order',
  SHIPPED: 'Mark as shipped',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
}

// Forward actions first, cancellation last.
const ACTION_ORDER: OrderStatus[] = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const { data, error, loading } = useAsync(() => adminOrdersApi.get(id), [id])
  const [updated, setUpdated] = useState<Order | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const order = updated ?? data
  useDocumentTitle(order ? `Order #${order.id}` : 'Order')

  if (loading) return <p className="muted">Loading…</p>
  if (error || !order) {
    return (
      <section>
        <h1>{error instanceof ApiError && error.status === 404 ? 'Order not found' : 'Could not load order'}</h1>
        <Link to="/admin/orders">Back to orders</Link>
      </section>
    )
  }

  const changeStatus = async (status: OrderStatus) => {
    if (status === 'CANCELLED' && !window.confirm(`Cancel order #${order.id}? Stock will be returned to inventory.`)) {
      return
    }
    setActionError(null)
    setSaving(true)
    try {
      setUpdated(await adminOrdersApi.updateStatus(order.id, status))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update the order.')
    } finally {
      setSaving(false)
    }
  }

  const actions = ACTION_ORDER.filter((s) => order.nextStatuses.includes(s))

  return (
    <section className="order-detail">
      <Link to="/admin/orders" className="muted">← All orders</Link>
      <div className="page-header">
        <h1>Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <dl className="order-meta">
        <dt>Customer</dt>
        <dd>{order.customer.name} ({order.customer.email})</dd>
        <dt>Placed</dt>
        <dd>{formatDate(order.createdAt)}</dd>
        <dt>Last updated</dt>
        <dd>{formatDate(order.updatedAt)}</dd>
      </dl>
      {actionError && <p role="alert" className="error">{actionError}</p>}
      <OrderItemsTable order={order} />
      <div className="form-actions">
        {actions.length === 0 && <span className="muted">This order is {order.status.toLowerCase()}; no further changes.</span>}
        {actions.map((status) => (
          <button key={status} type="button" disabled={saving}
            className={status === 'CANCELLED' ? 'secondary danger' : undefined}
            onClick={() => changeStatus(status)}>
            {ACTION_LABELS[status]}
          </button>
        ))}
      </div>
    </section>
  )
}
