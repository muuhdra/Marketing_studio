import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video' | 'audio' | 'avatar'

export type MediaEngine =
  | 'nano-banana'
  | 'kling-v2.1-pro'
  | 'seedance-pro'
  | 'elevenlabs'
  | 'minimax'
  | 'claude'
  | 'chatgpt'

export interface MediaAsset {
  id:            string
  type:          MediaType
  url:           string          // URL de l'asset (peut expirer pour vidéo Kling)
  thumbnailUrl?: string          // Thumbnail pour vidéos/audio
  title:         string
  prompt?:       string
  engine:        MediaEngine
  campaignName?: string
  campaignId?:   string
  avatarName?:   string
  avatarId?:     string
  format?:       string          // '9:16' | '16:9' | '1:1' | '4:5' | 'square'
  duration?:     number          // secondes (vidéo/audio)
  width?:        number
  height?:       number
  mimeType?:     string          // 'image/png' | 'video/mp4' | 'audio/mpeg' | 'audio/wav'
  sizeBytes?:    number
  tags?:         string[]
  createdAt:     string          // ISO 8601
}

interface MediaStore {
  assets: MediaAsset[]

  // Actions
  addAsset:     (asset: Omit<MediaAsset, 'id' | 'createdAt'>) => string
  removeAsset:  (id: string) => void
  clearAll:     () => void
  updateAsset:  (id: string, patch: Partial<MediaAsset>) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMediaStore = create<MediaStore>()(
  persist(
    (set) => ({
      assets: [],

      addAsset: (asset) => {
        const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newAsset: MediaAsset = {
          ...asset,
          id,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ assets: [newAsset, ...s.assets] }))
        return id
      },

      removeAsset: (id) =>
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

      clearAll: () => set({ assets: [] }),

      updateAsset: (id, patch) =>
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
    }),
    {
      name:    'media-library',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function engineLabel(engine: MediaEngine): string {
  const labels: Record<MediaEngine, string> = {
    'nano-banana':     'Nano Banana',
    'kling-v2.1-pro':  'Kling v2.1',
    'seedance-pro':    'Seedance Pro',
    'elevenlabs':      'ElevenLabs',
    'minimax':         'MiniMax',
    'claude':          'Claude',
    'chatgpt':         'ChatGPT',
  }
  return labels[engine] ?? engine
}

export function engineColor(engine: MediaEngine): string {
  const colors: Record<MediaEngine, string> = {
    'nano-banana':     'text-accent border-accent/40',
    'kling-v2.1-pro':  'text-teal border-border-teal/40',
    'seedance-pro':    'text-pink border-pink/40',
    'elevenlabs':      'text-coral border-coral/40',
    'minimax':         'text-pink border-pink/40',
    'claude':          'text-purple border-purple/40',
    'chatgpt':         'text-teal border-border-teal/40',
  }
  return colors[engine] ?? 'text-text-dim border-border'
}

export function typeIcon(type: MediaType): string {
  return type === 'image'  ? '🖼'
       : type === 'video'  ? '🎬'
       : type === 'audio'  ? '🎵'
       : '👤'
}

export function typeLabel(type: MediaType): string {
  return type === 'image'  ? 'Image'
       : type === 'video'  ? 'Vidéo'
       : type === 'audio'  ? 'Voix'
       : 'Avatar'
}
