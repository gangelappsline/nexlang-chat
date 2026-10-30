import { useEffect, useState } from 'react'

/** Devuelve el tiempo transcurrido desde `since` como `mm:ss` o `h:mm:ss`. */
export function useCallTimer(since: number | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!since) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [since])

  if (!since) return null

  const totalSeconds = Math.max(0, Math.floor((now - since) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}
