import { useState } from 'react'
import { Link } from 'react-router'
import { ORDER_STATUSES, type OrderStatus } from '../../types/order'
import { formatCount } from '../../utils/format'
import { statusLabel } from '../../utils/orderStatus'

interface Props {
  byStatus: Record<OrderStatus, number>
  total: number
}

function share(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

/**
 * Horizontal bars comparing order counts per status. One hue (magnitude, not identity);
 * each row is a link to the filtered order list and shows a tooltip on hover/focus.
 */
export function OrdersByStatusChart({ byStatus, total }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [active, setActive] = useState<OrderStatus | null>(null)
  const max = Math.max(1, ...ORDER_STATUSES.map((s) => byStatus[s]))

  return (
    <section className="card chart-card" aria-labelledby="orders-by-status-title">
      <div className="chart-header">
        <h2 id="orders-by-status-title">Orders by status</h2>
        <button type="button" className="link" onClick={() => setView(view === 'chart' ? 'table' : 'chart')}>
          {view === 'chart' ? 'View as table' : 'View as chart'}
        </button>
      </div>

      {total === 0 && <p className="muted">No orders yet.</p>}

      {total > 0 && view === 'chart' && (
        <ul className="bar-chart">
          {ORDER_STATUSES.map((status) => {
            const count = byStatus[status]
            const pct = share(count, total)
            return (
              <li key={status}>
                <Link
                  to={`/admin/orders?status=${status}`}
                  className="bar-row"
                  aria-label={`${statusLabel(status)}: ${formatCount(count)} orders, ${pct}% of all orders`}
                  onMouseEnter={() => setActive(status)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(status)}
                  onBlur={() => setActive(null)}
                >
                  <span className="bar-label">{statusLabel(status)}</span>
                  <span className="bar-track">
                    {count > 0 && <span className="bar" style={{ width: `${(count / max) * 100}%` }} />}
                  </span>
                  <span className="bar-value">{formatCount(count)}</span>
                  {active === status && (
                    <span role="tooltip" className="chart-tooltip">
                      <strong>{statusLabel(status)}</strong>
                      <span>{formatCount(count)} {count === 1 ? 'order' : 'orders'} · {pct}% of all orders</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {total > 0 && view === 'table' && (
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th className="num">Orders</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {ORDER_STATUSES.map((status) => (
              <tr key={status}>
                <td><Link to={`/admin/orders?status=${status}`}>{statusLabel(status)}</Link></td>
                <td className="num">{formatCount(byStatus[status])}</td>
                <td className="num">{share(byStatus[status], total)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
