import { ApiError } from '@/lib/api/errors'
import { accentFor, EMAIL_PATTERN, maskEmail, normalizeIdentifier, sleep, USERNAME_PATTERN } from '@/lib/format'
import type {
  AuthUser,
  CodeChallenge,
  Conversation,
  ConversationMember,
  DirectoryPerson,
  Message,
  SessionPayload,
} from '@/types'

import { getChallenges, getDb, persistDb, resetDb, saveChallenges, syncSelfIdentity, type StoredChallenge } from './db'
import { emitDemoEvent } from './events'
import { AUTO_REPLIES } from './seed'

interface MockRequestInit {
  method?: string
  body?: unknown
  signal?: AbortSignal
  token?: string | null
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8
const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_AFTER_SECONDS = 30
const MAX_ATTEMPTS = 5

const DEMO_EMAIL = 'devon.lane@nexlang.io'
const DEMO_PASSWORDLESS_USER: AuthUser = {
  id: 'me',
  name: 'Devon Lane',
  email: DEMO_EMAIL,
  username: 'devon.lane',
  role: 'owner',
  title: 'Team Lead · Soporte',
  workspace: 'Nexlang HQ',
  presence: 'online',
  avatarUrl: null,
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000))
const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`

const encode = (value: string) => btoa(value).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const decode = (value: string) => atob(value.replace(/-/g, '+').replace(/_/g, '/'))

function signToken(userId: string) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = { sub: userId, iat: issuedAt, exp: issuedAt + TOKEN_TTL_SECONDS }
  return `demo.${encode(JSON.stringify(payload))}.${randomCode()}`
}

function readToken(token: string | null | undefined) {
  if (!token) return null
  const [, payload] = token.split('.')
  if (!payload) return null
  try {
    const parsed = JSON.parse(decode(payload)) as { sub?: string; exp?: number }
    if (!parsed.sub || !parsed.exp) return null
    if (parsed.exp * 1000 <= Date.now()) return null
    return { userId: parsed.sub, exp: parsed.exp }
  } catch {
    return null
  }
}

function requireAuth(token: string | null | undefined) {
  const session = readToken(token)
  if (!session) {
    throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', {
      status: 401,
      code: 'unauthorized',
    })
  }
  return session
}

function displayNameFrom(identifier: string) {
  const local = identifier.split('@')[0] ?? identifier
  const words = local.split(/[._\-+\s]+/).filter(Boolean)
  if (words.length === 0) return 'Miembro Nexlang'
  return words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function validateIdentifier(raw: unknown) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new ApiError('Ingresa tu correo o usuario.', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { identifier: ['Este campo es obligatorio.'] },
    })
  }

  if (value.includes('@')) {
    if (!EMAIL_PATTERN.test(value)) {
      throw new ApiError('Ingresa un correo válido, por ejemplo nombre@empresa.com.', {
        status: 422,
        code: 'validation_error',
        fieldErrors: { identifier: ['El correo no tiene un formato válido.'] },
      })
    }
    return value.toLowerCase()
  }

  if (!USERNAME_PATTERN.test(value)) {
    throw new ApiError('El usuario debe tener entre 3 y 32 caracteres (letras, números, punto o guion).', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { identifier: ['Usa entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.'] },
    })
  }

  return value.toLowerCase()
}

function upsertChallenge(challenge: StoredChallenge) {
  const challenges = getChallenges()
  const entries = Object.entries(challenges)
    .filter(([, item]) => item.expiresAt > Date.now())
    .slice(-10)
  const next = Object.fromEntries(entries)
  next[challenge.id] = challenge
  saveChallenges(next)
}

function buildChallenge(identifier: string): StoredChallenge {
  const normalized = normalizeIdentifier(identifier)
  return {
    id: randomId(),
    identifier: normalized.value,
    email: normalized.email,
    username: normalized.username,
    name: displayNameFrom(normalized.email),
    code: randomCode(),
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS,
  }
}

function challengeResponse(challenge: StoredChallenge): CodeChallenge {
  return {
    challengeId: challenge.id,
    identifier: challenge.identifier,
    emailHint: maskEmail(challenge.email),
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    resendAfterSeconds: RESEND_AFTER_SECONDS,
    demoCode: challenge.code,
  }
}

function findConversation(id: string) {
  const db = getDb()
  const conversation = db.conversations.find((item) => item.id === id)
  if (!conversation) {
    throw new ApiError('La conversación no existe o fue eliminada.', {
      status: 404,
      code: 'not_found',
    })
  }
  return conversation
}

function touchConversation(conversation: Conversation, message: Message) {
  conversation.updatedAt = message.createdAt
  conversation.lastMessage = {
    body: message.attachment ? `📎 ${message.attachment.name}` : message.body,
    authorName: message.authorName,
    createdAt: message.createdAt,
    role: message.role,
  }
}

function scheduleVisitorReply(conversation: Conversation) {
  const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)] ?? AUTO_REPLIES[0]!
  const conversationId = conversation.id
  const conversationTitle = conversation.title

  window.setTimeout(() => {
    emitDemoEvent({ type: 'typing', conversationId, name: conversationTitle, typing: true })
  }, 900)

  window.setTimeout(() => {
    const db = getDb()
    const target = db.conversations.find((item) => item.id === conversationId)
    if (!target) return

    const incoming: Message = {
      id: randomId(),
      conversationId,
      role: 'visitor',
      authorId: `p-${conversationId}`,
      authorName: target.type === 'group' ? 'Kate Morrison' : target.title,
      body: reply,
      createdAt: new Date().toISOString(),
      status: 'delivered',
      kind: 'text',
      attachment: null,
    }

    db.messages[conversationId] = [...(db.messages[conversationId] ?? []), incoming]
    touchConversation(target, incoming)
    if (document.visibilityState !== 'visible') target.unreadCount += 1
    persistDb()

    emitDemoEvent({ type: 'typing', conversationId, name: conversationTitle, typing: false })
    emitDemoEvent({ type: 'message', conversationId })
  }, 2600)
}

/* ------------------------------------------------------------------ */
/* handlers                                                           */
/* ------------------------------------------------------------------ */

type Handler = (context: {
  params: Record<string, string>
  body: Record<string, unknown>
  query: URLSearchParams
  token?: string | null
}) => unknown

const requestCode: Handler = ({ body }) => {
  const identifier = validateIdentifier(body.identifier)
  const challenge = buildChallenge(identifier)
  upsertChallenge(challenge)
  return challengeResponse(challenge)
}

const resendCode: Handler = ({ body }) => {
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : ''
  const challenges = getChallenges()
  const challenge = challenges[challengeId]
  if (!challenge) {
    throw new ApiError('El proceso de verificación expiró. Solicita un código nuevo.', {
      status: 410,
      code: 'challenge_expired',
    })
  }

  const refreshed: StoredChallenge = {
    ...challenge,
    code: randomCode(),
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS,
  }
  upsertChallenge(refreshed)
  return challengeResponse(refreshed)
}

const verifyCode: Handler = ({ body }) => {
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError('El código debe tener 6 dígitos.', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { code: ['Ingresa los 6 dígitos del código.'] },
    })
  }

  const challenges = getChallenges()
  const challenge = challenges[challengeId]
  if (!challenge) {
    throw new ApiError('Tu código expiró. Solicita uno nuevo para continuar.', {
      status: 410,
      code: 'challenge_expired',
    })
  }

  if (challenge.expiresAt <= Date.now()) {
    delete challenges[challengeId]
    saveChallenges(challenges)
    throw new ApiError('Tu código expiró. Solicita uno nuevo para continuar.', {
      status: 410,
      code: 'challenge_expired',
    })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw new ApiError('Demasiados intentos. Solicita un código nuevo.', {
      status: 429,
      code: 'too_many_attempts',
    })
  }

  if (challenge.code !== code) {
    challenge.attempts += 1
    challenges[challengeId] = challenge
    saveChallenges(challenges)
    const remaining = Math.max(0, MAX_ATTEMPTS - challenge.attempts)
    throw new ApiError(`El código no es correcto. Te quedan ${remaining} intentos.`, {
      status: 422,
      code: 'invalid_code',
      fieldErrors: { code: ['El código no coincide. Verifícalo e intenta de nuevo.'] },
    })
  }

  delete challenges[challengeId]
  saveChallenges(challenges)

  const user: AuthUser = {
    ...DEMO_PASSWORDLESS_USER,
    name: challenge.name,
    email: challenge.email,
    username: challenge.username,
  }

  syncSelfIdentity(user)

  return {
    accessToken: signToken(user.id),
    refreshToken: `refresh.${randomId()}`,
    expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    user,
  } satisfies SessionPayload
}

const me: Handler = ({ token }) => {
  const session = requireAuth(token)
  const db = getDb()
  return { ...db.me, id: session.userId }
}

const logout: Handler = () => ({ ok: true })

const listConversations: Handler = ({ token }) => {
  requireAuth(token)
  const db = getDb()
  return [...db.conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

const getConversation: Handler = ({ token, params }) => {
  requireAuth(token)
  const db = getDb()
  const conversation = findConversation(params.id ?? '')
  return {
    conversation,
    messages: db.messages[conversation.id] ?? [],
  }
}

const listMessages: Handler = ({ token, params }) => {
  requireAuth(token)
  const conversation = findConversation(params.id ?? '')
  return getDb().messages[conversation.id] ?? []
}

const sendMessage: Handler = ({ token, params, body }) => {
  requireAuth(token)
  const db = getDb()
  const conversation = findConversation(params.id ?? '')
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  const attachment = body.attachment as Message['attachment']

  if (!text && !attachment) {
    throw new ApiError('Escribe un mensaje antes de enviarlo.', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { body: ['El mensaje está vacío.'] },
    })
  }

  if (text.length > 4000) {
    throw new ApiError('El mensaje es demasiado largo (máximo 4000 caracteres).', {
      status: 422,
      code: 'validation_error',
    })
  }

  const message: Message = {
    id: randomId(),
    conversationId: conversation.id,
    role: 'agent',
    authorId: 'me',
    authorName: db.me.name,
    body: text,
    createdAt: new Date().toISOString(),
    status: 'sent',
    kind: 'text',
    attachment: attachment ?? null,
  }

  db.messages[conversation.id] = [...(db.messages[conversation.id] ?? []), message]
  conversation.unreadCount = 0
  touchConversation(conversation, message)
  persistDb()

  if (conversation.type === 'direct') scheduleVisitorReply(conversation)

  return message
}

const markRead: Handler = ({ token, params }) => {
  requireAuth(token)
  const conversation = findConversation(params.id ?? '')
  if (conversation.unreadCount !== 0) {
    conversation.unreadCount = 0
    persistDb()
    emitDemoEvent({ type: 'message', conversationId: conversation.id })
  }
  return conversation
}

const updateConversation: Handler = ({ token, params, body }) => {
  requireAuth(token)
  const conversation = findConversation(params.id ?? '')

  if (typeof body.pinned === 'boolean') conversation.pinned = body.pinned
  if (typeof body.muted === 'boolean') conversation.muted = body.muted
  if (typeof body.archived === 'boolean') conversation.archived = body.archived
  if (typeof body.notes === 'string') conversation.notes = body.notes
  if (body.status === 'open' || body.status === 'pending' || body.status === 'closed') {
    conversation.status = body.status
  }
  if (Array.isArray(body.tags)) {
    conversation.tags = body.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8)
  }

  persistDb()
  return conversation
}

const createConversation: Handler = ({ token, body }) => {
  requireAuth(token)
  const db = getDb()
  const type = body.type === 'group' ? 'group' : 'direct'
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.filter((id): id is string => typeof id === 'string')
    : []

  if (type === 'group' && !title) {
    throw new ApiError('Ponle un nombre al grupo.', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { title: ['El nombre del grupo es obligatorio.'] },
    })
  }

  if (memberIds.length === 0) {
    throw new ApiError('Selecciona al menos una persona.', {
      status: 422,
      code: 'validation_error',
      fieldErrors: { memberIds: ['Selecciona al menos un contacto.'] },
    })
  }

  const selected = db.directory.filter((person) => memberIds.includes(person.id))

  if (selected.length === 0) {
    throw new ApiError('No encontramos a las personas seleccionadas.', {
      status: 422,
      code: 'validation_error',
    })
  }

  const now = new Date().toISOString()
  const id = `c-${randomId().slice(0, 8)}`
  const groupMembers: ConversationMember[] = [
    { id: 'me', name: db.me.name, role: 'owner', presence: 'online', email: db.me.email },
    ...selected.map((person, index) => ({
      id: person.id,
      name: person.name,
      role: index === 0 ? ('admin' as const) : ('member' as const),
      presence: person.presence,
      email: person.email,
    })),
  ]

  const conversation: Conversation = {
    id,
    type,
    title: type === 'group' ? title : selected[0]!.name,
    subtitle:
      type === 'group'
        ? `${groupMembers.length} miembros`
        : `Conversación con ${selected[0]!.name}`,
    channel: 'app',
    status: 'open',
    updatedAt: now,
    createdAt: now,
    unreadCount: 0,
    pinned: false,
    muted: false,
    archived: false,
    tags: type === 'group' ? ['Interno'] : [],
    notes: '',
    assignee: { id: 'me', name: db.me.name, presence: 'online' },
    stats: { sessions: 1, durationSeconds: 0, tickets: 0 },
    accent: accentFor(id),
    ...(type === 'group'
      ? {
          members: groupMembers,
          description: typeof body.description === 'string' ? body.description : '',
        }
      : {
          profile: {
            fullName: selected[0]!.name,
            email: selected[0]!.email,
            phone: '',
            location: 'Sin ubicación',
            visitorType: 'Nuevo',
            gender: '—',
            presence: selected[0]!.presence,
            browser: 'Nexlang Chat',
            timezone: 'GMT-6',
          },
        }),
    lastMessage: null,
  }

  const intro: Message = {
    id: randomId(),
    conversationId: id,
    role: 'system',
    authorId: 'system',
    authorName: 'Sistema',
    body:
      type === 'group'
        ? `Grupo "${title}" creado por ${db.me.name}`
        : `Conversación iniciada con ${selected[0]!.name}`,
    createdAt: now,
    status: 'sent',
    kind: 'system',
  }

  db.conversations.unshift(conversation)
  db.messages[id] = [intro]
  persistDb()

  return conversation
}

const listDirectory: Handler = ({ token }) => {
  requireAuth(token)
  return getDb().directory as DirectoryPerson[]
}

const resetDemo: Handler = () => {
  resetDb()
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* router                                                             */
/* ------------------------------------------------------------------ */

interface Route {
  method: string
  pattern: RegExp
  keys: string[]
  handler: Handler
}

function route(method: string, path: string, handler: Handler): Route {
  const keys: string[] = []
  const pattern = new RegExp(
    `^${path.replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
      keys.push(key)
      return '([^/]+)'
    })}$`,
  )
  return { method, pattern, keys, handler }
}

const routes: Route[] = [
  route('POST', '/auth/request-code', requestCode),
  route('POST', '/auth/resend-code', resendCode),
  route('POST', '/auth/verify-code', verifyCode),
  route('GET', '/auth/me', me),
  route('POST', '/auth/logout', logout),
  route('GET', '/conversations', listConversations),
  route('POST', '/conversations', createConversation),
  route('GET', '/conversations/:id', getConversation),
  route('PATCH', '/conversations/:id', updateConversation),
  route('GET', '/conversations/:id/messages', listMessages),
  route('POST', '/conversations/:id/messages', sendMessage),
  route('POST', '/conversations/:id/read', markRead),
  route('GET', '/directory', listDirectory),
  route('POST', '/demo/reset', resetDemo),
]

export async function mockRequest<T>(path: string, init: MockRequestInit): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const url = new URL(path, 'https://demo.nexlang.local')
  const startedAt = performance.now()

  // Simulate realistic network latency.
  const authRoute = url.pathname.startsWith('/auth/')
  await sleep(authRoute ? 650 + Math.random() * 450 : 140 + Math.random() * 260)

  if (init.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const params: Record<string, string> = {}
  let matched: Route | undefined

  for (const candidate of routes) {
    if (candidate.method !== method) continue
    const result = candidate.pattern.exec(url.pathname)
    if (!result) continue
    matched = candidate
    candidate.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(result[index + 1] ?? '')
    })
    break
  }

  if (!matched) {
    throw new ApiError(`Ruta de demo no encontrada: ${method} ${url.pathname}`, {
      status: 404,
      code: 'not_found',
    })
  }

  const body =
    init.body && typeof init.body === 'object' ? (init.body as Record<string, unknown>) : {}

  try {
    return matched.handler({ params, body, query: url.searchParams, token: init.token }) as T
  } finally {
    if (import.meta.env.DEV) {
      const elapsed = Math.round(performance.now() - startedAt)
      console.debug(`[demo-api] ${method} ${url.pathname} · ${elapsed}ms`)
    }
  }
}
