/**
 * Taxonomie partagée des types & formats de contenu.
 * Source unique utilisée par l'étape 2 de création de campagne (ChoixContenusView)
 * ET par Creative Studio → les deux écrans restent strictement synchronisés.
 */

export type MarketingGroup = 'produit' | 'app'

export interface ContentTypeDef {
  id:    string
  label: string
  desc:  string
}

export type FormatGroup = Record<string, { label: string; types: ContentTypeDef[] }>

export const PRODUIT_FORMATS: FormatGroup = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'ugc-social',   label: 'UGC',                desc: 'Realistic social media videos' },
      { id: 'ugc-tutorial', label: 'Tutorials',          desc: 'Step-by-step tutorials' },
      { id: 'ugc-unboxing', label: 'Unboxing',           desc: 'High-quality unboxing' },
      { id: 'ugc-review',   label: 'Product Review',     desc: 'Authentic product reviews' },
      { id: 'ugc-tryon',    label: 'UGC Virtual Try on', desc: 'Try before you buy' },
    ],
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'com-hypermotion', label: 'Hyper motion',       desc: 'Highlight your product' },
      { id: 'com-tvspot',      label: 'Tv spot',            desc: 'Authentic stories amplified' },
      { id: 'com-protryon',    label: 'Pro Virtual Try on', desc: 'Advanced virtual try-on' },
    ],
  },
  shooting: {
    label: 'Shooting photo',
    types: [
      { id: 'shoot-packshot',   label: 'Packshot / Fond blanc',     desc: 'Le standard e-commerce (Amazon, Etsy)' },
      { id: 'shoot-lifestyle',  label: 'Shooting Lifestyle',        desc: 'Le produit en utilisation réelle' },
      { id: 'shoot-mode',       label: 'Shooting Mode / Mannequin', desc: 'Mise en valeur de la coupe et matière' },
      { id: 'shoot-flatlat',    label: 'Flat Lay / Vue de dessus',  desc: 'Produits disposés à plat avec props' },
      { id: 'shoot-macro',      label: 'Photo de Détails / Macro',  desc: 'Focalisé sur la texture et fonctionnalités' },
      { id: 'shoot-ghost',      label: 'Ghost Mannequin',           desc: 'Vêtement qui tient tout seul' },
      { id: 'shoot-avantapres', label: 'Avant/Après Démonstration', desc: "Personnage montrant l'efficacité" },
    ],
  },
}

export const APP_FORMATS: FormatGroup = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'app-ugc-social',   label: 'UGC',            desc: 'Realistic social media videos' },
      { id: 'app-ugc-tutorial', label: 'Tutorials',      desc: 'Step-by-step tutorials' },
      { id: 'app-ugc-review',   label: 'Product Review', desc: 'Authentic product reviews' },
    ],
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'app-com-hypermotion', label: 'Hyper motion', desc: 'Highlight your product' },
      { id: 'app-com-tvspot',      label: 'Tv spot',      desc: 'Authentic stories amplified' },
    ],
  },
  visuel: {
    label: 'Visuel',
    types: [
      { id: 'app-vis-screenshots',  label: 'Captures fonctionnelles', desc: 'Interface épurée avec fonctionnalités clés' },
      { id: 'app-vis-storytelling', label: 'Captures Storytelling',   desc: 'Plusieurs images montrant un flux continu' },
      { id: 'app-vis-lifestyle',    label: 'Visuels en contexte',     desc: "Vraies personnes utilisant l'application" },
      { id: 'app-vis-mockup',       label: 'Visuels avec appareils',  desc: 'Interface intégrée dans un cadre smartphone' },
    ],
  },
}

export const GROUPS = [
  { key: 'produit' as const, label: 'Product', desc: 'E-commerce, physique, DTC' },
  { key: 'app'     as const, label: 'App',     desc: 'Applications mobiles & SaaS' },
]

/** Engine de génération Creative Studio déduit de la catégorie. */
export type EngineFormat = 'ugc' | 'commercial' | 'shooting' | 'image' | 'moodboard' | 'voix'
export function categoryToEngineFormat(category: string): EngineFormat {
  switch (category) {
    case 'commercial': return 'commercial'
    case 'shooting':   return 'shooting'
    case 'visuel':     return 'image'
    default:           return 'ugc'   // ugc
  }
}
