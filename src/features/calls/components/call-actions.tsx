import { Phone, Video } from 'lucide-react'

import { IconButton } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/session'
import type { Conversation } from '@/types'

import { callManager } from '../call-manager'
import { WEBRTC_SUPPORTED } from '../config'
import { useActiveCall, useCallStore, useIncomingCall, useSignalingConnection } from '../store'

interface CallActionsProps {
  conversation: Conversation
}

/**
 * Botones de llamada y videollamada del encabezado del chat.
 * Llaman a todos los demás participantes de la conversación.
 */
export function CallActions({ conversation }: CallActionsProps) {
  const user = useCurrentUser()
  const connection = useSignalingConnection()
  const call = useActiveCall()
  const incoming = useIncomingCall()
  const online = useCallStore((state) => state.online)
  const others = conversation.participants.filter((participant) => participant.id !== user?.id)

  const offline = others.filter((participant) => !online.includes(participant.id))
  const availability =
    offline.length === 0
      ? undefined
      : offline.length === others.length
        ? 'Nadie de esta conversación tiene la app abierta ahora mismo'
        : `${offline.map((participant) => participant.name).join(', ')} no tiene la app abierta`

  const disabled = !WEBRTC_SUPPORTED || connection !== 'online' || Boolean(call) || Boolean(incoming)

  const reason = !WEBRTC_SUPPORTED
    ? 'Tu navegador no soporta llamadas'
    : connection !== 'online'
      ? 'Conectando con el servidor de llamadas…'
      : call || incoming
        ? 'Ya hay una llamada en curso'
        : others.length === 0
          ? 'No hay otros participantes'
          : undefined

  const hint = reason ?? availability
  const audioLabel = others.length > 1 ? 'Llamada grupal' : 'Llamar'
  const videoLabel = others.length > 1 ? 'Videollamada grupal' : 'Videollamada'

  return (
    <>
      <IconButton
        label={audioLabel}
        title={hint ?? audioLabel}
        className="hidden sm:inline-flex"
        disabled={disabled}
        onClick={() => void callManager.start(conversation, 'audio')}
      >
        <Phone className="size-[17px]" />
      </IconButton>

      <IconButton
        label={videoLabel}
        title={hint ?? videoLabel}
        className="hidden sm:inline-flex"
        disabled={disabled}
        onClick={() => void callManager.start(conversation, 'video')}
      >
        <Video className="size-[17px]" />
      </IconButton>
    </>
  )
}
