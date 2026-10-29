import { firstName } from '@/lib/format'
import type { Conversation } from '@/types'

/** Conversaciones ordenadas por actividad (la más reciente primero). */
export function sortConversations(list: Conversation[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime(),
  )
}

/** Texto de vista previa: siempre el último mensaje de la conversación. */
export function conversationPreview(conversation: Conversation, currentUserId?: string | null) {
  const last = conversation.lastMessage
  if (!last || !last.body) return 'Sin mensajes todavía'

  if (currentUserId && last.authorId === currentUserId) return `Tú: ${last.body}`
  if (conversation.type === 'group' && last.authorName) {
    return `${firstName(last.authorName)}: ${last.body}`
  }
  return last.body
}

export type InboxFilter = 'all' | 'unread' | 'groups'

export function filterConversations(
  list: Conversation[],
  { filter, query }: { filter: InboxFilter; query: string },
) {
  const needle = query.trim().toLowerCase()

  return sortConversations(
    list.filter((conversation) => {
      if (filter === 'unread' && conversation.unreadCount === 0) return false
      if (filter === 'groups' && conversation.type !== 'group') return false

      if (!needle) return true

      return (
        conversation.title.toLowerCase().includes(needle) ||
        conversation.lastMessage?.body.toLowerCase().includes(needle) ||
        conversation.lastMessage?.authorName.toLowerCase().includes(needle) ||
        conversation.participants.some(
          (participant) =>
            participant.name.toLowerCase().includes(needle) ||
            participant.email.toLowerCase().includes(needle),
        )
      )
    }),
  )
}

export function countUnread(list: Conversation[]) {
  return list.reduce((total, conversation) => total + conversation.unreadCount, 0)
}

/** Los demás participantes (sin el usuario actual) de una conversación. */
export function otherParticipants(conversation: Conversation, currentUserId?: string | null) {
  const others = conversation.participants.filter(
    (participant) => participant.id !== currentUserId,
  )
  return others.length > 0 ? others : conversation.participants
}
