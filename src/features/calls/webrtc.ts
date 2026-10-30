import { ICE_SERVERS } from './config'
import type { CallKind } from './types'

/** Restricciones de audio pensadas para voz (cancelación de eco y ruido). */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
}

/** Captura micrófono (y cámara si es videollamada) del usuario. */
export async function getLocalMedia(kind: CallKind): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('unsupported')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: AUDIO_CONSTRAINTS,
    video: kind === 'video' ? VIDEO_CONSTRAINTS : false,
  })
}

/** Conexión peer-to-peer con los servidores ICE configurados. */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle',
  })
}

/** `true` si el navegador permite compartir pantalla. */
export function canShareScreen() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)
}

/** Mensaje en español para los errores típicos de permisos/dispositivos. */
export function describeMediaError(error: unknown): string {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : ''

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Bloqueaste el acceso al micrófono o la cámara. Habilítalo en los permisos del navegador y vuelve a intentarlo.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No encontramos micrófono ni cámara disponibles en este dispositivo.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Tu cámara o micrófono está siendo usado por otra aplicación.'
    case 'OverconstrainedError':
      return 'Tu dispositivo no soporta la calidad solicitada. Prueba con una llamada de solo audio.'
    case 'unsupported':
      return 'Este navegador no soporta llamadas. Usa Chrome, Edge, Firefox o Safari actualizados.'
    default:
      return 'No pudimos iniciar el audio o el vídeo. Revisa tus permisos e inténtalo otra vez.'
  }
}
