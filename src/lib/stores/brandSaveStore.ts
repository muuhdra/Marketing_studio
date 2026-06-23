import { create } from 'zustand'

// Statut de sauvegarde du profil de marque (auto-save via BrandProfileSync).
export type BrandSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface BrandSaveState {
  status: BrandSaveStatus
  setStatus: (status: BrandSaveStatus) => void
}

export const useBrandSave = create<BrandSaveState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}))
