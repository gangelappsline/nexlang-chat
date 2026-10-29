import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

import { setAuthTokenProvider, setUnauthorizedHandler } from '@/lib/api/client'
import { SESSION_STORAGE_KEY } from '@/lib/constants'
import { queryClient } from '@/lib/query-client'
import {
  readRawSession,
  removeRawSession,
  setSessionStorageMode,
  writeRawSession,
} from '@/lib/session-storage'
import type { AuthUser, SessionPayload } from '@/types'

export { SESSION_STORAGE_KEY }

export interface SetSessionOptions {
  /** `true` conserva la sesión en localStorage; por defecto solo en la pestaña. */
  remember?: boolean
}

export interface SessionState {
  accessToken: string | null
  tokenType: string
  refreshToken: string | null
  /** `null` cuando la API no informa caducidad (p. ej. tokens Sanctum). */
  expiresAt: string | null
  user: AuthUser | null
  setSession: (session: SessionPayload, options?: SetSessionOptions) => void
  updateUser: (user: AuthUser) => void
  clearSession: () => void
}

/** Guarda la sesión en sessionStorage o localStorage según "recordarme". */
const sessionStateStorage: StateStorage = {
  getItem: () => readRawSession(SESSION_STORAGE_KEY),
  setItem: (_name, value) => writeRawSession(SESSION_STORAGE_KEY, value),
  removeItem: () => removeRawSession(SESSION_STORAGE_KEY),
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenType: 'Bearer',
      refreshToken: null,
      expiresAt: null,
      user: null,
      setSession: (session, options) => {
        setSessionStorageMode(options?.remember ? 'local' : 'session')
        set({
          accessToken: session.accessToken,
          tokenType: session.tokenType ?? 'Bearer',
          refreshToken: session.refreshToken ?? null,
          expiresAt: session.expiresAt ?? null,
          user: session.user,
        })
      },
      updateUser: (user) => set({ user }),
      clearSession: () => {
        set({
          accessToken: null,
          tokenType: 'Bearer',
          refreshToken: null,
          expiresAt: null,
          user: null,
        })
        // Elimina el snapshot persistido de ambos almacenes.
        removeRawSession(SESSION_STORAGE_KEY)
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => sessionStateStorage),
      partialize: ({ accessToken, tokenType, refreshToken, expiresAt, user }) => ({
        accessToken,
        tokenType,
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
export function hasValidSession(
  state: Pick<SessionState, 'accessToken' | 'user' | 'expiresAt'>,
) {
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
