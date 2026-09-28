import { Link, useSearchParams } from 'react-router'
import { ordersApi } from '../api/orders'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatPrice } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function OrdersPage() {
  useDocumentTitle('Your orders')
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 0)
  const { data, error, loading } = useAsync(() => ordersApi.list(page), [page])

  return (
    <section>
      <h1>Your orders</h1>
      {loading && !data && <p className="muted">Loading orders…</p>}
      {error && <p role="alert" className="error">Could not load your orders.</p>}
      {data && data.content.length === 0 && (
        <>
          <p className="muted">You haven’t placed any orders yet.</p>
          <Link to="/" className="button">Start shopping</Link>
        </>
      )}
      {data && data.content.length > 0 && (
        <>
          <ul className="order-list">
            {data.content.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="card order-row">
                  <strong>Order #{order.id}</strong>
                  <span className="muted">{formatDate(order.createdAt)}</span>
                  <span className="muted">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
                  <OrderStatusBadge status={order.status} />
                  <strong className="order-total">{formatPrice(order.total)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages}
            onChange={(p) => setParams(p > 0 ? { page: String(p) } : {})} />
        </>
      )}
    </section>
  )
}
