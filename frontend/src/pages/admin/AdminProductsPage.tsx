import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { adminProductsApi } from '../../api/products'
import { Pagination } from '../../components/Pagination'
import { useAsync } from '../../hooks/useAsync'
import type { Product } from '../../types/product'
import { formatPrice } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function AdminProductsPage() {
  useDocumentTitle('Manage products')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? 0)
  const [search, setSearch] = useState(q)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, error, loading, reload } = useAsync(() => adminProductsApi.list({ q, page }), [q, page])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setParams(search.trim() ? { q: search.trim() } : {})
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Remove “${product.name}” from the catalog?`)) return
    setActionError(null)
    try {
      await adminProductsApi.remove(product.id)
      reload()
    } catch {
      setActionError(`Could not remove “${product.name}”.`)
    }
  }

  const handleRestore = async (product: Product) => {
    setActionError(null)
    try {
      await adminProductsApi.update(product.id, { ...product, active: true })
      reload()
    } catch {
      setActionError(`Could not restore “${product.name}”.`)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Manage products</h1>
        <div className="toolbar">
          <form className="toolbar" role="search" onSubmit={handleSearch}>
            <input type="search" aria-label="Search products" placeholder="Search by name"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="secondary">Search</button>
          </form>
          <Link to="/admin/products/new" className="button">New product</Link>
        </div>
      </div>

      {actionError && <p role="alert" className="error">{actionError}</p>}
      {loading && !data && <p className="muted">Loading…</p>}
      {error && <p role="alert" className="error">Could not load products.</p>}
      {data && data.content.length === 0 && <p className="muted">No products found.</p>}
      {data && data.content.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.content.map((product) => (
                  <tr key={product.id} className={product.active ? undefined : 'inactive'}>
                    <td>{product.name}</td>
                    <td className="num">{formatPrice(product.price)}</td>
                    <td className="num">{product.stock}</td>
                    <td>{product.active ? 'Active' : <span className="badge">Removed</span>}</td>
                    <td className="actions">
                      <Link to={`/admin/products/${product.id}/edit`}>Edit</Link>
                      {product.active ? (
                        <button type="button" className="link danger" onClick={() => handleDelete(product)}>
                          Remove
                        </button>
                      ) : (
                        <button type="button" className="link" onClick={() => handleRestore(product)}>
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages}
            onChange={(p) => setParams({ ...(q ? { q } : {}), ...(p > 0 ? { page: String(p) } : {}) })} />
        </>
      )}
    </section>
  )
}
