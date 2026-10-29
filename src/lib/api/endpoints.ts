/**
 * Rutas de la API, centralizadas para poder ajustarlas en un solo lugar.
 * Siempre se concatenan a `VITE_BASE_API_URL` (ver `lib/api/client.ts`).
 */
export const API_PATHS = {
  /** Login sin contraseña · paso 1: envía el código al correo. */
  loginCode: '/v1/chat/login-code',
  /** Login sin contraseña · paso 2: valida el código y devuelve el token. */
  loginValidation: '/v1/chat/login-validation',
  logout: '/v1/chat/logout',
  conversations: '/v1/chat/conversations',
  directory: '/v1/chat/directory',
} as const
