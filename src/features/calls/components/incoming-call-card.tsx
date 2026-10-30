import { motion } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'

import { callManager } from '../call-manager'
import type { IncomingCall } from '../types'

export function IncomingCallCard({ call }: { call: IncomingCall }) {
  const isVideo = call.kind === 'video'
  const others = call.participants.filter((participant) => participant.id !== call.from.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      role="dialog"
      aria-label={isVideo ? 'Videollamada entrante' : 'Llamada entrante'}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto w-[calc(100%-1.5rem)] max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(15,20,36,0.55)] ring-1 ring-ink-900/10 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(140deg,#3d54f2_0%,#4a3fe4_55%,#6d28d9_100%)] px-5 pb-6 pt-5 text-white">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-[0.15]" />
        <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-white/15 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <span className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
            <Avatar
              name={call.from.name}
              photoUrl={call.from.photoUrl}
              size="lg"
              className="relative ring-2 ring-white/40"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{call.from.name}</p>
            <p className="flex items-center gap-1.5 text-[12px] text-white/80">
              {isVideo ? <Video className="size-3.5" /> : <Phone className="size-3.5" />}
              {isVideo ? 'Videollamada entrante' : 'Llamada de voz entrante'}
            </p>
          </div>
        </div>

        <p className="relative mt-3 truncate text-[11.5px] text-white/70">
          {others.length > 0
            ? `${call.conversationTitle} · ${others.length + 1} participantes`
            : call.conversationTitle}
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => callManager.reject()}
          className={cn(
            'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 text-[13px] font-semibold text-rose-600',
            'transition-colors hover:bg-rose-100',
          )}
        >
          <PhoneOff className="size-4" />
          Rechazar
        </button>
        <button
          type="button"
          onClick={() => void callManager.accept()}
          className={cn(
            'inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-semibold text-white',
            'shadow-[0_14px_30px_-16px_rgba(5,150,105,0.9)] transition-colors hover:bg-emerald-700',
          )}
        >
          {isVideo ? <Video className="size-4" /> : <Phone className="size-4" />}
          Aceptar
        </button>
      </div>
    </motion.div>
  )
}
