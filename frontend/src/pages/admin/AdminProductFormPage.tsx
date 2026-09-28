import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { adminProductsApi } from '../../api/products'
import { FormField } from '../../components/FormField'
import type { ProductRequest } from '../../types/product'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

interface FormState {
  name: string
  description: string
  price: string
  stock: string
  imageUrl: string
  active: boolean
}

type Errors = Partial<Record<keyof FormState, string>>

const EMPTY: FormState = { name: '', description: '', price: '', stock: '0', imageUrl: '', active: true }

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
    errors.price = 'Enter a price of 0 or more'
  } else if (!/^\d+(\.\d{1,2})?$/.test(form.price.trim())) {
    errors.price = 'Use at most 2 decimal places'
  }
  if (!/^\d+$/.test(form.stock.trim())) errors.stock = 'Enter a whole number of 0 or more'
  if (form.imageUrl.trim() && !/^https?:\/\/\S+$/.test(form.imageUrl.trim())) {
    errors.imageUrl = 'Must be an http(s) URL'
  }
  return errors
}

function toRequest(form: FormState): ProductRequest {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    stock: Number(form.stock),
    imageUrl: form.imageUrl.trim() || null,
    active: form.active,
  }
}

export function AdminProductFormPage() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  useDocumentTitle(isEdit ? 'Edit product' : 'New product')

  useEffect(() => {
    if (!id) return
    adminProductsApi
      .get(id)
      .then((p) =>
        setForm({
          name: p.name,
          description: p.description ?? '',
          price: p.price.toFixed(2),
          stock: String(p.stock),
          imageUrl: p.imageUrl ?? '',
          active: p.active,
        }),
      )
      .catch(() => setFormError('Could not load this product.'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (field: keyof FormState) => (value: string | boolean) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      if (isEdit) await adminProductsApi.update(id, toRequest(form))
      else await adminProductsApi.create(toRequest(form))
      navigate('/admin/products')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setErrors(err.fieldErrors)
      else setFormError('Could not save the product, please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <form className="card product-form" onSubmit={handleSubmit} noValidate>
      <h1>{isEdit ? 'Edit product' : 'New product'}</h1>
      {formError && <p role="alert" className="error">{formError}</p>}
      <FormField label="Name" name="name" value={form.name} error={errors.name}
        onChange={(e) => set('name')(e.target.value)} />
      <label className="field">
        <span>Description</span>
        <textarea name="description" rows={4} value={form.description}
          onChange={(e) => set('description')(e.target.value)} />
      </label>
      <div className="field-row">
        <FormField label="Price" name="price" inputMode="decimal" value={form.price} error={errors.price}
          onChange={(e) => set('price')(e.target.value)} />
        <FormField label="Stock" name="stock" inputMode="numeric" value={form.stock} error={errors.stock}
          onChange={(e) => set('stock')(e.target.value)} />
      </div>
      <FormField label="Image URL" name="imageUrl" type="url" value={form.imageUrl} error={errors.imageUrl}
        onChange={(e) => set('imageUrl')(e.target.value)} />
      <label className="checkbox">
        <input type="checkbox" checked={form.active} onChange={(e) => set('active')(e.target.checked)} />
        <span>Visible in catalog</span>
      </label>
      <div className="form-actions">
        <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save product'}</button>
        <Link to="/admin/products">Cancel</Link>
      </div>
    </form>
  )
}
