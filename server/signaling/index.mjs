/**
 * Nexlang Chat · servidor de señalización para llamadas y videollamadas
 * ---------------------------------------------------------------------
 * Retransmite los mensajes de negociación (invitación, SDP e ICE) entre los
 * navegadores de los usuarios. El audio y el vídeo NUNCA pasan por aquí: van
 * directos entre navegadores por WebRTC (P2P), por eso las llamadas no tienen
 * límite de tiempo ni coste por minuto.
 *
 * Uso:
 *   node server/signaling/index.mjs
 *
 * Variables de entorno (todas opcionales):
 *   SIGNALING_PORT                  puerto HTTP/WS            (8081)
 *   SIGNALING_HOST                  interfaz                  (0.0.0.0)
 *   SIGNALING_PATH                  ruta del upgrade WS       (/)
 *   SIGNALING_ALLOWED_ORIGINS       orígenes permitidos       (*)
 *   SIGNALING_REQUIRE_TOKEN         exige ?token=…            (true)
 *   SIGNALING_VERIFY_URL            endpoint de la API para validar el token
 *   SIGNALING_VERIFY_TIMEOUT_MS     timeout de esa validación (5000)
 *   SIGNALING_MAX_MESSAGE_BYTES     tamaño máximo por mensaje (65536)
 *   SIGNALING_MAX_MESSAGES_PER_SECOND límite anti-abuso     (60)
 *   SIGNALING_HEARTBEAT_MS          ping/pong                 (30000)
 *
 * El token se valida (si `SIGNALING_VERIFY_URL` está definido) haciendo una
 * petición con `Authorization: <token_type> <token>`. La identidad (`userId`)
 * la declara el cliente en el mensaje `hello`; para producción se recomienda
 * que esa validación devuelva también el id del usuario (ver README).
 */

import { createServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

/* -------------------------------------------------------------------------- */
/* Configuración                                                              */
/* -------------------------------------------------------------------------- */

const PORT = Number(process.env.SIGNALING_PORT ?? process.env.PORT ?? 8081)
const HOST = process.env.SIGNALING_HOST ?? '0.0.0.0'
const PATHNAME = process.env.SIGNALING_PATH ?? '/'
const ALLOWED_ORIGINS = (process.env.SIGNALING_ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const REQUIRE_TOKEN = (process.env.SIGNALING_REQUIRE_TOKEN ?? 'true') !== 'false'
const VERIFY_URL = process.env.SIGNALING_VERIFY_URL ?? ''
const VERIFY_TIMEOUT_MS = Number(process.env.SIGNALING_VERIFY_TIMEOUT_MS ?? 5000)
const MAX_MESSAGE_BYTES = Number(process.env.SIGNALING_MAX_MESSAGE_BYTES ?? 64 * 1024)
const MAX_MESSAGES_PER_SECOND = Number(process.env.SIGNALING_MAX_MESSAGES_PER_SECOND ?? 60)
const HEARTBEAT_MS = Number(process.env.SIGNALING_HEARTBEAT_MS ?? 30_000)

/** Mensajes que el servidor reenvía al destinatario. */
const RELAY_TYPES = new Set([
  'call:invite',
  'call:ringing',
  'call:accept',
  'call:reject',
  'call:cancel',
  'call:end',
  'call:busy',
  'call:offer',
  'call:answer',
  'call:ice',
])

const CLOSE = {
  replaced: 4000, // misma cuenta abierta en otra pestaña
  unauthorized: 4001,
  forbidden: 4003,
  malformed: 4004,
  rateLimited: 4008,
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const log = (...args) => console.log('[signaling]', ...args)
const warn = (...args) => console.warn('[signaling]', ...args)

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Ids de usuario razonables: texto corto, sin espacios ni caracteres raros. */
const isValidUserId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 64 && !/[\s/\\?#]/.test(value)

const isValidCallId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && !/\s/.test(value)

const truncate = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '')

function originAllowed(origin) {
  if (ALLOWED_ORIGINS.includes('*')) return true
  if (!origin) return false
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed === origin) return true
    // Comodín de subdominio: *.nexlang.io
    if (allowed.startsWith('*.')) return origin.endsWith(allowed.slice(1))
    return false
  })
}

/**
 * Valida el token contra la API real.
 * Devuelve `{ ok }` o `{ ok: false, reason }`.
 */
async function verifyToken(token, origin) {
  if (!VERIFY_URL) return { ok: true }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        ...(origin ? { Origin: origin } : {}),
      },
      signal: controller.signal,
    })

    if (response.ok) return { ok: true }
    if (response.status === 401 || response.status === 403) return { ok: false, reason: 'token' }
    // Un 5xx no debe tumbar las llamadas: se acepta y queda el log de aviso.
    warn(`la verificación del token devolvió ${response.status}; se permite la conexión`)
    return { ok: true }
  } catch (error) {
    warn(`no se pudo verificar el token (${error?.message ?? error}); se permite la conexión`)
    return { ok: true }
  } finally {
    clearTimeout(timeout)
  }
}

/* -------------------------------------------------------------------------- */
/* Estado en memoria                                                          */
/* -------------------------------------------------------------------------- */

/** userId → { socket, name, token, connectedAt, tokens, refilledAt } */
const clients = new Map()
/** callId → Set<userId> (para avisar a todos si alguien cuelga) */
const calls = new Map()

function send(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) return
  try {
    socket.send(JSON.stringify(message))
  } catch (error) {
    warn('no se pudo enviar el mensaje:', error?.message ?? error)
  }
}

function broadcast(message, exceptUserId) {
  for (const [userId, entry] of clients) {
    if (userId === exceptUserId) continue
    send(entry.socket, message)
  }
}

function takeRateToken(entry) {
  const now = Date.now()
  const elapsed = (now - entry.refilledAt) / 1000
  entry.tokens = Math.min(MAX_MESSAGES_PER_SECOND, entry.tokens + elapsed * MAX_MESSAGES_PER_SECOND)
  entry.refilledAt = now

  if (entry.tokens < 1) return false
  entry.tokens -= 1
  return true
}

/* -------------------------------------------------------------------------- */
/* Servidor HTTP + WebSocket                                                  */
/* -------------------------------------------------------------------------- */

const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        connections: clients.size,
        calls: calls.size,
        uptimeSeconds: Math.round(process.uptime()),
      }),
    )
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({
  server,
  path: PATHNAME,
  maxPayload: MAX_MESSAGE_BYTES,
  perMessageDeflate: false,
})

wss.on('connection', async (socket, request) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const token = url.searchParams.get('token') ?? ''
  const origin = request.headers.origin

  if (!originAllowed(origin)) {
    socket.close(CLOSE.forbidden, 'Origen no permitido')
    return
  }

  if (REQUIRE_TOKEN) {
    if (!token) {
      socket.close(CLOSE.unauthorized, 'Token requerido')
      return
    }
    const verification = await verifyToken(token, origin)
    if (!verification.ok) {
      socket.close(CLOSE.unauthorized, 'Token inválido')
      return
    }
  }

  let userId = null
  let callId = null

  socket.isAlive = true
  socket.on('pong', () => {
    socket.isAlive = true
  })

  /** Cierra la sesión de un usuario (reutilizado al reconectar/expulsar). */
  const unregister = () => {
    if (!userId) return
    const entry = clients.get(userId)
    if (entry?.socket === socket) {
      clients.delete(userId)
      broadcast({ type: 'presence', userId, status: 'offline' })
      log(`desconectado ${userId} (${clients.size} en línea)`)
    }

    if (callId) {
      const members = calls.get(callId)
      if (members) {
        members.delete(userId)
        if (members.size === 0) calls.delete(callId)
      }
    }
  }

  socket.on('message', (raw) => {
    let message
    try {
      message = JSON.parse(raw.toString())
    } catch {
      socket.close(CLOSE.malformed, 'JSON inválido')
      return
    }

    if (!isPlainObject(message) || typeof message.type !== 'string') {
      socket.send(JSON.stringify({ type: 'error', code: 'bad_message' }))
      return
    }

    /* ---------------------------- hello ---------------------------- */
    if (message.type === 'hello') {
      if (userId) {
        send(socket, { type: 'hello', ok: true, userId, resumed: true })
        return
      }

      const declaredId = String(message.userId ?? '')
      if (!isValidUserId(declaredId)) {
        socket.close(CLOSE.unauthorized, 'userId inválido')
        return
      }

      userId = declaredId
      callId = null

      const previous = clients.get(userId)
      if (previous && previous.socket !== socket) {
        send(previous.socket, { type: 'session:replaced' })
        previous.socket.close(CLOSE.replaced, 'Sesión reemplazada')
      }

      clients.set(userId, {
        socket,
        name: truncate(message.name, 120),
        token,
        connectedAt: Date.now(),
        tokens: MAX_MESSAGES_PER_SECOND,
        refilledAt: Date.now(),
      })

      send(socket, {
        type: 'hello',
        ok: true,
        userId,
        online: [...clients.keys()].filter((id) => id !== userId),
        serverTime: Date.now(),
      })
      broadcast({ type: 'presence', userId, status: 'online', name: truncate(message.name, 120) }, userId)
      log(`conectado ${userId} · ${truncate(message.name, 60) || 'sin nombre'} (${clients.size} en línea)`)
      return
    }

    if (!userId) {
      socket.close(CLOSE.unauthorized, 'Primero envía hello')
      return
    }

    const entry = clients.get(userId)
    if (!entry) return

    if (!takeRateToken(entry)) {
      socket.close(CLOSE.rateLimited, 'Demasiados mensajes')
      return
    }

    /* ---------------------------- ping ----------------------------- */
    if (message.type === 'ping') return send(socket, { type: 'pong', at: Date.now() })

    /* --------------------------- relay ----------------------------- */
    if (!RELAY_TYPES.has(message.type)) {
      send(socket, { type: 'error', code: 'bad_type', received: message.type })
      return
    }

    const call = String(message.callId ?? '')
    const to = String(message.to ?? '')

    if (!isValidCallId(call) || !isValidUserId(to)) {
      send(socket, { type: 'error', code: 'bad_message' })
      return
    }

    // Solo quien inicia la llamada fija el `callId` en el servidor.
    if (message.type === 'call:invite') {
      const members = calls.get(call) ?? new Set()
      members.add(userId)
      calls.set(call, members)
    }

    const target = clients.get(to)
    if (!target) {
      if (message.type === 'call:invite') {
        send(socket, { type: 'call:unavailable', callId: call, to })
      }
      return
    }

    if (message.type === 'call:accept' || message.type === 'call:ringing') {
      const members = calls.get(call) ?? new Set()
      members.add(userId)
      calls.set(call, members)
      callId = call
    }

    send(target.socket, {
      ...message,
      from: userId,
      fromName: entry.name || undefined,
      relayedAt: Date.now(),
    })
  })

  socket.on('close', () => {
    unregister()
  })

  socket.on('error', (error) => {
    warn(`error de socket (${userId ?? 'anónimo'}):`, error?.message ?? error)
  })
})

/* Apaga los sockets que no responden al ping. */
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (socket.isAlive === false) {
      socket.terminate()
      continue
    }
    socket.isAlive = false
    try {
      socket.ping()
    } catch {
      socket.terminate()
    }
  }
}, HEARTBEAT_MS)

wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, HOST, () => {
  log(`escuchando en ws://${HOST}:${PORT}${PATHNAME === '/' ? '' : PATHNAME}`)
  log(
    `orígenes=${ALLOWED_ORIGINS.join(',')} · token=${REQUIRE_TOKEN ? 'requerido' : 'libre'} · ` +
      `verificación=${VERIFY_URL || 'desactivada'}`,
  )
})

const shutdown = (signal) => {
  log(`recibido ${signal}; cerrando…`)
  clearInterval(heartbeat)
  for (const socket of wss.clients) socket.close(1001, 'Servidor reiniciado')
  wss.close(() => server.close(() => process.exit(0)))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

export { server, wss }
