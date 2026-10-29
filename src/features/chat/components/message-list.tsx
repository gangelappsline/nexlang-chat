import { motion } from 'framer-motion'
import { Check, CheckCheck, Loader2, MessageSquareDashed } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { formatDayLabel, formatMessageTime } from '@/lib/format'
import type { Conversation, Message } from '@/types'

import { attachmentIcons, attachmentTone } from '../utils'

function MessageStatusIcon({ message }: { message: Message }) {
  if (message.status === 'sending') return <Loader2 className="size-3 animate-spin opacity-80" />
  if (message.status === 'failed') return <span className="text-[10px] font-medium">Error</span>
  if (message.status === 'sent') return <Check className="size-3.5 opacity-80" />
  return <CheckCheck className={cn('size-3.5', message.status === 'read' ? 'opacity-100' : 'opacity-70')} />
}

function AttachmentCard({ message }: { message: Message }) {
  if (!message.attachment) return null
  const Icon = attachmentIcons[message.attachment.kind]
  const mine = message.authorId === 'me'

  return (
    <div
      className={cn(
        'mt-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2 ring-1',
        mine ? 'bg-white/15 ring-white/20' : 'bg-white ring-line',
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg',
          mine ? 'bg-white/20 text-white' : attachmentTone[message.attachment.kind],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-[12px] font-semibold',
            mine ? 'text-white' : 'text-ink-800',
          )}
        >
          {message.attachment.name}
        </p>
        <p className={cn('text-[10.5px]', mine ? 'text-white/70' : 'text-ink-400')}>
          {message.attachment.size}
        </p>
      </div>
    </div>
  )
}

interface BubbleProps {
  message: Message
  conversation: Conversation
  showAuthor: boolean
}

function Bubble({ message, conversation, showAuthor }: BubbleProps) {
  const mine = message.authorId === 'me'
  const isGroup = conversation.type === 'group'

  return (
    <div className={cn('flex w-full gap-2.5', mine ? 'justify-end' : 'justify-start')}>
      {!mine ? (
        <div className="w-8 shrink-0">
          {showAuthor ? (
            <Avatar
              name={message.authorName}
              size="xs"
              accent={isGroup ? undefined : conversation.accent}
            />
          ) : null}
        </div>
      ) : null}

      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        {!mine && showAuthor ? (
          <div className="mb-1 flex items-center gap-1.5 pl-1">
            <span className="text-[11.5px] font-semibold text-ink-700">{message.authorName}</span>
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
          )}
        >
          {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
          <AttachmentCard message={message} />
        </div>

        <div
          className={cn(
            'mt-1 flex items-center gap-1 px-1 text-[10px] text-ink-400',
            mine ? 'justify-end' : 'justify-start',
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {mine ? <MessageStatusIcon message={message} /> : null}
        </div>
      </div>
    </div>
  )
}

interface MessageListProps {
  conversation: Conversation
  messages: Message[]
  typingName?: string
  isLoading: boolean
}

export function MessageList({ conversation, messages, typingName, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const isFirstRender = lastCount.current === 0
    lastCount.current = messages.length

    element.scrollTo({
      top: element.scrollHeight,
      behavior: isFirstRender ? 'auto' : 'smooth',
    })
  }, [messages.length, typingName])

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
                <Bubble message={message} conversation={conversation} showAuthor={showAuthor} />
              </motion.div>
            </div>
          )
        })}

        {typingName ? (
          <div className="flex items-end gap-2.5">
            <Avatar name={typingName} size="xs" />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[#f1f3f9] px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-1.5 rounded-full bg-ink-400"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                />
              ))}
            </div>
          </div>
        ) : null}
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
