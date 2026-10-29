import { apiRequest } from '@/lib/api/http'
import type { AuthUser, CodeChallenge, SessionPayload } from '@/types'

export const authApi = {
  requestCode: (identifier: string) =>
    apiRequest<CodeChallenge>('/auth/request-code', {
      method: 'POST',
      auth: false,
      body: { identifier },
    }),

  resendCode: (challengeId: string) =>
    apiRequest<CodeChallenge>('/auth/resend-code', {
      method: 'POST',
      auth: false,
      body: { challengeId },
    }),

  verifyCode: (challengeId: string, code: string) =>
    apiRequest<SessionPayload>('/auth/verify-code', {
      method: 'POST',
      auth: false,
      body: { challengeId, code },
    }),

  me: () => apiRequest<AuthUser>('/auth/me'),

  logout: () => apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
}
