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
  /** Listado y creación de conversaciones. */
  conversations: '/v1/chat/conversations',
  conversation: (id: string) => `/v1/chat/conversations/${encodeURIComponent(id)}`,
  /** Mensajes de una conversación (GET para listar, POST para enviar). */
  messages: (id: string) => `/v1/chat/conversations/${encodeURIComponent(id)}/messages`,
  /** Marca la conversación como leída. */
  read: (id: string) => `/v1/chat/conversations/${encodeURIComponent(id)}/read`,
  /** Usuarios disponibles para iniciar una conversación (sin el usuario logueado). */
  users: '/v1/chat/users',
} as const
