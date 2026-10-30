import { useRef } from 'react'

import { signalingClient } from '@/features/calls/signaling-client'

import { useTypingStore } from './typing-store'

/** Cada cuánto se permite enviar un aviso de "escribiendo". */
const TYPING_THROTTLE_MS = 2200

/**
 * Nombre de quien está escribiendo en la conversación, o `null`.
 * La caducidad la gestiona el store con un temporizador.
 */
export function useTypingIndicator(conversationId: string | undefined) {
  return useTypingStore((state) =>
    conversationId ? (state.typing[conversationId]?.name ?? null) : null,
  )
}

/**
 * Devuelve una función para avisar a los demás de que estás escribiendo.
 * Se limita el envío para no saturar el socket.
 */
export function useTypingPublisher(conversationId: string | undefined) {
  const lastSent = useRef(0)

  return () => {
    if (!conversationId) return

    const now = Date.now()
    if (now - lastSent.current < TYPING_THROTTLE_MS) return

    lastSent.current = now
    signalingClient.send({ type: 'chat:typing', conversationId })
  }
}
