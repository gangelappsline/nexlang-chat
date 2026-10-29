/**
 * Almacenamiento de la sesión (token + usuario).
 *
 * Seguridad:
 * - Por defecto se guarda en `sessionStorage`: la sesión desaparece al cerrar
 *   la pestaña y no queda expuesta a otros procesos del navegador.
 * - Si el usuario marca "mantener sesión", se guarda en `localStorage` para
 *   sobrevivir al cierre del navegador.
 * - Nunca se guardan credenciales, solo el token emitido por la API y el perfil.
 * - El token se borra de ambos almacenes al cerrar sesión o recibir un 401.
 */
export type SessionStorageMode = 'session' | 'local'

const MODE_KEY = 'nexlang.session.mode'

function safeGet(getter: () => Storage): Storage | null {
  try {
    return getter()
  } catch {
    return null
  }
}

export function getSessionStorageMode(): SessionStorageMode {
  try {
    return safeGet(() => window.localStorage)?.getItem(MODE_KEY) === 'local'
      ? 'local'
      : 'session'
  } catch {
    return 'session'
  }
}

export function setSessionStorageMode(mode: SessionStorageMode) {
  try {
    safeGet(() => window.localStorage)?.setItem(MODE_KEY, mode)
  } catch {
    // almacenamiento no disponible (modo privado): la sesión vive en memoria
  }
}

/**
 * Lee la sesión persistida. `sessionStorage` tiene prioridad sobre
 * `localStorage` para que una sesión temporal no quede "resucitada" por una
 * sesión recordada anterior.
 */
export function readRawSession(key: string): string | null {
  const stores = [safeGet(() => window.sessionStorage), safeGet(() => window.localStorage)]
  for (const store of stores) {
    try {
      const value = store?.getItem(key)
      if (value) return value
    } catch {
      // seguimos con el siguiente almacén
    }
  }
  return null
}

export function writeRawSession(key: string, value: string) {
  const target =
    getSessionStorageMode() === 'local'
      ? safeGet(() => window.localStorage)
      : safeGet(() => window.sessionStorage)
  const other =
    getSessionStorageMode() === 'local'
      ? safeGet(() => window.sessionStorage)
      : safeGet(() => window.localStorage)

  try {
    target?.setItem(key, value)
  } catch {
    // ignore
  }
  try {
    other?.removeItem(key)
  } catch {
    // ignore
  }
}

export function removeRawSession(key: string) {
  for (const store of [safeGet(() => window.localStorage), safeGet(() => window.sessionStorage)]) {
    try {
      store?.removeItem(key)
    } catch {
      // ignore
    }
  }
}
