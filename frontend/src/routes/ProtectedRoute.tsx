import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../types/auth'

interface Props {
  /** When set, the user must also have this role. */
  role?: Role
}

export function ProtectedRoute({ role }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
