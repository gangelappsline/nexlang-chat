import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentUser } from '@/features/auth/session'
import type { Conversation, Message } from '@/types'

import { chatApi, type CreateConversationInput, type SendMessageInput } from './api'
import { applyReadMarks, setReadMark } from './read-state'

export const chatKeys = {
  all: ['chat'] as const,
  /** Prefijo de todas las listas (útil para invalidar sin conocer el usuario). */
  conversations: () => ['chat', 'conversations'] as const,
  conversationList: (userId: string | null) =>
    ['chat', 'conversations', userId ?? 'me'] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  users: (userId: string | null) => ['chat', 'users', userId ?? 'me'] as const,
}

/** La bandeja se refresca sola para reflejar mensajes y no leídos. */
const LIST_POLL_MS = 20_000
const THREAD_POLL_MS = 12_000

/* -------------------------------------------------------------------------- */
/* queries                                                                    */
/* -------------------------------------------------------------------------- */

export function useConversations() {
  const user = useCurrentUser()
  const userId = user?.id ?? null

  return useQuery({
    queryKey: chatKeys.conversationList(userId),
    queryFn: async () => applyReadMarks(await chatApi.conversations(userId)),
    staleTime: 10_000,
    refetchInterval: LIST_POLL_MS,
  })
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? 'none'),
    queryFn: () => chatApi.messages(conversationId as string),
    enabled: Boolean(conversationId),
    staleTime: 5_000,
    refetchInterval: THREAD_POLL_MS,
  })
}

export function useDirectory(enabled = true) {
  const user = useCurrentUser()
  const userId = user?.id ?? null

  return useQuery({
    queryKey: chatKeys.users(userId),
    queryFn: () => chatApi.users(userId),
    staleTime: 5 * 60_000,
    enabled,
  })
}

/* -------------------------------------------------------------------------- */
/* mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const key = chatKeys.messages(conversationId)

  return useMutation({
    mutationFn: (input: SendMessageInput) => chatApi.send(conversationId, input),

    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Message[]>(key)
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        authorId: user?.id ?? '',
        authorName: user?.name ?? 'Tú',
        authorPhotoUrl: user?.avatarUrl ?? null,
        body: text,
        kind: 'text',
        createdAt: new Date().toISOString(),
        status: 'sending',
      }

      queryClient.setQueryData<Message[]>(key, (old) => [...(old ?? []), optimistic])

      return { previous, optimisticId: optimistic.id }
    },

    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      else queryClient.setQueryData<Message[]>(key, (old) =>
        (old ?? []).filter((message) => message.id !== context?.optimisticId),
      )
    },

    onSuccess: (message, _input, context) => {
      if (!message) return
      queryClient.setQueryData<Message[]>(key, (old) =>
        (old ?? [])
          .filter((item) => item.id !== context?.optimisticId)
          .concat(old?.some((item) => item.id === message.id) ? [] : [message]),
      )
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversation: Conversation) => {
      setReadMark(conversation.id, conversation.lastMessage?.id ?? null)
      try {
        await chatApi.markRead(conversation.id)
      } catch {
        // El endpoint de lectura es opcional: el contador ya se limpió en local.
      }
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
      void queryClient.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversations() },
        (old) => (Array.isArray(old) ? applyReadMarks(old) : old),
      )
    },
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    mutationFn: (input: CreateConversationInput) => chatApi.create(input, user?.id ?? null),

    onSuccess: (conversation) => {
      if (conversation) {
        queryClient.setQueriesData<Conversation[]>(
          { queryKey: chatKeys.conversations() },
          (old) =>
            Array.isArray(old)
              ? [conversation, ...old.filter((item) => item.id !== conversation.id)]
              : old,
        )
      }
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })
}
