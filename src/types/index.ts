export type Presence = 'online' | 'away' | 'offline'

export type ConversationType = 'direct' | 'group'

export type Channel = 'web' | 'email' | 'whatsapp' | 'phone' | 'app'

export type ConversationStatus = 'open' | 'pending' | 'closed'

export type MessageAuthorRole = 'visitor' | 'agent' | 'member' | 'system'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string
  role: string
  title: string
  workspace: string
  avatarUrl?: string | null
  presence: Presence
}

export interface SessionPayload {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: AuthUser
}

export interface ConversationStats {
  sessions: number
  durationSeconds: number
  tickets: number
}

export interface Assignee {
  id: string
  name: string
  presence: Presence
}

export interface VisitorProfile {
  fullName: string
  email: string
  phone: string
  location: string
  visitorType: string
  gender: string
  presence: Presence
  browser: string
  timezone: string
}

export interface ConversationMember {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  presence: Presence
  email: string
}

export interface MessageAttachment {
  id: string
  name: string
  size: string
  kind: 'pdf' | 'image' | 'sheet' | 'doc' | 'link'
}

export interface Message {
  id: string
  conversationId: string
  role: MessageAuthorRole
  authorId: string
  authorName: string
  body: string
  createdAt: string
  status: MessageStatus
  kind?: 'text' | 'system'
  attachment?: MessageAttachment | null
}

export interface Conversation {
  id: string
  type: ConversationType
  title: string
  subtitle: string
  channel: Channel
  status: ConversationStatus
  updatedAt: string
  createdAt: string
  unreadCount: number
  pinned: boolean
  muted: boolean
  archived: boolean
  tags: string[]
  notes: string
  assignee: Assignee
  stats: ConversationStats
  profile?: VisitorProfile
  members?: ConversationMember[]
  description?: string
  accent: string
  lastMessage?: {
    body: string
    authorName: string
    createdAt: string
    role: MessageAuthorRole
  } | null
}

export interface ConversationDetail {
  conversation: Conversation
  messages: Message[]
}

export interface DirectoryPerson {
  id: string
  name: string
  email: string
  role: string
  presence: Presence
  accent: string
}

export interface ApiFieldErrors {
  [field: string]: string[] | undefined
}
