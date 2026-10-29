import type { AuthUser, Conversation, DirectoryPerson, Message } from '@/types'

import { conversations as seedConversations, directory as seedDirectory, ME, messagesByConversation } from './seed'

const DB_KEY = 'nexlang.demo.db.v1'
const CHALLENGE_KEY = 'nexlang.demo.challenges.v1'
const DB_VERSION = 4

export interface DemoDatabase {
  version: number
  me: AuthUser
  conversations: Conversation[]
  messages: Record<string, Message[]>
  directory: DirectoryPerson[]
}

export interface StoredChallenge {
  id: string
  identifier: string
  email: string
  username: string
  name: string
  code: string
  attempts: number
  createdAt: number
  expiresAt: number
}

function createDatabase(): DemoDatabase {
  return {
    version: DB_VERSION,
    me: { ...ME },
    conversations: structuredClone(seedConversations),
    messages: structuredClone(messagesByConversation),
    directory: structuredClone(seedDirectory),
  }
}

let cache: DemoDatabase | null = null

function isDatabase(value: unknown): value is DemoDatabase {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DemoDatabase>
  return (
    candidate.version === DB_VERSION &&
    Array.isArray(candidate.conversations) &&
    typeof candidate.messages === 'object' &&
    candidate.messages !== null
  )
}

export function getDb(): DemoDatabase {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isDatabase(parsed)) {
        cache = parsed
        return cache
      }
    }
  } catch {
    // corrupted storage — fall through to a fresh seed
  }

  cache = createDatabase()
  persistDb()
  return cache
}

export function persistDb() {
  if (!cache) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch {
    // storage full / private mode: the demo keeps working in memory
  }
}

export function resetDb() {
  cache = createDatabase()
  persistDb()
  return cache
}

export function getChallenges(): Record<string, StoredChallenge> {
  try {
    const raw = sessionStorage.getItem(CHALLENGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, StoredChallenge>
  } catch {
    // ignore
  }
  return {}
}

export function saveChallenges(challenges: Record<string, StoredChallenge>) {
  try {
    sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges))
  } catch {
    // ignore
  }
}

export function syncSelfIdentity(user: Pick<AuthUser, 'name' | 'email' | 'username'>) {
  const db = getDb()
  if (db.me.name === user.name && db.me.email === user.email) return

  db.me = { ...db.me, name: user.name, email: user.email, username: user.username }

  for (const message of Object.values(db.messages).flat()) {
    if (roleBelongsToSelf(message) && message.authorName !== user.name) {
      message.authorName = user.name
    }
  }

  for (const conversation of db.conversations) {
    if (conversation.lastMessage && conversation.lastMessage.role === 'agent') {
      conversation.lastMessage.authorName = user.name
    }
    if (conversation.members) {
      conversation.members = conversation.members.map((member) =>
        member.id === 'me' ? { ...member, name: user.name, email: user.email } : member,
      )
    }
    if (conversation.assignee.id === 'me') {
      conversation.assignee = { ...conversation.assignee, name: user.name }
    }
  }

  persistDb()
}

function roleBelongsToSelf(message: Message) {
  return message.authorId === 'me' || message.role === 'agent'
}
