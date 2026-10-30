import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useSessionStore } from '@/features/auth/session'
import { signalingClient } from '@/features/calls/signaling-client'
import { useCallStore } from '@/features/calls/store'
import { chatKeys, useConversations } from '@/features/chat/hooks'

import { useTypingStore } from './typing-store'

/**
 * Conecta el socket propio (`server/signaling`) con los chats.
 *
 * El servidor **no transporta mensajes**: solo avisa de que una conversación
 * tiene novedades. El contenido se pide a la API, que sigue siendo la fuente
 * de verdad y la que valida la pertenencia a la conversación.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const accessToken = useSessionStore((state) => state.accessToken)
  const userId = useSessionStore((state) => state.user?.id)
  const userName = useSessionStore((state) => state.user?.name)
  const queryClient = useQueryClient()
  const { data } = useConversations()

  const conversationIds = useMemo(() => (data ?? []).map((item) => item.id), [data])
  const conversationKey = conversationIds.join(',')

  /* ---------------------------- conexión ---------------------------- */
  useEffect(() => {
    if (!accessToken || !userId) return

    signalingClient.connect({ token: accessToken, userId, name: userName })

    const offStatus = signalingClient.onStatus((status) => {
      useCallStore.getState().setConnection(status)
    })

    return () => {
      offStatus()
      signalingClient.disconnect()
      useTypingStore.getState().clear()
    }
  }, [accessToken, userId, userName])

  /* ------------------ suscripción a las conversaciones -------------- */
  useEffect(() => {
    const ids = conversationKey ? conversationKey.split(',') : []
    if (ids.length === 0) return

    const subscribe = () => {
      signalingClient.send({ type: 'chat:subscribe', conversationIds: ids })
    }

    // Al (re)conectar hay que volver a suscribirse y recuperar lo perdido.
    const offStatus = signalingClient.onStatus((status) => {
      if (status !== 'online') return
      subscribe()
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
    })

    subscribe()

    return offStatus
  }, [conversationKey, queryClient])

  /* ----------------------- eventos en tiempo real ------------------- */
  useEffect(() => {
    return signalingClient.onSignal((signal) => {
      if (signal.type === 'chat:message') {
        // Solo se invalida: el contenido lo trae la API con los permisos reales.
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
        void queryClient.invalidateQueries({
          queryKey: chatKeys.messages(signal.conversationId),
        })
        useTypingStore.getState().setTyping(signal.conversationId, null)

        if (typeof document !== 'undefined' && document.hidden) {
          toast.message(`Nuevo mensaje de ${signal.fromName ?? 'un compañero'}`)
        }
        return
      }

      if (signal.type === 'chat:typing') {
        useTypingStore.getState().setTyping(signal.conversationId, {
          name: signal.fromName ?? 'Alguien',
          at: Date.now(),
        })
      }
    })
  }, [queryClient])

  /* -------- recuperar mensajes perdidos al volver a la pestaña ------ */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() })
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient])

  return <>{children}</>
}
