import { create } from 'zustand'

export interface TypingEntry {
  name: string
  /** Momento (epoch ms) en el que llegó el aviso. */
  at: number
}

/** Tiempo máximo que se muestra "escribiendo…" sin un aviso nuevo. */
const TYPING_TTL_MS = 4500

interface TypingStore {
  typing: Record<string, TypingEntry>
  setTyping: (conversationId: string, entry: TypingEntry | null) => void
  clear: () => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleExpiry(conversationId: string) {
  const current = timers.get(conversationId)
  if (current) clearTimeout(current)

  timers.set(
    conversationId,
    setTimeout(() => {
      timers.delete(conversationId)
      useTypingStore.getState().setTyping(conversationId, null)
    }, TYPING_TTL_MS),
  )
}

/** Quién está escribiendo en cada conversación (se limpia solo por antigüedad). */
export const useTypingStore = create<TypingStore>()((set) => ({
  typing: {},

  setTyping: (conversationId, entry) => {
    if (entry) {
      scheduleExpiry(conversationId)
    } else {
      const timer = timers.get(conversationId)
      if (timer) clearTimeout(timer)
      timers.delete(conversationId)
    }

    set((state) => {
      if (!entry) {
        if (!(conversationId in state.typing)) return state
        const typing = { ...state.typing }
        delete typing[conversationId]
        return { typing }
      }

      return { typing: { ...state.typing, [conversationId]: entry } }
    })
  },

  clear: () => {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    set({ typing: {} })
  },
}))
