import { create } from 'zustand'

import type { ActiveCall, CallState, IncomingCall, SignalingConnection } from './types'

interface CallStore extends CallState {
  /** Usuarios con el servidor de señalización conectado. */
  online: string[]
  setOnline: (online: string[]) => void
  setConnection: (connection: SignalingConnection) => void
  setIncoming: (incoming: IncomingCall | null) => void
  setCall: (call: ActiveCall | null) => void
  updateCall: (updater: (call: ActiveCall) => ActiveCall) => void
  updatePeer: (userId: string, patch: Partial<ActiveCall['peers'][number]>) => void
  reset: () => void
}

/**
 * Estado global de llamadas.
 *
 * Vive fuera de las rutas: la llamada sigue activa mientras navegas entre
 * conversaciones, porque el panel de llamada se monta una sola vez.
 */
export const useCallStore = create<CallStore>()((set) => ({
  connection: 'offline',
  incoming: null,
  call: null,
  online: [],

  setOnline: (online) => set({ online }),
  setConnection: (connection) => set({ connection }),
  setIncoming: (incoming) => set({ incoming }),
  setCall: (call) => set({ call }),

  updateCall: (updater) =>
    set((state) => (state.call ? { call: updater(state.call) } : state)),

  updatePeer: (userId, patch) =>
    set((state) => {
      if (!state.call) return state
      return {
        call: {
          ...state.call,
          peers: state.call.peers.map((peer) =>
            peer.id === userId ? { ...peer, ...patch } : peer,
          ),
        },
      }
    }),

  reset: () => set({ incoming: null, call: null }),
}))

export const useActiveCall = () => useCallStore((state) => state.call)
export const useIncomingCall = () => useCallStore((state) => state.incoming)
export const useSignalingConnection = () => useCallStore((state) => state.connection)
