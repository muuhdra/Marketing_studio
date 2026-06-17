import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

// Élément de garde-robe/décor retenu pour une assignation (snapshot nom+description)
export interface WardrobePick {
  id:          string
  name:        string
  description: string | null
}

export interface AvatarAssignment {
  avatarId:     string
  avatarName:   string
  role:         string | null
  format:       string | null
  // Garde-robe & décors pour cette campagne :
  //  - 'auto'   → le système pioche dans tout le pool ci-dessous (avatar non statique)
  //  - 'manual' → le pool est restreint à la sélection de l'utilisateur
  wardrobeMode: 'auto' | 'manual'
  outfits:      WardrobePick[]   // pool effectif de tenues (vide = pas de garde-robe)
  environments: WardrobePick[]   // pool effectif de décors
}

export interface WizardStep1 {
  name:              string
  campaignType:      'generale' | 'speciale'
  startDate:         string
  endDate:           string
  preCampaignEnabled: boolean
  preCampaignStart:  string
  preCampaignEnd:    string           // fin de la pré-campagne
  preCampaignDna:    string           // DA/direction de la pré-campagne
  postCampaignEnabled: boolean
  postCampaignDelayWeeks: number | null // 2 | 3 | 4 | 6 semaines après la fin
  contentTargetValue: number | null     // objectif de volume de contenus (valeur brute saisie)
  contentTargetUnit: 'month' | 'week' | 'day'  // unité de l'objectif → normalisé en mensuel à la sauvegarde
  dnaText:           string          // contenu ADN saisi/collé directement — injecté dans les prompts IA
  dnaFileName:       string | null   // nom du fichier ADN uploadé
  dnaFilePath:       string | null   // chemin Storage (bucket privé) du fichier ADN original
  assetsUrl:         string          // URL assets visuels (Notion, Drive, Dropbox…)
}

export interface WizardStep2 {
  marketingGroup:     'produit' | 'app' | null
  selectedContentIds: string[]          // ex: ['ugc-social', 'ugc-tutorial'] ou ids de templates
  seedPrompt?:        string            // prompt(s) des templates sélectionnés → pré-remplit la génération
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
  preCampaignEnd:     '',
  preCampaignDna:     '',
  postCampaignEnabled: false,
  postCampaignDelayWeeks: null,
  contentTargetValue: null,
  contentTargetUnit:  'month',
  dnaText:            '',
  dnaFileName:        null,
  dnaFilePath:        null,
  assetsUrl:          '',
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
      name:    'campaign-wizard',           // clé sessionStorage
      storage: createJSONStorage(() => sessionStorage), // effacé à la fermeture du tab
      version: 1,
      // Merge profond : un state persisté avec une ancienne forme (champs manquants
      // après évolution du schéma) est complété par les défauts au lieu de les écraser.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CampaignWizardState>
        return {
          ...current,
          campaignId: p.campaignId ?? current.campaignId,
          step1: { ...current.step1, ...(p.step1 ?? {}) },
          step2: { ...current.step2, ...(p.step2 ?? {}) },
          step3: { ...current.step3, ...(p.step3 ?? {}) },
        }
      },
    }
  )
)
