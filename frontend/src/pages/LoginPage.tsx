import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { FormField } from '../components/FormField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function LoginPage() {
  useDocumentTitle('Log in')
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const destination = (role: string) => from ?? (role === 'ADMIN' ? '/admin' : '/')

  if (user) return <Navigate to={destination(user.role)} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedIn = await login({ email, password })
      navigate(destination(loggedIn.role), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Invalid email or password')
      else if (err instanceof ApiError && (err.status === 429 || err.status === 0)) setError(err.message)
      else setError('Login failed, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Log in</h1>
      {error && <p role="alert" className="error">{error}</p>}
      <FormField label="Email" name="email" type="email" autoComplete="email" required
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" required
        value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
      <p className="muted">No account? <Link to="/register">Register</Link></p>
    </form>
  )
}
