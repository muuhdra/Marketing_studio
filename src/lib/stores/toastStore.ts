import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id:       string
  message:  string
  variant:  ToastVariant
}

interface ToastState {
  toasts: Toast[]
  add:    (message: string, variant?: ToastVariant) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (message, variant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    // Garde-fou : on ne stocke JAMAIS un objet (ex. une Error passée par erreur via un `catch (e: any)`)
    // — sinon React plante au rendu (« Objects are not valid as a React child »).
    const text = typeof message === 'string'
      ? message
      : (message && typeof message === 'object' && 'message' in (message as Record<string, unknown>)
          ? String((message as { message: unknown }).message)
          : String(message ?? 'Une erreur est survenue'))
    set((s) => ({ toasts: [...s.toasts, { id, message: text, variant }] }))
    // Auto-dismiss après 4s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// ─── Hook raccourci ────────────────────────────────────────────────────────────

export function useToast() {
  const add = useToastStore((s) => s.add)
  return {
    success: (msg: string) => add(msg, 'success'),
    error:   (msg: string) => add(msg, 'error'),
    warning: (msg: string) => add(msg, 'warning'),
    info:    (msg: string) => add(msg, 'info'),
  }
}
