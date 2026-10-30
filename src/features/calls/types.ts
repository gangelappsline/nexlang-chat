export type CallKind = 'audio' | 'video'

export type CallStatus =
  /** Sin llamada. */
  | 'idle'
  /** Llamando y esperando respuesta. */
  | 'dialing'
  /** Entrante, sonando en este dispositivo. */
  | 'incoming'
  /** Alguien aceptó: negociando media. */
  | 'connecting'
  /** Llamada en curso. */
  | 'active'
  /** Terminada (se muestra un instante antes de cerrar el panel). */
  | 'ended'

export type CallPeerStatus = 'ringing' | 'connecting' | 'connected' | 'rejected' | 'left'

export interface CallParticipant {
  id: string
  name: string
  photoUrl: string | null
}

export interface CallPeerState extends CallParticipant {
  status: CallPeerStatus
  /** Stream remoto (audio y, si aplica, vídeo). */
  stream: MediaStream | null
  connectionState: RTCPeerConnectionState | 'idle'
  /** El usuario compartió pantalla como pista de vídeo. */
  sharingScreen?: boolean
}

export interface ActiveCall {
  id: string
  kind: CallKind
  conversationId: string | null
  conversationTitle: string
  direction: 'outgoing' | 'incoming'
  status: CallStatus
  /** Marca de tiempo en la que la llamada pasó a `active` (cronómetro). */
  activeSince: number | null
  peers: CallPeerState[]
  /** Stream local (micrófono + cámara, o pantalla compartida). */
  localStream: MediaStream | null
  selfMuted: boolean
  cameraEnabled: boolean
  sharingScreen: boolean
  /** Mensaje puntual (por ejemplo, un error de permisos). */
  error: string | null
}

export interface IncomingCall {
  id: string
  kind: CallKind
  conversationId: string | null
  conversationTitle: string
  from: CallParticipant
  /** Todos los invitados a la llamada (incluido quien llama). */
  participants: CallParticipant[]
  receivedAt: number
}

export type SignalingConnection = 'offline' | 'connecting' | 'online'

export interface CallState {
  connection: SignalingConnection
  incoming: IncomingCall | null
  call: ActiveCall | null
}

/* -------------------------------------------------------------------------- */
/* Protocolo de señalización                                                  */
/* -------------------------------------------------------------------------- */

/** Mensajes de negociación que el servidor reenvía entre usuarios. */
export type CallSignal =
  | {
      type: 'call:invite'
      to: string
      callId: string
      kind: CallKind
      conversationId: string | null
      conversationTitle: string
      participants: CallParticipant[]
    }
  | { type: 'call:accept'; to: string; callId: string }
  | { type: 'call:reject'; to: string; callId: string; reason?: string }
  | { type: 'call:cancel'; to: string; callId: string }
  | { type: 'call:end'; to: string; callId: string }
  | { type: 'call:busy'; to: string; callId: string }
  | { type: 'call:offer'; to: string; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'call:answer'; to: string; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'call:ice'; to: string; callId: string; candidate: RTCIceCandidateInit }

/** Eventos de chat (no llevan contenido: solo avisan de que hay algo nuevo). */
export type ChatSignal =
  | { type: 'chat:message'; conversationId: string; messageId?: string }
  | { type: 'chat:typing'; conversationId: string }

export type ClientSignal =
  | { type: 'hello'; userId: string; name?: string }
  | { type: 'ping' }
  | { type: 'chat:subscribe'; conversationIds: string[] }
  | CallSignal
  | ChatSignal

/** Metadatos que el servidor agrega al reenviar un mensaje. */
type Relayed<T> = T extends unknown
  ? T & { from: string; fromName?: string; relayedAt?: number }
  : never

export type RelayedSignal = Relayed<CallSignal | ChatSignal>

export type ServerSignal =
  | { type: 'hello'; ok: boolean; userId: string; online: string[]; serverTime: number }
  | { type: 'pong'; at: number }
  | { type: 'presence'; userId: string; status: 'online' | 'offline'; name?: string }
  | { type: 'error'; code: string; received?: string; conversationId?: string }
  | { type: 'chat:subscribed'; conversationIds: string[] }
  | { type: 'session:replaced' }
  | { type: 'call:unavailable'; callId: string; to: string }
  | RelayedSignal
