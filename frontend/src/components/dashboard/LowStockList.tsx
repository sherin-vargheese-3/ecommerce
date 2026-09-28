import { Link } from 'react-router'
import type { Product } from '../../types/product'

interface Props {
  products: Product[]
  threshold: number
}

/** Stock alerts: status color is always paired with an icon and a text label. */
export function LowStockList({ products, threshold }: Props) {
  return (
    <section className="card" aria-labelledby="low-stock-title">
      <div className="chart-header">
        <h2 id="low-stock-title">Stock alerts</h2>
        <span className="muted">{threshold} or fewer left</span>
      </div>
      {products.length === 0 ? (
        <p className="muted">All active products are well stocked.</p>
      ) : (
        <ul className="alert-list">
          {products.map((product) => {
            const out = product.stock === 0
            return (
              <li key={product.id}>
                <span className={`alert-icon ${out ? 'critical' : 'warning'}`} aria-hidden="true">{out ? '✕' : '!'}</span>
                <Link to={`/admin/products/${product.id}/edit`}>{product.name}</Link>
                <span className="alert-label">{out ? 'Out of stock' : `${product.stock} left`}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
