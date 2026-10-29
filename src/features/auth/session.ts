import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { setAuthTokenProvider, setUnauthorizedHandler } from '@/lib/api/client'
import { SESSION_STORAGE_KEY } from '@/lib/constants'
import { queryClient } from '@/lib/query-client'
import type { AuthUser, SessionPayload } from '@/types'

export { SESSION_STORAGE_KEY }

export interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  user: AuthUser | null
  setSession: (session: SessionPayload) => void
  updateUser: (user: AuthUser) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          user: session.user,
        }),
      updateUser: (user) => set({ user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, expiresAt: null, user: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 1,
      partialize: ({ accessToken, refreshToken, expiresAt, user }) => ({
        accessToken,
        refreshToken,
        expiresAt,
        user,
      }),
    },
  ),
)

export function isSessionExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false
  const timestamp = new Date(expiresAt).getTime()
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

/** A session is only usable when a token **and** the user profile are stored. */
export function hasValidSession(state: Pick<SessionState, 'accessToken' | 'user' | 'expiresAt'>) {
  return Boolean(state.accessToken && state.user) && !isSessionExpired(state.expiresAt)
}

export function useCurrentUser() {
  return useSessionStore((state) => state.user)
}

export function useIsAuthenticated() {
  return useSessionStore((state) => hasValidSession(state))
}

// Wire the HTTP layer to the session without creating an import cycle.
setAuthTokenProvider(() => useSessionStore.getState().accessToken)

setUnauthorizedHandler(() => {
  const state = useSessionStore.getState()
  if (!state.accessToken) return
  state.clearSession()
  queryClient.clear()
})
