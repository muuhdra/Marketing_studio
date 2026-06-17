'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import AvatarWardrobe from './AvatarWardrobe'
import AvatarEnvironment from './AvatarEnvironment'
import AvatarVoice, { type AvatarVoiceValue } from './AvatarVoice'
import { createAvatar, updateAvatar } from '@/lib/actions/avatars'
import { actionGenerateAvatarPhoto, actionGenerateAvatarSheet } from '@/lib/actions/ai'
import { actionPersistAvatarPhoto, actionPersistAvatarSheet, actionGetAssetSignedUrl, actionGetAvatarLibrary, actionGetAvatarRefImage } from '@/lib/actions/avatar-assets'
import { FaceColor, HairColor, EyeColor, GenderIcon, HairLenIcon, HairTexIcon, BuildIcon, StyleIcon } from './morphoIcons'
import { useToast } from '@/lib/stores/toastStore'

const PIPELINE_STEPS = [
  { id: 1, label: 'Modèle de base' },
  { id: 2, label: 'Garde-robe'     },
  { id: 3, label: 'Environnements' },
]

// ── Moteur de création : choix morphologiques (libellé FR → descripteur EN [, couleur d'illustration]) ──
type MorphoKey = 'gender' | 'skin' | 'hairColor' | 'hairLen' | 'hairTex' | 'eyes' | 'build'
type MorphoOpt = readonly [fr: string, en: string, color?: string]
const RAINBOW = 'linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#c86be0)'
const MORPHO: { key: MorphoKey; label: string; opts: readonly MorphoOpt[] }[] = [
  { key: 'gender', label: 'Genre', opts: [['Femme', 'a woman'], ['Homme', 'a man'], ['Androgyne', 'an androgynous person']] },
  { key: 'skin',   label: 'Teint de peau', opts: [['Très clair', 'very fair skin', '#f7e0ce'], ['Clair', 'light skin', '#efc8a6'], ['Mat', 'olive skin', '#d2a170'], ['Hlé', 'tanned skin', '#b07a4f'], ['Foncé', 'dark brown skin', '#7c5234'], ['Ébène', 'deep ebony skin', '#4a2e1e']] },
  { key: 'hairColor', label: 'Couleur cheveux', opts: [['Noir', 'black', '#1c1a19'], ['Brun', 'brown', '#4a2e1e'], ['Chtain', 'chestnut', '#6f4e37'], ['Blond', 'blond', '#d9b36b'], ['Roux', 'red', '#b05a2c'], ['Gris / Blanc', 'grey', '#cdcdcd'], ['Coloré', 'brightly dyed', RAINBOW]] },
  { key: 'hairLen', label: 'Longueur cheveux', opts: [['Rasé', 'shaved'], ['Court', 'short'], ['Mi-long', 'medium-length'], ['Long', 'long'], ['Très long', 'very long']] },
  { key: 'hairTex', label: 'Texture cheveux', opts: [['Raides', 'straight'], ['Ondulés', 'wavy'], ['Bouclés', 'curly'], ['Crépus', 'coily']] },
  { key: 'eyes',   label: 'Yeux', opts: [['Marron', 'brown eyes', '#6b4423'], ['Noisette', 'hazel eyes', '#a77b4f'], ['Bleu', 'blue eyes', '#5b86c4'], ['Vert', 'green eyes', '#5c8a5c'], ['Gris', 'grey eyes', '#9aa3a8']] },
  { key: 'build',  label: 'Physique', opts: [['Mince', 'slim build'], ['Athlétique', 'athletic build'], ['Moyen', 'average build'], ['Pulpeux', 'curvy build'], ['Costaud', 'heavy-set build']] },
]
const morphoEN = (key: MorphoKey, fr: string): string =>
  MORPHO.find((m) => m.key === key)?.opts.find((o) => o[0] === fr)?.[1] ?? ''

// Origines (sélection unique) — pastille = teinte indicative
const ORIGINS: readonly [string, string][] = [
  ['Caucasienne', '#e8c39e'], ['Africaine', '#6b4a2f'], ['Maghrébine', '#c79a6b'],
  ['Moyen-orientale', '#cdae87'], ['Asiatique', '#ecd2a6'], ['Sud-asiatique', '#b98a5e'],
  ['Hispanique / Latina', '#d2a679'], ['Métisse', '#a9794f'],
]

// Styles (multi-sélection → tags) — pastille = couleur d'accent
const STYLE_TAGS: readonly string[] = [
  'Casual chic', 'Minimaliste', 'Gen Z', 'Streetwear', 'Luxe', 'Sportif',
  'Bohème', 'Corporate', 'Glamour', 'Vintage', 'Naturel', 'Edgy',
]
const STYLE_PALETTE = ['#2dd4bf', '#5ec8c8', '#a09ae0', '#e0795b', '#e06ba0', '#e0b85b']

// Classe d'une tuile illustrée (sélectionnable)
const tileCls = (active: boolean) =>
  `flex flex-col items-center justify-center gap-1 w-[72px] py-2 px-1 rounded-neo-lg border transition-all
   ${active ? 'border-accent text-accent bg-accent/10 shadow-neo' : 'border-border text-text-muted hover:border-border-strong hover:text-text-primary'}`

// Résout l'illustration d'une option morphologique
function MorphoIcon({ k, fr, color }: { k: MorphoKey; fr: string; color?: string }) {
  switch (k) {
    case 'gender':    return <GenderIcon kind={fr} />
    case 'skin':      return <FaceColor color={color ?? '#ccc'} />
    case 'hairColor': return <HairColor color={color ?? '#ccc'} />
    case 'hairLen':   return <HairLenIcon kind={fr} />
    case 'hairTex':   return <HairTexIcon kind={fr} />
    case 'eyes':      return <EyeColor color={color ?? '#ccc'} />
    case 'build':     return <BuildIcon kind={fr} />
    default:          return null
  }
}

// Paramètres d'apparence affichés en déclencheurs (la grille d'illustrations s'ouvre au clic)
type ParamId = MorphoKey | 'origin' | 'style'
const APPEARANCE: { id: ParamId; label: string }[] = [
  { id: 'gender', label: 'Genre' }, { id: 'skin', label: 'Teint de peau' },
  { id: 'hairColor', label: 'Couleur cheveux' }, { id: 'hairLen', label: 'Longueur cheveux' },
  { id: 'hairTex', label: 'Texture cheveux' }, { id: 'eyes', label: 'Yeux' },
  { id: 'build', label: 'Physique' }, { id: 'origin', label: 'Origine' }, { id: 'style', label: 'Styles' },
]

/** Compose les choix morphologiques en un descripteur EN pour le prompt de génération. */
function buildTraits(m: Partial<Record<MorphoKey, string>>): string {
  const parts: string[] = []
  if (m.gender) parts.push(morphoEN('gender', m.gender))
  if (m.skin)   parts.push(morphoEN('skin', m.skin))
  // Cheveux : on combine longueur + texture + couleur en une seule expression
  if (m.hairLen && morphoEN('hairLen', m.hairLen) === 'shaved') {
    parts.push('shaved head')
  } else {
    const hair = [
      m.hairLen && morphoEN('hairLen', m.hairLen),
      m.hairTex && morphoEN('hairTex', m.hairTex),
      m.hairColor && morphoEN('hairColor', m.hairColor),
    ].filter(Boolean).join(' ')
    if (hair) parts.push(`${hair} hair`)
  }
  if (m.eyes)  parts.push(morphoEN('eyes', m.eyes))
  if (m.build) parts.push(morphoEN('build', m.build))
  return parts.filter(Boolean).join(', ')
}

export interface ExistingAvatar {
  id:               string
  name:             string
  age:              number | null
  ethnicity:        string | null
  style_tags:       string[] | null
  continuity_mode:  'evolutif' | 'verrouille'
  source_photo_url: string | null
  reference_sheet_url?: string | null
  morphology?:      Record<string, string> | null
  // Voix (pour réafficher la config à l'édition)
  voice_engine?:      string | null
  voice_id?:          string | null
  voice_mode?:        string | null
  voice_description?: string | null
  voice_settings?:    { emotion?: string; speed?: number; pitch?: number } | null
  voice_label?:       string | null
}

export default function AvatarStudioView({ existingAvatars = [] }: { existingAvatars?: ExistingAvatar[] }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const toast        = useToast()

  const [step, setStep]                     = useState<1 | 2 | 3>(1)
  const [modelValidated, setModelValidated] = useState(false)
  const [isSaving, setIsSaving]             = useState(false)
  const [avatarId, setAvatarId]             = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)

  // Portrait généré (URL AIML)
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null)  // URL d'affichage
  const [generatedUrl, setGeneratedUrl]     = useState<string | null>(null)  // URL AIML à persister
  // Fiche de référence personnage (planche multi-poses)
  const [sheetPreview, setSheetPreview]       = useState<string | null>(null)  // URL d'affichage (signée ou AIML)
  const [generatingSheet, setGeneratingSheet] = useState(false)
  const [sheetOpen, setSheetOpen]             = useState(false)               // lightbox de la planche

  const [avatarName, setAvatarName]         = useState('')
  const [avatarAge, setAvatarAge]           = useState('')
  const [avatarEthnicity, setAvatarEthnicity] = useState('')
  const [avatarStyle, setAvatarStyle]       = useState('')
  const [morpho, setMorpho]                 = useState<Partial<Record<MorphoKey, string>>>({})
  const [appearancePrompt, setAppearancePrompt] = useState('')   // description libre d'apparence (prompt direct)
  const [picker, setPicker]                 = useState<MorphoKey | 'origin' | 'style' | null>(null)
  const [continuityMode, setContinuityMode] = useState<'evolutif' | 'verrouille'>('evolutif')

  const [outfitCount, setOutfitCount] = useState(0)
  const [envCount, setEnvCount]       = useState(0)
  const [dirty, setDirty]             = useState(false)   // identité modifiée non sauvegardée
  const [voiceInitial, setVoiceInitial] = useState<AvatarVoiceValue | undefined>(undefined)

  // Confirme avant d'abandonner des modifications d'identité non enregistrées
  function confirmDiscard(): boolean {
    if (!dirty) return true
    return window.confirm('Des modifications d\'identité ne sont pas enregistrées. Les abandonner ?')
  }

  // ── Charger un avatar existant pour l'éditer (garde-robe, décors…) ──────────
  async function loadAvatar(a: ExistingAvatar) {
    if (a.id === avatarId || !confirmDiscard()) return
    setDirty(false)
    setAvatarId(a.id)
    setAvatarName(a.name)
    setAvatarAge(a.age != null ? String(a.age) : '')
    setAvatarEthnicity(a.ethnicity ?? '')
    setAvatarStyle((a.style_tags ?? []).join(', '))
    {
      const m0 = { ...(a.morphology ?? {}) } as Record<string, string>
      const p0 = m0._prompt ?? ''
      delete m0._prompt
      setMorpho(m0 as Partial<Record<MorphoKey, string>>)
      setAppearancePrompt(p0)
    }
    setContinuityMode(a.continuity_mode)
    setVoiceInitial({
      voice_engine: a.voice_engine, voice_id: a.voice_id, voice_mode: a.voice_mode,
      voice_description: a.voice_description, voice_settings: a.voice_settings, voice_label: a.voice_label,
    })
    setModelValidated(true)
    setGeneratedUrl(null); setError(null)
    setOutfitCount(0); setEnvCount(0)   // évite d'afficher les compteurs de l'avatar précédent
    setStep(1)
    // Compteurs réels + portrait en parallèle
    if (a.source_photo_url) {
      actionGetAssetSignedUrl(a.source_photo_url).then((url) => { if (url) setPhotoPreview(url) }).catch(() => {})
    }
    setSheetPreview(null)
    if (a.reference_sheet_url) {
      actionGetAssetSignedUrl(a.reference_sheet_url).then((url) => { if (url) setSheetPreview(url) }).catch(() => {})
    }
    try {
      const lib = await actionGetAvatarLibrary(a.id)
      setOutfitCount(lib.outfits.length)
      setEnvCount(lib.environments.length)
    } catch { /* compteurs restent à 0 */ }
  }


  // Auto-chargement depuis « Modifier le profil » de la Galerie (?avatar=<id>)
  useEffect(() => {
    const id = searchParams.get('avatar')
    if (!id) return
    const a = existingAvatars.find((x) => x.id === id)
    if (a) loadAvatar(a)
    // Nettoie le param → un refresh ultérieur ne rechargera pas cet avatar par surprise
    router.replace('/avatar-studio')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Traits = choix morphologiques (chips) + description libre (prompt direct), fusionnés
  const combinedTraits = () =>
    [buildTraits(morpho), appearancePrompt.trim()].filter(Boolean).join('. ') || undefined

  // ── Fiche de référence personnage (planche 3×3 multi-poses) ──────────────────
  async function generateReferenceSheet() {
    setGeneratingSheet(true); setError(null)
    try {
      // Cohérence : on part du PORTRAIT déjà généré de l'avatar (image-to-image)
      const portraitRef = avatarId ? await actionGetAvatarRefImage(avatarId).catch(() => null) : null
      const result = await actionGenerateAvatarSheet({
        age:       avatarAge ? parseInt(avatarAge) : undefined,
        ethnicity: avatarEthnicity.trim() || undefined,
        style:     avatarStyle.trim() || undefined,
        traits:    combinedTraits(),
        imageUrl:  portraitRef ?? undefined,
      })
      setSheetPreview(result.url)
      toast.success('Fiche de référence générée')
      if (avatarId) {
        const path = await actionPersistAvatarSheet(avatarId, result.url)
        if (!path) toast.error('Fiche non enregistrée (réessaie)')
      }
    } catch (e: any) {
      const msg = e.message ?? 'Erreur génération de la fiche'
      setError(msg); toast.error(msg)
    } finally {
      setGeneratingSheet(false)
    }
  }

  // Styles : multi-sélection synchronisée avec le champ texte (tags séparés par virgules)
  function toggleStyleTag(tag: string) {
    const tags = avatarStyle.split(',').map((s) => s.trim()).filter(Boolean)
    const i = tags.findIndex((x) => x.toLowerCase() === tag.toLowerCase())
    if (i >= 0) tags.splice(i, 1); else tags.push(tag)
    setAvatarStyle(tags.join(', ')); setDirty(true)
  }
  const styleHas = (tag: string) =>
    avatarStyle.split(',').map((s) => s.trim().toLowerCase()).includes(tag.toLowerCase())

  // Valeur courante affichée sur le déclencheur d'un paramètre d'apparence
  const paramValue = (id: ParamId): string => {
    if (id === 'origin') return avatarEthnicity.trim()
    if (id === 'style') { const n = avatarStyle.split(',').map((s) => s.trim()).filter(Boolean).length; return n ? `${n} choisi${n > 1 ? 's' : ''}` : '' }
    return morpho[id] ?? ''
  }
  // Mini-illustration de la sélection courante (sur le déclencheur)
  const paramIcon = (id: ParamId) => {
    if (id === 'origin') { const o = ORIGINS.find(([fr]) => fr.toLowerCase() === avatarEthnicity.trim().toLowerCase()); return o ? <FaceColor color={o[1]} /> : null }
    if (id === 'style') return null
    const fr = morpho[id]; if (!fr) return null
    const color = MORPHO.find((m) => m.key === id)?.opts.find((o) => o[0] === fr)?.[2]
    return <MorphoIcon k={id} fr={fr} color={color} />
  }

  // ── Création / persistance du modèle ────────────────────────────────────────
  async function validateModel() {
    // Nom optionnel : à défaut, on en dérive un depuis le prompt
    const derivedName = avatarName.trim()
      || appearancePrompt.trim().split(/\s+/).slice(0, 4).join(' ').slice(0, 40).trim()
      || 'Nouvel avatar'
    if (!avatarName.trim() && !appearancePrompt.trim()) {
      setError('Donne un nom ou décris ton avatar pour le créer.'); return
    }
    if (!avatarName.trim()) setAvatarName(derivedName)
    setIsSaving(true); setError(null)
    try {
      const tags = avatarStyle ? avatarStyle.split(',').map((s) => s.trim()).filter(Boolean) : []
      // On ne persiste que les choix morphologiques réellement renseignés (déselection = clé retirée)
      const cleanMorpho = Object.fromEntries(Object.entries(morpho).filter(([, v]) => v)) as Record<string, string>
      if (appearancePrompt.trim()) cleanMorpho._prompt = appearancePrompt.trim()
      const morphology = Object.keys(cleanMorpho).length ? cleanMorpho : null
      let id = avatarId
      if (id) {
        await updateAvatar(id, {
          name: derivedName,
          age: avatarAge ? parseInt(avatarAge) : null,
          ethnicity: avatarEthnicity.trim() || null,
          style_tags: tags,
          continuity_mode: continuityMode,
          morphology,
        })
      } else {
        const avatar = await createAvatar({
          name: derivedName,
          age: avatarAge ? parseInt(avatarAge) : null,
          ethnicity: avatarEthnicity.trim() || null,
          style_tags: tags,
          continuity_mode: continuityMode,
          morphology,
        })
        id = avatar.id
        setAvatarId(avatar.id)
      }

      // Persiste le portrait généré sous l'avatar, puis bascule l'aperçu sur l'URL durable
      if (id && generatedUrl) {
        const path = await actionPersistAvatarPhoto(id, generatedUrl)
        if (path) { const s = await actionGetAvatarRefImage(id); if (s) setPhotoPreview(s) }
        else toast.error('Portrait non enregistré (réessaie « Regénérer »)')
      } else if (id && !photoPreview) {
        // Aucun portrait fourni → on en génère un automatiquement (profil + caractéristiques)
        try {
          const result = await actionGenerateAvatarPhoto({
            name:      avatarName.trim() || 'the avatar',
            age:       avatarAge ? parseInt(avatarAge) : undefined,
            ethnicity: avatarEthnicity.trim() || undefined,
            style:     avatarStyle.trim() || undefined,
            traits:    combinedTraits(),
          })
          setGeneratedUrl(result.url)
          setPhotoPreview(result.url)
          const path = await actionPersistAvatarPhoto(id, result.url)
          if (path) { const s = await actionGetAvatarRefImage(id); if (s) setPhotoPreview(s) }
          else toast.error('Portrait non enregistré (réessaie « Regénérer »)')
        } catch { /* best-effort : l'avatar reste créé sans portrait */ }
      }

      setModelValidated(true)
      setDirty(false)   // identité enregistrée
      toast.success(`Avatar "${avatarName.trim()}" enregistré ✓ — génère sa fiche de référence`)
    } catch (e: any) {
      const msg = e.message ?? 'Erreur lors de la sauvegarde'
      setError(msg); toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Finalisation réelle : statut → active ───────────────────────────────────
  async function handleFinalize() {
    if (!avatarId) { toast.error('Créez d\'abord le modèle de base'); return }
    setIsSaving(true)
    try {
      await updateAvatar(avatarId, { status: 'active', continuity_mode: continuityMode })
      toast.success('Avatar finalisé & actif')
      router.push('/galerie')
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur finalisation')
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="nb-label mb-2">Avatar Studio</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">
            Moteur de Création
          </h1>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="flex gap-3 mb-8">
        {PIPELINE_STEPS.map((s) => {
          const isActive    = step === s.id
          const isLocked    = s.id > 1 && !modelValidated
          const isCompleted = s.id < step || (s.id === 1 && modelValidated)
          return (
            <button
              key={s.id}
              onClick={() => !isLocked && setStep(s.id as 1 | 2 | 3)}
              disabled={isLocked}
              className={`
                flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-neo-lg border
                transition-all duration-100
                ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive ? 'border-accent bg-accent/5 shadow-neo' : 'border-border bg-bg-card hover:border-border-strong'}
              `}
            >
              <div className={`w-5 h-5 rounded-neo flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                ${isCompleted ? 'bg-accent text-bg-base' : isActive ? 'bg-accent/20 text-accent' : 'bg-bg-surface text-text-dim'}`}>
                {isCompleted ? '✓' : s.id}
              </div>
              <div className="text-left">
                <div className={`text-[12px] font-semibold ${isActive || isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>{s.label}</div>
                {isLocked && <div className="font-sans text-[9px] text-text-dim">Requiert validation</div>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-7">

        {/* Left panel */}
        <div className="flex flex-col gap-6">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fade-in flex flex-col gap-5">

              {/* Composer horizontal — prompt + chips à gauche, actions à droite */}
              <div className="bg-bg-card border border-border rounded-neo-xl p-4 focus-within:border-border-strong transition-colors">
                <div className="flex gap-4 items-stretch">

                  {/* Zone gauche : description + contrôles */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">

                    {/* Ligne du haut : + (import) + grand champ de description */}
                    <textarea
                      value={appearancePrompt}
                      onChange={(e) => { setAppearancePrompt(e.target.value); setDirty(true) }}
                      rows={5}
                      placeholder="Décris ton avatar — visage, cheveux, peau, morphologie, style, détails (taches de rousseur, lunettes, tatouages…)"
                      className="w-full min-h-[120px] bg-transparent border-0 p-0 pt-0.5 outline-none resize-y focus:shadow-none text-[15px] leading-relaxed text-text-primary placeholder:text-text-faint"
                    />

                    {/* Ligne du bas : nom + âge + chips d'apparence */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={avatarName}
                        onChange={(e) => { setAvatarName(e.target.value); setDirty(true) }}
                        placeholder="Nom *"
                        className="w-[140px] h-9 bg-fg/[0.03] border border-border rounded-neo-md px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent placeholder:text-text-faint placeholder:font-normal"
                      />
                      <input
                        value={avatarAge}
                        onChange={(e) => { setAvatarAge(e.target.value.replace(/\D/g, '')); setDirty(true) }}
                        inputMode="numeric"
                        placeholder="Âge"
                        className="w-[64px] h-9 bg-fg/[0.03] border border-border rounded-neo-md px-2 text-center text-[12px] text-text-primary outline-none focus:border-accent placeholder:text-text-faint"
                      />
                      <span className="w-px h-6 bg-border mx-1 flex-shrink-0" />
                      {APPEARANCE.map(({ id, label }) => {
                        const val = paramValue(id)
                        const icon = paramIcon(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPicker(id)}
                            title={label}
                            className={`group inline-flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-neo-md border transition-all
                              ${val ? 'border-accent/50 bg-accent/10' : 'border-border bg-fg/[0.03] hover:bg-fg/[0.06] hover:border-border-strong'}`}
                          >
                            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-neo bg-fg/[0.04] [&_svg]:!w-[18px] [&_svg]:!h-[18px]">
                              {icon ?? (val
                                ? <span className="w-2 h-2 rounded-full bg-accent" />
                                : <span className="w-2.5 h-2.5 rounded-full border border-dashed border-text-faint" />)}
                            </span>
                            <span className={`text-[12px] font-semibold whitespace-nowrap ${val ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>
                              {val || label}
                            </span>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 transition-colors ${val ? 'text-accent/70' : 'text-text-faint group-hover:text-text-muted'}`} aria-hidden="true">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        )
                      })}
                    </div>

                  </div>

                </div>
              </div>

              {/* Lightbox — fiche de référence en grand */}
              {sheetOpen && sheetPreview && (
                <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in" onClick={() => setSheetOpen(false)}>
                  <button onClick={() => setSheetOpen(false)} className="absolute top-4 right-4 w-9 h-9 rounded-neo border border-white/30 text-white text-lg flex items-center justify-center hover:bg-white/10 transition-colors">×</button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sheetPreview} alt="Fiche de référence" onClick={(e) => e.stopPropagation()} className="max-w-[92vw] max-h-[88vh] object-contain rounded-neo-lg border border-border-strong shadow-neo" />
                </div>
              )}

              {/* Modale d'illustrations — ouverte au clic sur un paramètre d'apparence */}
              {picker && (() => {
                const isOrigin = picker === 'origin'
                const isStyle  = picker === 'style'
                const title = isOrigin ? 'Origine' : isStyle ? 'Styles' : (MORPHO.find((m) => m.key === picker)?.label ?? '')
                let tiles: ReactNode
                if (isOrigin) {
                  tiles = ORIGINS.map(([fr, color]) => {
                    const active = avatarEthnicity.trim().toLowerCase() === fr.toLowerCase()
                    return (
                      <button key={fr} type="button" onClick={() => { setAvatarEthnicity(active ? '' : fr); setDirty(true); setPicker(null) }} className={tileCls(active)}>
                        <FaceColor color={color} /><span className="font-sans text-[8.5px] text-center leading-tight">{fr}</span>
                      </button>
                    )
                  })
                } else if (isStyle) {
                  tiles = STYLE_TAGS.map((tag, i) => {
                    const active = styleHas(tag)
                    return (
                      <button key={tag} type="button" onClick={() => toggleStyleTag(tag)} className={tileCls(active)}>
                        <StyleIcon color={STYLE_PALETTE[i % STYLE_PALETTE.length]} /><span className="font-sans text-[8.5px] text-center leading-tight">{tag}</span>
                      </button>
                    )
                  })
                } else {
                  const mk = picker as MorphoKey
                  tiles = (MORPHO.find((m) => m.key === mk)?.opts ?? []).map(([fr, , color]) => {
                    const active = morpho[mk] === fr
                    return (
                      <button key={fr} type="button" onClick={() => { setMorpho((prev) => ({ ...prev, [mk]: active ? '' : fr })); setDirty(true); setPicker(null) }} className={tileCls(active)}>
                        <MorphoIcon k={mk} fr={fr} color={color} /><span className="font-sans text-[8.5px] text-center leading-tight">{fr}</span>
                      </button>
                    )
                  })
                }
                return (
                  <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in" onClick={() => setPicker(null)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] bg-bg-card border border-border-strong rounded-neo-lg shadow-neo animate-slide-up">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                        <h3 className="font-display font-bold text-[14px] text-text-primary">{title}</h3>
                        <button onClick={() => setPicker(null)} className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">×</button>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2 justify-center">{tiles}</div>
                      {isStyle && (
                        <div className="px-4 pb-4 flex justify-end">
                          <Button size="sm" onClick={() => setPicker(null)}>Terminé</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {error && (
                <div className="bg-coral/5 border border-coral/30 rounded-neo px-4 py-2.5">
                  <p className="font-sans text-[11px] text-coral">{error}</p>
                </div>
              )}

              <Button onClick={validateModel} size="lg" loading={isSaving} disabled={!avatarName.trim()}>
                {modelValidated ? '✓ Enregistrer les modifications' : 'Créer l\'avatar'}
              </Button>

              {/* ── Une fois l'avatar créé : fiche de référence + voix (rattachées à son ID) ── */}
              {avatarId && modelValidated && (
                <>
                  {/* Fiche de référence personnage (planche multi-poses) */}
                  <div className="bg-bg-card border border-accent/40 rounded-neo-lg p-5">
                    <h2 className="font-display font-bold text-[15px] text-text-primary mb-2 flex items-center gap-2">Fiche de référence</h2>
                    <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
                      Planche du personnage sous plusieurs angles & expressions (même identité) — sert de référence de cohérence pour toutes les générations.
                    </p>
                    <div className="flex gap-3 items-start flex-wrap">
                      <button
                        type="button"
                        onClick={() => sheetPreview && setSheetOpen(true)}
                        className={`relative w-32 h-32 rounded-neo-lg border overflow-hidden flex items-center justify-center flex-shrink-0
                          ${sheetPreview ? 'border-accent cursor-zoom-in' : 'border-dashed border-border bg-bg-surface'}`}
                      >
                        {sheetPreview
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={sheetPreview} alt="Fiche de référence" className="w-full h-full object-cover" />
                          : <span className="font-sans text-[10px] text-text-dim text-center px-2">Aucune fiche</span>}
                      </button>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={generateReferenceSheet} loading={generatingSheet} disabled={generatingSheet}>
                          {generatingSheet ? 'Nano Banana…' : sheetPreview ? 'Regénérer la fiche' : 'Générer la fiche de référence'}
                        </Button>
                        {sheetPreview && <span className="font-sans text-[9px] text-text-dim">Clique la planche pour l'agrandir</span>}
                      </div>
                    </div>
                  </div>

                  {/* Voix de l'avatar */}
                  <AvatarVoice
                    key={avatarId}
                    avatarId={avatarId}
                    avatarName={avatarName}
                    age={avatarAge ? parseInt(avatarAge) : null}
                    styleTags={avatarStyle ? avatarStyle.split(',').map((s) => s.trim()).filter(Boolean) : []}
                    gender={morpho.gender}
                    ethnicity={avatarEthnicity}
                    appearancePrompt={appearancePrompt}
                    initial={voiceInitial}
                  />

                  <Button variant="secondary" size="lg" onClick={() => setStep(2)}>Continuer → Garde-robe</Button>
                </>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && avatarId && (
            <div className="flex flex-col gap-5">
              <AvatarWardrobe avatarId={avatarId} onCount={setOutfitCount} />
              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(1)}>← Modèle de base</Button>
                <Button onClick={() => setStep(3)}>Environnements →</Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && avatarId && (
            <div className="flex flex-col gap-5">
              <AvatarEnvironment
                avatarId={avatarId}
                onCount={setEnvCount}
                continuityMode={continuityMode}
                setContinuityMode={setContinuityMode}
              />
              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(2)}>← Garde-robe</Button>
                <Button onClick={handleFinalize} loading={isSaving}>Finaliser l'Avatar → Galerie</Button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — sticky preview */}
        <div className="sticky top-0 self-start">
          <div className={`bg-bg-card border rounded-neo-lg overflow-hidden shadow-neo ${modelValidated ? 'border-accent' : 'border-border'}`}>
            {/* Portrait dominant + identité en surimpression */}
            <div className="relative h-[300px] bg-bg-elevated">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt={avatarName} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-dashed border-border flex items-center justify-center font-sans text-text-dim text-sm">IA</div>
                </div>
              )}
              {isSaving && !photoPreview && (
                <div className="absolute inset-0 bg-bg-elevated/80 flex flex-col items-center justify-center gap-2 z-20">
                  <div className="w-8 h-8 border border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="font-sans text-[10px] text-text-dim">Nano Banana…</span>
                </div>
              )}
              <span className={`absolute top-3 right-3 z-10 font-sans text-[9px] font-bold border rounded px-2 py-0.5 bg-black/55 backdrop-blur-sm
                ${modelValidated ? 'text-teal border-border-teal' : 'text-white/70 border-white/30'}`}>
                {modelValidated ? 'Actif' : 'Brouillon'}
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 p-4" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-display font-bold text-[20px] text-white truncate">{avatarName || 'Nouvel avatar'}</h2>
                  {modelValidated && (
                    <svg width="15" height="15" viewBox="0 0 24 24" className="flex-shrink-0 text-accent" aria-hidden="true">
                      <path fill="currentColor" d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15.6l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3-.1z"/>
                      <path fill="none" stroke="#0f1113" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.3 2.3 4.6-4.8"/>
                    </svg>
                  )}
                </div>
                <p className="font-sans text-[10px] text-white/85 truncate">
                  {avatarAge ? `${avatarAge} ans` : '—'}{avatarEthnicity ? ` · ${avatarEthnicity}` : ''}{avatarStyle.split(',')[0]?.trim() ? ` · ${avatarStyle.split(',')[0].trim()}` : ''}
                </p>
              </div>
            </div>

            {/* Infos modèle */}
            <div className="p-4 flex flex-col gap-3">
              <div>
                <div className="nb-label text-[8.5px] mb-0.5">Statut du modèle</div>
                <div className={`text-[12.5px] font-medium ${modelValidated ? 'text-accent' : 'text-text-muted'}`}>
                  {modelValidated ? '✓ Enregistré' : 'En cours de création'}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="nb-label text-[8.5px] mb-0.5">Garde-robe</div>
                <div className="text-[12.5px] text-text-primary">{outfitCount} tenue{outfitCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="nb-label text-[8.5px] mb-0.5">Environnements ({continuityMode === 'evolutif' ? 'Évolutif' : 'Verrouillé'})</div>
                <div className="text-[12.5px] text-text-primary">{envCount} lieu{envCount > 1 ? 'x' : ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
