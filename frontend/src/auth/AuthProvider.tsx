import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { getToken, onUnauthorized, setToken } from '../api/client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    onUnauthorized(logout)
    return () => onUnauthorized(null)
  }, [logout])

  // Restore the session from a stored token.
  useEffect(() => {
    if (!getToken()) return
    authApi
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  const accept = useCallback((response: AuthResponse) => {
    setToken(response.token)
    setUser(response.user)
    return response.user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: (request: LoginRequest) => authApi.login(request).then(accept),
      register: (request: RegisterRequest) => authApi.register(request).then(accept),
      logout,
    }),
    [user, loading, accept, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
