import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import type { AuthUser } from '@/types'

import { authApi } from './api'
import { useSessionStore } from './session'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export function useRequestCode() {
  return useMutation({
    mutationFn: (identifier: string) => authApi.requestCode(identifier),
  })
}

export function useResendCode() {
  return useMutation({
    mutationFn: (challengeId: string) => authApi.resendCode(challengeId),
  })
}

export function useVerifyCode() {
  const setSession = useSessionStore((state) => state.setSession)

  return useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) =>
      authApi.verifyCode(challengeId, code),
    onSuccess: (session) => {
      setSession(session)
      queryClient.setQueryData(authKeys.me, session.user)
    },
  })
}

/** Validates the stored token against the API on boot. */
export function useSessionUser() {
  const user = useSessionStore((state) => state.user)
  const token = useSessionStore((state) => state.accessToken)
  const updateUser = useSessionStore((state) => state.updateUser)

  return useQuery<AuthUser>({
    queryKey: authKeys.me,
    queryFn: async () => {
      const fresh = await authApi.me()
      updateUser(fresh)
      return fresh
    },
    enabled: Boolean(token && user),
    staleTime: 5 * 60_000,
    retry: false,
    initialData: user ?? undefined,
  })
}

export function useLogout() {
  const clearSession = useSessionStore((state) => state.clearSession)
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession()
      client.clear()
    },
  })
}
