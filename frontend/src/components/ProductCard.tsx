import { Link } from 'react-router'
import type { Product } from '../types/product'
import { formatPrice } from '../utils/format'
import { ProductImage } from './ProductImage'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="product-card-link">
        <ProductImage src={product.imageUrl} alt={product.name} />
        <h2>{product.name}</h2>
      </Link>
      <div className="product-card-footer">
        <strong>{formatPrice(product.price)}</strong>
        {product.stock === 0 && <span className="badge">Out of stock</span>}
      </div>
    </article>
  )
}
