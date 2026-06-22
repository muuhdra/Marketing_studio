'use client'

import { type ReactNode, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createAvatar, updateAvatar } from '@/lib/actions/avatars'
import { actionAddOutfit, actionPersistAvatarPhoto, actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { actionInspireFromMedia, actionGenerateAvatarPhoto, actionDescribeAvatarFromImage } from '@/lib/actions/ai'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
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

const sourceOptions = [
  {
    id: 'scratch',
    title: 'Créer de zéro',
    description:
      "Conçois manuellement l'apparence, la personnalité et l'histoire de ton personnage.",
    bullets: ['Définir les attributs visuels', 'Rédiger un prompt / une bio', 'Ajuster les traits de personnalité'],
    icon: UserCog,
  },
  {
    id: 'clone',
    title: 'Cloner un personnage',
    description:
      "Importe une photo de toi ou d'un personnage et laisse l'IA générer ton avatar instantanément.",
    bullets: ['Importer un selfie ou une photo', 'Mapping facial instantané', 'Traits générés automatiquement'],
    icon: ScanFace,
  },
] as const

const hairStyleOptions = [
  {
    label: 'Long wavy',
    gradient: 'linear-gradient(180deg, #b9b0a8 0%, #7e7169 56%, #171717 100%)',
  },
  {
    label: 'Buzz cut',
    gradient: 'linear-gradient(180deg, #d1d1d1 0%, #9d9d9d 56%, #252525 100%)',
  },
  {
    label: 'Messy bun',
    gradient: 'linear-gradient(180deg, #b8b2aa 0%, #867568 56%, #1f1b19 100%)',
  },
  {
    label: 'Mullet',
    gradient: 'linear-gradient(180deg, #c4beb5 0%, #847767 56%, #22201d 100%)',
  },
  {
    label: 'Curtain layers',
    gradient: 'linear-gradient(180deg, #c6beb4 0%, #8a7c71 56%, #202020 100%)',
  },
  {
    label: 'Bald',
    gradient: 'linear-gradient(180deg, #ddd8d2 0%, #ad9a8c 56%, #232323 100%)',
  },
  {
    label: 'Dreadlocks',
    gradient: 'linear-gradient(180deg, #b2aea7 0%, #6b5a4a 56%, #1a1613 100%)',
  },
  { label: 'Custom', custom: true },
] as const

const hairColorOptions = [
  {
    label: 'Black',
    gradient: 'linear-gradient(180deg, #c9c9c9 0%, #747474 56%, #050505 100%)',
  },
  {
    label: 'Blonde',
    gradient: 'linear-gradient(180deg, #ded8c9 0%, #c5a66f 56%, #33271b 100%)',
  },
  {
    label: 'Red',
    gradient: 'linear-gradient(180deg, #cfc5b9 0%, #a95b29 56%, #2b1510 100%)',
  },
  {
    label: 'Brown',
    gradient: 'linear-gradient(180deg, #cac4bb 0%, #6d5541 56%, #1c1510 100%)',
  },
  {
    label: 'Gray',
    gradient: 'linear-gradient(180deg, #dbdbdb 0%, #9c9c9c 56%, #292929 100%)',
  },
  { label: 'Custom', custom: true },
] as const

type CharacterStep = 'source' | 'identity' | 'appearance' | 'outfit' | 'background'

type AppearanceOption = {
  label: string
  gradient?: string
  imageSrc?: string
  custom?: boolean
}

const ageGroupOptions = [
  'Enfant',
  'Adolescent',
  'Jeune adulte (18-25)',
  'Adulte (26-35)',
  'Adulte (36-50)',
  'Senior (50+)',
] as const

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

type Identity = { name: string; gender: 'male' | 'female' | ''; ageGroup: string; ethnicity: string }

type OutfitStyle = 'casual' | 'smart' | 'sport' | 'formal' | 'streetwear' | 'custom'
type Outfit = { description: string; styleType: OutfitStyle | ''; file: File | null; previewUrl: string }

const outfitTagOptions: { label: string; style: OutfitStyle }[] = [
  { label: 'Formel', style: 'formal' },
  { label: 'Sport / Gym', style: 'sport' },
  { label: 'Sportswear', style: 'sport' },
  { label: 'Décontracté', style: 'casual' },
  { label: 'Médecin', style: 'custom' },
  { label: 'Ouvrier BTP', style: 'custom' },
  { label: 'Chef cuisinier', style: 'custom' },
]

type Background = { sceneType: string; lighting: string; shotType: string }

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

const eyeOptions = [
  { label: 'Blue' },
  { label: 'Black' },
  { label: 'Brown' },
  { label: 'Hazel' },
  { label: 'Custom', custom: true },
] as const

const facialHairOptions = [
  { label: 'Stubble' },
  { label: 'Goatee' },
  { label: 'Handlebar mustache' },
  { label: 'Full beard' },
  { label: 'Patchy beard' },
  { label: 'Custom', custom: true },
] as const

const skinDetailOptions = [
  { label: 'Flawless' },
  { label: 'Acne scars' },
  { label: 'Visible pores' },
  { label: 'Rosacea' },
  { label: 'Freckles' },
  { label: 'Mole on cheek' },
  { label: 'Wrinkles' },
  { label: 'Custom', custom: true },
] as const

export default function CharacterPromptGeneratorView() {
  const toast = useToast()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [sourceType, setSourceType] = useState<'scratch' | 'clone'>('scratch')
  const [identity, setIdentity] = useState<Identity>({ name: '', gender: '', ageGroup: '', ethnicity: '' })
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [outfit, setOutfit] = useState<Outfit>({ description: '', styleType: '', file: null, previewUrl: '' })
  const [savingOutfit, setSavingOutfit] = useState(false)
  const [generatingOutfit, setGeneratingOutfit] = useState(false)
  const [background, setBackground] = useState<Background>({ sceneType: '', lighting: '', shotType: '' })
  const [generatingScene, setGeneratingScene] = useState(false)
  const [generatingCharacter, setGeneratingCharacter] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  const [cloneImages, setCloneImages] = useState<CloneImage[]>([])
  const [savingClone, setSavingClone] = useState(false)

  const handleNextStep = () => {
    setCurrentStepIndex((prev) => {
      const maxStep = sourceType === 'clone' ? 4 : 4
      return Math.min(prev + 1, maxStep)
    })
  }

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
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
      toast.success('Personnage enregistré ✓')
      handleNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSavingIdentity(false)
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
      toast.success('Description générée ✓')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Génération impossible')
    } finally {
      setGeneratingOutfit(false)
    }
  }

  // Étape 4 (Tenue, optionnelle) → persiste la tenue (image + description) liée au personnage, puis avance.
  const handleOutfitContinue = async () => {
    if (savingOutfit) return
    const hasData = Boolean(outfit.file || outfit.description.trim())
    if (!avatarId || !hasData) { handleNextStep(); return }
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
      await actionAddOutfit(fd)
      toast.success('Tenue enregistrée ✓')
      handleNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible')
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
      toast.success('Scène générée ✓')
    } finally {
      setGeneratingScene(false)
    }
  }

  // Étape 5 → GÉNÉRATION RÉELLE du personnage : compose le prompt à partir de toutes les
  // étapes, génère le portrait (Nano Banana), le persiste et l'affiche dans l'aperçu.
  const handleGenerateCharacter = async () => {
    if (generatingCharacter) return
    if (!identity.name.trim()) { toast.error('Renseigne au moins le nom (étape Identité)'); return }
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
        identity.ageGroup,
        outfit.description.trim() ? `wearing ${outfit.description.trim()}` : '',
      ].filter(Boolean).join(', ')
      const setting = [background.sceneType.trim(), background.lighting, background.shotType].filter(Boolean).join(', ')
      const result = await actionGenerateAvatarPhoto({
        name: identity.name.trim(),
        ethnicity: identity.ethnicity || undefined,
        style: outfit.description.trim() || undefined,
        setting: setting || undefined,
        traits: traits || undefined,
      })
      setResultUrl(result.url)
      await actionPersistAvatarPhoto(id, result.url)
      await updateAvatar(id, { status: 'active' })
      toast.success('Personnage généré ✓')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Génération impossible')
    } finally {
      setGeneratingCharacter(false)
    }
  }

  const stepContainer =
    'flex h-full w-full shrink-0 flex-col items-center justify-center overflow-y-auto px-5 py-8 sm:px-7 lg:px-10'

  const stepLabels = [
    'Source',
    'Identité',
    sourceType === 'scratch' ? 'Apparence' : 'Photos',
    'Tenue',
    'Arrière-plan',
  ]

  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        <header className="flex h-[56px] shrink-0 items-center gap-4 border-b border-border px-5">
          <Link
            href="/avatar-studio"
            aria-label="Retour à la bibliothèque"
            className="grid h-8 w-8 place-items-center rounded-full text-text-primary transition-colors hover:bg-fg/[0.06]"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
          <span className="h-7 w-px bg-border" />
          <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">
            Créer un personnage
          </h1>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {stepLabels.map((label, index) => {
              const active = currentStepIndex === index
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentStepIndex(index)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold transition-colors ${active ? 'bg-accent text-white' : 'text-text-secondary hover:bg-fg/[0.06] hover:text-text-primary'}`}
                >
                  <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${active ? 'bg-white/25 text-white' : 'bg-fg/[0.10] text-text-secondary'}`}>{index + 1}</span>
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
                    <CharacterAppearanceStep onContinue={handleNextStep} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterOutfitStep value={outfit} onChange={setOutfit} onGenerate={handleGenerateOutfit} generating={generatingOutfit} saving={savingOutfit} onContinue={handleOutfitContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterBackgroundStep value={background} onChange={setBackground} onGenerateScene={handleGenerateScene} generatingScene={generatingScene} onGenerate={handleGenerateCharacter} generating={generatingCharacter} onBack={handlePrevStep} />
                  </div>
                </>
              ) : (
                <>
                  {/* Clone flow: Identity → Upload Images → Outfit → Background */}
                  <div className={stepContainer}>
                    <CharacterIdentityStep value={identity} onChange={setIdentity} saving={savingIdentity} onContinue={handleIdentityContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <UploadCharacterImagesStep onContinue={handleNextStep} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterOutfitStep value={outfit} onChange={setOutfit} onGenerate={handleGenerateOutfit} generating={generatingOutfit} saving={savingOutfit} onContinue={handleOutfitContinue} onBack={handlePrevStep} />
                  </div>
                  <div className={stepContainer}>
                    <CharacterBackgroundStep value={background} onChange={setBackground} onGenerateScene={handleGenerateScene} generatingScene={generatingScene} onGenerate={handleGenerateCharacter} generating={generatingCharacter} onBack={handlePrevStep} />
                  </div>
                </>
              )}
            </div>
          </main>

          <aside className="flex h-full flex-col overflow-hidden border-t border-border bg-fg/[0.03] px-5 py-6 lg:border-l lg:border-t-0">
            <h2 className="shrink-0 text-[18px] font-extrabold tracking-tight text-text-primary">
              Aperçu
            </h2>
            <p className="mt-2 shrink-0 text-[13px] font-medium text-text-secondary">
              Ton personnage généré apparaîtra ici
            </p>

            <div className="mt-5 flex flex-1 items-center justify-center overflow-hidden rounded-[14px] border border-border bg-fg/[0.05] px-5 text-center">
              {generatingCharacter ? (
                <div>
                  <span className="mx-auto block h-9 w-9 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                  <p className="mt-4 text-[13px] font-medium text-text-secondary">Génération du personnage…</p>
                </div>
              ) : resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultUrl} alt="Personnage généré" className="max-h-full w-auto rounded-[10px] object-contain" />
              ) : (
                <div>
                  <UserRound className="mx-auto text-text-faint" size={42} strokeWidth={2.3} />
                  <p className="mt-4 text-[14px] font-medium text-text-secondary">Personnage personnalisé</p>
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
  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <StepHeading step={1} title="Choisis la source de ton personnage" />

      <div className="grid gap-4 md:grid-cols-2">
        {sourceOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.id

          return (
            <button
              key={option.title}
              type="button"
              onClick={() => onSelectSource(option.id as 'scratch' | 'clone')}
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
  const set = <K extends keyof Identity>(key: K, v: Identity[K]) => onChange({ ...value, [key]: v })
  const canContinue = Boolean(value.name.trim() && value.gender && value.ageGroup && value.ethnicity)

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <StepHeading step={2} title="Identité du personnage" />

      <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <FormField label="Nom du personnage">
          <input
            type="text"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Saisis un nom"
            className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
          />
        </FormField>

        <FormField label="Genre">
          <div className="grid h-8 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('gender', 'male')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] border text-[12px] font-extrabold transition-colors ${value.gender === 'male' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-primary hover:border-accent'}`}
            >
              <Mars size={14} strokeWidth={2.5} />
              Homme
            </button>
            <button
              type="button"
              onClick={() => set('gender', 'female')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] border text-[12px] font-extrabold transition-colors ${value.gender === 'female' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-primary hover:border-accent'}`}
            >
              <Venus size={14} strokeWidth={2.5} />
              Femme
            </button>
          </div>
        </FormField>

        <FormField label="Tranche d’âge">
          <SelectControl
            value={value.ageGroup}
            onChange={(v) => set('ageGroup', v)}
            placeholder="Sélectionne une tranche d’âge"
            options={ageGroupOptions}
          />
        </FormField>

        <FormField label="Ethnie">
          <SelectControl
            value={value.ethnicity}
            onChange={(v) => set('ethnicity', v)}
            placeholder="Sélectionne une ethnie"
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
              <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Enregistrement…</>
            ) : (
              <>Continue <ChevronDown size={15} strokeWidth={2.4} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function CharacterAppearanceStep({ onContinue, onBack, hideContinue }: { onContinue: () => void; onBack?: () => void; hideContinue?: boolean }) {
  const [selectedSkinDetail, setSelectedSkinDetail] = useState<string>('Wrinkles')

  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={3} title="Character Appearance (optional)" />

      <AppearanceSection title="Hair Style" options={hairStyleOptions} />

      <AppearanceSection title="Hair Color" options={hairColorOptions} className="mt-5" />

      <AppearanceSection title="Eyes" options={eyeOptions} className="mt-5" />

      <AppearanceSection title="Facial Hair" options={facialHairOptions} className="mt-5" />

      <AppearanceSection
        title="Skin Details"
        options={skinDetailOptions}
        className="mt-5"
        selectedLabel={selectedSkinDetail}
        onSelect={setSelectedSkinDetail}
        extraHeader={
          <span className="text-[12px] font-extrabold text-text-primary">
            Selected: <span className="text-text-primary">{selectedSkinDetail}</span>
          </span>
        }
      />

      <div className="mt-7 flex items-center justify-between">
        <button type="button" className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-text-primary hover:text-accent">
          More details
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </button>

        <button type="button" className="inline-flex items-center gap-2 text-[12px] font-extrabold text-accent hover:brightness-110">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
          Generate Description
        </button>
      </div>

      <div className="mt-3">
        <textarea
          placeholder="e.g Tattoos, scars, glasses, piercings, body build, or distinctive marks."
          className="h-[80px] w-full resize-none rounded-[10px] border border-border bg-fg/[0.03] p-3 text-[13px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
        />
      </div>

      {!hideContinue && (
        <div className="mt-7 mb-4 flex justify-center gap-3">
          {onBack && <BackButton onBack={onBack} />}
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105"
          >
            Continue
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
}: {
  value: Outfit
  onChange: (next: Outfit) => void
  onGenerate: () => void
  generating?: boolean
  saving?: boolean
  onContinue: () => void
  onBack?: () => void
  hideContinue?: boolean
}) {
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
      <StepHeading step={4} title="Tenue du personnage (optionnel)" />

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
          <img src={value.previewUrl} alt="Tenue" className="mx-auto max-h-[150px] w-auto object-contain" />
          <button
            type="button"
            onClick={clearFile}
            aria-label="Retirer la tenue"
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
            Clique pour importer une tenue
          </span>
          <span className="mt-1 text-[11px] font-extrabold uppercase text-text-faint">
            PNG, JPG ou WEBP (max. 10 Mo)
          </span>
        </button>
      )}

      <div className="my-3 flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-extrabold uppercase text-text-muted">Ou décris</span>
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
            <><span className="h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" /> Génération…</>
          ) : (
            <><Sparkles size={14} strokeWidth={2.4} /> Générer une description</>
          )}
        </button>
      </div>

      <div className="w-full rounded-[12px] border border-border bg-fg/[0.03] px-3 py-2.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="ex. tenue formelle, look décontracté, costume de super-héros"
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
              <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Enregistrement…</>
            ) : (
              <>Continue <ChevronDown size={15} strokeWidth={2.4} /></>
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
}: {
  value: Background
  onChange: (next: Background) => void
  onGenerateScene: () => void
  generatingScene?: boolean
  onGenerate: () => void
  generating?: boolean
  onBack?: () => void
}) {
  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={5} title="Arrière-plan (optionnel)" />

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold text-text-primary">Type de scène</h3>
        <button
          type="button"
          onClick={onGenerateScene}
          disabled={generatingScene}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-accent transition hover:brightness-110 disabled:opacity-55"
        >
          {generatingScene ? (
            <><span className="h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" /> Génération…</>
          ) : (
            <><Sparkles size={14} strokeWidth={2.4} /> Générer une description</>
          )}
        </button>
      </div>

      <textarea
        value={value.sceneType}
        onChange={(e) => onChange({ ...value, sceneType: e.target.value })}
        placeholder="ex. dans un salon en train de regarder une série, en cuisine"
        className="h-[72px] w-full resize-none rounded-[10px] border border-border bg-fg/[0.03] p-3 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
      />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <FormField label="Éclairage">
          <SelectControl
            value={value.lighting}
            onChange={(v) => onChange({ ...value, lighting: v })}
            placeholder="Sélectionne un éclairage"
            options={lightingOptions}
          />
        </FormField>
        <FormField label="Type de plan">
          <SelectControl
            value={value.shotType}
            onChange={(v) => onChange({ ...value, shotType: v })}
            placeholder="Sélectionne un plan"
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
            <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Génération du personnage…</>
          ) : (
            <><Wand2 size={15} strokeWidth={2.5} /> Générer le personnage</>
          )}
        </button>
      </div>
    </div>
  )
}

function AppearanceSection({
  title,
  options,
  className = '',
  selectedLabel,
  onSelect,
  extraHeader,
}: {
  title: string
  options: readonly AppearanceOption[]
  className?: string
  selectedLabel?: string
  onSelect?: (label: string) => void
  extraHeader?: ReactNode
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-[14px] font-extrabold tracking-[-0.01em] text-text-primary">
          {title}
        </h3>
        {extraHeader}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
        {options.map((option) => (
          <AppearanceOptionCard
            key={`${title}-${option.label}`}
            option={option}
            selected={selectedLabel === option.label}
            onClick={() => onSelect?.(option.label)}
          />
        ))}
      </div>
    </section>
  )
}

function AppearanceOptionCard({ option, selected, onClick }: { option: AppearanceOption, selected?: boolean, onClick?: () => void }) {
  if (option.custom) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative h-[76px] overflow-hidden rounded-[10px] border bg-fg/[0.05] shadow-neo-sm transition-all hover:bg-fg/[0.06] ${selected ? 'border-accent ring-[1.5px] ring-accent ring-offset-[1.5px] ring-offset-bg-card' : 'border-dashed border-border-strong hover:border-accent'
          }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
        <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-[24px] font-extrabold text-text-faint">
          C
        </span>
        <span className="absolute inset-x-0 bottom-1.5 px-2 text-center text-[12px] font-extrabold leading-tight text-white">
          {option.label}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-[76px] overflow-hidden rounded-[10px] border bg-fg/[0.05] shadow-sm transition-all hover:shadow-[0_8px_16px_rgba(0,0,0,0.10)] ${selected ? 'border-accent ring-[1.5px] ring-accent ring-offset-[1.5px] ring-offset-bg-card' : 'border-border hover:border-accent'
        }`}
    >
      {option.imageSrc ? (
        <img src={option.imageSrc} alt={option.label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              option.gradient ?? 'linear-gradient(180deg, #dadada 0%, #b5b5b5 55%, #444 100%)',
          }}
        />
      )}
      {!option.imageSrc && (
        <>
          <div className="absolute left-1/2 top-[36%] h-9 w-8 -translate-x-1/2 rounded-full bg-white/18 ring-1 ring-white/15" />
          <UserRound
            className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-white/75"
            size={30}
            strokeWidth={1.7}
          />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

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

function UploadCharacterImagesStep({ onContinue, onBack }: { onContinue: () => void; onBack?: () => void }) {
  return (
    <div className="w-full max-w-[680px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 lg:py-2">
      <StepHeading step={3} title="Upload Character Images" />

      <p className="-mt-2 mb-5 text-[13px] font-medium text-text-secondary">
        Upload up to 4 images of your character for better cloning results
      </p>

      <button
        type="button"
        className="group flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-border-strong bg-fg/[0.03] py-10 transition-colors hover:border-accent hover:bg-accent/5"
      >
        <Upload size={28} strokeWidth={1.8} className="text-text-secondary transition-colors group-hover:text-accent" />
        <span className="mt-4 text-[14px] font-extrabold text-text-primary">
          Click to upload character images
        </span>
        <span className="mt-2 text-[12px] font-extrabold uppercase text-text-faint">
          PNG, JPG, or WEBP (MAX. 10MB) · 0 of 4 uploaded
        </span>
      </button>

      <div className="mt-8 flex justify-center gap-3">
        {onBack && <BackButton onBack={onBack} />}
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:brightness-105"
        >
          Continue
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
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

