import type { Conversation } from '@/types'

/**
 * Marca local de "última conversación leída".
 *
 * La API solo entrega `unread_count`; para que el contador no vuelva a aparecer
 * al refrescar la lista, se guarda el id del último mensaje leído por
 * conversación. Si llega un mensaje nuevo (otro `latest_message.id`), el badge
 * de no leídos vuelve a mostrarse.
 */
const STORAGE_KEY = 'nexlang.chat.read-marks'

type ReadMarks = Record<string, string>

let cache: ReadMarks | null = null

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function load(): ReadMarks {
  if (cache) return cache

  cache = {}
  if (!hasStorage()) return cache

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const mark = typeof value === 'string' ? value : ''
        if (key && mark) cache[key] = mark
      }
    }
  } catch {
    cache = {}
  }

  return cache
}

function persist(marks: ReadMarks) {
  cache = marks
  if (!hasStorage()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(marks))
  } catch {
    // almacenamiento lleno o bloqueado: se mantiene solo en memoria
  }
}

/** Último mensaje leído registrado para la conversación. */
export function getReadMark(conversationId: string): string | null {
  return load()[conversationId] ?? null
}

/** Registra la conversación como leída hasta su último mensaje. */
export function setReadMark(conversationId: string, lastMessageId: string | null) {
  const marks = { ...load() }
  const next = lastMessageId ?? '0'

  if (marks[conversationId] === next) return
  marks[conversationId] = next
  persist(marks)
}

/** Aplica las marcas locales sobre la lista que devuelve la API. */
export function applyReadMarks(list: Conversation[]): Conversation[] {
  const marks = load()

  return list.map((conversation) => {
    const mark = marks[conversation.id]
    if (!mark || conversation.unreadCount === 0) return conversation

    const lastId = conversation.lastMessage?.id ?? '0'
    return mark === lastId ? { ...conversation, unreadCount: 0 } : conversation
  })
}

export function clearReadMarks() {
  cache = {}
  if (!hasStorage()) return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // sin acceso al almacenamiento
  }
}
