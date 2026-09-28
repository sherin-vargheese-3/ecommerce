import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { productsApi } from '../api/products'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const SORTS = [
  { value: '', label: 'Newest' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'name,asc', label: 'Name' },
]

export function ProductListPage() {
  useDocumentTitle(undefined)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? ''
  const page = Number(params.get('page') ?? 0)
  const [search, setSearch] = useState(q)

  const { data, error, loading } = useAsync(() => productsApi.browse({ q, sort, page }), [q, sort, page])

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    update({ q: search.trim(), page: '' })
  }

  return (
    <section>
      <div className="page-header">
        <h1>Products</h1>
        <form className="toolbar" role="search" onSubmit={handleSearch}>
          <input type="search" aria-label="Search products" placeholder="Search products"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit">Search</button>
          <select aria-label="Sort by" value={sort} onChange={(e) => update({ sort: e.target.value, page: '' })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </form>
      </div>

      {loading && !data && <p className="muted">Loading products…</p>}
      {error && <p role="alert" className="error">Could not load products.</p>}
      {data && data.content.length === 0 && (
        <p className="muted">{q ? `No products match “${q}”.` : 'No products available yet.'}</p>
      )}
      {data && data.content.length > 0 && (
        <>
          <div className="product-grid">
            {data.content.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages}
            onChange={(p) => update({ page: p > 0 ? String(p) : '' })} />
        </>
      )}
    </section>
  )
}
