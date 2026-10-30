import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

import { useSessionStore } from '@/features/auth/session'

import { callManager } from '../call-manager'
import { WEBRTC_SUPPORTED } from '../config'
import { useActiveCall, useIncomingCall } from '../store'
import { CallPanel } from './call-panel'
import { IncomingCallCard } from './incoming-call-card'

/**
 * Montaje único de las llamadas dentro del panel.
 *
 * Conecta la señalización con la sesión activa y dibuja la llamada entrante o
 * la llamada en curso por encima del resto de la interfaz.
 */
export function CallCenter() {
  const accessToken = useSessionStore((state) => state.accessToken)
  const userId = useSessionStore((state) => state.user?.id)
  const userName = useSessionStore((state) => state.user?.name)
  const call = useActiveCall()
  const incoming = useIncomingCall()

  useEffect(() => {
    if (!accessToken || !userId || !WEBRTC_SUPPORTED) {
      callManager.detach()
      return
    }

    callManager.attach({ token: accessToken, userId, name: userName })

    return () => callManager.detach()
  }, [accessToken, userId, userName])

  // Evita cerrar la pestaña por accidente durante una llamada.
  const inCall = Boolean(call)
  useEffect(() => {
    if (!inCall) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [inCall])

  // Mantiene la pantalla encendida mientras la llamada está activa.
  const active = call?.status === 'active'
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false

    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) void sentinel.release()
        else lock = sentinel
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      void lock?.release().catch(() => undefined)
    }
  }, [active])

  if (!WEBRTC_SUPPORTED) return null

  return (
    <AnimatePresence>
      {incoming ? <IncomingCallCard key={`incoming-${incoming.id}`} call={incoming} /> : null}
      {call ? <CallPanel key={`call-${call.id}`} call={call} /> : null}
    </AnimatePresence>
  )
}
