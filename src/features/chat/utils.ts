import {
  FileSpreadsheet,
  FileText,
  Globe,
  ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

import type { Channel, Conversation, ConversationStatus, MessageAttachment } from '@/types'

export const channelMeta: Record<
  Channel,
  { label: string; icon: LucideIcon; className: string }
> = {
  web: { label: 'Web', icon: Globe, className: 'text-brand-600' },
  email: { label: 'Correo', icon: Mail, className: 'text-amber-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, className: 'text-emerald-600' },
  phone: { label: 'Teléfono', icon: Phone, className: 'text-violet-600' },
  app: { label: 'App', icon: Smartphone, className: 'text-sky-600' },
}

export const channelLabels: Record<Channel, string> = {
  web: 'vía Web',
  email: 'vía Correo',
  whatsapp: 'vía WhatsApp',
  phone: 'vía Teléfono',
  app: 'en la app',
}

export const statusMeta: Record<ConversationStatus, { label: string; className: string }> = {
  open: { label: 'Abierta', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  closed: { label: 'Resuelta', className: 'bg-ink-900/5 text-ink-500 ring-ink-900/5' },
}

export const attachmentIcons: Record<MessageAttachment['kind'], LucideIcon> = {
  pdf: FileText,
  image: ImageIcon,
  sheet: FileSpreadsheet,
  doc: FileText,
  link: Link2,
}

export const attachmentTone: Record<MessageAttachment['kind'], string> = {
  pdf: 'bg-rose-50 text-rose-600',
  image: 'bg-violet-50 text-violet-600',
  sheet: 'bg-emerald-50 text-emerald-600',
  doc: 'bg-sky-50 text-sky-600',
  link: 'bg-amber-50 text-amber-600',
}

export function sortConversations(list: Conversation[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function conversationPreview(conversation: Conversation) {
  const last = conversation.lastMessage
  if (!last) return 'Sin mensajes todavía'

  const prefix =
    last.role === 'agent'
      ? 'Tú: '
      : last.role === 'member'
        ? `${last.authorName.split(' ')[0]}: `
        : ''

  return `${prefix}${last.body}`
}

export type InboxFilter = 'all' | 'unread' | 'groups' | 'archived'

export function filterConversations(
  list: Conversation[],
  { filter, query }: { filter: InboxFilter; query: string },
) {
  const needle = query.trim().toLowerCase()

  return sortConversations(
    list.filter((conversation) => {
      if (filter === 'archived' && !conversation.archived) return false
      if (filter !== 'archived' && conversation.archived) return false
      if (filter === 'unread' && conversation.unreadCount === 0) return false
      if (filter === 'groups' && conversation.type !== 'group') return false

      if (!needle) return true

      return (
        conversation.title.toLowerCase().includes(needle) ||
        conversation.subtitle.toLowerCase().includes(needle) ||
        conversation.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        conversation.lastMessage?.body.toLowerCase().includes(needle) ||
        conversation.profile?.email.toLowerCase().includes(needle) ||
        conversation.members?.some((member) => member.name.toLowerCase().includes(needle))
      )
    }),
  )
}

export function countUnread(list: Conversation[]) {
  return list.reduce((total, conversation) => total + (conversation.archived ? 0 : conversation.unreadCount), 0)
}

export function onlineMembers(conversation: Conversation) {
  return conversation.members?.filter((member) => member.presence === 'online') ?? []
}
