import { API_BASE_URL } from '@/lib/api/client'
import { firstName } from '@/lib/format'
import type { ChatUser, Conversation, LastMessage, Message } from '@/types'

/**
 * Normalización de las respuestas de `/v1/chat/*`.
 *
 * La API envuelve los datos en `{ success, data, message }`, así que aquí se
 * acepta tanto `data` como la respuesta plana. También se toleran variantes de
 * nombres de campo (`latest_message` / `last_message`, `message` / `body`) para
 * que un cambio menor en el backend no rompa el panel.
 */

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown): Json | null => (isRecord(value) ? value : null)

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const str = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

const num = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

/** Origen del backend, para completar rutas relativas de archivos (`/storage/...`). */
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin
  } catch {
    return ''
  }
})()

function toAbsoluteUrl(value: unknown): string | null {
  const raw = str(value)
  if (!raw) return null
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  if (raw.startsWith('/') && API_ORIGIN) return `${API_ORIGIN}${raw}`
  return raw
}

/* -------------------------------------------------------------------------- */
/* Listas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Extrae el arreglo de elementos de una respuesta.
 * Soporta `[...]`, `{ data: [...] }` y `{ data: { data: [...] } }` (paginado).
 */
export function unwrapList(payload: unknown, keys: string[] = []): Json[] {
  const push = (value: unknown, result: Json[], depth = 0) => {
    if (depth > 4) return
    if (Array.isArray(value)) {
      for (const item of value) {
        const record = asRecord(item)
        if (record) result.push(record)
      }
      return
    }

    const record = asRecord(value)
    if (!record) return

    for (const key of keys) {
      if (key in record) {
        push(record[key], result, depth + 1)
        if (result.length > 0) return
      }
    }

    if ('data' in record) push(record.data, result, depth + 1)
  }

  const result: Json[] = []
  push(payload, result)
  return result
}

/** Extrae un objeto único de `{ data: {...} }` (o `{ data: { conversation } }`). */
export function unwrapItem(payload: unknown, keys: string[] = []): Json | null {
  const record = asRecord(payload)
  if (!record) return null

  const fromData = (value: unknown, depth = 0): Json | null => {
    if (depth > 4) return null
    const candidate = asRecord(value)
    if (!candidate) {
      const first = asArray(value).map(asRecord).find(Boolean)
      return first ?? null
    }
    for (const key of keys) {
      const nested = asRecord(candidate[key])
      if (nested) return nested
    }
    for (const key of keys) {
      const nested = asRecord(asRecord(candidate.data)?.[key])
      if (nested) return nested
    }
    return candidate
  }

  if ('data' in record) {
    const unwrapped = fromData(record.data)
    if (unwrapped) return unwrapped
  }

  for (const key of keys) {
    const nested = asRecord(record[key])
    if (nested) return nested
  }

  return 'id' in record ? record : null
}

/* -------------------------------------------------------------------------- */
/* Modelos                                                                    */
/* -------------------------------------------------------------------------- */

export function toChatUser(raw: unknown): ChatUser | null {
  const record = asRecord(raw)
  if (!record) return null

  const id = str(record.id)
  if (!id) return null

  const email = str(record.email)
  const name =
    str(record.name) ||
    str(record.full_name) ||
    (email ? email.split('@')[0] : '') ||
    `Usuario ${id}`

  return {
    id,
    name,
    email,
    photoUrl: toAbsoluteUrl(
      record.photo ?? record.photo_url ?? record.avatar ?? record.profile_photo_url,
    ),
  }
}

function toParticipants(raw: unknown): ChatUser[] {
  return asArray(raw)
    .map(toChatUser)
    .filter((user): user is ChatUser => Boolean(user))
}

function uniqueUsers(users: ChatUser[]): ChatUser[] {
  const seen = new Set<string>()
  return users.filter((user) => {
    if (seen.has(user.id)) return false
    seen.add(user.id)
    return true
  })
}

function toLastMessage(raw: unknown): LastMessage | null {
  const record = asRecord(raw)
  if (!record) return null

  const body = str(record.message) || str(record.body) || str(record.content)
  const author = toChatUser(record.user ?? record.author)

  return {
    id: str(record.id) || `${str(record.conversation_id)}-${str(record.created_at)}`,
    authorId: author?.id ?? '',
    authorName: author?.name ?? '',
    body,
    createdAt: str(record.created_at) || str(record.updated_at),
  }
}

function directTitle(others: ChatUser[]): string {
  if (others.length === 0) return 'Conversación'
  return others[0].name
}

function groupTitle(others: ChatUser[]): string {
  const names = others.slice(0, 3).map((user) => firstName(user.name))
  const rest = others.length - names.length
  if (names.length === 0) return 'Grupo'
  return rest > 0 ? `${names.join(', ')} +${rest}` : names.join(', ')
}

export function toConversation(raw: unknown, currentUserId?: string | null): Conversation | null {
  const record = asRecord(raw)
  if (!record) return null

  const id = str(record.id)
  if (!id) return null

  const createdBy = toChatUser(record.created_by)
  const participants = uniqueUsers(
    toParticipants(record.participants).concat(createdBy ? [createdBy] : []),
  )
  const others = participants.filter((user) => user.id !== currentUserId)

  const type = str(record.type).toLowerCase() === 'group' ? 'group' : 'direct'
  const explicitName = str(record.name)
  const title =
    explicitName || (type === 'group' ? groupTitle(others) : directTitle(others))

  const lastMessage = toLastMessage(record.latest_message ?? record.last_message)

  const createdAt = str(record.created_at)
  const updatedAt = str(record.updated_at) || lastMessage?.createdAt || createdAt

  return {
    id,
    type,
    title,
    participants,
    participantCount: num(record.participant_count) || participants.length,
    createdById: createdBy?.id ?? null,
    unreadCount: Math.max(0, num(record.unread_count)),
    lastMessage,
    createdAt,
    updatedAt,
  }
}

export function toConversationList(payload: unknown, currentUserId?: string | null): Conversation[] {
  return unwrapList(payload, ['conversations'])
    .map((item) => toConversation(item, currentUserId))
    .filter((item): item is Conversation => Boolean(item))
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )
}

export function toUserList(payload: unknown, currentUserId?: string | null): ChatUser[] {
  const seen = new Set<string>()

  return unwrapList(payload, ['users'])
    .map(toChatUser)
    .filter((user): user is ChatUser => Boolean(user))
    .filter((user) => {
      if (currentUserId && user.id === currentUserId) return false
      if (seen.has(user.id)) return false
      seen.add(user.id)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function toMessage(raw: unknown, conversationId: string): Message | null {
  const record = asRecord(raw)
  if (!record) return null

  const author = toChatUser(record.user ?? record.author)
  const body = str(record.message) || str(record.body) || str(record.content)
  const id = str(record.id) || `local-${str(record.created_at)}-${body.slice(0, 8)}`

  if (!body) return null

  return {
    id,
    conversationId: str(record.conversation_id) || conversationId,
    authorId: author?.id ?? str(record.user_id),
    authorName: author?.name ?? '',
    authorPhotoUrl: author?.photoUrl ?? null,
    body,
    kind: str(record.type).toLowerCase() === 'system' ? 'system' : 'text',
    createdAt: str(record.created_at) || str(record.updated_at) || new Date().toISOString(),
    status: 'sent',
  }
}

export function toMessageList(payload: unknown, conversationId: string): Message[] {
  return unwrapList(payload, ['messages'])
    .map((item) => toMessage(item, conversationId))
    .filter((item): item is Message => Boolean(item))
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}
