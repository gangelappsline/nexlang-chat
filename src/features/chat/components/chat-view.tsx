import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/api/errors'
import type { Conversation, Message } from '@/types'

import { useMarkRead, useSendMessage } from '../hooks'
import type { SendMessagePayload } from '../api'
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

  useEffect(() => {
    if (conversation.unreadCount === 0) return
    if (readMarker.current === conversation.id) return
    readMarker.current = conversation.id
    markRead.mutate(conversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unreadCount])

  const handleSend = (payload: SendMessagePayload) => {
    sendMessage.mutate(payload, {
      onError: (error) => {
        toast.error('No pudimos enviar tu mensaje', { description: getErrorMessage(error) })
      },
    })
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
            : `Responder a ${conversation.title.split(' ')[0]}…`
        }
      />
    </div>
  )
}
