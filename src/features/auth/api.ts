import { apiClient } from '@/lib/api/client'
import type { AuthUser, CodeChallenge, SessionPayload } from '@/types'

export const authApi = {
  requestCode: (identifier: string) =>
    apiClient.post<CodeChallenge>('/auth/request-code', { identifier }, { auth: false }),

  resendCode: (challengeId: string) =>
    apiClient.post<CodeChallenge>('/auth/resend-code', { challengeId }, { auth: false }),

  verifyCode: (challengeId: string, code: string) =>
    apiClient.post<SessionPayload>('/auth/verify-code', { challengeId, code }, { auth: false }),

  me: () => apiClient.get<AuthUser>('/auth/me'),

  logout: () => apiClient.post<{ ok: boolean }>('/auth/logout'),
}
