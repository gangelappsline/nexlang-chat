import {
  Archive,
  ArchiveRestore,
  BellOff,
  BellRing,
  ChevronLeft,
  CircleCheck,
  Copy,
  MoreVertical,
  PanelRight,
  Phone,
  Pin,
  PinOff,
  UsersRound,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarStack } from '@/components/ui/avatar'
import { IconButton } from '@/components/ui/button'
import { Dropdown, MenuItem, MenuSeparator } from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/types'

import { useUpdateConversation } from '../hooks'
import { channelLabels, onlineMembers, statusMeta } from '../utils'

interface ChatHeaderProps {
  conversation: Conversation
  typingName?: string
  infoOpen: boolean
  onBack: () => void
  onToggleInfo: () => void
}

export function ChatHeader({
  conversation,
  typingName,
  infoOpen,
  onBack,
  onToggleInfo,
}: ChatHeaderProps) {
  const update = useUpdateConversation()
  const status = statusMeta[conversation.status]
  const isGroup = conversation.type === 'group'
  const online = onlineMembers(conversation)

  const patch = (payload: Parameters<typeof update.mutate>[0]['patch'], message: string) => {
    update.mutate(
      { id: conversation.id, patch: payload },
      { onSuccess: () => toast.success(message) },
    )
  }

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
          people={(conversation.members ?? []).map((member) => ({ name: member.name }))}
          size="sm"
          max={2}
        />
      ) : (
        <Avatar
          name={conversation.title}
          accent={conversation.accent}
          size="md"
          presence={conversation.profile?.presence}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="truncate text-[14.5px] font-semibold text-ink-900">
            {conversation.title}
          </h2>
          {conversation.pinned ? <Pin className="size-3 shrink-0 text-ink-300" /> : null}
          {conversation.muted ? (
            <BellOff className="size-3 shrink-0 text-ink-300" aria-label="Silenciada" />
          ) : null}
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]">
          {typingName ? (
            <span className="flex items-center gap-1.5 font-medium text-brand-600">
              <span className="flex items-center gap-0.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-1 animate-bounce rounded-full bg-brand-500"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
              escribiendo…
            </span>
          ) : isGroup ? (
            <>
              <UsersRound className="size-3 text-ink-400" />
              <span className="truncate text-ink-500">
                {conversation.members?.length ?? 0} miembros · {online.length} en línea
              </span>
            </>
          ) : (
            <>
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  conversation.profile?.presence === 'online'
                    ? 'bg-emerald-500'
                    : conversation.profile?.presence === 'away'
                      ? 'bg-amber-400'
                      : 'bg-ink-300',
                )}
              />
              <span className="truncate text-ink-500">
                {conversation.profile?.presence === 'online'
                  ? 'En línea'
                  : conversation.profile?.presence === 'away'
                    ? 'Ausente'
                    : 'Desconectado'}{' '}
                · {channelLabels[conversation.channel]}
              </span>
            </>
          )}
        </div>
      </div>

      <span
        className={cn(
          'hidden shrink-0 items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold ring-1 ring-inset sm:inline-flex',
          status.className,
        )}
      >
        {status.label}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label="Llamar"
          className="hidden sm:inline-flex"
          onClick={() =>
            toast.info('Llamada de voz', {
              description: 'Las llamadas estarán disponibles en la app de escritorio.',
            })
          }
        >
          <Phone className="size-[17px]" />
        </IconButton>
        <IconButton
          label="Videollamada"
          className="hidden sm:inline-flex"
          onClick={() =>
            toast.info('Videollamada', {
              description: 'Las videollamadas estarán disponibles en la app de escritorio.',
            })
          }
        >
          <Video className="size-[17px]" />
        </IconButton>

        <IconButton
          label={infoOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
          onClick={onToggleInfo}
          active={infoOpen}
        >
          <PanelRight className="size-[17px]" />
        </IconButton>

        <Dropdown
          align="right"
          trigger={({ toggle }) => (
            <IconButton label="Más acciones" onClick={toggle}>
              <MoreVertical className="size-[17px]" />
            </IconButton>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                icon={conversation.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                onClick={() => {
                  close()
                  patch(
                    { pinned: !conversation.pinned },
                    conversation.pinned
                      ? 'Conversación desfijada'
                      : 'Conversación fijada en la bandeja',
                  )
                }}
              >
                {conversation.pinned ? 'Dejar de fijar' : 'Fijar conversación'}
              </MenuItem>
              <MenuItem
                icon={conversation.muted ? <BellRing className="size-4" /> : <BellOff className="size-4" />}
                onClick={() => {
                  close()
                  patch(
                    { muted: !conversation.muted },
                    conversation.muted ? 'Notificaciones activadas' : 'Conversación silenciada',
                  )
                }}
              >
                {conversation.muted ? 'Activar notificaciones' : 'Silenciar'}
              </MenuItem>
              <MenuItem
                icon={<CircleCheck className="size-4" />}
                onClick={() => {
                  close()
                  patch({ status: 'closed' }, 'Conversación marcada como resuelta')
                }}
              >
                Marcar como resuelta
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={<Copy className="size-4" />}
                onClick={() => {
                  close()
                  void copyLink()
                }}
              >
                Copiar enlace
              </MenuItem>
              <MenuItem
                icon={
                  conversation.archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )
                }
                onClick={() => {
                  close()
                  patch(
                    { archived: !conversation.archived },
                    conversation.archived ? 'Conversación restaurada' : 'Conversación archivada',
                  )
                }}
              >
                {conversation.archived ? 'Restaurar' : 'Archivar'}
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  )
}
