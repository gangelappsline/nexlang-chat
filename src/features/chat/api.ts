import { apiClient } from '@/lib/api/client'
import { API_PATHS } from '@/lib/api/endpoints'
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
  list: () => apiClient.get<Conversation[]>(API_PATHS.conversations),

  detail: (id: string) => apiClient.get<ConversationDetail>(`${API_PATHS.conversations}/${id}`),

  messages: (id: string) => apiClient.get<Message[]>(`${API_PATHS.conversations}/${id}/messages`),

  send: (id: string, payload: SendMessagePayload) =>
    apiClient.post<Message>(`${API_PATHS.conversations}/${id}/messages`, payload),

  markRead: (id: string) => apiClient.post<Conversation>(`${API_PATHS.conversations}/${id}/read`),

  update: (id: string, payload: UpdateConversationPayload) =>
    apiClient.patch<Conversation>(`${API_PATHS.conversations}/${id}`, payload),

  create: (payload: CreateConversationPayload) =>
    apiClient.post<Conversation>(API_PATHS.conversations, payload),

  directory: () => apiClient.get<DirectoryPerson[]>(API_PATHS.directory),
}
