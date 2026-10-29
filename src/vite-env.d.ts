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

  /** Modo de Vite (`development`, `production`, `staging`…). */
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
