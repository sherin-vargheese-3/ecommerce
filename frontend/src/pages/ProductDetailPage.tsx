import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { productsApi } from '../api/products'
import { AddToCart } from '../components/AddToCart'
import { ProductImage } from '../components/ProductImage'
import { useAsync } from '../hooks/useAsync'
import { formatPrice } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function ProductDetailPage() {
  const { id = '' } = useParams()
  const { data: product, error, loading } = useAsync(() => productsApi.get(id), [id])
  useDocumentTitle(product?.name)

  if (loading) return <p className="muted">Loading…</p>
  if (error) {
    return (
      <section>
        <h1>{error instanceof ApiError && error.status === 404 ? 'Product not found' : 'Could not load product'}</h1>
        <Link to="/">Back to products</Link>
      </section>
    )
  }
  if (!product) return null

  return (
    <section className="product-detail">
      <ProductImage src={product.imageUrl} alt={product.name} className="large" />
      <div>
        <Link to="/" className="muted">← All products</Link>
        <h1>{product.name}</h1>
        <p className="price">{formatPrice(product.price)}</p>
        <p className={product.stock > 0 ? 'muted' : 'error'}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
        <AddToCart product={product} />
        {product.description && <p>{product.description}</p>}
      </div>
    </section>
  )
}
