/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de todas las peticiones hacia la API (sin barra final). */
  readonly VITE_BASE_API_URL?: string
  /** Alias heredado de `VITE_BASE_API_URL`. */
  readonly VITE_API_BASE_URL?: string
  /** Entorno lógico: development | staging | production. */
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_APP_NAME?: string
  /** Timeout de peticiones en milisegundos. */
  readonly VITE_REQUEST_TIMEOUT_MS?: string
  /** `"true"` imprime las peticiones en consola. */
  readonly VITE_DEBUG_REQUESTS?: string

  /** URL del servidor de señalización de llamadas (`ws://` o `wss://`). */
  readonly VITE_SIGNALING_URL?: string
  /** Servidores STUN separados por comas. */
  readonly VITE_STUN_URLS?: string
  /** Servidor TURN propio (necesario detrás de NAT estricto). */
  readonly VITE_TURN_URL?: string
  readonly VITE_TURN_USERNAME?: string
  readonly VITE_TURN_CREDENTIAL?: string

  /** Modo de Vite (`development`, `production`, `staging`…). */
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
