import { useSyncExternalStore } from 'react'

const getServerSnapshot = () => false

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', onStoreChange)
      return () => mediaQuery.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  )
}
