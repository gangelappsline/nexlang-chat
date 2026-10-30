/**
 * Configuración de llamadas (WebRTC propio).
 *
 * Todo se controla desde variables `VITE_*` para poder usar tu propio servidor
 * de señalización y tu propio TURN sin tocar código.
 */

const parseList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/**
 * URL del servidor de señalización.
 *
 * - Un valor absoluto (`wss://signal.nexlang.io`) se usa tal cual.
 * - `auto` (o vacío) apunta al **mismo origen**: `wss://tu-dominio/signaling`.
 *   Vite lo redirige a `127.0.0.1:8081` en desarrollo y en producción basta con
 *   un `location /signaling { proxy_pass … }` en nginx (ver README).
 */
const configuredSignalingUrl = (import.meta.env.VITE_SIGNALING_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

function sameOriginSignalingUrl() {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/signaling`
}

export const SIGNALING_URL =
  configuredSignalingUrl === '' || configuredSignalingUrl.toLowerCase() === 'auto'
    ? sameOriginSignalingUrl()
    : configuredSignalingUrl

/**
 * Servidores ICE.
 *
 * - `VITE_STUN_URLS`: lista separada por comas (descubre la IP pública).
 * - `VITE_TURN_URL` + credenciales: relay propio (coturn). Necesario para
 *   atravesar NAT simétrico / redes corporativas.
 *
 * Si no hay nada configurado se usa un STUN público como último recurso para
 * que las pruebas funcionen; en producción configura tu propio TURN.
 */
export const ICE_SERVERS: RTCIceServer[] = (() => {
  const servers: RTCIceServer[] = []
  const stunUrls = parseList(import.meta.env.VITE_STUN_URLS)
  const turnUrl = (import.meta.env.VITE_TURN_URL ?? '').trim()

  if (stunUrls.length > 0) servers.push({ urls: stunUrls })

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: (import.meta.env.VITE_TURN_USERNAME ?? '').trim() || undefined,
      credential: (import.meta.env.VITE_TURN_CREDENTIAL ?? '').trim() || undefined,
    })
  }

  if (servers.length === 0) servers.push({ urls: 'stun:stun.l.google.com:19302' })

  return servers
})()

/** `true` cuando hay servidor de señalización configurado. */
export const SIGNALING_CONFIGURED = Boolean(SIGNALING_URL)

/** `true` cuando el navegador puede hacer WebRTC con cámara/micrófono. */
export const WEBRTC_SUPPORTED = (() => {
  if (typeof window === 'undefined') return false
  const hasPeer = 'RTCPeerConnection' in window
  return hasPeer && Boolean(navigator.mediaDevices?.getUserMedia)
})()

export function buildSignalingUrl(token: string) {
  const separator = SIGNALING_URL.includes('?') ? '&' : '?'
  return `${SIGNALING_URL}${separator}token=${encodeURIComponent(token)}`
}

if (import.meta.env.DEV) {
  console.info(
    `[calls] señalización=${SIGNALING_URL || '(sin configurar)'} · ice=${ICE_SERVERS.map((server) =>
      Array.isArray(server.urls) ? server.urls.join('|') : server.urls,
    ).join(', ')}`,
  )
}
