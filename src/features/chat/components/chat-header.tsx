import { ChevronLeft, Copy, PanelRight, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { IconButton } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/session'
import type { Conversation } from '@/types'

import { otherParticipants } from '../utils'

interface ChatHeaderProps {
  conversation: Conversation
  infoOpen: boolean
  onBack: () => void
  onToggleInfo: () => void
}

export function ChatHeader({
  conversation,
  infoOpen,
  onBack,
  onToggleInfo,
}: ChatHeaderProps) {
  const user = useCurrentUser()
  const isGroup = conversation.type === 'group'
  const others = otherParticipants(conversation, user?.id)

  const copyLink = async () => {
    const url = `${window.location.origin}/c/${conversation.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado', { description: url })
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <header className="flex items-center gap-3 border-b border-line bg-white/85 px-3 py-3 backdrop-blur-md sm:px-5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver a la bandeja"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900 lg:hidden"
      >
        <ChevronLeft className="size-5" />
      </button>

      {isGroup ? (
        <AvatarStack
          people={others.map((participant) => ({
            name: participant.name,
            photoUrl: participant.photoUrl,
          }))}
          size="sm"
          max={2}
        />
      ) : (
        <Avatar name={others[0]?.name ?? conversation.title} photoUrl={others[0]?.photoUrl} size="md" />
      )}

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[14.5px] font-semibold text-ink-900">{conversation.title}</h2>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-500">
          {isGroup ? (
            <>
              <UsersRound className="size-3 text-ink-400" />
              <span className="truncate">
                {conversation.participantCount}{' '}
                {conversation.participantCount === 1 ? 'miembro' : 'miembros'}
              </span>
            </>
          ) : (
            <span className="truncate">{others[0]?.email ?? 'Chat directo'}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Copiar enlace" className="hidden sm:inline-flex" onClick={() => void copyLink()}>
          <Copy className="size-[17px]" />
        </IconButton>

        <IconButton
          label={infoOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
          onClick={onToggleInfo}
          active={infoOpen}
        >
          <PanelRight className="size-[17px]" />
        </IconButton>
      </div>
    </header>
  )
}
