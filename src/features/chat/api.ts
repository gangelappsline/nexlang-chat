import { apiClient } from '@/lib/api/client'
import type {
  Conversation,
  ConversationDetail,
  ConversationStatus,
  DirectoryPerson,
  Message,
  MessageAttachment,
} from '@/types'

export interface SendMessagePayload {
  body: string
  attachment?: MessageAttachment
}

export interface CreateConversationPayload {
  type: 'direct' | 'group'
  title?: string
  description?: string
  memberIds: string[]
}

export interface UpdateConversationPayload {
  pinned?: boolean
  muted?: boolean
  archived?: boolean
  status?: ConversationStatus
  tags?: string[]
  notes?: string
}

export const chatApi = {
  list: () => apiClient.get<Conversation[]>('/conversations'),

  detail: (id: string) => apiClient.get<ConversationDetail>(`/conversations/${id}`),

  messages: (id: string) => apiClient.get<Message[]>(`/conversations/${id}/messages`),

  send: (id: string, payload: SendMessagePayload) =>
    apiClient.post<Message>(`/conversations/${id}/messages`, payload),

  markRead: (id: string) => apiClient.post<Conversation>(`/conversations/${id}/read`),

  update: (id: string, payload: UpdateConversationPayload) =>
    apiClient.patch<Conversation>(`/conversations/${id}`, payload),

  create: (payload: CreateConversationPayload) =>
    apiClient.post<Conversation>('/conversations', payload),

  directory: () => apiClient.get<DirectoryPerson[]>('/directory'),
}
