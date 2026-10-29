import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Conversation, ConversationDetail, Message } from '@/types'

import {
  chatApi,
  type CreateConversationPayload,
  type SendMessagePayload,
  type UpdateConversationPayload,
} from './api'

export const chatKeys = {
  all: ['chat'] as const,
  list: () => ['chat', 'conversations'] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  directory: () => ['chat', 'directory'] as const,
}

/* ------------------------------------------------------------------ */
/* queries                                                            */
/* ------------------------------------------------------------------ */

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: chatApi.list,
    staleTime: 15_000,
  })
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(id ?? 'none'),
    queryFn: () => chatApi.detail(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

export function useDirectory(enabled = true) {
  return useQuery({
    queryKey: chatKeys.directory(),
    queryFn: chatApi.directory,
    staleTime: 5 * 60_000,
    enabled,
  })
}

/* ------------------------------------------------------------------ */
/* mutations                                                          */
/* ------------------------------------------------------------------ */

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const key = chatKeys.conversation(conversationId)

  return useMutation({
    mutationFn: (payload: SendMessagePayload) => chatApi.send(conversationId, payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ConversationDetail>(key)
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        role: 'agent',
        authorId: 'me',
        authorName: 'Tú',
        body: payload.body,
        createdAt: new Date().toISOString(),
        status: 'sending',
        kind: 'text',
        attachment: payload.attachment ?? null,
      }

      queryClient.setQueryData<ConversationDetail>(key, (old) =>
        old ? { ...old, messages: [...old.messages, optimistic] } : old,
      )

      return { previous, optimisticId: optimistic.id }
    },

    onError: (_error, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },

    onSuccess: (message, _payload, context) => {
      queryClient.setQueryData<ConversationDetail>(key, (old) =>
        old
          ? {
              ...old,
              messages: [
                ...old.messages.filter((item) => item.id !== context?.optimisticId),
                message,
              ],
            }
          : old,
      )
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() })
    },
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => chatApi.markRead(id),
    onMutate: (id) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) =>
        old?.map((conversation) =>
          conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      )
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() })
    },
  })
}

export function useUpdateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateConversationPayload }) =>
      chatApi.update(id, patch),

    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) =>
        old?.map((item) => (item.id === conversation.id ? conversation : item)),
      )
      queryClient.setQueryData<ConversationDetail>(
        chatKeys.conversation(conversation.id),
        (old) => (old ? { ...old, conversation } : old),
      )
    },
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateConversationPayload) => chatApi.create(payload),
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) =>
        old ? [conversation, ...old] : [conversation],
      )
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() })
    },
  })
}
