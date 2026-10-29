import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authService } from './api'
import { useSessionStore } from './session'

export function useRequestLoginCode() {
  return useMutation({
    mutationFn: (email: string) => authService.requestLoginCode(email),
  })
}

/** Reenviar el código usa el mismo endpoint del paso 1. */
export function useResendLoginCode() {
  return useMutation({
    mutationFn: (email: string) => authService.requestLoginCode(email),
  })
}

export function useVerifyLoginCode() {
  const setSession = useSessionStore((state) => state.setSession)

  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authService.verifyLoginCode(email, code),
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function useLogout() {
  const clearSession = useSessionStore((state) => state.clearSession)
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSession()
      client.clear()
    },
  })
}
