import { apiRequest } from '@/lib/api/http'
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
  list: () => apiRequest<Conversation[]>('/conversations'),

  detail: (id: string) => apiRequest<ConversationDetail>(`/conversations/${id}`),

  messages: (id: string) => apiRequest<Message[]>(`/conversations/${id}/messages`),

  send: (id: string, payload: SendMessagePayload) =>
    apiRequest<Message>(`/conversations/${id}/messages`, { method: 'POST', body: payload }),

  markRead: (id: string) =>
    apiRequest<Conversation>(`/conversations/${id}/read`, { method: 'POST' }),

  update: (id: string, payload: UpdateConversationPayload) =>
    apiRequest<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: payload }),

  create: (payload: CreateConversationPayload) =>
    apiRequest<Conversation>('/conversations', { method: 'POST', body: payload }),

  directory: () => apiRequest<DirectoryPerson[]>('/directory'),
}
