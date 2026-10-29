import { SESSION_STORAGE_KEY } from '../constants'
import { readRawSession } from '../session-storage'
import { ApiError } from './errors'

/* -------------------------------------------------------------------------- */
/* Configuración (leída de los archivos .env de cada modo)                     */
/* -------------------------------------------------------------------------- */

const trimBase = (value: string | undefined) => (value ?? '').trim().replace(/\/+$/, '')

/**
 * Base de todas las peticiones.
 *
 * - `.env.development` → `VITE_BASE_API_URL=http://localhost:3000` (`npm run dev`)
 * - `.env.production`  → `VITE_BASE_API_URL=https://api.nexlang.io` (`npm run build`)
 *
 * Se mantiene `VITE_API_BASE_URL` como alias por compatibilidad.
 */
export const API_BASE_URL = trimBase(
  import.meta.env.VITE_BASE_API_URL ?? import.meta.env.VITE_API_BASE_URL,
)

/** Entorno activo: `development`, `staging`, `production`… */
export const APP_ENV = import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE

/** Tiempo máximo por petición (ms). */
export const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? 20_000)

/** Log de peticiones en consola. */
export const DEBUG_REQUESTS =
  import.meta.env.VITE_DEBUG_REQUESTS === 'true' || import.meta.env.DEV

if (import.meta.env.DEV) {
  console.info(
    `[api] entorno=${APP_ENV} · base=${API_BASE_URL || '(sin configurar)'} · timeout=${REQUEST_TIMEOUT_MS}ms`,
  )
}

/* -------------------------------------------------------------------------- */
/* Token / sesión                                                             */
/* -------------------------------------------------------------------------- */

type TokenProvider = () => string | null

let authTokenProvider: TokenProvider | null = null
let unauthorizedHandler: (() => void) | null = null

/** La app registra aquí el store de sesión (ver `features/auth/session.ts`). */
export function setAuthTokenProvider(provider: TokenProvider | null) {
  authTokenProvider = provider
}

/** Alias histórico. */
export const setAccessTokenProvider = setAuthTokenProvider

/** Se ejecuta ante un `401` para cerrar la sesión. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

interface PersistedSession {
  state?: {
    accessToken?: string | null
    tokenType?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
  }
  version?: number
}

/** Lee el snapshot persistido (sessionStorage primero, luego localStorage). */
function readPersistedSession(): PersistedSession['state'] | null {
  const raw = readRawSession(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PersistedSession
    return parsed?.state ?? null
  } catch {
    return null
  }
}

/**
 * Token guardado: primero consulta el store en memoria y, si aún no existe,
 * recupera la sesión persistida.
 */
export function getStoredAccessToken(): string | null {
  try {
    const token = authTokenProvider?.()
    if (token) return token
  } catch {
    // el provider puede fallar antes de hidratar: usamos el fallback
  }
  return readPersistedSession()?.accessToken ?? null
}

/** Esquema del token devuelto por la API (`Bearer` por defecto). */
export function getStoredTokenType(): string {
  const tokenType = readPersistedSession()?.tokenType
  return tokenType && tokenType.trim() ? tokenType.trim() : 'Bearer'
}

/** Cabecera `Authorization` completa, o `null` si no hay sesión. */
export function getStoredAuthorization(): string | null {
  const token = getStoredAccessToken()
  if (!token) return null
  return `${getStoredTokenType()} ${token}`
}

export function getStoredRefreshToken(): string | null {
  return readPersistedSession()?.refreshToken ?? null
}

export function isAuthenticatedInStorage(): boolean {
  return Boolean(getStoredAccessToken())
}

/* -------------------------------------------------------------------------- */
/* Cliente HTTP                                                               */
/* -------------------------------------------------------------------------- */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  /** Adjunta `Authorization: Bearer <token>` (por defecto `true`). */
  auth?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
  query?: QueryParams
}

function buildUrl(path: string, query?: QueryParams) {
  const isAbsolute = /^https?:\/\//i.test(path)
  const base = isAbsolute ? '' : API_BASE_URL
  const normalizedPath = path.startsWith('/') || !base ? path : `/${path}`
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return `${base}${normalizedPath}${suffix}`
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) {
    const text = await response.text().catch(() => '')
    return text || null
  }
  return response.json().catch(() => null)
}

function extractError(payload: unknown, status: number) {
  const data = (payload ?? {}) as {
    message?: string
    error?: string
    code?: string
    errors?: Record<string, string[]>
  }

  return new ApiError(data.message ?? data.error ?? 'La solicitud no pudo completarse.', {
    status,
    code: data.code,
    fieldErrors: data.errors,
  })
}

/**
 * Punto único de salida hacia la API.
 *
 * - Usa `VITE_BASE_API_URL` como base de la ruta.
 * - Envía `Authorization: Bearer <token>` si hay un token guardado.
 * - Normaliza errores en `ApiError` y cierra la sesión ante un 401.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    headers = {},
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    query,
  } = options

  const authorization = auth ? getStoredAuthorization() : null
  const url = buildUrl(path, query)
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', abortFromCaller, { once: true })
  }

  try {
    if (DEBUG_REQUESTS) {
      console.debug(`[api] ${method} ${url}`, { auth: Boolean(authorization) })
    }

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authorization ? { Authorization: authorization } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const payload = await parseBody(response)

    if (!response.ok) {
      if (response.status === 401 && auth) unauthorizedHandler?.()
      throw extractError(payload, response.status)
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (controller.signal.aborted) {
      if (signal?.aborted || isAbortError(error)) throw error
      throw new ApiError('La solicitud tardó demasiado. Inténtalo de nuevo.', {
        status: 408,
        code: 'timeout',
      })
    }

    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', {
      status: 0,
      code: 'network_error',
    })
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

/** Alias corto usado por los módulos de features. */
export const apiRequest = request

export const apiClient = {
  request,
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
