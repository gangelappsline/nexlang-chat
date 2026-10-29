import {
  Archive,
  CalendarDays,
  Clock3,
  FileText,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Settings2,
  Sparkles,
  StickyNote,
  Tag,
  Ticket,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { EmptyState, SectionTitle, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { formatDuration, formatListTime } from '@/lib/format'
import type { Conversation, Message } from '@/types'

import { useUpdateConversation } from '../hooks'
import { attachmentIcons, attachmentTone, statusMeta } from '../utils'

type PanelTab = 'overview' | 'notes' | 'files'

const tabs: { key: PanelTab; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Resumen', icon: Info },
  { key: 'notes', label: 'Notas', icon: StickyNote },
  { key: 'files', label: 'Archivos', icon: FileText },
]

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface px-2.5 py-2 ring-1 ring-inset ring-line">
      <p className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-ink-400">{label}</p>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 py-[7px]">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-ink-400">{icon}</span>
      <span className="w-[86px] shrink-0 text-[12px] text-ink-400">{label}</span>
      <span className="min-w-0 flex-1 break-words text-right text-[12px] font-medium text-ink-800">
        {value || '—'}
      </span>
    </div>
  )
}

interface InfoPanelProps {
  conversation?: Conversation
  messages: Message[]
  isLoading: boolean
  onClose: () => void
  className?: string
}

export function InfoPanel({ conversation, messages, isLoading, onClose, className }: InfoPanelProps) {
  const [tab, setTab] = useState<PanelTab>('overview')
  const [note, setNote] = useState(conversation?.notes ?? '')
  const [tagDraft, setTagDraft] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const update = useUpdateConversation()

  const files = useMemo(
    () =>
      messages
        .filter((message) => message.attachment)
        .map((message) => ({
          ...message.attachment!,
          createdAt: message.createdAt,
          author: message.authorName,
        })),
    [messages],
  )

  const patchTags = (tags: string[]) => {
    if (!conversation) return
    update.mutate({ id: conversation.id, patch: { tags } })
  }

  const addTag = () => {
    const value = tagDraft.trim()
    if (!value || !conversation) return
    if (conversation.tags.includes(value)) {
      setTagDraft('')
      return
    }
    patchTags([...conversation.tags, value].slice(0, 8))
    setTagDraft('')
    setShowTagInput(false)
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-line bg-white',
        className,
      )}
      aria-label="Detalles de la conversación"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-ink-400" />
          <h2 className="text-[13.5px] font-semibold text-ink-900">Detalles</h2>
        </div>
        <IconButton label="Cerrar detalles" size="sm" onClick={onClose} className="xl:hidden">
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {tabs.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors',
                active ? 'bg-surface text-ink-900' : 'text-ink-500 hover:text-ink-800',
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-brand-600" />
              ) : null}
            </button>
          )
        })}
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
        ) : tab === 'overview' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              <StatCard value={String(conversation.stats.sessions).padStart(2, '0')} label="Sesiones" />
              <StatCard value={formatDuration(conversation.stats.durationSeconds)} label="Duración" />
              <StatCard value={String(conversation.stats.tickets).padStart(2, '0')} label="Tickets" />
            </div>

            <div className="space-y-2.5 rounded-xl bg-white p-3 ring-1 ring-inset ring-line">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-500">Estado</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset',
                    statusMeta[conversation.status].className,
                  )}
                >
                  {statusMeta[conversation.status].label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-500">Asignado a</span>
                <span className="flex items-center gap-1.5">
                  <Avatar name={conversation.assignee.name} size="xs" />
                  <span className="text-[12px] font-medium text-ink-800">
                    {conversation.assignee.name.split(' ')[0]}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-500">Última actividad</span>
                <span className="text-[12px] font-medium text-ink-800">
                  {formatListTime(conversation.updatedAt)}
                </span>
              </div>
            </div>

            <section>
              <SectionTitle className="mb-1.5">
                {conversation.type === 'group' ? 'Grupo' : 'Información del usuario'}
              </SectionTitle>

              {conversation.type === 'group' ? (
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed text-ink-500">
                    {conversation.description || 'Sin descripción.'}
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-inset ring-line">
                    <UsersRound className="size-4 text-ink-400" />
                    <span className="text-[12px] text-ink-600">
                      {conversation.members?.length ?? 0} miembros
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.info('Invitar miembros', { description: 'Próximamente.' })}
                      className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold text-brand-700"
                    >
                      <Plus className="size-3" />
                      Invitar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {conversation.members?.map((member) => (
                      <div key={member.id} className="flex items-center gap-2.5 py-1">
                        <Avatar name={member.name} size="sm" presence={member.presence} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium text-ink-900">
                            {member.name}
                            {member.id === 'me' ? (
                              <span className="ml-1 text-[10.5px] font-normal text-ink-400">(tú)</span>
                            ) : null}
                          </p>
                          <p className="truncate text-[10.5px] text-ink-400">{member.email}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-500 ring-1 ring-inset ring-line">
                          {member.role === 'owner'
                            ? 'Propietario'
                            : member.role === 'admin'
                              ? 'Admin'
                              : 'Miembro'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  <InfoRow
                    icon={<UserRound className="size-3.5" />}
                    label="Nombre"
                    value={conversation.profile?.fullName ?? conversation.title}
                  />
                  <InfoRow
                    icon={<Phone className="size-3.5" />}
                    label="Teléfono"
                    value={conversation.profile?.phone ?? ''}
                  />
                  <InfoRow
                    icon={<Mail className="size-3.5" />}
                    label="Correo"
                    value={conversation.profile?.email ?? ''}
                  />
                  <InfoRow
                    icon={<Sparkles className="size-3.5" />}
                    label="Tipo"
                    value={conversation.profile?.visitorType ?? ''}
                  />
                  <InfoRow
                    icon={<Info className="size-3.5" />}
                    label="Navegador"
                    value={conversation.profile?.browser ?? ''}
                  />
                  <InfoRow
                    icon={<MapPin className="size-3.5" />}
                    label="Ubicación"
                    value={conversation.profile?.location ?? ''}
                  />
                </div>
              )}
            </section>

            {conversation.type === 'direct' ? (
              <section className="space-y-2">
                <SectionTitle>Ubicación</SectionTitle>
                <div className="relative h-[104px] overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e8f0ff,#f2f7f4)] ring-1 ring-inset ring-line">
                  <div className="absolute inset-0 dot-pattern opacity-70" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_46%,rgba(255,255,255,0.9)_46%,rgba(255,255,255,0.9)_50%,transparent_50%),linear-gradient(0deg,transparent_60%,rgba(255,255,255,0.9)_60%,rgba(255,255,255,0.9)_63%,transparent_63%)]" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-70" />
                      <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-rose-500 shadow" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 backdrop-blur-sm">
                    <MapPin className="size-3 text-rose-500" />
                    <p className="truncate text-[11px] font-medium text-ink-700">
                      {conversation.profile?.location}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Mapa', {
                          description: conversation.profile?.location ?? 'Ubicación no disponible.',
                        })
                      }
                      className="ml-auto shrink-0 text-[10.5px] font-semibold text-brand-700"
                    >
                      Ver más
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <SectionTitle
                action={
                  <button
                    type="button"
                    onClick={() => setShowTagInput((value) => !value)}
                    className="flex items-center gap-0.5 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    <Plus className="size-3" />
                    Agregar
                  </button>
                }
              >
                Etiquetas
              </SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {conversation.tags.length === 0 ? (
                  <p className="text-[11.5px] text-ink-400">Sin etiquetas todavía.</p>
                ) : (
                  conversation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="group inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100"
                    >
                      <Tag className="size-2.5" />
                      {tag}
                      <button
                        type="button"
                        aria-label={`Quitar etiqueta ${tag}`}
                        onClick={() => patchTags(conversation.tags.filter((item) => item !== tag))}
                        className="grid size-3.5 place-items-center rounded-full text-brand-400 hover:bg-brand-100 hover:text-brand-700"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              {showTagInput ? (
                <input
                  autoFocus
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addTag()
                    }
                    if (event.key === 'Escape') setShowTagInput(false)
                  }}
                  onBlur={addTag}
                  placeholder="Nueva etiqueta…"
                  className="h-9 w-full rounded-lg bg-surface px-2.5 text-[12px] ring-1 ring-inset ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : null}
            </section>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              leftIcon={<Ticket className="size-3.5" />}
              onClick={() =>
                toast.success('Ticket creado', {
                  description: `Se abrió un ticket para ${conversation.title}.`,
                })
              }
            >
              Crear ticket
            </Button>
          </div>
        ) : tab === 'notes' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2.5 ring-1 ring-inset ring-amber-100">
              <StickyNote className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-[11.5px] leading-relaxed text-amber-800">
                Solo tu equipo puede ver estas notas. Úsalas para dar contexto en la conversación.
              </p>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={9}
              placeholder="Escribe una nota interna…"
              className="w-full resize-none rounded-xl bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-800 ring-1 ring-inset ring-line placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
                <Clock3 className="size-3" />
                {formatListTime(conversation.updatedAt)}
              </span>
              <Button
                size="sm"
                loading={update.isPending}
                disabled={note === conversation.notes}
                onClick={() =>
                  update.mutate(
                    { id: conversation.id, patch: { notes: note } },
                    { onSuccess: () => toast.success('Nota guardada') },
                  )
                }
              >
                Guardar nota
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.length === 0 ? (
              <EmptyState
                icon={<Archive className="size-6" />}
                title="Sin archivos"
                description="Los archivos compartidos en esta conversación aparecerán aquí."
              />
            ) : (
              files.map((file) => {
                const Icon = attachmentIcons[file.kind]
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 ring-1 ring-inset ring-line transition-colors hover:bg-surface"
                  >
                    <span
                      className={cn('grid size-8 place-items-center rounded-lg', attachmentTone[file.kind])}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink-800">{file.name}</p>
                      <p className="text-[10.5px] text-ink-400">
                        {file.size} · {formatListTime(file.createdAt)}
                      </p>
                    </div>
                    <IconButton
                      label="Descargar"
                      size="sm"
                      onClick={() =>
                        toast.info('Descarga', { description: 'Disponible con el backend real.' })
                      }
                    >
                      <FileText className="size-4" />
                    </IconButton>
                  </div>
                )
              })
            )}
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-inset ring-line">
              <CalendarDays className="size-3.5 text-ink-400" />
              <span className="text-[11px] text-ink-500">Conversación creada</span>
              <span className="ml-auto text-[11px] font-medium text-ink-700">
                {formatListTime(conversation.createdAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
