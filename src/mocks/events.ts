export type DemoEvent =
  | { type: 'message'; conversationId: string }
  | { type: 'typing'; conversationId: string; name: string; typing: boolean }

type Listener = (event: DemoEvent) => void

const listeners = new Set<Listener>()

export function emitDemoEvent(event: DemoEvent) {
  for (const listener of listeners) listener(event)
}

export function subscribeDemoEvents(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
