import { useCallback, useEffect, useState } from 'react'

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)

  const restart = useCallback(
    (value: number = initialSeconds) => setSeconds(Math.max(0, Math.round(value))),
    [initialSeconds],
  )

  useEffect(() => {
    if (seconds <= 0) return
    const timeout = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timeout)
  }, [seconds])

  return { seconds, restart, active: seconds > 0 }
}
