import { apiClient } from '@/lib/api/client'
import { API_PATHS } from '@/lib/api/endpoints'
import type { ChatUser, Conversation, Message } from '@/types'

import {
  toConversation,
  toConversationList,
  toMessage,
  toMessageList,
  toUserList,
  unwrapItem,
} from './mappers'

export interface CreateConversationInput {
  participantIds: string[]
  type: 'direct' | 'group'
  name?: string
}

export interface SendMessageInput {
  text: string
}

/**
 * Peticiones reales contra `/v1/chat`.
 *
 * Contrato asumido (ver README):
 * - `GET  /v1/chat/conversations`                     → `{ data: Conversation[] }`
 * - `POST /v1/chat/conversations`                     → `{ data: Conversation }`
 * - `GET  /v1/chat/conversations/{id}/messages`       → `{ data: Message[] }`
 * - `POST /v1/chat/conversations/{id}/messages`       → `{ data: Message }`
 * - `POST /v1/chat/conversations/{id}/read`           → 200/204
 * - `GET  /v1/chat/users`                             → `{ data: User[] }`
 */
export const chatApi = {
  conversations: async (currentUserId?: string | null): Promise<Conversation[]> =>
    toConversationList(await apiClient.get<unknown>(API_PATHS.conversations), currentUserId),

  users: async (currentUserId?: string | null): Promise<ChatUser[]> =>
    toUserList(await apiClient.get<unknown>(API_PATHS.users), currentUserId),

  messages: async (conversationId: string): Promise<Message[]> =>
    toMessageList(
      await apiClient.get<unknown>(API_PATHS.messages(conversationId)),
      conversationId,
    ),

  send: async (
    conversationId: string,
    { text }: SendMessageInput,
  ): Promise<Message | null> => {
    const payload = await apiClient.post<unknown>(API_PATHS.messages(conversationId), {
      message: text,
      type: 'text',
    })

    return toMessage(unwrapItem(payload, ['message']), conversationId)
  },

  create: async (
    { participantIds, type, name }: CreateConversationInput,
    currentUserId?: string | null,
  ): Promise<Conversation | null> => {
    const payload = await apiClient.post<unknown>(API_PATHS.conversations, {
      // La API espera ids numéricos; se envían como número cuando lo son.
      participants: participantIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id)),
      type: type === 'group' ? 'group' : 'private',
      ...(name ? { name } : {}),
    })

    return toConversation(unwrapItem(payload, ['conversation']), currentUserId)
  },

  /** Best-effort: si el endpoint no existe, el contador se limpia en local. */
  markRead: async (conversationId: string): Promise<void> => {
    await apiClient.post<unknown>(API_PATHS.read(conversationId), {})
  },
}
