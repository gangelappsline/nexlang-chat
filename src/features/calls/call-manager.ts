import { toast } from 'sonner'

import type { Conversation } from '@/types'

import { WEBRTC_SUPPORTED } from './config'
import { startRingtone, stopRingtone } from './ringtone'
import { signalingClient, type SignalingIdentity } from './signaling-client'
import { useCallStore } from './store'
import type {
  ActiveCall,
  CallKind,
  CallParticipant,
  IncomingCall,
  ServerSignal,
} from './types'
import {
  canShareScreen,
  createPeerConnection,
  describeMediaError,
  getLocalMedia,
} from './webrtc'

/** Tiempo que suena una llamada saliente antes de cancelarse sola. */
const RING_TIMEOUT_MS = 45_000
/** Tiempo que suena una llamada entrante antes de descartarse. */
const INCOMING_TIMEOUT_MS = 60_000
/** Máximo de personas por llamada (malla P2P). */
const MAX_PARTICIPANTS = 6

interface PeerRuntime {
  pc: RTCPeerConnection
  remoteStream: MediaStream
  pendingCandidates: RTCIceCandidateInit[]
  hasRemoteDescription: boolean
  iceRestarted: boolean
}

const toParticipant = (participant: {
  id: string
  name: string
  photoUrl?: string | null
}): CallParticipant => ({
  id: participant.id,
  name: participant.name,
  photoUrl: participant.photoUrl ?? null,
})

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** SDP listo para enviar (usa `toJSON` cuando el navegador lo expone). */
function sessionPayload(
  pc: RTCPeerConnection,
  fallback: RTCSessionDescriptionInit,
): RTCSessionDescriptionInit {
  const local = pc.localDescription
  if (!local) return fallback
  if (typeof local.toJSON === 'function') return local.toJSON()
  return { type: local.type, sdp: local.sdp ?? fallback.sdp }
}

/** Compara ids (numéricos si se puede) para decidir quién lanza la oferta. */
function compareIds(a: string, b: string) {
  const numberA = Number(a)
  const numberB = Number(b)
  if (Number.isFinite(numberA) && Number.isFinite(numberB) && numberA !== numberB) {
    return numberA < numberB ? -1 : 1
  }
  return a.localeCompare(b)
}

/**
 * Orquestador de llamadas.
 *
 * - Negocia por `signalingClient` (servidor propio del repo).
 * - El audio/vídeo viaja P2P por WebRTC: sin límite de tiempo ni coste por
 *   minuto, y la llamada sigue aunque se caiga la señalización.
 */
class CallManager {
  private identity: SignalingIdentity | null = null
  private localStream: MediaStream | null = null
  private localVideoTrack: MediaStreamTrack | null = null
  private screenTrack: MediaStreamTrack | null = null
  private peers = new Map<string, PeerRuntime>()
  private offSignal: (() => void) | null = null
  private offStatus: (() => void) | null = null
  private timeouts = new Set<ReturnType<typeof setTimeout>>()

  private get state() {
    return useCallStore.getState()
  }

  /* ------------------------------------------------------------------ */
  /* Ciclo de vida                                                      */
  /* ------------------------------------------------------------------ */

  /** Conecta la señalización con la sesión actual. Idempotente. */
  attach(identity: SignalingIdentity | null) {
    if (!identity?.token || !identity.userId) return
    const sameSession =
      this.identity?.userId === identity.userId && this.identity.token === identity.token

    this.identity = identity

    if (!this.offSignal) {
      this.offSignal = signalingClient.onSignal((signal) => {
        void this.handleSignal(signal)
      })
    }

    if (!this.offStatus) {
      this.offStatus = signalingClient.onStatus((status) => this.state.setConnection(status))
    }

    if (!sameSession) signalingClient.connect(identity)
  }

  detach() {
    this.hangup({ silent: true })
    signalingClient.disconnect()
    this.offSignal?.()
    this.offStatus?.()
    this.offSignal = null
    this.offStatus = null
    this.identity = null
  }

  /* ------------------------------------------------------------------ */
  /* Acciones públicas                                                  */
  /* ------------------------------------------------------------------ */

  /** Inicia una llamada con todos los demás participantes de la conversación. */
  async start(conversation: Conversation, kind: CallKind) {
    if (!this.identity) {
      toast.error('Inicia sesión para llamar')
      return
    }
    if (this.state.call) {
      toast.error('Ya hay una llamada en curso')
      return
    }
    if (this.state.incoming) {
      toast.error('Tienes una llamada entrante')
      return
    }
    if (this.state.connection !== 'online') {
      toast.error('Sin conexión de llamadas', {
        description: 'No pudimos conectar con el servidor de señalización. Reintentando…',
      })
      return
    }

    const others = conversation.participants.filter(
      (participant) => participant.id !== this.identity?.userId,
    )

    if (others.length === 0) {
      toast.error('No hay a quién llamar en esta conversación')
      return
    }
    if (others.length + 1 > MAX_PARTICIPANTS) {
      toast.error(`Las llamadas admiten hasta ${MAX_PARTICIPANTS} personas`)
      return
    }

    const stream = await this.capture(kind)
    if (!stream) return

    this.prepareLocalMedia(stream, kind)

    const callId = createId()
    const peers = others.map<CallParticipant>((participant) => toParticipant(participant))
    const call: ActiveCall = {
      id: callId,
      kind,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      direction: 'outgoing',
      status: 'dialing',
      activeSince: null,
      peers: peers.map((peer) => ({
        ...peer,
        status: 'ringing',
        stream: null,
        connectionState: 'idle',
      })),
      localStream: stream,
      selfMuted: false,
      cameraEnabled: kind === 'video',
      sharingScreen: false,
      error: null,
    }

    this.state.setCall(call)

    const participants: CallParticipant[] = [
      {
        id: this.identity.userId,
        name: this.identity.name ?? 'Tú',
        photoUrl: null,
      },
      ...peers,
    ]

    for (const peer of peers) {
      signalingClient.send({
        type: 'call:invite',
        to: peer.id,
        callId,
        kind,
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        participants,
      })
    }

    this.schedule(() => {
      if (this.state.call?.id === callId && this.state.call.status === 'dialing') {
        this.finish(callId, 'Nadie contestó la llamada')
      }
    }, RING_TIMEOUT_MS)
  }

  /** Acepta la llamada entrante. */
  async accept() {
    const incoming = this.state.incoming
    if (!incoming || !this.identity) return

    stopRingtone()
    this.clearTimeouts()

    const stream = await this.capture(incoming.kind)
    if (!stream) {
      this.reject('media_error')
      return
    }

    this.prepareLocalMedia(stream, incoming.kind)

    const others = incoming.participants.filter(
      (participant) => participant.id !== this.identity?.userId,
    )

    const call: ActiveCall = {
      id: incoming.id,
      kind: incoming.kind,
      conversationId: incoming.conversationId,
      conversationTitle: incoming.conversationTitle,
      direction: 'incoming',
      status: 'connecting',
      activeSince: null,
      peers: others.map((peer) => ({
        ...peer,
        status: 'ringing',
        stream: null,
        connectionState: 'idle',
      })),
      localStream: stream,
      selfMuted: false,
      cameraEnabled: incoming.kind === 'video',
      sharingScreen: false,
      error: null,
    }

    this.state.setIncoming(null)
    this.state.setCall(call)

    // Se avisa a todos los invitados: quien deba ofertar lo hará al recibirlo.
    for (const peer of others) {
      signalingClient.send({ type: 'call:accept', to: peer.id, callId: incoming.id })
    }

    for (const peer of others) {
      if (this.shouldInitiate(peer.id)) await this.createOffer(peer.id)
    }
  }

  /** Rechaza la llamada entrante. */
  reject(reason = 'declined') {
    const incoming = this.state.incoming
    stopRingtone()
    this.clearTimeouts()

    if (incoming) {
      signalingClient.send({
        type: 'call:reject',
        to: incoming.from.id,
        callId: incoming.id,
        reason,
      })
    }

    this.state.setIncoming(null)
  }

  /** Cuelga (o cancela la llamada saliente). */
  hangup(options: { silent?: boolean } = {}) {
    const call = this.state.call
    stopRingtone()
    this.clearTimeouts()

    if (!call) {
      this.closeAllPeers()
      this.state.setCall(null)
      return
    }

    for (const peer of call.peers) {
      signalingClient.send({ type: 'call:end', to: peer.id, callId: call.id })
    }

    this.closeAllPeers()
    this.state.setCall(null)

    if (!options.silent) toast.message('Llamada finalizada')
  }

  toggleMute() {
    const call = this.state.call
    if (!call) return

    const nextMuted = !call.selfMuted
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })

    this.state.updateCall((current) => ({ ...current, selfMuted: nextMuted }))
  }

  toggleCamera() {
    const call = this.state.call
    if (!call || call.kind !== 'video' || call.sharingScreen) return

    const tracks = this.localStream?.getVideoTracks() ?? []
    if (tracks.length === 0) return

    const nextEnabled = !call.cameraEnabled
    tracks.forEach((track) => {
      track.enabled = nextEnabled
    })

    this.state.updateCall((current) => ({ ...current, cameraEnabled: nextEnabled }))
  }

  /** Comparte pantalla sustituyendo la pista de vídeo enviada. */
  async toggleScreenShare() {
    const call = this.state.call
    if (!call) return

    if (call.sharingScreen) {
      await this.stopScreenShare()
      return
    }

    if (call.kind !== 'video') {
      toast.error('Compartir pantalla solo está disponible en videollamadas')
      return
    }
    if (!canShareScreen()) {
      toast.error('Tu navegador no permite compartir pantalla')
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const track = display.getVideoTracks()[0]
      if (!track) return

      this.screenTrack = track
      track.onended = () => {
        void this.stopScreenShare()
      }

      for (const runtime of this.peers.values()) {
        const sender = runtime.pc.getSenders().find((item) => item.track?.kind === 'video')
        if (sender) await sender.replaceTrack(track)
      }

      this.state.updateCall((current) => ({
        ...current,
        sharingScreen: true,
        localStream: display,
      }))
    } catch (error) {
      toast.error('No pudimos compartir tu pantalla', { description: describeMediaError(error) })
    }
  }

  private async stopScreenShare() {
    const screen = this.screenTrack
    this.screenTrack = null
    screen?.stop()

    if (this.localVideoTrack) {
      for (const runtime of this.peers.values()) {
        const sender = runtime.pc
          .getSenders()
          .find((item) => item.track?.kind === 'video' && item.track === screen)
        const fallback = sender ?? runtime.pc.getSenders().find((item) => item.track?.kind === 'video')
        if (fallback) await fallback.replaceTrack(this.localVideoTrack)
      }
    }

    this.state.updateCall((current) => ({
      ...current,
      sharingScreen: false,
      localStream: this.localStream,
    }))
  }

  /* ------------------------------------------------------------------ */
  /* Señales entrantes                                                  */
  /* ------------------------------------------------------------------ */

  private async handleSignal(signal: ServerSignal) {
    switch (signal.type) {
      case 'hello':
        this.state.setOnline(signal.online ?? [])
        return

      case 'pong':
        return

      case 'presence': {
        const online = this.state.online.filter((id) => id !== signal.userId)
        this.state.setOnline(
          signal.status === 'online' ? [...online, signal.userId] : online,
        )
        return
      }

      case 'session:replaced':
        toast.error('Llamadas abiertas en otra pestaña', {
          description: 'Esta pestaña ya no recibe llamadas.',
        })
        return

      case 'call:unavailable':
        this.state.updatePeer(signal.to, { status: 'rejected' })
        toast.error('La persona no está conectada', {
          description: 'Debe tener Nexlang Chat abierto para recibir la llamada.',
        })
        this.maybeFinishIfNobodyLeft()
        return

      case 'call:invite':
        this.handleInvite(signal)
        return

      case 'call:accept':
        await this.handleAccept(signal)
        return

      case 'call:reject':
        this.state.updatePeer(signal.from, { status: 'rejected' })
        this.describePeer(signal.from, 'rechazó la llamada')
        this.maybeFinishIfNobodyLeft()
        return

      case 'call:busy':
        this.state.updatePeer(signal.from, { status: 'rejected' })
        this.describePeer(signal.from, 'está en otra llamada')
        this.maybeFinishIfNobodyLeft()
        return

      case 'call:offer':
        await this.handleOffer(signal)
        return

      case 'call:answer':
        await this.handleAnswer(signal)
        return

      case 'call:ice':
        await this.handleCandidate(signal)
        return

      case 'call:end':
      case 'call:cancel':
        this.handleEnd(signal.from, signal.callId, signal.type === 'call:cancel')
        return

      default:
        return
    }
  }

  private handleInvite(signal: Extract<ServerSignal, { type: 'call:invite' }>) {
    if (this.state.call || this.state.incoming) {
      signalingClient.send({ type: 'call:busy', to: signal.from, callId: signal.callId })
      return
    }

    if (!WEBRTC_SUPPORTED) {
      signalingClient.send({
        type: 'call:reject',
        to: signal.from,
        callId: signal.callId,
        reason: 'unsupported',
      })
      return
    }

    const participants = signal.participants?.length
      ? signal.participants
      : [{ id: signal.from, name: signal.fromName ?? 'Usuario', photoUrl: null }]

    const from =
      participants.find((participant) => participant.id === signal.from) ?? participants[0]

    const incoming: IncomingCall = {
      id: signal.callId,
      kind: signal.kind,
      conversationId: signal.conversationId ?? null,
      conversationTitle: signal.conversationTitle || from.name,
      from,
      participants,
      receivedAt: Date.now(),
    }

    this.state.setIncoming(incoming)
    startRingtone()

    this.schedule(() => {
      if (this.state.incoming?.id === incoming.id) this.reject('timeout')
    }, INCOMING_TIMEOUT_MS)
  }

  private async handleAccept(signal: Extract<ServerSignal, { type: 'call:accept' }>) {
    const call = this.state.call
    if (!call || call.id !== signal.callId) return
    if (!call.peers.some((peer) => peer.id === signal.from)) return

    this.state.updatePeer(signal.from, { status: 'connecting' })
    stopRingtone()

    if (this.shouldInitiate(signal.from)) await this.createOffer(signal.from)
  }

  private async handleOffer(signal: Extract<ServerSignal, { type: 'call:offer' }>) {
    const call = this.state.call
    if (!call || call.id !== signal.callId) return

    const runtime = this.ensurePeer(signal.from)

    // Si ya teníamos una oferta local pendiente, se ignora (evita glare).
    if (runtime.pc.signalingState === 'have-local-offer') return

    await runtime.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
    runtime.hasRemoteDescription = true
    await this.flushCandidates(runtime)

    const answer = await runtime.pc.createAnswer()
    await runtime.pc.setLocalDescription(answer)

    signalingClient.send({
      type: 'call:answer',
      to: signal.from,
      callId: signal.callId,
      sdp: sessionPayload(runtime.pc, answer),
    })

    this.state.updatePeer(signal.from, { status: 'connecting' })
  }

  private async handleAnswer(signal: Extract<ServerSignal, { type: 'call:answer' }>) {
    const runtime = this.peers.get(signal.from)
    if (!runtime) return

    if (runtime.pc.signalingState === 'stable') return

    await runtime.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
    runtime.hasRemoteDescription = true
    await this.flushCandidates(runtime)
  }

  private async handleCandidate(signal: Extract<ServerSignal, { type: 'call:ice' }>) {
    const runtime = this.peers.get(signal.from)
    if (!runtime) return

    if (!runtime.hasRemoteDescription) {
      runtime.pendingCandidates.push(signal.candidate)
      return
    }

    try {
      await runtime.pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
    } catch {
      /* candidato tardío o duplicado */
    }
  }

  private handleEnd(from: string, callId: string, cancelled: boolean) {
    const incoming = this.state.incoming
    if (incoming && incoming.id === callId) {
      stopRingtone()
      this.clearTimeouts()
      this.state.setIncoming(null)
      if (cancelled) toast.message('Llamada cancelada')
      return
    }

    const call = this.state.call
    if (!call || call.id !== callId) return

    const runtime = this.peers.get(from)
    if (runtime) {
      runtime.pc.ontrack = null
      runtime.pc.onicecandidate = null
      runtime.pc.onconnectionstatechange = null
      runtime.pc.close()
      this.peers.delete(from)
    }

    this.state.updatePeer(from, { status: 'left', stream: null })

    if (this.peers.size === 0) {
      this.closeAllPeers()
      this.state.setCall(null)
      toast.message('Llamada finalizada')
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pares (RTCPeerConnection)                                          */
  /* ------------------------------------------------------------------ */

  private currentCallId() {
    return this.state.call?.id ?? ''
  }

  /** La oferta la crea siempre el id menor: evita ofertas simultáneas. */
  private shouldInitiate(peerId: string) {
    const selfId = this.identity?.userId
    if (!selfId) return false
    return compareIds(selfId, peerId) < 0
  }

  private ensurePeer(userId: string): PeerRuntime {
    const existing = this.peers.get(userId)
    if (existing) return existing

    const pc = createPeerConnection()
    const runtime: PeerRuntime = {
      pc,
      remoteStream: new MediaStream(),
      pendingCandidates: [],
      hasRemoteDescription: false,
      iceRestarted: false,
    }

    this.peers.set(userId, runtime)

    for (const track of this.localStream?.getTracks() ?? []) {
      pc.addTrack(track, this.localStream as MediaStream)
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      signalingClient.send({
        type: 'call:ice',
        to: userId,
        callId: this.currentCallId(),
        candidate: event.candidate.toJSON(),
      })
    }

    pc.ontrack = (event) => {
      const incoming = event.streams[0]
      if (incoming) {
        for (const track of incoming.getTracks()) {
          if (!runtime.remoteStream.getTracks().some((item) => item.id === track.id)) {
            runtime.remoteStream.addTrack(track)
          }
        }
      } else if (!runtime.remoteStream.getTracks().some((item) => item.id === event.track.id)) {
        runtime.remoteStream.addTrack(event.track)
      }

      this.state.updatePeer(userId, { stream: runtime.remoteStream })
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState

      if (state === 'connected') {
        this.state.updatePeer(userId, { status: 'connected', connectionState: state })
        this.markActive()
        return
      }

      if (state === 'failed') {
        this.state.updatePeer(userId, { status: 'connecting', connectionState: state })
        void this.recoverPeer(userId, runtime)
        return
      }

      if (state === 'closed') {
        this.state.updatePeer(userId, { connectionState: state, status: 'left' })
        return
      }

      this.state.updatePeer(userId, { connectionState: state })
    }

    return runtime
  }

  private async createOffer(userId: string, iceRestart = false) {
    const call = this.state.call
    if (!call) return

    const runtime = this.ensurePeer(userId)
    if (runtime.pc.signalingState !== 'stable') return

    const offer = await runtime.pc.createOffer(iceRestart ? { iceRestart } : undefined)
    await runtime.pc.setLocalDescription(offer)

    signalingClient.send({
      type: 'call:offer',
      to: userId,
      callId: call.id,
      sdp: sessionPayload(runtime.pc, offer),
    })

    this.state.updatePeer(userId, { status: 'connecting' })
  }

  private async recoverPeer(userId: string, runtime: PeerRuntime) {
    if (runtime.iceRestarted) {
      this.state.updatePeer(userId, { status: 'left' })
      this.describePeer(userId, 'perdió la conexión')
      return
    }

    runtime.iceRestarted = true

    if (this.shouldInitiate(userId)) {
      await this.createOffer(userId, true)
    }
  }

  private async flushCandidates(runtime: PeerRuntime) {
    const pending = [...runtime.pendingCandidates]
    runtime.pendingCandidates = []

    for (const candidate of pending) {
      try {
        await runtime.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        /* candidato inválido */
      }
    }
  }

  private closeAllPeers() {
    for (const runtime of this.peers.values()) {
      runtime.pc.ontrack = null
      runtime.pc.onicecandidate = null
      runtime.pc.onconnectionstatechange = null
      try {
        runtime.pc.close()
      } catch {
        /* ya cerrado */
      }
      runtime.remoteStream.getTracks().forEach((track) => track.stop())
    }

    this.peers.clear()
    this.screenTrack?.stop()
    this.screenTrack = null

    this.localStream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    this.localStream = null
    this.localVideoTrack = null
  }

  /* ------------------------------------------------------------------ */
  /* Utilidades internas                                                */
  /* ------------------------------------------------------------------ */

  private async capture(kind: CallKind): Promise<MediaStream | null> {
    if (!WEBRTC_SUPPORTED) {
      toast.error('Llamadas no disponibles', {
        description: describeMediaError(new Error('unsupported')),
      })
      return null
    }

    try {
      return await getLocalMedia(kind)
    } catch (error) {
      toast.error('No pudimos acceder a tu micrófono o cámara', {
        description: describeMediaError(error),
      })
      return null
    }
  }

  private prepareLocalMedia(stream: MediaStream, kind: CallKind) {
    this.localStream = stream
    this.localVideoTrack = stream.getVideoTracks()[0] ?? null

    // Si el usuario quita el dispositivo, se avisa y se apaga la cámara.
    for (const track of stream.getTracks()) {
      track.onended = () => {
        if (track.kind === 'video') {
          this.state.updateCall((current) => ({ ...current, cameraEnabled: false }))
        } else {
          this.state.updateCall((current) => ({ ...current, selfMuted: true }))
          toast.error('Tu micrófono se desconectó')
        }
      }
    }

    if (kind === 'video') {
      this.state.updateCall((current) => ({ ...current, cameraEnabled: true }))
    }
  }

  private markActive() {
    this.state.updateCall((current) =>
      current.status === 'active'
        ? current
        : { ...current, status: 'active', activeSince: current.activeSince ?? Date.now() },
    )
  }

  private describePeer(userId: string, message: string) {
    const name =
      this.state.call?.peers.find((peer) => peer.id === userId)?.name ?? 'La persona'
    toast.info(`${name} ${message}`)
  }

  private maybeFinishIfNobodyLeft() {
    const call = this.state.call
    if (!call) return
    const alive = call.peers.some(
      (peer) => peer.status === 'connected' || peer.status === 'connecting',
    )
    if (!alive) {
      this.closeAllPeers()
      this.state.setCall(null)
    }
  }

  private finish(callId: string, message: string) {
    const call = this.state.call
    if (!call || call.id !== callId) return

    for (const peer of call.peers) {
      signalingClient.send({ type: 'call:end', to: peer.id, callId })
    }

    this.closeAllPeers()
    this.state.setCall(null)
    toast.message(message)
  }

  private schedule(callback: () => void, delay: number) {
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout)
      callback()
    }, delay)

    this.timeouts.add(timeout)
  }

  private clearTimeouts() {
    for (const timeout of this.timeouts) clearTimeout(timeout)
    this.timeouts.clear()
  }
}

export const callManager = new CallManager()
