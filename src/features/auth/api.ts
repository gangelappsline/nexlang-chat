import { apiClient } from '@/lib/api/client'
import { API_PATHS } from '@/lib/api/endpoints'
import { ApiError } from '@/lib/api/errors'
import type { AuthUser, Presence, SessionPayload } from '@/types'

/**
 * Servicio de autenticación de Nexlang Chat.
 *
 * Endpoint único: `POST ${VITE_BASE_API_URL}/v1/chat/login-code`
 *
 * 1. `requestLoginCode(email)`  → `{ email }`            → envía el código al correo.
 * 2. `verifyLoginCode(email, code)` → `{ email, code }`  → valida y devuelve token + usuario.
 *
 * La respuesta se normaliza porque distintas implementaciones devuelven el token
 * como `token`, `accessToken`, `access_token` o `jwt`, y el usuario dentro de
 * `user`, `usuario` o `profile` (incluso anidado en `data`).
 */

export interface LoginCodeChallenge {
  email: string
  challengeId?: string
  expiresAt?: string
  /** Segundos antes de permitir reenviar el código. */
  resendAfterSeconds: number
}

const DEFAULT_RESEND_SECONDS = 30
const DEFAULT_SESSION_HOURS = 8

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Aplana `{ data: {...} }` / `{ result: {...} }` sobre el objeto raíz. */
function unwrap(payload: unknown): JsonObject {
  if (!isObject(payload)) return {}
  const nested = [payload.data, payload.result, payload.payload].find(isObject)
  return { ...payload, ...(nested ?? {}) }
}

function pickString(source: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function pickNumber(source: JsonObject, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }
  return undefined
}

/** Lee el `exp` de un JWT (si el token lo es). */
function readJwtExpiry(token: string): string | undefined {
  const [, payload] = token.split('.')
  if (!payload) return undefined
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded: unknown = JSON.parse(atob(padded))
    if (!isObject(decoded) || typeof decoded.exp !== 'number') return undefined
    return new Date(decoded.exp * 1000).toISOString()
  } catch {
    return undefined
  }
}

const titleCase = (value: string) =>
  value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const PRESENCE: Presence[] = ['online', 'away', 'offline']

function normalizeUser(raw: JsonObject, email: string): AuthUser {
  const emailValue = pickString(raw, ['email', 'correo', 'mail']) ?? email
  const username =
    pickString(raw, ['username', 'userName', 'usuario', 'nickname']) ??
    emailValue.split('@')[0] ??
    'usuario'

  const name =
    pickString(raw, [
      'name',
      'fullName',
      'full_name',
      'displayName',
      'display_name',
      'nombre',
    ]) ?? (titleCase(username) || 'Miembro Nexlang')

  const presenceValue = pickString(raw, ['presence', 'status'])
  const presence =
    presenceValue && PRESENCE.includes(presenceValue as Presence)
      ? (presenceValue as Presence)
      : 'online'

  return {
    id: pickString(raw, ['id', '_id', 'uuid', 'userId', 'user_id']) ?? emailValue,
    name,
    email: emailValue,
    username,
    role: pickString(raw, ['role', 'rol']) ?? 'member',
    title: pickString(raw, ['title', 'jobTitle', 'job_title', 'position']) ?? 'Miembro del equipo',
    workspace: pickString(raw, ['workspace', 'company', 'organization', 'organizationName']) ?? 'Nexlang',
    avatarUrl:
      pickString(raw, ['avatarUrl', 'avatar_url', 'avatar', 'picture', 'image']) ?? null,
    presence,
  }
}

/** Normaliza la respuesta del paso 1 (código enviado). */
export function parseLoginCodeResponse(payload: unknown, email: string): LoginCodeChallenge {
  const data = unwrap(payload)
  const rawSeconds = pickNumber(data, [
    'resendAfterSeconds',
    'resend_after_seconds',
    'cooldown',
    'cooldownSeconds',
    'retryAfter',
  ])

  return {
    email,
    challengeId: pickString(data, [
      'challengeId',
      'challenge_id',
      'requestId',
      'request_id',
      'tokenId',
      'token_id',
    ]),
    expiresAt: pickString(data, ['expiresAt', 'expires_at', 'codeExpiresAt']),
    resendAfterSeconds: Math.min(300, Math.max(0, Math.round(rawSeconds ?? DEFAULT_RESEND_SECONDS))),
  }
}

/** Normaliza la respuesta del paso 2 a una sesión utilizable. */
export function parseLoginSessionResponse(payload: unknown, email: string): SessionPayload {
  const data = unwrap(payload)

  const accessToken = pickString(data, [
    'accessToken',
    'access_token',
    'token',
    'jwt',
    'authToken',
    'auth_token',
    'bearer',
  ])

  if (!accessToken) {
    throw new ApiError('La API no devolvió un token de acceso. Revisa la respuesta del login.', {
      status: 502,
      code: 'invalid_response',
    })
  }

  const rawUser = [data.user, data.usuario, data.profile, data.account].find(isObject) ?? {}
  const expiresAt =
    pickString(data, ['expiresAt', 'expires_at', 'tokenExpiresAt']) ??
    readJwtExpiry(accessToken) ??
    new Date(Date.now() + DEFAULT_SESSION_HOURS * 60 * 60 * 1000).toISOString()

  return {
    accessToken,
    refreshToken:
      pickString(data, ['refreshToken', 'refresh_token', 'refresh']) ?? '',
    expiresAt,
    user: normalizeUser(rawUser, email),
  }
}

export const authService = {
  /** Paso 1 · solicita (o reenvía) el código de acceso al correo. */
  async requestLoginCode(email: string): Promise<LoginCodeChallenge> {
    const payload = await apiClient.post<unknown>(
      API_PATHS.loginCode,
      { email },
      { auth: false },
    )
    return parseLoginCodeResponse(payload, email)
  },

  /** Paso 2 · valida el código y devuelve la sesión. */
  async verifyLoginCode(email: string, code: string): Promise<SessionPayload> {
    const payload = await apiClient.post<unknown>(
      API_PATHS.loginCode,
      { email, code },
      { auth: false },
    )
    return parseLoginSessionResponse(payload, email)
  },

  async logout(): Promise<void> {
    await apiClient.post<unknown>(API_PATHS.logout)
  },
}
