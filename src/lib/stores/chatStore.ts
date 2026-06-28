import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ChatMsg = {
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  link?: { label: string; path: string } | null
}

interface ChatState {
  messages: ChatMsg[]
  setMessages: (m: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => void
  reset: () => void
}

// Conversation persistée (survit fermeture du panneau + rechargements de page).
export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      setMessages: (m) => set((s) => ({ messages: typeof m === 'function' ? m(s.messages) : m })),
      reset: () => set({ messages: [] }),
    }),
    { name: 'studio-chat', storage: createJSONStorage(() => sessionStorage) },
  ),
)
