import { create } from 'zustand'
import { listOutputs, deleteOutput, type OutputDTO } from '@/lib/actions/outputs'

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

// Mappe un output serveur (Supabase, 48h) vers la forme MediaAsset utilisée par l'UI.
function toMediaAsset(o: OutputDTO): MediaAsset {
  return {
    id:        o.id,
    type:      o.type as MediaType,
    url:       o.url,
    title:     o.title ?? '',
    engine:    (o.engine ?? 'nano-banana') as MediaEngine,
    format:    o.format ?? undefined,
    campaignId:   o.campaignId ?? undefined,
    campaignName: o.campaignName ?? undefined,
    avatarName:   o.avatarName ?? undefined,
    duration:     o.durationSeconds ?? undefined,
    createdAt: o.createdAt,
  }
}

interface MediaStore {
  assets:  MediaAsset[]
  loading: boolean

  // Cache alimenté par le serveur (bucket `outputs`, expiration 48h gérée côté DB).
  loadFromServer: () => Promise<void>
  removeAsset:     (id: string) => Promise<void>
  clearAll:        () => Promise<void>
}

// ─── Store — cache client des outputs serveur (plus de localStorage) ─────────

export const useMediaStore = create<MediaStore>()((set, get) => ({
  assets:  [],
  loading: false,

  loadFromServer: async () => {
    set({ loading: true })
    try {
      const list = await listOutputs()
      set({ assets: list.map(toMediaAsset), loading: false })
    } catch {
      set({ loading: false })
    }
  },

  removeAsset: async (id) => {
    try { await deleteOutput(id) } catch { /* best-effort */ }
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }))
  },

  clearAll: async () => {
    const ids = get().assets.map((a) => a.id)
    await Promise.allSettled(ids.map((id) => deleteOutput(id)))
    set({ assets: [] })
  },
}))

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

export function typeLabel(type: MediaType): string {
  return type === 'image'  ? 'Image'
       : type === 'video'  ? 'Vidéo'
       : type === 'audio'  ? 'Voix'
       : 'Avatar'
}
