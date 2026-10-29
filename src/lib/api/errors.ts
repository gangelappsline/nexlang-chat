import type { ApiFieldErrors } from '@/types'

export interface ApiErrorOptions {
  status?: number
  code?: string
  fieldErrors?: ApiFieldErrors
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: ApiFieldErrors

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 500
    this.code = options.code ?? 'internal_error'
    this.fieldErrors = options.fieldErrors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function getFieldErrors(error: unknown): ApiFieldErrors | undefined {
  return isApiError(error) ? error.fieldErrors : undefined
}
