import {
  ArrowUpDown,
  Check,
  Inbox,
  Pin,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { LogoMark } from '@/components/brand/logo'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown, MenuItem } from '@/components/ui/dropdown'
import { IconButton } from '@/components/ui/button'
import { EmptyState, Kbd, Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { formatListTime } from '@/lib/format'
import type { Conversation } from '@/types'

import {
  channelMeta,
  conversationPreview,
  filterConversations,
  type InboxFilter,
} from '../utils'
import { UserMenu } from './user-menu'

interface InboxSidebarProps {
  conversations: Conversation[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  activeId?: string
  onSelect: (id: string) => void
  onCompose: () => void
  className?: string
}

type SortKey = 'recent' | 'unread' | 'name'

const sortLabels: Record<SortKey, string> = {
  recent: 'Más recientes',
  unread: 'Sin leer primero',
  name: 'Nombre (A-Z)',
}

const filters: { key: InboxFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'No leídos' },
  { key: 'groups', label: 'Grupos' },
  { key: 'archived', label: 'Archivados' },
]

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation
  active: boolean
  onSelect: () => void
}) {
  const channel = channelMeta[conversation.channel]
  const ChannelIcon = conversation.type === 'group' ? UsersRound : channel.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
        active ? 'bg-brand-50/80' : 'hover:bg-surface',
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />
      ) : null}

      <Avatar
        name={conversation.title}
        accent={conversation.accent}
        size="md"
        rounded={conversation.type === 'group' ? 'xl' : 'full'}
        presence={conversation.type === 'direct' ? conversation.profile?.presence : undefined}
        badge={<ChannelIcon className={cn('size-2.5', channel.className)} />}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p
            className={cn(
              'truncate text-[13.5px] font-semibold',
              active ? 'text-brand-800' : 'text-ink-900',
            )}
          >
            {conversation.title}
          </p>
          {conversation.pinned ? <Pin className="size-3 shrink-0 text-ink-300" /> : null}
          <span className="ml-auto shrink-0 text-[10.5px] font-medium text-ink-400">
            {formatListTime(conversation.updatedAt)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p
            className={cn(
              'truncate text-[12px] leading-snug',
              conversation.unreadCount > 0 ? 'font-medium text-ink-700' : 'text-ink-500',
            )}
          >
            {conversationPreview(conversation)}
          </p>
          {conversation.unreadCount > 0 ? (
            <span className="ml-auto grid min-w-[19px] shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 py-[1px] text-[10px] font-bold text-white">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          ) : conversation.type === 'group' ? (
            <span className="ml-auto shrink-0 text-[10.5px] text-ink-400">
              {conversation.members?.length ?? 0}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export function InboxSidebar({
  conversations,
  isLoading,
  isError,
  onRetry,
  activeId,
  onSelect,
  onCompose,
  className,
}: InboxSidebarProps) {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const visible = useMemo(() => {
    const filtered = filterConversations(conversations, { filter, query })
    if (sort === 'name') return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'es'))
    if (sort === 'unread') {
      return [...filtered].sort((a, b) => b.unreadCount - a.unreadCount)
    }
    return filtered
  }, [conversations, filter, query, sort])

  const pinned = visible.filter((conversation) => conversation.pinned)
  const rest = visible.filter((conversation) => !conversation.pinned)

  const counts = useMemo(
    () => ({
      all: conversations.filter((conversation) => !conversation.archived).length,
      unread: conversations.filter(
        (conversation) => !conversation.archived && conversation.unreadCount > 0,
      ).length,
      groups: conversations.filter(
        (conversation) => !conversation.archived && conversation.type === 'group',
      ).length,
      archived: conversations.filter((conversation) => conversation.archived).length,
    }),
    [conversations],
  )

  const renderList = (items: Conversation[]) =>
    items.map((conversation) => (
      <ConversationRow
        key={conversation.id}
        conversation={conversation}
        active={conversation.id === activeId}
        onSelect={() => onSelect(conversation.id)}
      />
    ))

  return (
    <aside
      className={cn(
        'flex h-full w-full shrink-0 flex-col border-line bg-white lg:w-[334px] lg:border-r',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="h-6 lg:hidden" />
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink-900">
            Bandeja de entrada
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Nueva conversación" onClick={onCompose}>
            <Plus className="size-[18px]" />
          </IconButton>
          <UserMenu size="sm" className="lg:hidden" />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-3 pt-2">
        <div className="thin-scrollbar flex flex-1 items-center gap-0.5 overflow-x-auto rounded-xl bg-surface p-0.5 ring-1 ring-inset ring-line">
          {filters.map((item) => {
            const active = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'relative shrink-0 rounded-[9px] px-2 py-1.5 text-[11px] font-semibold transition-colors',
                  active
                    ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(16,22,50,0.08)] ring-1 ring-line'
                    : 'text-ink-500 hover:text-ink-800',
                )}
              >
                {item.label}
                {counts[item.key] > 0 ? (
                  <span
                    className={cn(
                      'ml-1 text-[10px] font-bold',
                      active ? 'text-brand-600' : 'text-ink-400',
                    )}
                  >
                    {counts[item.key]}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <Dropdown
          align="right"
          trigger={({ toggle }) => (
            <IconButton label={`Ordenar: ${sortLabels[sort]}`} size="sm" onClick={toggle}>
              <ArrowUpDown className="size-3.5" />
            </IconButton>
          )}
        >
          {({ close }) => (
            <>
              {Object.entries(sortLabels).map(([key, label]) => (
                <MenuItem
                  key={key}
                  icon={
                    sort === key ? (
                      <Check className="size-3.5 text-brand-600" />
                    ) : (
                      <span className="size-3.5" />
                    )
                  }
                  onClick={() => {
                    setSort(key as SortKey)
                    close()
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar conversación o persona"
            aria-label="Buscar conversación"
            className="h-10 w-full rounded-xl bg-surface pl-9 pr-14 text-[13px] text-ink-900 ring-1 ring-inset ring-line transition-all placeholder:text-ink-400 hover:ring-line-strong focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="grid size-6 place-items-center rounded-md text-ink-400 hover:bg-ink-900/5 hover:text-ink-700"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <span className="hidden items-center gap-1 sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-1 px-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 px-1.5 py-2.5">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-8" />
                  </div>
                  <Skeleton className="h-2.5 w-full max-w-[160px]" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<RefreshCw className="size-6" />}
            title="No pudimos cargar tus chats"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Reintentar
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={query ? <SearchX className="size-6" /> : <Inbox className="size-6" />}
            title={query ? 'Sin resultados' : 'Nada por aquí'}
            description={
              query
                ? `No encontramos conversaciones que coincidan con “${query}”.`
                : filter === 'archived'
                  ? 'Las conversaciones que archives aparecerán aquí.'
                  : 'Cuando alguien te escriba, verás la conversación en esta bandeja.'
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-xl bg-surface px-4 py-2 text-[12.5px] font-semibold text-ink-700 ring-1 ring-line transition-colors hover:bg-white"
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCompose}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Iniciar conversación
                </button>
              )
            }
          />
        ) : (
          <div>
            {pinned.length > 0 ? (
              <div className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  Fijados
                </p>
                <div className="space-y-0.5">{renderList(pinned)}</div>
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div>
                {pinned.length > 0 ? (
                  <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    Recientes
                  </p>
                ) : null}
                <div className="space-y-0.5">{renderList(rest)}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Sincronizado en tiempo real
        </span>
        <span className="text-[11px] font-medium text-ink-400">
          {conversations.length} conversaciones
        </span>
      </div>
    </aside>
  )
}
