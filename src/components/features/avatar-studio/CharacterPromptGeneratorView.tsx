'use client'

import { type ReactNode, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createAvatar, updateAvatar } from '@/lib/actions/avatars'
import { actionAddOutfit, actionAddEnvironment, actionDeleteOutfit, actionDeleteEnvironment, actionPersistAvatarPhoto, actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { actionInspireFromMedia, actionGenerateAvatarPhoto, actionDescribeAvatarFromImage } from '@/lib/actions/ai'
import { actionGenerateAppearanceIllustrations } from '@/lib/actions/appearance-illustrations'
import { appearanceCategories, appearanceImg, type AppearanceCategoryDef, type AppearanceOptionDef, type AppearanceGender } from '@/lib/avatar/appearance-options'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { useT } from '@/lib/i18n'
import {
  ChevronDown,
  ChevronLeft,
  Mars,
  ScanFace,
  Sparkles,
  UserCog,
  UserRound,
  Venus,
  Upload,
  Wand2,
  X,
} from 'lucide-react'

const ageGroupOptions = [
  'Enfant',
  'Adolescent',
  'Jeune adulte (18-25)',
  'Adulte (26-35)',
  'Adulte (36-50)',
  'Senior (50+)',
] as const

// Tranche d'âge FR → âge représentatif (numérique) pour le prompt de génération.
const ageGroupToAge: Record<string, number> = {
  'Enfant': 8,
  'Adolescent': 16,
  'Jeune adulte (18-25)': 22,
  'Adulte (26-35)': 30,
  'Adulte (36-50)': 43,
  'Senior (50+)': 60,
}

const ethnicityOptions = [
  'Caucasien',
  'Africain / Noir',
  'Afro-américain',
  'Maghrébin / Arabe',
  'Moyen-oriental',
  'Hispanique / Latino',
  'Asiatique de l’Est',
  'Asiatique du Sud',
  'Métis',
  'Autre',
] as const

// Ethnie FR → descripteur EN pour le prompt de génération (le FR reste stocké pour l'affichage).
const ethnicityToEn: Record<string, string> = {
  'Caucasien': 'Caucasian',
  'Africain / Noir': 'Black African',
  'Afro-américain': 'African American',
  'Maghrébin / Arabe': 'North African Arab',
  'Moyen-oriental': 'Middle Eastern',
  'Hispanique / Latino': 'Hispanic Latino',
  'Asiatique de l’Est': 'East Asian',
  'Asiatique du Sud': 'South Asian',
  'Métis': 'mixed race',
}

type Identity = { name: string; gender: 'male' | 'female' | ''; ageGroup: string; ethnicity: string }

// Avatar existant passé pour l'édition (hydrate le workflow au lieu de créer).
export type EditAvatar = {
  id: string
  name: string
  gender: 'male' | 'female' | ''
  ageGroup: string
  ethnicity: string
  portraitUrl: string | null
}

// Assets déjà sauvegardés dans la bibliothèque de l'avatar (affichés en édition).
export type SavedOutfit = { id: string; name: string; refUrl: string | null }
export type SavedEnvironment = { id: string; name: string; refUrl: string | null }

type OutfitStyle = 'casual' | 'smart' | 'sport' | 'formal' | 'streetwear' | 'custom'
type Outfit = { description: string; styleType: OutfitStyle | ''; file: File | null; previewUrl: string }

type CloneImage = { file: File; previewUrl: string; dataUrl: string }

type Appearance = { hairStyle: string; hairColor: string; eyes: string; facialHair: string; skinDetail: string; extra: string }

const outfitTagOptions: { label: string; style: OutfitStyle }[] = [
  { label: 'Formel', style: 'formal' },
  { label: 'Sport / Gym', style: 'sport' },
  { label: 'Sportswear', style: 'sport' },
  { label: 'Décontracté', style: 'casual' },
  { label: 'Médecin', style: 'custom' },
  { label: 'Ouvrier BTP', style: 'custom' },
  { label: 'Chef cuisinier', style: 'custom' },
]

type Background = { name: string; locationType: string; sceneType: string; lighting: string; shotType: string; file: File | null; previewUrl: string }

const lightingOptions = [
  'Lumière naturelle',
  'Studio',
  'Lumière douce',
  'Contre-jour',
  'Golden hour',
  'Néon',
  'Clair-obscur',
] as const

const shotTypeOptions = [
  'Gros plan',
  'Portrait (buste)',
  'Plan taille',
  'Plan américain',
  'Plan large',
  'Plongée',
  'Contre-plongée',
] as const

// Éclairage / plan FR → descripteur EN pour le prompt de génération.
const lightingToEn: Record<string, string> = {
  'Lumière naturelle': 'natural light',
  'Studio': 'studio lighting',
  'Lumière douce': 'soft lighting',
  'Contre-jour': 'backlight',
  'Golden hour': 'golden hour light',
  'Néon': 'neon lighting',
  'Clair-obscur': 'chiaroscuro lighting',
}
const shotTypeToEn: Record<string, string> = {
  'Gros plan': 'close-up shot',
  'Portrait (buste)': 'bust portrait shot',
  'Plan taille': 'waist-up shot',
  'Plan américain': 'American medium shot',
  'Plan large': 'wide shot',
  'Plongée': 'high angle shot',
  'Contre-plongée': 'low angle shot',
}

export default function CharacterPromptGeneratorView({ editAvatar, savedOutfits = [], savedEnvironments = [] }: { editAvatar?: EditAvatar; savedOutfits?: SavedOutfit[]; savedEnvironments?: SavedEnvironment[] }) {
  const isEditing = Boolean(editAvatar)
  const toast = useToast()
  const tr = useT()
  const [outfitLib, setOutfitLib] = useState<SavedOutfit[]>(savedOutfits)
  const [environmentLib, setEnvironmentLib] = useState<SavedEnvironment[]>(savedEnvironments)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  // Signature du dernier asset enregistré → évite les doublons si on repasse l'étape sans rien changer.
  const lastSavedOutfitSig = useRef<string | null>(null)
  const lastSavedEnvSig = useRef<string | null>(null)

  const removeOutfit = async (id: string) => {
    if (deletingAssetId) return
    setDeletingAssetId(id)
    try {
      await actionDeleteOutfit(id)
      setOutfitLib((l) => l.filter((o) => o.id !== id))
      lastSavedOutfitSig.current = null // autorise un nouvel enregistrement identique
      toast.success(tr('avatar.tOutfitDeleted'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tDeleteFailed'))
    } finally {
      setDeletingAssetId(null)
    }
  }

  const removeEnvironment = async (id: string) => {
    if (deletingAssetId) return
    setDeletingAssetId(id)
    try {
      await actionDeleteEnvironment(id)
      setEnvironmentLib((l) => l.filter((e) => e.id !== id))
      lastSavedEnvSig.current = null // autorise un nouvel enregistrement identique
      toast.success(tr('avatar.tEnvDeleted'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tDeleteFailed'))
    } finally {
      setDeletingAssetId(null)
    }
  }
  // En édition : on saute l'étape Source (index 0) et on démarre sur Identité (index 1).
  const [currentStepIndex, setCurrentStepIndex] = useState(editAvatar ? 1 : 0)
  const [sourceType, setSourceType] = useState<'scratch' | 'clone'>('scratch')
  const [identity, setIdentity] = useState<Identity>(editAvatar
    ? { name: editAvatar.name, gender: editAvatar.gender, ageGroup: editAvatar.ageGroup, ethnicity: editAvatar.ethnicity }
    : { name: '', gender: '', ageGroup: '', ethnicity: '' })
  const [avatarId, setAvatarId] = useState<string | null>(editAvatar?.id ?? null)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [outfit, setOutfit] = useState<Outfit>({ description: '', styleType: '', file: null, previewUrl: '' })
  const [savingOutfit, setSavingOutfit] = useState(false)
  const [generatingOutfit, setGeneratingOutfit] = useState(false)
  const [background, setBackground] = useState<Background>({ name: '', locationType: '', sceneType: '', lighting: '', shotType: '', file: null, previewUrl: '' })
  const [generatingScene, setGeneratingScene] = useState(false)
  const [generatingCharacter, setGeneratingCharacter] = useState(false)
  const [resultUrl, setResultUrl] = useState(editAvatar?.portraitUrl ?? '')
  const [cloneImages, setCloneImages] = useState<CloneImage[]>([])
  const [savingClone, setSavingClone] = useState(false)
  const [appearance, setAppearance] = useState<Appearance>({ hairStyle: '', hairColor: '', eyes: '', facialHair: '', skinDetail: '', extra: '' })
  const [genIllusCat, setGenIllusCat] = useState<string | null>(null)
  const [illusVersion, setIllusVersion] = useState(0)

  // DEV : génère les illustrations manquantes (homme + femme, modèle Black) d'une catégorie.
  // `force` (Shift+clic) régénère même celles déjà présentes.
  const handleGenIllustrations = async (categorySlug: string, force = false) => {
    if (genIllusCat) return
    setGenIllusCat(categorySlug)
    toast.info(force ? 'Régénération forcée en cours…' : 'Génération des illustrations manquantes…')
    try {
      const r = await actionGenerateAppearanceIllustrations(categorySlug, force)
      if (r.count > 0) {
        setIllusVersion((v) => v + 1) // cache-bust → les cartes re-téléchargent les images
        toast.success(`${r.count} générées${r.skipped ? ` · ${r.skipped} déjà présentes` : ''}${r.failed ? ` · ${r.failed} échecs` : ''}`)
      } else if (r.skipped > 0) {
        toast.info(`Déjà à jour (${r.skipped} illustrations). Shift+clic pour régénérer.`)
      } else {
        toast.error(`Échec génération : ${r.error || 'voir la console serveur'}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tGenFailed'))
    } finally {
      setGenIllusCat(null)
    }
  }

  const handleNextStep = () => {
    setCurrentStepIndex((prev) => {
      const maxStep = sourceType === 'clone' ? 4 : 4
      return Math.min(prev + 1, maxStep)
    })
  }

  const handlePrevStep = () => {
    // En édition, on ne revient pas à l'étape Source.
    setCurrentStepIndex((prev) => Math.max(prev - 1, isEditing ? 1 : 0))
  }

  const handleSelectSource = (type: 'scratch' | 'clone') => {
    setSourceType(type)
    setCurrentStepIndex(1)
  }

  // Étape 2 (Identité) → persiste le personnage en base (création ou mise à jour du brouillon)
  // puis avance. L'id obtenu est réutilisé par les étapes suivantes.
  const handleIdentityContinue = async () => {
    if (savingIdentity) return
    setSavingIdentity(true)
    try {
      const payload = {
        name: identity.name.trim(),
        ethnicity: identity.ethnicity || null,
        morphology: { gender: identity.gender, ageGroup: identity.ageGroup },
      }
      if (avatarId) {
        await updateAvatar(avatarId, payload)
      } else {
        const created = await createAvatar(payload)
        setAvatarId(created.id)
      }
      toast.success(tr('avatar.tCharSaved'))
      handleNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tSaveFailed'))
    } finally {
      setSavingIdentity(false)
    }
  }

  // Étape 3 (flux clone) → persiste la 1ʳᵉ image de référence comme portrait de l'avatar, puis avance.
  const handleCloneContinue = async () => {
    if (savingClone) return
    if (!cloneImages.length || !avatarId) { handleNextStep(); return }
    setSavingClone(true)
    try {
      const { url } = await actionUploadTempImage(cloneImages[0].dataUrl)
      if (url) await actionPersistAvatarPhoto(avatarId, url)
      toast.success(tr('avatar.tImagesSaved'))
      handleNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tSaveFailed'))
    } finally {
      setSavingClone(false)
    }
  }

  // Étape 4 (Tenue) → génère une description : décrit l'image IA si fournie, sinon compose
  // une suggestion à partir du style choisi et de l'identité.
  const handleGenerateOutfit = async () => {
    if (generatingOutfit) return
    setGeneratingOutfit(true)
    try {
      if (outfit.file) {
        const dataUrl = await fileToDataUrl(outfit.file)
        const desc = await actionInspireFromMedia({
          dataUrl,
          hint: 'Décris précisément cette tenue vestimentaire en français : pièces, couleurs, matières, coupe et style global. Phrase courte et concrète.',
        })
        setOutfit((o) => ({ ...o, description: desc.trim() }))
      } else {
        const who = [identity.gender === 'female' ? 'femme' : identity.gender === 'male' ? 'homme' : 'personne', identity.ageGroup]
          .filter(Boolean).join(', ')
        const style = outfitTagOptions.find((t) => t.style === outfit.styleType)?.label || 'décontracté'
        setOutfit((o) => ({ ...o, description: `Tenue ${style.toLowerCase()} pour ${who || 'le personnage'}, coupe moderne et soignée, couleurs harmonieuses, rendu réaliste.` }))
      }
      toast.success(tr('avatar.tDescGenerated'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tGenFailed'))
    } finally {
      setGeneratingOutfit(false)
    }
  }

  // Étape 4 (Tenue, optionnelle) → persiste la tenue (image + description) liée au personnage, puis avance.
  const handleOutfitContinue = async () => {
    if (savingOutfit) return
    const hasData = Boolean(outfit.file || outfit.description.trim())
    if (!avatarId || !hasData) { handleNextStep(); return }
    // Contenu identique au dernier enregistrement → on n'enregistre pas de doublon.
    const sig = `${outfit.styleType}|${outfit.description.trim()}|${outfit.file?.name ?? ''}|${outfit.file?.size ?? ''}`
    if (sig === lastSavedOutfitSig.current) { handleNextStep(); return }
    setSavingOutfit(true)
    try {
      const name = outfit.description.trim().slice(0, 40)
        || outfitTagOptions.find((t) => t.style === outfit.styleType)?.label
        || 'Tenue'
      const fd = new FormData()
      fd.append('avatarId', avatarId)
      fd.append('name', name)
      fd.append('styleType', outfit.styleType || 'casual')
      fd.append('description', outfit.description.trim())
      if (outfit.file) fd.append('file', outfit.file)
      const saved = await actionAddOutfit(fd)
      lastSavedOutfitSig.current = sig
      setOutfitLib((l) => [...l, { id: saved.id, name: saved.name, refUrl: outfit.previewUrl || null }])
      toast.success(tr('avatar.tOutfitSaved'))
      handleNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tSaveFailed'))
    } finally {
      setSavingOutfit(false)
    }
  }

  // Étape 5 (Arrière-plan) → suggère une scène à partir de l'identité + la tenue.
  const handleGenerateScene = () => {
    if (generatingScene) return
    setGeneratingScene(true)
    try {
      const who = identity.gender === 'female' ? 'le personnage féminin' : identity.gender === 'male' ? 'le personnage masculin' : 'le personnage'
      const wearing = outfit.description.trim() ? ` portant ${outfit.description.trim().toLowerCase()}` : ''
      setBackground((b) => ({
        ...b,
        sceneType: `${who}${wearing} dans un décor lifestyle réaliste et lumineux, ambiance naturelle, profondeur de champ douce.`,
      }))
      toast.success(tr('avatar.tSceneGenerated'))
    } finally {
      setGeneratingScene(false)
    }
  }

  // Étape 3 (scratch, Apparence) → résume les traits choisis (+ identité) en une description.
  const handleGenerateAppearance = () => {
    const noCustom = (v: string) => v && v !== 'Personnalisé' ? v : ''
    const parts = [
      noCustom(appearance.hairStyle) && `cheveux ${appearance.hairStyle.toLowerCase()}`,
      noCustom(appearance.hairColor) && `couleur ${appearance.hairColor.toLowerCase()}`,
      noCustom(appearance.eyes) && `yeux ${appearance.eyes.toLowerCase()}`,
      noCustom(appearance.facialHair) && appearance.facialHair.toLowerCase(),
      noCustom(appearance.skinDetail) && appearance.skinDetail.toLowerCase(),
    ].filter(Boolean)
    if (!parts.length) { toast.info(tr('avatar.tNeedTrait')); return }
    setAppearance((a) => ({ ...a, extra: `${parts.join(', ')}.` }))
    toast.success(tr('avatar.tDescGenerated'))
  }

  // Traits d'apparence pour le prompt : on mappe le libellé FR choisi → descripteur EN (promptEn).
  const appearanceTraits = () => {
    const en = (catKey: string, label: string) => {
      if (!label || label === 'Personnalisé') return ''
      const cat = appearanceCategories.find((c) => c.key === catKey)
      return cat?.options.find((o) => o.label === label)?.promptEn ?? ''
    }
    return [
      en('hairStyle', appearance.hairStyle),
      en('hairColor', appearance.hairColor),
      en('eyes', appearance.eyes),
      en('facialHair', appearance.facialHair),
      en('skinDetail', appearance.skinDetail),
      appearance.extra.trim(),
    ].filter(Boolean).join(', ')
  }

  // Étape 5 → GÉNÉRATION RÉELLE du personnage : compose le prompt à partir de toutes les
  // étapes, génère le portrait (Nano Banana), le persiste et l'affiche dans l'aperçu.
  const handleGenerateCharacter = async () => {
    if (generatingCharacter) return
    if (!identity.name.trim()) { toast.error(tr('avatar.tNeedName')); return }
    setGeneratingCharacter(true)
    setResultUrl('')
    try {
      let id = avatarId
      if (!id) {
        const created = await createAvatar({
          name: identity.name.trim(),
          ethnicity: identity.ethnicity || null,
          morphology: { gender: identity.gender, ageGroup: identity.ageGroup },
        })
        id = created.id
        setAvatarId(id)
      }
      const traits = [
        identity.gender === 'female' ? 'female' : identity.gender === 'male' ? 'male' : '',
        appearanceTraits(),
        outfit.description.trim() ? `wearing ${outfit.description.trim()}` : '',
      ].filter(Boolean).join(', ')
      const age = ageGroupToAge[identity.ageGroup]
      const setting = [
        background.sceneType.trim(),
        lightingToEn[background.lighting] ?? background.lighting,
        shotTypeToEn[background.shotType] ?? background.shotType,
      ].filter(Boolean).join(', ')
      // Flux clone : on passe la VRAIE photo en image-to-image (fidélité au visage) + une
      // description du visage en secours. La tenue uploadée sert aussi de référence si présente.
      let imageUrl: string | undefined
      let descriptionPrompt: string | undefined
      if (cloneImages.length) {
        try {
          const up = await actionUploadTempImage(cloneImages[0].dataUrl)
          imageUrl = up.url || undefined
        } catch { /* best-effort */ }
        // Secours uniquement si l'upload a échoué : on reconstruit le visage par description.
        if (!imageUrl) {
          try { descriptionPrompt = await actionDescribeAvatarFromImage({ dataUrl: cloneImages[0].dataUrl }) } catch { /* best-effort */ }
        }
      }
      const result = await actionGenerateAvatarPhoto({
        name: identity.name.trim(),
        age,
        ethnicity: (ethnicityToEn[identity.ethnicity] ?? identity.ethnicity) || undefined,
        style: outfit.description.trim() || undefined,
        setting: setting || undefined,
        traits: traits || undefined,
        descriptionPrompt,
        imageUrl,
      })
      setResultUrl(result.url)
      await actionPersistAvatarPhoto(id, result.url)
      await updateAvatar(id, { status: 'active' })
      // Persiste l'environnement dans la bibliothèque de l'avatar (réutilisable) — best-effort.
      // Garde anti-doublon : on n'enregistre que si le décor a changé depuis le dernier enregistrement.
      const envName = background.name.trim() || background.locationType.trim()
      const envSig = `${envName}|${background.locationType.trim()}|${background.sceneType.trim()}|${background.file?.name ?? ''}|${background.file?.size ?? ''}`
      if ((envName || background.file) && envSig !== lastSavedEnvSig.current) {
        try {
          const fd = new FormData()
          fd.append('avatarId', id)
          fd.append('name', envName || tr('avatar.defaultEnvName'))
          fd.append('locationType', background.locationType.trim())
          fd.append('description', background.sceneType.trim())
          if (background.file) fd.append('file', background.file)
          const savedEnv = await actionAddEnvironment(fd)
          lastSavedEnvSig.current = envSig
          setEnvironmentLib((l) => [...l, { id: savedEnv.id, name: savedEnv.name, refUrl: background.previewUrl || null }])
        } catch { /* best-effort */ }
      }
      toast.success(tr('avatar.tCharGenerated'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('avatar.tGenFailed'))
    } finally {
      setGeneratingCharacter(false)
    }
  }

  const stepContainer =
    'flex h-full w-full shrink-0 flex-col items-center justify-center overflow-y-auto px-5 py-8 sm:px-7 lg:px-10'

  const stepLabels = [
    tr('avatar.stepSource'),
    tr('avatar.stepIdentity'),
    sourceType === 'scratch' ? tr('avatar.stepAppearance') : tr('avatar.stepPhotos'),
    tr('avatar.stepOutfit'),
    tr('avatar.stepBackground'),
  ]

  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        <header className="flex h-[56px] shrink-0 items-center gap-4 border-b border-border px-5">
          <Link
            href="/avatar-studio"
            aria-label={tr('avatar.backLibrary')}
            className="grid h-8 w-8 place-items-center rounded-full text-text-primary transition-colors hover:bg-fg/[0.06]"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
          <span className="h-7 w-px bg-border" />
          <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">
            {isEditing ? tr('avatar.editCharacter') : tr('avatar.createCharacter')}
          </h1>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {stepLabels.map((label, index) => {
              if (isEditing && index === 0) return null // pas d'étape Source en édition
              const active = currentStepIndex === index
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentStepIndex(index)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold transition-colors ${active ? 'bg-accent text-white' : 'text-text-secondary hover:bg-fg/[0.06] hover:text-text-primary'}`}
                >
                  <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${active ? 'bg-white/25 text-white' : 'bg-fg/[0.10] text-text-secondary'}`}>{isEditing ? index : index + 1}</span>
                  {label}
                </button>
              )
            })}
          </nav>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="relative flex h-full w-full flex-col overflow-hidden">
            <div
              className="flex h-full w-full flex-col transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${currentStepIndex * 100}%)` }}
            >
              {/* Step 0: Source selection (shared) */}
              <div className={stepContainer}>
                <SourceStep selected={currentStepIndex > 0 ? sourceType : null} onSelectSource={handleSelectSource} />
              </div>

              {sourceType === 'scratch' ? (
                <>
                  {/* Scratch flow: Identity → Appearance → Outfit → Background */}
                  <div className={stepContainer}>
                    <CharacterIdentityStep value={identity} onChange={setIdentity} saving={savingIdentity} onContinue={handleIdentityContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterAppearanceStep value={appearance} onChange={setAppearance} gender={identity.gender || 'male'} version={illusVersion} onGenerate={handleGenerateAppearance} onGenIllustrations={handleGenIllustrations} genIllusCat={genIllusCat} onContinue={handleNextStep} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterOutfitStep value={outfit} onChange={setOutfit} onGenerate={handleGenerateOutfit} generating={generatingOutfit} saving={savingOutfit} onContinue={handleOutfitContinue} onBack={handlePrevStep} saved={outfitLib} onDelete={removeOutfit} deletingId={deletingAssetId} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterBackgroundStep value={background} onChange={setBackground} onGenerateScene={handleGenerateScene} generatingScene={generatingScene} onGenerate={handleGenerateCharacter} generating={generatingCharacter} onBack={handlePrevStep} saved={environmentLib} onDelete={removeEnvironment} deletingId={deletingAssetId} />
                  </div>
                </>
              ) : (
                <>
                  {/* Clone flow: Identity → Upload Images → Outfit → Background */}
                  <div className={stepContainer}>
                    <CharacterIdentityStep value={identity} onChange={setIdentity} saving={savingIdentity} onContinue={handleIdentityContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <UploadCharacterImagesStep value={cloneImages} onChange={setCloneImages} saving={savingClone} onContinue={handleCloneContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterOutfitStep value={outfit} onChange={setOutfit} onGenerate={handleGenerateOutfit} generating={generatingOutfit} saving={savingOutfit} onContinue={handleOutfitContinue} onBack={handlePrevStep} saved={outfitLib} onDelete={removeOutfit} deletingId={deletingAssetId} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterBackgroundStep value={background} onChange={setBackground} onGenerateScene={handleGenerateScene} generatingScene={generatingScene} onGenerate={handleGenerateCharacter} generating={generatingCharacter} onBack={handlePrevStep} saved={environmentLib} onDelete={removeEnvironment} deletingId={deletingAssetId} />
                  </div>
                </>
              )}
            </div>
          </main>

          <aside className="flex h-full flex-col overflow-hidden border-t border-border bg-fg/[0.03] px-5 py-6 lg:border-l lg:border-t-0">
            <h2 className="shrink-0 text-[18px] font-extrabold tracking-tight text-text-primary">
              {tr('avatar.previewTitle')}
            </h2>
            <p className="mt-2 shrink-0 text-[13px] font-medium text-text-secondary">
              {tr('avatar.previewHint')}
            </p>

            <div className="mt-5 flex flex-1 items-center justify-center overflow-hidden rounded-[14px] border border-border bg-fg/[0.05] px-5 text-center">
              {generatingCharacter ? (
                <div>
                  <span className="mx-auto block h-9 w-9 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                  <p className="mt-4 text-[13px] font-medium text-text-secondary">{tr('avatar.generatingCharacter')}</p>
                </div>
              ) : resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultUrl} alt="" className="max-h-full w-auto rounded-[10px] object-contain" />
              ) : (
                <div>
                  <UserRound className="mx-auto text-text-faint" size={42} strokeWidth={2.3} />
                  <p className="mt-4 text-[14px] font-medium text-text-secondary">{tr('avatar.previewPlaceholder')}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function SourceStep({ selected, onSelectSource }: { selected: 'scratch' | 'clone' | null; onSelectSource: (type: 'scratch' | 'clone') => void }) {
  const tr = useT()
  const opts = [
    { id: 'scratch' as const, icon: UserCog, title: tr('avatar.scratchTitle'), description: tr('avatar.scratchDesc'), bullets: [tr('avatar.scratchB1'), tr('avatar.scratchB2'), tr('avatar.scratchB3')] },
    { id: 'clone' as const, icon: ScanFace, title: tr('avatar.cloneTitle'), description: tr('avatar.cloneDesc'), bullets: [tr('avatar.cloneB1'), tr('avatar.cloneB2'), tr('avatar.cloneB3')] },
  ]
  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <StepHeading step={1} title={tr('avatar.sourceTitle')} />

      <div className="grid gap-4 md:grid-cols-2">
        {opts.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectSource(option.id)}
              aria-pressed={isSelected}
              className={`group relative flex min-h-[160px] flex-col rounded-[14px] border-2 bg-fg/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5 hover:shadow-neo sm:p-5 ${
                isSelected ? 'border-accent bg-accent/5 shadow-neo' : 'border-border'
              }`}
            >
              <span className={`grid h-[44px] w-[44px] place-items-center rounded-full transition-colors ${isSelected ? 'bg-accent text-white' : 'bg-accent/12 text-accent group-hover:bg-accent group-hover:text-white'}`}>
                <Icon size={20} strokeWidth={2.4} />
              </span>

              <h3 className="mt-4 text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">
                {option.title}
              </h3>
              <p className="mt-2 max-w-[290px] text-[13px] font-medium leading-snug text-text-secondary">
                {option.description}
              </p>

              <ul className="mt-4 space-y-2 text-[12px] font-medium text-text-secondary">
                {option.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CharacterIdentityStep({
  value,
  onChange,
  onContinue,
  onBack,
  saving,
  hideContinue,
}: {
  value: Identity
  onChange: (next: Identity) => void
  onContinue: () => void
  onBack?: () => void
  saving?: boolean
  hideContinue?: boolean
}) {
  const tr = useT()
  const set = <K extends keyof Identity>(key: K, v: Identity[K]) => onChange({ ...value, [key]: v })
  const canContinue = Boolean(value.name.trim() && value.gender && value.ageGroup && value.ethnicity)

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <StepHeading step={2} title={tr('avatar.identityTitle')} />

      <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <FormField label={tr('avatar.nameLabel')}>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={tr('avatar.namePlaceholder')}
            className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
          />
        </FormField>

        <FormField label={tr('avatar.genderLabel')}>
          <div className="grid h-8 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('gender', 'male')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] border text-[12px] font-extrabold transition-colors ${value.gender === 'male' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-primary hover:border-accent'}`}
            >
              <Mars size={14} strokeWidth={2.5} />
              {tr('avatar.male')}
            </button>
            <button
              type="button"
              onClick={() => set('gender', 'female')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] border text-[12px] font-extrabold transition-colors ${value.gender === 'female' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-primary hover:border-accent'}`}
            >
              <Venus size={14} strokeWidth={2.5} />
              {tr('avatar.female')}
            </button>
          </div>
        </FormField>

        <FormField label={tr('avatar.ageGroupLabel')}>
          <SelectControl
            value={value.ageGroup}
            onChange={(v) => set('ageGroup', v)}
            placeholder={tr('avatar.ageGroupPlaceholder')}
            options={ageGroupOptions}
          />
        </FormField>

        <FormField label={tr('avatar.ethnicityLabel')}>
          <SelectControl
            value={value.ethnicity}
            onChange={(v) => set('ethnicity', v)}
            placeholder={tr('avatar.ethnicityPlaceholder')}
            options={ethnicityOptions}
          />
        </FormField>
      </div>

      {!hideContinue && (
        <div className="mt-7 flex justify-center gap-3">
          {onBack && <BackButton onBack={onBack} className="h-8" />}
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue || saving}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-accent px-5 text-[12px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
          >
            {saving ? (
              <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {tr('avatar.saving')}</>
            ) : (
              <>{tr('avatar.continue')} <ChevronDown size={15} strokeWidth={2.4} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function CharacterAppearanceStep({
  value,
  onChange,
  gender,
  version,
  onGenerate,
  onGenIllustrations,
  genIllusCat,
  onContinue,
  onBack,
  hideContinue,
}: {
  value: Appearance
  onChange: (next: Appearance) => void
  gender: AppearanceGender
  version: number
  onGenerate: () => void
  onGenIllustrations: (categorySlug: string, force?: boolean) => void
  genIllusCat: string | null
  onContinue: () => void
  onBack?: () => void
  hideContinue?: boolean
}) {
  const tr = useT()
  const isDev = process.env.NODE_ENV !== 'production'
  const set = <K extends keyof Appearance>(key: K, v: Appearance[K]) => onChange({ ...value, [key]: v })
  // Toggle : recliquer la même valeur la désélectionne.
  const toggle = (key: keyof Appearance, label: string) => set(key, value[key] === label ? '' : label)

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={3} title={tr('avatar.appearanceTitle')} />

      {appearanceCategories.map((cat, i) => (
        <AppearanceSection
          key={cat.slug}
          category={cat}
          gender={gender}
          version={version}
          className={i > 0 ? 'mt-4' : ''}
          selectedLabel={value[cat.key as keyof Appearance] as string}
          onSelect={(l) => toggle(cat.key as keyof Appearance, l)}
          extraHeader={isDev ? (
            <button
              type="button"
              onClick={(e) => onGenIllustrations(cat.slug, e.shiftKey)}
              disabled={genIllusCat !== null}
              className="inline-flex items-center gap-1 rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-extrabold text-text-secondary transition hover:bg-fg/[0.12] disabled:opacity-55"
              title={tr('avatar.devGenIllus')}
            >
              {genIllusCat === cat.slug
                ? <><span className="h-2.5 w-2.5 rounded-full border-2 border-text-secondary/40 border-t-text-secondary animate-spin" /> génération…</>
                : <>⚙︎ illustrations</>}
            </button>
          ) : undefined}
        />
      ))}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-text-secondary">{tr('avatar.extraDetails')}</span>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-accent transition hover:brightness-110"
        >
          <Sparkles size={14} strokeWidth={2.4} /> {tr('avatar.generateDescription')}
        </button>
      </div>

      <div className="mt-2">
        <textarea
          value={value.extra}
          onChange={(e) => set('extra', e.target.value)}
          placeholder={tr('avatar.extraPlaceholder')}
          className="h-[68px] w-full resize-none rounded-[10px] border border-border bg-fg/[0.03] p-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
        />
      </div>

      {!hideContinue && (
        <div className="mt-6 mb-4 flex justify-center gap-3">
          {onBack && <BackButton onBack={onBack} className="h-9" />}
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105"
          >
            {tr('avatar.continue')}
            <ChevronDown size={15} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  )
}

function CharacterOutfitStep({
  value,
  onChange,
  onGenerate,
  generating,
  saving,
  onContinue,
  onBack,
  hideContinue,
  saved,
  onDelete,
  deletingId,
}: {
  value: Outfit
  onChange: (next: Outfit) => void
  onGenerate: () => void
  generating?: boolean
  saving?: boolean
  onContinue: () => void
  onBack?: () => void
  hideContinue?: boolean
  saved?: SavedOutfit[]
  onDelete?: (id: string) => void
  deletingId?: string | null
}) {
  const tr = useT()
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange({ ...value, file, previewUrl: URL.createObjectURL(file) })
  }

  const clearFile = () => {
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange({ ...value, file: null, previewUrl: '' })
    if (inputRef.current) inputRef.current.value = ''
  }

  const toggleTag = (tag: { label: string; style: OutfitStyle }) => {
    const has = value.description.toLowerCase().includes(tag.label.toLowerCase())
    const description = has
      ? value.description
      : value.description.trim()
        ? `${value.description.trim()}, ${tag.label}`
        : tag.label
    onChange({ ...value, description, styleType: tag.style })
  }

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={4} title={tr('avatar.outfitTitle')} />

      <SavedAssetList items={saved} onDelete={onDelete} deletingId={deletingId} label={tr('avatar.savedOutfits')} />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {value.previewUrl ? (
        <div className="relative mt-4 overflow-hidden rounded-[12px] border border-border bg-fg/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="" className="mx-auto max-h-[150px] w-auto object-contain" />
          <button
            type="button"
            onClick={clearFile}
            aria-label={tr('common.delete')}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur transition-all hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group mt-4 flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-border-strong bg-fg/[0.03] py-6 transition-colors hover:border-accent hover:bg-accent/5"
        >
          <Upload size={22} strokeWidth={2} className="text-text-secondary transition-colors group-hover:text-accent" />
          <span className="mt-2 text-[13px] font-extrabold text-text-primary">
            {tr('avatar.outfitUpload')}
          </span>
          <span className="mt-1 text-[11px] font-extrabold uppercase text-text-faint">
            {tr('avatar.outfitFormats')}
          </span>
        </button>
      )}

      <div className="my-3 flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-extrabold uppercase text-text-muted">{tr('avatar.orDescribe')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-accent transition hover:brightness-110 disabled:opacity-55"
        >
          {generating ? (
            <><span className="h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" /> {tr('avatar.generating')}</>
          ) : (
            <><Sparkles size={14} strokeWidth={2.4} /> {tr('avatar.generateDescription')}</>
          )}
        </button>
      </div>

      <div className="w-full rounded-[12px] border border-border bg-fg/[0.03] px-3 py-2.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder={tr('avatar.outfitPlaceholder')}
          className="block h-[44px] w-full resize-none border-0 bg-transparent p-0 text-[12px] font-medium leading-relaxed text-text-primary outline-none ring-0 placeholder:text-text-muted focus:ring-0"
        />
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto border-t border-border pt-2 [&::-webkit-scrollbar]:hidden">
          {outfitTagOptions.map((tag) => {
            const active = value.description.toLowerCase().includes(tag.label.toLowerCase())
            return (
              <button
                key={tag.label}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition-colors ${active ? 'border-accent bg-accent text-white' : 'border-transparent bg-fg/[0.06] text-text-secondary hover:bg-fg/[0.12] hover:text-text-primary'}`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {!hideContinue && (
        <div className="mt-6 mb-4 flex justify-center gap-3">
          {onBack && <BackButton onBack={onBack} className="h-8" />}
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-accent px-5 text-[12px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
          >
            {saving ? (
              <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {tr('avatar.saving')}</>
            ) : (
              <>{tr('avatar.continue')} <ChevronDown size={15} strokeWidth={2.4} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function CharacterBackgroundStep({
  value,
  onChange,
  onGenerateScene,
  generatingScene,
  onGenerate,
  generating,
  onBack,
  saved,
  onDelete,
  deletingId,
}: {
  value: Background
  onChange: (next: Background) => void
  onGenerateScene: () => void
  generatingScene?: boolean
  onGenerate: () => void
  generating?: boolean
  onBack?: () => void
  saved?: SavedEnvironment[]
  onDelete?: (id: string) => void
  deletingId?: string | null
}) {
  const tr = useT()
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange({ ...value, file, previewUrl: URL.createObjectURL(file) })
  }

  const clearFile = () => {
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange({ ...value, file: null, previewUrl: '' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={5} title={tr('avatar.backgroundTitle')} />

      <SavedAssetList items={saved} onDelete={onDelete} deletingId={deletingId} label={tr('avatar.savedEnvironments')} />

      <FormField label={tr('avatar.envName')}>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={tr('avatar.envNamePlaceholder')}
          className="h-9 w-full rounded-[10px] border border-border bg-fg/[0.03] px-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
        />
      </FormField>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {value.previewUrl ? (
        <div className="relative mt-4 overflow-hidden rounded-[12px] border border-border bg-fg/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="" className="mx-auto max-h-[150px] w-auto object-contain" />
          <button
            type="button"
            onClick={clearFile}
            aria-label={tr('common.delete')}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur transition-all hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group mt-4 flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-border-strong bg-fg/[0.03] py-6 transition-colors hover:border-accent hover:bg-accent/5"
        >
          <Upload size={22} strokeWidth={2} className="text-text-secondary transition-colors group-hover:text-accent" />
          <span className="mt-2 text-[13px] font-extrabold text-text-primary">
            {tr('avatar.envUpload')}
          </span>
          <span className="mt-1 text-[11px] font-extrabold uppercase text-text-faint">
            {tr('avatar.outfitFormats')}
          </span>
        </button>
      )}

      <div className="my-3 flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-extrabold uppercase text-text-muted">{tr('avatar.orDescribeScene')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold text-text-primary">{tr('avatar.sceneType')}</h3>
        <button
          type="button"
          onClick={onGenerateScene}
          disabled={generatingScene}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-accent transition hover:brightness-110 disabled:opacity-55"
        >
          {generatingScene ? (
            <><span className="h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" /> {tr('avatar.generating')}</>
          ) : (
            <><Sparkles size={14} strokeWidth={2.4} /> {tr('avatar.generateDescription')}</>
          )}
        </button>
      </div>

      <textarea
        value={value.sceneType}
        onChange={(e) => onChange({ ...value, sceneType: e.target.value })}
        placeholder={tr('avatar.scenePlaceholder')}
        className="h-[72px] w-full resize-none rounded-[10px] border border-border bg-fg/[0.03] p-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
      />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <FormField label={tr('avatar.lighting')}>
          <SelectControl
            value={value.lighting}
            onChange={(v) => onChange({ ...value, lighting: v })}
            placeholder={tr('avatar.lightingPlaceholder')}
            options={lightingOptions}
          />
        </FormField>
        <FormField label={tr('avatar.shotType')}>
          <SelectControl
            value={value.shotType}
            onChange={(v) => onChange({ ...value, shotType: v })}
            placeholder={tr('avatar.shotPlaceholder')}
            options={shotTypeOptions}
          />
        </FormField>
      </div>

      <div className="mt-7 mb-4 flex justify-center gap-3">
        {onBack && <BackButton onBack={onBack} className="h-9" />}
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100"
        >
          {generating ? (
            <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {tr('avatar.generatingCharacter')}</>
          ) : (
            <><Wand2 size={15} strokeWidth={2.5} /> {tr('avatar.generateCharacter')}</>
          )}
        </button>
      </div>
    </div>
  )
}

function AppearanceSection({
  category,
  gender,
  version,
  className = '',
  selectedLabel,
  onSelect,
  extraHeader,
}: {
  category: AppearanceCategoryDef
  gender: AppearanceGender
  version: number
  className?: string
  selectedLabel?: string
  onSelect?: (label: string) => void
  extraHeader?: ReactNode
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-end justify-between">
        <h3 className="text-[13px] font-extrabold tracking-[-0.01em] text-text-primary">
          {category.title}
        </h3>
        {extraHeader}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
        {category.options.map((option) => (
          <AppearanceOptionCard
            key={`${category.slug}-${gender}-${version}-${option.label}`}
            option={option}
            src={!option.custom && option.slug ? `${appearanceImg(category.slug, gender, option.slug)}${version ? `?v=${version}` : ''}` : ''}
            objectPosition={category.objectPosition ?? 'object-[center_22%]'}
            selected={selectedLabel === option.label}
            onClick={() => onSelect?.(option.label)}
          />
        ))}
      </div>
    </section>
  )
}

function AppearanceOptionCard({ option, src, objectPosition = 'object-[center_22%]', selected, onClick }: { option: AppearanceOptionDef; src: string; objectPosition?: string; selected?: boolean; onClick?: () => void }) {
  const [imgOk, setImgOk] = useState(true)

  if (option.custom) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative aspect-[4/5] overflow-hidden rounded-[12px] border bg-fg/[0.05] shadow-neo-sm transition-all hover:bg-fg/[0.06] ${selected ? 'border-accent ring-[1.5px] ring-accent ring-offset-[1.5px] ring-offset-bg-card' : 'border-dashed border-border-strong hover:border-accent'
          }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
        <span className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-[26px] font-extrabold text-text-faint">
          C
        </span>
        <span className="absolute inset-x-0 bottom-1.5 px-2 text-center text-[12px] font-extrabold leading-tight text-white">
          {option.label}
        </span>
      </button>
    )
  }

  const showImg = Boolean(src) && imgOk

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-[4/5] overflow-hidden rounded-[12px] border bg-fg/[0.05] shadow-sm transition-all hover:shadow-[0_8px_16px_rgba(0,0,0,0.10)] ${selected ? 'border-accent ring-[1.5px] ring-accent ring-offset-[1.5px] ring-offset-bg-card' : 'border-border hover:border-accent'
        }`}
    >
      {/* Placeholder (toujours présent) — visible tant que la photo n'est pas générée/chargée. */}
      <div className="absolute inset-0" style={{ background: option.gradient ?? 'linear-gradient(180deg, #dadada 0%, #b5b5b5 55%, #444 100%)' }} />
      {!showImg && (
        <>
          <div className="absolute left-1/2 top-[34%] h-10 w-8 -translate-x-1/2 rounded-full bg-white/18 ring-1 ring-white/15" />
          <UserRound className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-white/75" size={30} strokeWidth={1.7} />
        </>
      )}
      {Boolean(src) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={option.label}
          loading="lazy"
          onError={() => setImgOk(false)}
          onLoad={() => setImgOk(true)}
          className={`absolute inset-0 h-full w-full object-cover ${objectPosition} transition-opacity duration-200 ${showImg ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {selected && (
        <div className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      )}

      <span className="absolute inset-x-0 bottom-1.5 px-2 text-center text-[12px] font-extrabold leading-tight text-white">
        {option.label}
      </span>
    </button>
  )
}

function UploadCharacterImagesStep({
  value,
  onChange,
  saving,
  onContinue,
  onBack,
}: {
  value: CloneImage[]
  onChange: (next: CloneImage[]) => void
  saving?: boolean
  onContinue: () => void
  onBack?: () => void
}) {
  const tr = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const MAX = 4

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const room = MAX - value.length
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
    const mapped = await Promise.all(
      picked.map(async (file) => ({ file, previewUrl: URL.createObjectURL(file), dataUrl: await fileToDataUrl(file) })),
    )
    onChange([...value, ...mapped])
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (index: number) => {
    URL.revokeObjectURL(value[index].previewUrl)
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={3} title={tr('avatar.photosTitle')} />

      <p className="-mt-2 mb-4 text-[12px] font-medium text-text-secondary">
        {tr('avatar.photosDesc')}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {value.length > 0 ? (
        <div className="grid grid-cols-4 gap-2.5">
          {value.map((img, i) => (
            <div key={img.previewUrl} className="group relative aspect-square overflow-hidden rounded-[10px] border border-border bg-fg/[0.05]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={`#${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={tr('common.delete')}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur transition-all hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"
              >
                <X size={12} strokeWidth={2.6} />
              </button>
            </div>
          ))}
          {value.length < MAX && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border-strong bg-fg/[0.03] transition-colors hover:border-accent hover:bg-accent/5"
            >
              <Upload size={18} strokeWidth={2} className="text-text-secondary transition-colors group-hover:text-accent" />
              <span className="text-[10px] font-extrabold text-text-secondary">{tr('common.add')}</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-border-strong bg-fg/[0.03] py-8 transition-colors hover:border-accent hover:bg-accent/5"
        >
          <Upload size={24} strokeWidth={1.8} className="text-text-secondary transition-colors group-hover:text-accent" />
          <span className="mt-3 text-[13px] font-extrabold text-text-primary">
            {tr('avatar.uploadPhotos')}
          </span>
          <span className="mt-1.5 text-[11px] font-extrabold uppercase text-text-faint">
            {tr('avatar.outfitFormats')} · {value.length} / {MAX}
          </span>
        </button>
      )}

      <div className="mt-7 flex justify-center gap-3">
        {onBack && <BackButton onBack={onBack} className="h-9" />}
        <button
          type="button"
          onClick={onContinue}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100"
        >
          {saving ? (
            <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {tr('avatar.saving')}</>
          ) : (
            <>{tr('avatar.continue')} <ChevronDown size={16} strokeWidth={2.4} /></>
          )}
        </button>
      </div>
    </div>
  )
}

// Liste des assets déjà enregistrés (tenues / décors) avec suppression — visible en édition.
function SavedAssetList({
  items,
  onDelete,
  deletingId,
  label,
}: {
  items?: { id: string; name: string; refUrl: string | null }[]
  onDelete?: (id: string) => void
  deletingId?: string | null
  label: string
  fallback?: string
}) {
  const tr = useT()
  if (!items || items.length === 0) return null
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-[10px] border border-border bg-fg/[0.03] py-1.5 pl-1.5 pr-2.5">
            {it.refUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.refUrl} alt={it.name} className="h-8 w-8 rounded-[7px] object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-fg/[0.06] text-text-faint"><UserRound size={15} /></span>
            )}
            <span className="max-w-[150px] truncate text-[12px] font-bold text-text-primary">{it.name}</span>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(it.id)}
                disabled={deletingId === it.id}
                aria-label={tr('common.delete')}
                className="grid h-5 w-5 place-items-center rounded-full text-text-faint transition-colors hover:bg-coral hover:text-white disabled:opacity-50"
              >
                {deletingId === it.id ? <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-current animate-spin" /> : <X size={12} strokeWidth={2.6} />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BackButton({ onBack, className = '' }: { onBack: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`inline-flex h-9 items-center gap-2 rounded-[8px] bg-fg/[0.08] px-4 text-[13px] font-extrabold text-text-primary transition-colors hover:bg-fg/[0.12] ${className}`}
    >
      <ChevronDown size={16} strokeWidth={2.4} className="rotate-90" />
      Retour
    </button>
  )
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-fg/[0.10] text-[11px] font-extrabold text-text-secondary">
        {step}
      </span>
      <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-text-primary sm:text-[16px]">
        {title}
      </h2>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-extrabold text-text-primary">{label}</span>
      {children}
    </label>
  )
}

function SelectControl({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: readonly string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between rounded-[8px] border border-border bg-fg/[0.03] px-3 text-left text-[12px] font-medium outline-none transition-colors hover:border-accent focus:border-accent"
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>{value || placeholder}</span>
        <ChevronDown size={15} strokeWidth={2.2} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[208px] overflow-y-auto rounded-[10px] border border-[#e2e2e2] bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
          {options.map((option) => {
            const active = value === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false) }}
                className={`flex w-full items-center px-3 py-1 text-left text-[12px] font-bold transition-colors ${active ? 'bg-[#fff1ec] text-[#e64414]' : 'text-[#111114] hover:bg-[#f4f4f4]'}`}
              >
                {option}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

