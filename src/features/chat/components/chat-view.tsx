import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/api/errors'
import { firstName } from '@/lib/format'
import type { Conversation, Message } from '@/types'

import { useMarkRead, useSendMessage } from '../hooks'
import { ChatHeader } from './chat-header'
import { Composer } from './composer'
import { MessageList } from './message-list'

interface ChatViewProps {
  conversation: Conversation
  messages: Message[]
  isLoading: boolean
  infoOpen: boolean
  onBack: () => void
  onToggleInfo: () => void
}

export function ChatView({
  conversation,
  messages,
  isLoading,
  infoOpen,
  onBack,
  onToggleInfo,
}: ChatViewProps) {
  const sendMessage = useSendMessage(conversation.id)
  const markRead = useMarkRead()
  const readMarker = useRef<string | null>(null)
  const lastMessageId = conversation.lastMessage?.id ?? null

  // Al abrir (o al llegar un mensaje nuevo) se marca la conversación como leída.
  useEffect(() => {
    if (conversation.unreadCount === 0) return
    if (readMarker.current === lastMessageId) return
    readMarker.current = lastMessageId
    markRead.mutate(conversation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unreadCount, lastMessageId])

  const handleSend = (text: string) => {
    sendMessage.mutate(
      { text },
      {
        onError: (error) => {
          toast.error('No pudimos enviar tu mensaje', { description: getErrorMessage(error) })
        },
      },
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#fbfbfe]">
      <ChatHeader
        conversation={conversation}
        infoOpen={infoOpen}
        onBack={onBack}
        onToggleInfo={onToggleInfo}
      />

      <MessageList conversation={conversation} messages={messages} isLoading={isLoading} />

      <Composer
        onSend={handleSend}
        sending={sendMessage.isPending}
        placeholder={
          conversation.type === 'group'
            ? `Mensaje para ${conversation.title}…`
            : `Responder a ${firstName(conversation.title)}…`
        }
      />
    </div>
  )
}
