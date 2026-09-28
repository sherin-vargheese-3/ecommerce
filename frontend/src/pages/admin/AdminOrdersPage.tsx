import { Link, useSearchParams } from 'react-router'
import { adminOrdersApi } from '../../api/orders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Pagination } from '../../components/Pagination'
import { useAsync } from '../../hooks/useAsync'
import { ORDER_STATUSES, type OrderStatus } from '../../types/order'
import { formatDate, formatPrice } from '../../utils/format'
import { statusLabel } from '../../utils/orderStatus'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function AdminOrdersPage() {
  useDocumentTitle('Manage orders')
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 0)
  const status = (params.get('status') as OrderStatus | null) ?? undefined
  const { data, error, loading } = useAsync(() => adminOrdersApi.list(page, status), [page, status])

  const update = (next: { status?: string; page?: number }) => {
    const search: Record<string, string> = {}
    const s = 'status' in next ? next.status : status
    if (s) search.status = s
    if (next.page) search.page = String(next.page)
    setParams(search)
  }

  return (
    <section>
      <div className="page-header">
        <h1>Orders</h1>
        <select aria-label="Filter by status" value={status ?? ''} onChange={(e) => update({ status: e.target.value })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      {loading && !data && <p className="muted">Loading…</p>}
      {error && <p role="alert" className="error">Could not load orders.</p>}
      {data && data.content.length === 0 && <p className="muted">No orders found.</p>}
      {data && data.content.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Customer</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((order) => (
                  <tr key={order.id}>
                    <td><Link to={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.customer.name} <span className="muted">{order.customer.email}</span></td>
                    <td className="num">{order.itemCount}</td>
                    <td className="num">{formatPrice(order.total)}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </section>
  )
}
