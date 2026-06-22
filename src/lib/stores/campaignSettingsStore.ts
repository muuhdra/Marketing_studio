import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Réglages de planification de campagne (onglet Campaign du Profil) — persistés localStorage.

export const DURATION_UNITS = ['days', 'weeks', 'months'] as const
export type DurationUnit = (typeof DURATION_UNITS)[number]

export const CADENCE_PER = ['day', 'week', 'month'] as const
export type CadencePer = (typeof CADENCE_PER)[number]

export const CONTENT_TYPES = [
  { id: 'static', label: 'Static Ad' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'product', label: 'Product Photoshoot' },
  { id: 'fashion', label: 'Fashion Photoshoot' },
  { id: 'actor-video', label: 'Actor Video' },
  { id: 'broll-video', label: 'B-roll Video' },
] as const

export interface CampaignSettings {
  campaignDuration: number
  campaignUnit: DurationUnit
  campaignCount: number
  campaignPer: CadencePer
  campaignTypes: string[]

  preEnabled: boolean
  preStartDate: string
  preDuration: number
  preUnit: DurationUnit
  preCount: number
  prePer: CadencePer
  preTypes: string[]
}

type ScopedKey = 'campaign' | 'pre'

interface CampaignSettingsState extends CampaignSettings {
  setField: <K extends keyof CampaignSettings>(key: K, value: CampaignSettings[K]) => void
  toggleType: (scope: ScopedKey, id: string) => void
}

const DEFAULTS: CampaignSettings = {
  campaignDuration: 30,
  campaignUnit: 'days',
  campaignCount: 1,
  campaignPer: 'day',
  campaignTypes: ['static'],

  preEnabled: false,
  preStartDate: '',
  preDuration: 7,
  preUnit: 'days',
  preCount: 1,
  prePer: 'day',
  preTypes: ['static'],
}

export const useCampaignSettings = create<CampaignSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setField: (key, value) => set({ [key]: value } as Partial<CampaignSettingsState>),
      toggleType: (scope, id) => set((state) => {
        const key = scope === 'campaign' ? 'campaignTypes' : 'preTypes'
        const current = state[key]
        return { [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] } as Partial<CampaignSettingsState>
      }),
    }),
    { name: 'campaign-settings', storage: createJSONStorage(() => localStorage) },
  ),
)
