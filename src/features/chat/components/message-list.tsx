import { motion } from 'framer-motion'
import { Loader2, MessageSquareDashed } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/primitives'
import { useCurrentUser } from '@/features/auth/session'
import { cn } from '@/lib/cn'
import { formatDayLabel, formatMessageTime } from '@/lib/format'
import type { Conversation, Message } from '@/types'

interface BubbleProps {
  message: Message
  conversation: Conversation
  showAuthor: boolean
  mine: boolean
}

function Bubble({ message, conversation, showAuthor, mine }: BubbleProps) {
  const isGroup = conversation.type === 'group'

  return (
    <div className={cn('flex w-full gap-2.5', mine ? 'justify-end' : 'justify-start')}>
      {!mine ? (
        <div className="w-8 shrink-0">
          {showAuthor ? (
            <Avatar name={message.authorName || 'Usuario'} photoUrl={message.authorPhotoUrl} size="xs" />
          ) : null}
        </div>
      ) : null}

      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        {!mine && showAuthor ? (
          <div className="mb-1 flex items-center gap-1.5 pl-1">
            <span className="text-[11.5px] font-semibold text-ink-700">
              {message.authorName || (isGroup ? 'Miembro' : conversation.title)}
            </span>
            <span className="text-[10.5px] text-ink-400">{formatMessageTime(message.createdAt)}</span>
          </div>
        ) : null}

        <div
          className={cn(
            'w-fit max-w-full px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-bubble',
            mine
              ? 'rounded-2xl rounded-tr-md bg-brand-600 text-white'
              : 'rounded-2xl rounded-tl-md bg-[#f1f3f9] text-ink-800',
            message.status === 'sending' && 'opacity-80',
            message.status === 'failed' && 'ring-1 ring-inset ring-rose-300',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>

        <div
          className={cn(
            'mt-1 flex items-center gap-1 px-1 text-[10px] text-ink-400',
            mine ? 'justify-end' : 'justify-start',
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {message.status === 'sending' ? <Loader2 className="size-3 animate-spin" /> : null}
          {message.status === 'failed' ? (
            <span className="font-medium text-rose-500">No enviado</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

interface MessageListProps {
  conversation: Conversation
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ conversation, messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)
  const user = useCurrentUser()
  const currentUserId = user?.id ?? null

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const isFirstRender = lastCount.current === 0
    lastCount.current = messages.length

    element.scrollTo({
      top: element.scrollHeight,
      behavior: isFirstRender ? 'auto' : 'smooth',
    })
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 overflow-hidden px-5 py-6">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className={cn('flex gap-2.5', row % 2 === 1 ? 'justify-end' : 'justify-start')}
          >
            {row % 2 === 0 ? <Skeleton className="size-8 rounded-full" /> : null}
            <Skeleton className={cn('h-16 rounded-2xl', row % 2 === 1 ? 'w-64' : 'w-72')} />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <MessageSquareDashed className="size-6" />
        </div>
        <p className="mt-4 text-[15px] font-semibold text-ink-900">Aún no hay mensajes</p>
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-500">
          Escribe el primer mensaje para iniciar la conversación con {conversation.title}.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="thin-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const dateLabel = formatDayLabel(message.createdAt)
          const showDate = !previous || dateLabel !== formatDayLabel(previous.createdAt)
          const mine = Boolean(currentUserId) && message.authorId === currentUserId

          if (message.kind === 'system') {
            return (
              <div key={message.id}>
                {showDate ? <DayDivider label={dateLabel} /> : null}
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[10.5px] font-medium text-ink-500 ring-1 ring-line">
                    {message.body}
                  </span>
                </div>
              </div>
            )
          }

          const showAuthor =
            !previous ||
            previous.kind === 'system' ||
            previous.authorId !== message.authorId ||
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >
              5 * 60_000

          return (
            <div key={message.id}>
              {showDate ? <DayDivider label={dateLabel} /> : null}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={showAuthor ? 'mt-2' : 'mt-0.5'}
              >
                <Bubble
                  message={message}
                  conversation={conversation}
                  showAuthor={showAuthor}
                  mine={mine}
                />
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-400 ring-1 ring-line">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
