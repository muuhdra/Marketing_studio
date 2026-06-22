import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Profil de marque (section « Brand › Profile ») — persisté en localStorage.
export interface BrandProfile {
  logoDataUrl: string
  name: string
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
}

export type BrandListKey =
  | 'colors' | 'keyFeatures' | 'preferredWords' | 'wordsToAvoid'
  | 'goodExamples' | 'badExamples' | 'audienceDesires' | 'audienceProblems'

interface BrandState extends BrandProfile {
  setField: <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => void
  addItem: (key: BrandListKey, value?: string) => void
  updateItem: (key: BrandListKey, index: number, value: string) => void
  removeItem: (key: BrandListKey, index: number) => void
}

const DEFAULTS: BrandProfile = {
  logoDataUrl: '',
  name: 'My Brand',
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
}

export const useBrand = create<BrandState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setField: (key, value) => set({ [key]: value } as Partial<BrandState>),
      addItem: (key, value = '') => set((state) => ({ [key]: [...state[key], value] } as Partial<BrandState>)),
      updateItem: (key, index, value) => set((state) => ({ [key]: state[key].map((item, i) => (i === index ? value : item)) } as Partial<BrandState>)),
      removeItem: (key, index) => set((state) => ({ [key]: state[key].filter((_, i) => i !== index) } as Partial<BrandState>)),
    }),
    { name: 'brand-profile', storage: createJSONStorage(() => localStorage) },
  ),
)

export const LANGUAGES = ['🇺🇸 English', '🇫🇷 Français', '🇪🇸 Español', '🇩🇪 Deutsch', '🇮🇹 Italiano']
export const BRAND_CATEGORIES = ['Fashion & Clothing', 'Beauty & Skincare', 'Food & Beverage', 'Tech & Gadgets', 'Health & Wellness', 'Home & Living', 'Services']
