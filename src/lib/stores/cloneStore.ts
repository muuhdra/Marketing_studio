import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalClone {
  id:             string   // UUID local
  name:           string
  heygenAvatarId: string   // avatar_id HeyGen
  status:         'processing' | 'completed' | 'failed'
  previewUrl?:    string   // thumbnail HeyGen
  createdAt:      string   // ISO 8601
}

interface CloneStore {
  clones: LocalClone[]
  addClone:    (clone: Omit<LocalClone, 'id' | 'createdAt'>) => string
  updateClone: (heygenAvatarId: string, patch: Partial<LocalClone>) => void
  removeClone: (id: string) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCloneStore = create<CloneStore>()(
  persist(
    (set) => ({
      clones: [],

      addClone: (clone) => {
        const id = `clone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newClone: LocalClone = {
          ...clone,
          id,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ clones: [newClone, ...s.clones] }))
        return id
      },

      updateClone: (heygenAvatarId, patch) =>
        set((s) => ({
          clones: s.clones.map((c) =>
            c.heygenAvatarId === heygenAvatarId ? { ...c, ...patch } : c,
          ),
        })),

      removeClone: (id) =>
        set((s) => ({ clones: s.clones.filter((c) => c.id !== id) })),
    }),
    {
      name:    'heygen-clones',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
