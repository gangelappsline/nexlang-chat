import { useEffect, useRef } from 'react'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'
import type { CallParticipant } from '../types'

interface MediaTileProps {
  participant: CallParticipant
  stream: MediaStream | null
  /** Vídeo local: se silencia para evitar el eco. */
  muted?: boolean
  className?: string
  showAvatar?: boolean
  labelClassName?: string
}

/** Muestra el stream de un participante o su avatar si aún no hay vídeo. */
export function MediaTile({
  participant,
  stream,
  muted = false,
  className,
  showAvatar = true,
  labelClassName,
}: MediaTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = Boolean(stream && stream.getVideoTracks().length > 0)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    element.srcObject = stream
    if (stream) {
      // `play()` puede rechazar (autoplay) o no existir en entornos de prueba.
      try {
        const playback = element.play()
        if (playback && typeof playback.catch === 'function') playback.catch(() => undefined)
      } catch {
        /* sin reproducción automática */
      }
    }

    return () => {
      element.srcObject = null
    }
  }, [stream, hasVideo])

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-ink-900', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          'size-full object-cover transition-opacity duration-200',
          hasVideo ? 'opacity-100' : 'opacity-0',
        )}
      />

      {(!hasVideo || showAvatar) && !hasVideo ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={participant.name} photoUrl={participant.photoUrl} size="xl" />
            <span
              className={cn(
                'rounded-full bg-black/35 px-2.5 py-1 text-[11.5px] font-medium text-white/90',
                labelClassName,
              )}
            >
              {participant.name}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
