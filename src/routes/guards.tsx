import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import {
  isSessionExpired,
  useIsAuthenticated,
  useSessionStore,
} from '@/features/auth/session'

/**
 * Protects the workspace: the panel can only be rendered when a valid token
 * **and** the user profile are stored in the session.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()
  const accessToken = useSessionStore((state) => state.accessToken)
  const expiresAt = useSessionStore((state) => state.expiresAt)
  const clearSession = useSessionStore((state) => state.clearSession)

  const expired = Boolean(accessToken) && isSessionExpired(expiresAt)

  useEffect(() => {
    if (expired) clearSession()
  }, [expired, clearSession])

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <>{children}</>
}

/** Keeps authenticated users away from the login screen. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}
