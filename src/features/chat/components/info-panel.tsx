import { CalendarDays, Clock3, Copy, MessageSquare, UsersRound, X } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { IconButton } from '@/components/ui/button'
import { EmptyState, SectionTitle, Skeleton } from '@/components/ui/primitives'
import { useCurrentUser } from '@/features/auth/session'
import { cn } from '@/lib/cn'
import { formatDayLabel, formatListTime } from '@/lib/format'
import type { Conversation } from '@/types'

interface InfoPanelProps {
  conversation?: Conversation
  isLoading: boolean
  onClose: () => void
  className?: string
}

export function InfoPanel({ conversation, isLoading, onClose, className }: InfoPanelProps) {
  const user = useCurrentUser()

  const copyLink = async () => {
    if (!conversation) return
    const url = `${window.location.origin}/c/${conversation.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado', { description: url })
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <aside
      className={cn('flex h-full flex-col border-line bg-white', className)}
      aria-label="Detalles de la conversación"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-ink-400" />
          <h2 className="text-[13.5px] font-semibold text-ink-900">Detalles</h2>
        </div>
        <IconButton label="Cerrar detalles" size="sm" onClick={onClose} className="xl:hidden">
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-4">
        {isLoading && !conversation ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : !conversation ? (
          <EmptyState
            icon={<MessageSquare className="size-6" />}
            title="Sin conversación"
            description="Selecciona una conversación para ver sus detalles."
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center rounded-2xl bg-surface px-4 py-5 text-center ring-1 ring-inset ring-line">
              <Avatar
                name={conversation.title}
                size="xl"
                rounded={conversation.type === 'group' ? 'xl' : 'full'}
              />
              <p className="mt-3 text-[14.5px] font-semibold text-ink-900">{conversation.title}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-500">
                {conversation.type === 'group'
                  ? `Grupo · ${conversation.participantCount} participantes`
                  : 'Conversación directa'}
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-inset ring-line">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                  <CalendarDays className="size-3.5 text-ink-400" /> Creada
                </span>
                <span className="text-[12px] font-medium text-ink-800">
                  {conversation.createdAt
                    ? formatDayLabel(conversation.createdAt)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                  <Clock3 className="size-3.5 text-ink-400" /> Última actividad
                </span>
                <span className="text-[12px] font-medium text-ink-800">
                  {formatListTime(conversation.updatedAt || conversation.createdAt)}
                </span>
              </div>
            </div>

            <section>
              <SectionTitle
                className="mb-1.5"
                action={
                  <span className="flex items-center gap-1 text-[11px] text-ink-400">
                    <UsersRound className="size-3" />
                    {conversation.participants.length}
                  </span>
                }
              >
                Participantes
              </SectionTitle>

              <ul className="divide-y divide-line rounded-xl ring-1 ring-inset ring-line">
                {conversation.participants.map((participant) => {
                  const isMe = participant.id === user?.id
                  const isCreator = participant.id === conversation.createdById

                  return (
                    <li key={participant.id} className="flex items-center gap-2.5 px-3 py-2.5">
                      <Avatar name={participant.name} photoUrl={participant.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-ink-900">
                          {participant.name}
                          {isMe ? (
                            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand-700">
                              Tú
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[11px] text-ink-400">{participant.email}</p>
                      </div>
                      {isCreator ? (
                        <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-500 ring-1 ring-line">
                          Creador
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>

            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-ink-700 ring-1 ring-line transition-colors hover:bg-surface"
            >
              <Copy className="size-3.5" />
              Copiar enlace de la conversación
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
