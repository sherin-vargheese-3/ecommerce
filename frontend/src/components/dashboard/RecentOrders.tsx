import { Link } from 'react-router'
import type { OrderSummary } from '../../types/order'
import { formatDate, formatPrice } from '../../utils/format'
import { OrderStatusBadge } from '../OrderStatusBadge'

export function RecentOrders({ orders }: { orders: OrderSummary[] }) {
  return (
    <section className="card" aria-labelledby="recent-orders-title">
      <div className="chart-header">
        <h2 id="recent-orders-title">Recent orders</h2>
        <Link to="/admin/orders">View all</Link>
      </div>
      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                  <td>{order.customer.name}</td>
                  <td className="muted">{formatDate(order.createdAt)}</td>
                  <td className="num">{formatPrice(order.total)}</td>
                  <td><OrderStatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
