import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (kind: ToastKind, message: string, duration?: number) => number
  success: (message: string, duration?: number) => number
  error: (message: string, duration?: number) => number
  info: (message: string, duration?: number) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (kind, message, duration = kind === 'error' ? 5000 : 3000) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    if (duration > 0) {
      window.setTimeout(() => get().dismiss(id), duration)
    }
    return id
  },

  success: (message, duration) => get().push('success', message, duration),
  error: (message, duration) => get().push('error', message, duration),
  info: (message, duration) => get().push('info', message, duration),

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().success(message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().error(message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().info(message, duration),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
}

export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  return e instanceof Error ? e.message : fallback
}
