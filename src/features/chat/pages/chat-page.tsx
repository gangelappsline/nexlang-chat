import { MessageSquarePlus, MessagesSquare, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { LogoMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/cn'

import { ChatView } from '../components/chat-view'
import { InboxSidebar } from '../components/inbox-sidebar'
import { InfoPanel } from '../components/info-panel'
import { NewConversationDialog } from '../components/new-conversation-dialog'
import { WorkspaceRail } from '../components/workspace-rail'
import { useConversation, useConversations, useRealtimeSync } from '../hooks'

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const isWide = useMediaQuery('(min-width: 1280px)')

  const conversationsQuery = useConversations()
  const detailQuery = useConversation(conversationId)

  const [infoOverride, setInfoOverride] = useState<boolean | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const infoOpen = infoOverride ?? isWide
  const setInfoOpen = (value: boolean) => setInfoOverride(value)

  useRealtimeSync()

  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  )

  const summary = conversations.find((conversation) => conversation.id === conversationId)
  const conversation = detailQuery.data?.conversation ?? summary
  const messages = detailQuery.data?.messages ?? []

  useEffect(() => {
    document.title = conversation ? `${conversation.title} · Nexlang Chat` : 'Nexlang Chat'
  }, [conversation])

  // On desktop the first conversation is opened automatically.
  useEffect(() => {
    if (conversationId || !isWide || conversations.length === 0) return
    const first = conversations.find((item) => !item.archived && item.unreadCount > 0) ??
      conversations.find((item) => !item.archived)
    if (first) navigate(`/c/${first.id}`, { replace: true })
  }, [conversationId, isWide, conversations, navigate])

  const handleSelect = (id: string) => navigate(`/c/${id}`)

  return (
    <div className="h-dvh w-full overflow-hidden bg-canvas lg:p-3">
      <div className="relative mx-auto flex h-full max-w-[1720px] overflow-hidden bg-white lg:rounded-[26px] lg:shadow-panel lg:ring-1 lg:ring-ink-900/5">
        <WorkspaceRail conversations={conversations} />

        <InboxSidebar
          conversations={conversations}
          isLoading={conversationsQuery.isLoading}
          isError={conversationsQuery.isError}
          onRetry={() => void conversationsQuery.refetch()}
          activeId={conversationId}
          onSelect={handleSelect}
          onCompose={() => setDialogOpen(true)}
          className={cn(conversationId ? 'hidden lg:flex' : 'flex')}
        />

        <main
          className={cn(
            'relative min-w-0 flex-1 flex-col',
            conversationId ? 'flex' : 'hidden lg:flex',
          )}
        >
          {conversation ? (
            <ChatView
              conversation={conversation}
              messages={messages}
              isLoading={detailQuery.isLoading}
              infoOpen={infoOpen}
              onBack={() => navigate('/')}
              onToggleInfo={() => setInfoOpen(!infoOpen)}
            />
          ) : detailQuery.isLoading && conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                <p className="text-[12.5px] text-ink-400">Cargando conversación…</p>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_20%,rgba(83,111,252,0.07),transparent)]" />
              <LogoMark className="h-12 opacity-90" />
              <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-ink-900">
                Selecciona una conversación
              </h2>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-500">
                Elige un chat de la bandeja de entrada o inicia una nueva conversación con tu
                equipo.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Button
                  leftIcon={<MessageSquarePlus className="size-4" />}
                  onClick={() => setDialogOpen(true)}
                >
                  Nueva conversación
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/c/${conversations.find((item) => !item.archived)?.id ?? conversations[0]?.id ?? ''}`,
                    )
                  }
                  disabled={conversations.length === 0}
                >
                  Abrir la más reciente
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-[11px] text-ink-400">
                <span className="flex items-center gap-1.5">
                  <MessagesSquare className="size-3.5" />
                  {conversations.length} conversaciones
                </span>
                <span className="flex items-center gap-1.5">
                  <Plus className="size-3.5" />
                  Crea chats y grupos ilimitados
                </span>
              </div>
            </div>
          )}
        </main>

        {conversation && infoOpen ? (
          <>
            {!isWide ? (
              <button
                type="button"
                aria-label="Cerrar detalles"
                onClick={() => setInfoOpen(false)}
                className="absolute inset-0 z-30 bg-ink-900/25 backdrop-blur-[2px]"
              />
            ) : null}
            <InfoPanel
              key={conversation.id}
              conversation={conversation}
              messages={messages}
              isLoading={detailQuery.isLoading}
              onClose={() => setInfoOpen(false)}
              className={cn(
                'z-40 bg-white',
                isWide
                  ? 'relative w-[330px] shrink-0 border-l'
                  : 'absolute inset-y-0 right-0 w-[86vw] max-w-[350px] border-l shadow-[-24px_0_60px_-30px_rgba(15,20,36,0.4)]',
              )}
            />
          </>
        ) : null}
      </div>

      <NewConversationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(id) => navigate(`/c/${id}`)}
      />
    </div>
  )
}
