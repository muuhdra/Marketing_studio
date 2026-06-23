import { create } from 'zustand'
import type { CompetitorInsight } from '@/lib/ai/research'

// Profil de marque (section « Brand › Profile ») — persisté en localStorage.
export interface BrandProfile {
  logoDataUrl: string
  name: string
  website: string        // URL du site de la marque (optionnel)
  category: string
  language: string
  description: string
  colors: string[]
  brandType: string
  keyFeatures: string[]
  communicationTone: string
  preferredWords: string[]
  wordsToAvoid: string[]
  goodExamples: string[]
  badExamples: string[]
  targetAudience: string
  audienceDesires: string[]
  audienceProblems: string[]
  dnaFileName: string   // nom du document ADN importé
  dnaText: string       // texte extrait (formats texte) → injectable dans les prompts
  activeSystemTemplateIds: string[]  // templates Images du système sélectionnés par la marque
  competitors: CompetitorInsight[]   // concurrents e-commerce découverts (classés par réussite)
  trackedCompetitors: string[]       // noms des concurrents suivis (max 3)
}

export type BrandListKey =
  | 'colors' | 'keyFeatures' | 'preferredWords' | 'wordsToAvoid'
  | 'goodExamples' | 'badExamples' | 'audienceDesires' | 'audienceProblems'

interface BrandState extends BrandProfile {
  setField: <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => void
  addItem: (key: BrandListKey, value?: string) => void
  updateItem: (key: BrandListKey, index: number, value: string) => void
  removeItem: (key: BrandListKey, index: number) => void
  /** Recharge le profil depuis la marque active (DB) — fusionné avec les valeurs par défaut. */
  hydrate: (profile: Partial<BrandProfile>) => void
}

const DEFAULTS: BrandProfile = {
  logoDataUrl: '',
  name: 'My Brand',
  website: '',
  category: 'Fashion & Clothing',
  language: '🇺🇸 English',
  description: 'A modern brand offering quality products and services.',
  colors: ['#1A1A1A', '#F5F0EB', '#C8A882', '#000000'],
  brandType: 'Service',
  keyFeatures: [],
  communicationTone: 'Friendly, confident, and approachable',
  preferredWords: ['quality', 'essential', 'everyday', 'accessible', 'sustainable'],
  wordsToAvoid: ['cheap', 'luxury', 'exclusive'],
  goodExamples: [],
  badExamples: [],
  targetAudience: 'Style-conscious adults aged 25-40 who value quality and sustainability over fast fashion',
  audienceDesires: ['Effortless everyday style', 'Products that last', 'Guilt-free purchases'],
  audienceProblems: ['Finding affordable quality clothing', 'Overwhelmed by too many choices', 'Concerned about sustainability'],
  dnaFileName: '',
  dnaText: '',
  activeSystemTemplateIds: [],
  competitors: [],
  trackedCompetitors: [],
}

// Le profil n'est plus persisté en localStorage : il est chargé depuis la marque
// active (DB) via hydrate() et sauvegardé en base (cf. BrandProfileSync).
export const useBrand = create<BrandState>((set) => ({
  ...DEFAULTS,
  setField: (key, value) => set({ [key]: value } as Partial<BrandState>),
  addItem: (key, value = '') => set((state) => ({ [key]: [...state[key], value] } as Partial<BrandState>)),
  updateItem: (key, index, value) => set((state) => ({ [key]: state[key].map((item, i) => (i === index ? value : item)) } as Partial<BrandState>)),
  removeItem: (key, index) => set((state) => ({ [key]: state[key].filter((_, i) => i !== index) } as Partial<BrandState>)),
  hydrate: (profile) => set({ ...DEFAULTS, ...profile }),
}))

// Clés du profil (pour extraire l'objet BrandProfile depuis le store).
const PROFILE_KEYS = Object.keys(DEFAULTS) as (keyof BrandProfile)[]

/** Extrait l'objet BrandProfile pur (sans les actions) depuis l'état du store. */
export function toBrandProfile(state: BrandProfile): BrandProfile {
  const out = {} as Record<string, unknown>
  for (const k of PROFILE_KEYS) out[k] = state[k]
  return out as unknown as BrandProfile
}

export const LANGUAGES = ['🇺🇸 English', '🇫🇷 Français', '🇪🇸 Español', '🇩🇪 Deutsch', '🇮🇹 Italiano']
export const BRAND_CATEGORIES = ['Fashion & Clothing', 'Beauty & Skincare', 'Food & Beverage', 'Tech & Gadgets', 'Health & Wellness', 'Home & Living', 'Services']
