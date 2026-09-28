import { adminDashboardApi } from '../../api/dashboard'
import { LowStockList } from '../../components/dashboard/LowStockList'
import { OrdersByStatusChart } from '../../components/dashboard/OrdersByStatusChart'
import { RecentOrders } from '../../components/dashboard/RecentOrders'
import { StatTile } from '../../components/dashboard/StatTile'
import { useAsync } from '../../hooks/useAsync'
import { formatCount, formatPrice, formatPriceShort } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function AdminDashboardPage() {
  useDocumentTitle('Dashboard')
  const { data, error, loading, reload } = useAsync(() => adminDashboardApi.summary(), [])

  return (
    <section className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button type="button" className="secondary" onClick={reload} disabled={loading}>
          {loading && data ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && !data && <p className="muted">Loading dashboard…</p>}
      {error && <p role="alert" className="error">Could not load the dashboard.</p>}

      {data && (
        <>
          <div className="kpi-row">
            <StatTile
              hero
              label="Revenue"
              value={formatPriceShort(data.orders.revenue)}
              title={formatPrice(data.orders.revenue)}
              detail={data.orders.revenue >= 100_000 ? formatPrice(data.orders.revenue) : 'Excludes cancelled orders'}
            />
            <StatTile
              label="Orders"
              value={formatCount(data.orders.total)}
              detail={`${formatCount(data.orders.byStatus.PENDING)} pending`}
              href="/admin/orders"
            />
            <StatTile
              label="Active products"
              value={formatCount(data.products.active)}
              detail={`${formatCount(data.products.inactive)} removed · ${formatCount(data.products.total)} total`}
              href="/admin/products"
            />
            <StatTile
              label="Stock alerts"
              value={formatCount(data.products.outOfStock + data.products.lowStock)}
              detail={`${formatCount(data.products.outOfStock)} out of stock · ${formatCount(data.products.lowStock)} low`}
            />
          </div>

          <div className="dashboard-grid">
            <OrdersByStatusChart byStatus={data.orders.byStatus} total={data.orders.total} />
            <LowStockList products={data.lowStockProducts} threshold={data.products.lowStockThreshold} />
          </div>

          <RecentOrders orders={data.recentOrders} />
        </>
      )}
    </section>
  )
}
