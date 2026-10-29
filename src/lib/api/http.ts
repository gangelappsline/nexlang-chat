import { mockRequest } from '@/mocks/api'

import { ApiError } from './errors'

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

/**
 * The app ships with a fully working demo backend (see `src/mocks`).
 * Point `VITE_API_BASE_URL` at a real API and set `VITE_USE_MOCK_API=false`
 * to switch the whole app over without touching a single component.
 */
export const API_BASE_URL = baseUrl
export const IS_DEMO_API = !baseUrl || import.meta.env.VITE_USE_MOCK_API !== 'false'

let accessTokenProvider: () => string | null = () => null
let unauthorizedHandler: (() => void) | null = null

export function setAccessTokenProvider(provider: () => string | null) {
  accessTokenProvider = provider
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  auth?: boolean
  headers?: Record<string, string>
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, auth = true, headers = {} } = options

  if (IS_DEMO_API) {
    return mockRequest<T>(path, {
      method,
      body,
      signal,
      token: auth ? accessTokenProvider() : null,
    })
  }

  const token = auth ? accessTokenProvider() : null

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', {
      status: 0,
      code: 'network_error',
    })
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const data = (payload ?? {}) as {
      message?: string
      code?: string
      errors?: Record<string, string[]>
    }

    if (response.status === 401 && auth) unauthorizedHandler?.()

    throw new ApiError(data.message ?? 'La solicitud no pudo completarse.', {
      status: response.status,
      code: data.code,
      fieldErrors: data.errors,
    })
  }

  return payload as T
}
