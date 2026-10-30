import type { ClientSignal, ServerSignal, SignalingConnection } from './types'
import { buildSignalingUrl, SIGNALING_CONFIGURED } from './config'

type SignalListener = (signal: ServerSignal) => void
type StatusListener = (status: SignalingConnection) => void

export interface SignalingIdentity {
  token: string
  userId: string
  name?: string
}

const HEARTBEAT_MS = 25_000
const MAX_RECONNECT_DELAY_MS = 15_000
/** Códigos del servidor que no deben reintentar la conexión. */
const FATAL_CLOSE_CODES = new Set([4000, 4001, 4003])

/**
 * Cliente WebSocket del servidor de señalización.
 *
 * Solo transporta la negociación (invitaciones, SDP e ICE). El audio y el
 * vídeo viajan directamente entre navegadores, así que una desconexión de
 * este socket no corta una llamada ya establecida: se reconecta en segundo
 * plano.
 */
export class SignalingClient {
  private socket: WebSocket | null = null
  private identity: SignalingIdentity | null = null
  private status: SignalingConnection = 'offline'
  private signalListeners = new Set<SignalListener>()
  private statusListeners = new Set<StatusListener>()
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private manualClose = false
  private lastSignal: ServerSignal | null = null

  getStatus() {
    return this.status
  }

  onSignal(listener: SignalListener) {
    this.signalListeners.add(listener)
    return () => this.signalListeners.delete(listener)
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  connect(identity: SignalingIdentity) {
    this.identity = identity
    this.manualClose = false

    if (!SIGNALING_CONFIGURED || typeof WebSocket === 'undefined') {
      this.setStatus('offline')
      return
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      // Misma sesión: solo se actualiza la identidad.
      if (this.socket.readyState === WebSocket.OPEN) this.sendHello()
      return
    }

    this.open()
  }

  disconnect() {
    this.manualClose = true
    this.identity = null
    this.clearTimers()

    if (this.socket) {
      const socket = this.socket
      this.socket = null
      try {
        socket.close(1000, 'Cliente desconectado')
      } catch {
        /* socket ya cerrado */
      }
    }

    this.setStatus('offline')
  }

  /** Envía un mensaje al servidor. Devuelve `false` si el socket no está listo. */
  send(signal: ClientSignal) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false

    try {
      this.socket.send(JSON.stringify(signal))
      return true
    } catch {
      return false
    }
  }

  /* ------------------------------------------------------------------ */
  /* Interno                                                            */
  /* ------------------------------------------------------------------ */

  private open() {
    if (!this.identity) return

    this.setStatus('connecting')
    const url = buildSignalingUrl(this.identity.token)

    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      this.setStatus('offline')
      this.scheduleReconnect()
      return
    }

    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('online')
      this.sendHello()
      this.startHeartbeat()
    }

    socket.onmessage = (event) => {
      let signal: ServerSignal
      try {
        signal = JSON.parse(String(event.data)) as ServerSignal
      } catch {
        return
      }

      if (signal.type === 'session:replaced') {
        this.manualClose = true
      }

      this.lastSignal = signal
      for (const listener of this.signalListeners) listener(signal)
    }

    socket.onclose = (event) => {
      this.clearTimers()
      this.socket = null

      if (this.manualClose) {
        this.setStatus('offline')
        return
      }

      // Token inválido u origen rechazado: no tiene sentido reintentar.
      if (FATAL_CLOSE_CODES.has(event.code)) {
        this.setStatus('offline')
        return
      }

      this.setStatus('connecting')
      this.scheduleReconnect()
    }

    socket.onerror = () => {
      // `onclose` se encarga del estado y del reintento.
    }
  }

  private sendHello() {
    if (!this.identity) return
    this.send({
      type: 'hello',
      userId: this.identity.userId,
      name: this.identity.name,
    })
  }

  private startHeartbeat() {
    this.clearHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) this.send({ type: 'ping' })
    }, HEARTBEAT_MS)
  }

  private scheduleReconnect() {
    if (this.manualClose || !this.identity) return
    if (this.reconnectTimer) return

    this.reconnectAttempts += 1
    const delay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      800 * 2 ** Math.min(this.reconnectAttempts - 1, 5),
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.manualClose) return
      this.open()
    }, delay)
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearTimers() {
    this.clearHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setStatus(status: SignalingConnection) {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  /** Último mensaje recibido (útil para depurar). */
  getLastSignal() {
    return this.lastSignal
  }
}

export const signalingClient = new SignalingClient()
