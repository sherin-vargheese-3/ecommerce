import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { FormField } from '../components/FormField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type Errors = Partial<Record<'name' | 'email' | 'password', string>>

function validate(name: string, email: string, password: string): Errors {
  const errors: Errors = {}
  if (!name.trim()) errors.name = 'Name is required'
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  return errors
}

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const clientErrors = validate(name, email, password)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      await register({ name, email, password })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors({ email: 'This email is already registered' })
      else if (err instanceof ApiError && err.status === 400) setErrors(err.fieldErrors)
      else if (err instanceof ApiError && err.status === 0) setFormError(err.message)
      else setFormError('Registration failed, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Create account</h1>
      {formError && <p role="alert" className="error">{formError}</p>}
      <FormField label="Name" name="name" autoComplete="name" value={name}
        onChange={(e) => setName(e.target.value)} error={errors.name} />
      <FormField label="Email" name="email" type="email" autoComplete="email" value={email}
        onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password" value={password}
        onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <button type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Register'}</button>
      <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
    </form>
  )
}
