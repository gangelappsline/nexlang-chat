import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ScreenShareOff,
  Video as VideoIcon,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { useCurrentUser } from '@/features/auth/session'
import { cn } from '@/lib/cn'

import { callManager } from '../call-manager'
import { useSignalingConnection } from '../store'
import { canShareScreen } from '../webrtc'
import type { ActiveCall } from '../types'
import { useCallTimer } from '../use-call-timer'
import { MediaTile } from './remote-media'

function statusLabel(call: ActiveCall, timer: string | null) {
  if (call.status === 'dialing') {
    return call.peers.length > 1 ? 'Invitando a los participantes…' : 'Llamando…'
  }
  if (call.status === 'connecting') return 'Conectando…'
  if (call.status === 'active') return timer ?? 'En llamada'
  return 'Finalizando…'
}

function ControlButton({
  label,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'grid size-11 place-items-center rounded-full transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        danger
          ? 'bg-rose-500 text-white hover:bg-rose-600'
          : active
            ? 'bg-white text-ink-900 hover:bg-white/90'
            : 'bg-white/15 text-white hover:bg-white/25',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  )
}

export function CallPanel({ call }: { call: ActiveCall }) {
  const timer = useCallTimer(call.activeSince)
  const connection = useSignalingConnection()
  const user = useCurrentUser()
  const isVideo = call.kind === 'video'
  const primary = call.peers[0]
  const connected = call.peers.filter((peer) => peer.status === 'connected')
  const ringing = call.peers.filter((peer) => peer.status === 'ringing')
  const others = call.peers.length
  const title =
    others > 1
      ? `${others + 1} participantes`
      : (primary?.name ?? call.conversationTitle)

  const localParticipant = {
    id: user?.id ?? 'me',
    name: user?.name ?? 'Tú',
    photoUrl: user?.avatarUrl ?? null,
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      role="dialog"
      aria-label={`Llamada con ${title}`}
      className={cn(
        'fixed inset-x-3 bottom-3 z-[60] mx-auto w-[calc(100%-1.5rem)] max-w-[440px] overflow-hidden rounded-3xl',
        'bg-[linear-gradient(160deg,#20223b_0%,#14162b_60%,#0d0f20_100%)] text-white',
        'shadow-[0_30px_90px_-30px_rgba(6,8,20,0.85)] ring-1 ring-white/10 sm:inset-x-auto sm:right-6 sm:bottom-6',
      )}
    >
      {/* Encabezado */}
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <Avatar
          name={primary?.name ?? call.conversationTitle}
          photoUrl={primary?.photoUrl}
          size="sm"
          className="ring-2 ring-white/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{title}</p>
          <p className="truncate text-[11.5px] text-white/60">{call.conversationTitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[10.5px] font-medium text-white/75">
          {call.status === 'active' ? (
            <Wifi className="size-3 text-emerald-400" />
          ) : (
            <WifiOff className="size-3 text-white/50" />
          )}
          {statusLabel(call, timer)}
        </div>
      </div>

      {connection !== 'online' ? (
        <p className="mx-4 -mt-1 mb-2 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[10.5px] font-medium text-amber-200">
          Reconectando la señalización… el audio y el vídeo siguen activos.
        </p>
      ) : null}

      {/* Contenido */}
      {isVideo ? (
        <div className="px-3">
          <div
            className={cn(
              'relative grid gap-2',
              call.peers.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {call.peers.map((peer) => (
              <MediaTile
                key={peer.id}
                participant={peer}
                stream={peer.stream}
                className={cn('aspect-video w-full', call.peers.length === 1 && 'aspect-[4/3]')}
              />
            ))}

            <div className="absolute bottom-2 right-2 w-[104px] overflow-hidden rounded-xl ring-1 ring-white/25">
              <MediaTile
                participant={localParticipant}
                stream={call.localStream}
                muted
                showAvatar={false}
                className="aspect-[4/3] w-full"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 pb-1">
          <div className="relative mt-1 grid place-items-center">
            <span
              className={cn(
                'absolute size-24 rounded-full bg-white/10',
                call.status === 'active' ? 'animate-ping' : 'opacity-0',
              )}
            />
            <Avatar
              name={primary?.name ?? call.conversationTitle}
              photoUrl={primary?.photoUrl}
              size="xl"
              className="relative ring-2 ring-white/20"
            />
          </div>

          {call.peers.length > 1 ? (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {call.peers.map((peer) => (
                <span
                  key={peer.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium',
                    peer.status === 'connected'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : peer.status === 'ringing'
                        ? 'bg-white/10 text-white/60'
                        : 'bg-rose-500/15 text-rose-300',
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {peer.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-center text-[11.5px] text-white/55">
              {ringing.length > 0
                ? 'Esperando respuesta…'
                : connected.length > 0
                  ? 'Llamada de voz en curso'
                  : 'Conectando…'}
            </p>
          )}
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center justify-center gap-2.5 px-4 py-4">
        <ControlButton
          label={call.selfMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          onClick={() => callManager.toggleMute()}
          active={call.selfMuted}
        >
          {call.selfMuted ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
        </ControlButton>

        {isVideo ? (
          <>
            <ControlButton
              label={call.cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
              onClick={() => callManager.toggleCamera()}
              active={!call.cameraEnabled}
              disabled={call.sharingScreen}
            >
              {call.cameraEnabled ? (
                <VideoIcon className="size-[18px]" />
              ) : (
                <VideoOff className="size-[18px]" />
              )}
            </ControlButton>

            <ControlButton
              label={call.sharingScreen ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
              onClick={() => void callManager.toggleScreenShare()}
              active={call.sharingScreen}
              disabled={!canShareScreen()}
            >
              {call.sharingScreen ? (
                <ScreenShareOff className="size-[18px]" />
              ) : (
                <MonitorUp className="size-[18px]" />
              )}
            </ControlButton>
          </>
        ) : null}

        <ControlButton label="Colgar" onClick={() => callManager.hangup()} danger>
          <PhoneOff className="size-[18px]" />
        </ControlButton>
      </div>
    </motion.section>
  )
}
