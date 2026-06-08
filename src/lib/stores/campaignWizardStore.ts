import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AvatarAssignment {
  avatarId:    string
  avatarName:  string
  role:        string | null
  format:      string | null
}

export interface WizardStep1 {
  name:              string
  campaignType:      'generale' | 'speciale'
  startDate:         string
  endDate:           string
  preCampaignEnabled: boolean
  preCampaignStart:  string
  postCampaignEnabled: boolean
  dnaFileName:       string | null   // nom du fichier uploadé (futur: URL Supabase)
  dnaText:           string          // contenu ADN saisi/collé directement — injecté dans les prompts IA
}

export interface WizardStep2 {
  marketingGroup:     'produit' | 'app' | null
  selectedContentIds: string[]          // ex: ['ugc-social', 'ugc-tutorial']
}

export interface WizardStep3 {
  assignments: AvatarAssignment[]
}

export interface CampaignWizardState {
  // ID de la campagne une fois créée en DB (null si pas encore sauvegardée)
  campaignId: string | null

  step1: WizardStep1
  step2: WizardStep2
  step3: WizardStep3

  // Actions
  setStep1:     (data: Partial<WizardStep1>) => void
  setStep2:     (data: Partial<WizardStep2>) => void
  setStep3:     (data: Partial<WizardStep3>) => void
  setCampaignId: (id: string) => void
  reset:        () => void
}

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

const defaultStep1: WizardStep1 = {
  name:               '',
  campaignType:       'generale',
  startDate:          '',
  endDate:            '',
  preCampaignEnabled: false,
  preCampaignStart:   '',
  postCampaignEnabled: false,
  dnaFileName:        null,
  dnaText:            '',
}

const defaultStep2: WizardStep2 = {
  marketingGroup:     null,
  selectedContentIds: [],
}

const defaultStep3: WizardStep3 = {
  assignments: [],
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCampaignWizard = create<CampaignWizardState>()(
  persist(
    (set) => ({
      campaignId: null,
      step1:      defaultStep1,
      step2:      defaultStep2,
      step3:      defaultStep3,

      setStep1: (data) =>
        set((s) => ({ step1: { ...s.step1, ...data } })),

      setStep2: (data) =>
        set((s) => ({ step2: { ...s.step2, ...data } })),

      setStep3: (data) =>
        set((s) => ({ step3: { ...s.step3, ...data } })),

      setCampaignId: (id) => set({ campaignId: id }),

      reset: () =>
        set({ campaignId: null, step1: defaultStep1, step2: defaultStep2, step3: defaultStep3 }),
    }),
    {
      name:    'campaign-wizard',           // clé localStorage
      storage: createJSONStorage(() => sessionStorage), // effacé à la fermeture du tab
    }
  )
)
