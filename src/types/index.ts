export type Presence = 'online' | 'away' | 'offline'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string
  role: string
  title: string
  workspace: string
  avatarUrl?: string | null
  presence: Presence
}

export interface SessionPayload {
  accessToken: string
  /** Esquema del token devuelto por la API (`Bearer` por defecto). */
  tokenType: string
  refreshToken: string | null
  /** `null` cuando la API no informa caducidad (tokens tipo Sanctum). */
  expiresAt: string | null
  user: AuthUser
}

/* -------------------------------------------------------------------------- */
/* Chat (modelo normalizado a partir de las respuestas de la API)             */
/* -------------------------------------------------------------------------- */

export interface ChatUser {
  id: string
  name: string
  email: string
  /** URL absoluta de la foto de perfil, o `null` si el usuario no tiene. */
  photoUrl: string | null
}

export interface LastMessage {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  title: string
  participants: ChatUser[]
  participantCount: number
  /** Usuario que inició la conversación (si la API lo informa). */
  createdById: string | null
  unreadCount: number
  lastMessage: LastMessage | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  authorId: string
  authorName: string
  authorPhotoUrl: string | null
  body: string
  kind: 'text' | 'system'
  createdAt: string
  /** `sending` solo existe en el mensaje optimista mientras viaja a la API. */
  status: 'sending' | 'sent' | 'failed'
}

export interface ApiFieldErrors {
  [field: string]: string[] | undefined
}
