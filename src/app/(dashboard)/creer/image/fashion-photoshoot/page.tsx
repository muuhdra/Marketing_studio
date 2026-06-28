'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Camera, Check, ChevronDown, CircleCheck, Download, Gem, ImageIcon, Images, Maximize2, RotateCcw, ScanSearch, Shirt, Sparkles, Upload, UserRound, Watch, Wand2, X } from 'lucide-react'
import { actionGenerateImage, actionDescribeProductScene, actionSuggestFashionScene } from '@/lib/actions/ai'
import { actionListAvatarsForPicker } from '@/lib/actions/avatar-assets'
import { actionListShootingModels, actionGenerateShootingModel, type ShootingModelDTO } from '@/lib/actions/shooting-models'
import { MODEL_NATIONALITIES, MODEL_BODY_TYPES, nationalityFlag } from '@/lib/fashion/model-traits'
import { persistOutput } from '@/lib/actions/outputs'
import { useToast } from '@/lib/stores/toastStore'
import { useBrand } from '@/lib/stores/brandStore'
import { BackButton, ContinueButton, MainPanel, PageShell, WizardHeader, ratioStyle, ratioToSize, uploadImageFile, StepSlider } from '@/components/features/creer/WizardKit'
import { AssetPickerModal } from '@/components/features/creer/AssetPicker'

const FASHION_TYPES = [
  { id: 'apparel', title: 'Apparel / Clothing', desc: 'Create professional fashion photoshoots with models wearing your clothing products', icon: Shirt, points: ['Choose a fashion model', 'Upload clothing images', 'Get 4 angle variations'] },
  { id: 'accessory', title: 'Fashion Accessory', desc: 'Generate styled product shots of fashion accessories like watches, bracelets, and jewelry', icon: Watch, points: ['Upload your accessory image', 'We generate styled product shots'] },
]

const SHOT_TYPES = ['UPPER BODY', 'LOWER BODY', 'FULL BODY']
const BACKGROUND_COLORS = ['ALL', 'BEIGE', 'LIGHT GREY', 'OFF WHITE', 'CREAM']
const BACKGROUND_SCENES = ['Editorial Street', 'Urban Street', 'Studio', 'Beach Sunset', 'Luxury Interior', 'Industrial Loft']
const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const CLOTHING_SAMPLE_URL = 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=700&q=80'
const FASHION_SHOTS = [
  { id: 'editorial', title: 'Editorial Full Body', desc: 'Head-to-toe lifestyle shot with complete outfit in a styled environment', icon: Sparkles,
    direction: 'full-length head-to-toe framing, dynamic confident editorial stance, shot on a 50mm lens, soft directional light, depth and atmosphere, Vogue editorial mood' },
  { id: 'back', title: 'Back View', desc: 'Back view of the outfit showing rear design, stitching, and construction details', icon: RotateCcw,
    direction: 'shot from directly behind, model glancing over the shoulder, emphasis on the garment rear cut, seams and drape, crisp directional light revealing construction' },
  { id: 'lifestyle', title: 'Lifestyle / Candid', desc: 'Three-quarter candid moment with the model interacting naturally with the environment', icon: Camera,
    direction: 'candid three-quarter angle, natural movement and genuine expression, warm ambient or golden-hour light, cinematic shallow depth of field, film-like grain' },
  { id: 'detail', title: 'Detail & Texture', desc: 'Extreme macro closeup showcasing craftsmanship, stitching, and material quality', icon: ScanSearch,
    direction: 'extreme macro close-up on the fabric, stitching and weave, raking light revealing texture and material, ultra-sharp tactile realism, shallow focus' },
]
const ACCESSORY_SHOTS = [
  { id: 'lifestyle-worn', title: 'Lifestyle Worn', desc: 'Person wearing or holding the accessory naturally in a styled editorial environment', icon: UserRound,
    direction: 'the accessory worn naturally in an editorial setting, elegant gesture that highlights it, soft flattering light, shallow depth of field' },
  { id: 'studio-product', title: 'Studio Product', desc: 'Clean product shot on a styled surface with professional lighting', icon: Box,
    direction: 'clean hero product shot on a styled surface, controlled three-point studio lighting, subtle reflections and soft shadow, premium catalogue look' },
  { id: 'detail-macro', title: 'Detail Macro', desc: 'Extreme close-up highlighting the accessory’s craftsmanship, texture, and material quality', icon: ScanSearch,
    direction: 'extreme macro highlighting craftsmanship, material texture and finish, precise focus, jewelry-grade lighting with crisp highlights' },
]

type StepId = 'type' | 'model' | 'scene' | 'aspect' | 'clothing' | 'shot' | 'accessoryUpload'

function buildSteps(type: string): StepId[] {
  // Le produit (vêtement/accessoire) est uploadé AVANT le mannequin → le choix et la
  // génération du modèle peuvent prendre en compte le produit (cohérence look).
  if (type === 'apparel') return ['type', 'clothing', 'model', 'scene', 'aspect', 'shot']
  if (type === 'accessory') return ['type', 'accessoryUpload', 'model', 'aspect', 'shot']
  return ['type']
}

export default function FashionPhotoshootPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Lien campagne = point d'entrée : ON depuis Production, OFF en création libre (dashboard).
  const [useBrandCtx] = useState(searchParams.get('from') === 'production')
  const toast = useToast()
  const brand = useBrand()
  const [currentStep, setCurrentStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [modelSource, setModelSource] = useState<'heyoz' | 'mine'>('heyoz')
  const [modelGender, setModelGender] = useState('All')
  const [modelNationality, setModelNationality] = useState('All')
  const [modelBodyType, setModelBodyType] = useState('All')
  const [suggestingScene, setSuggestingScene] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [shotType, setShotType] = useState(SHOT_TYPES[0])
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0])
  const [selectedModelUrl, setSelectedModelUrl] = useState('')
  const [scenePrompt, setScenePrompt] = useState('')
  const [selectedScene, setSelectedScene] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')
  const [clothingFrontUrl, setClothingFrontUrl] = useState(CLOTHING_SAMPLE_URL)
  const [clothingBackUrl, setClothingBackUrl] = useState(CLOTHING_SAMPLE_URL)
  const [accessoryImageUrl, setAccessoryImageUrl] = useState('')
  const [customModels, setCustomModels] = useState<string[]>([])
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [shootingModels, setShootingModels] = useState<ShootingModelDTO[]>([])
  const [generatingModel, setGeneratingModel] = useState(false)
  const [results, setResults] = useState<{ url: string }[]>([])
  const [activeShot, setActiveShot] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const accessoryInputRef = useRef<HTMLInputElement | null>(null)
  const clothingFrontInputRef = useRef<HTMLInputElement | null>(null)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [assetApply, setAssetApply] = useState<((url: string) => void) | null>(null)
  function openAssetPicker(apply: (url: string) => void) { setAssetApply(() => apply); setAssetPickerOpen(true) }
  const clothingBackInputRef = useRef<HTMLInputElement | null>(null)
  const modelUploadInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    actionListAvatarsForPicker().then(setAvatars).catch(() => setAvatars([]))
    actionListShootingModels().then(setShootingModels).catch(() => setShootingModels([]))
  }, [])

  // Handoff depuis Production (?from=production&prompt=…) → pré-remplit la description.
  useEffect(() => {
    if (!['production','template'].includes(searchParams.get('from') ?? '')) return
    const prompt = searchParams.get('prompt')
    if (prompt) setProductDescription(prompt)
    toast.info('Pré-rempli')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(file: File | undefined, apply: (url: string) => void) {
    const url = await uploadImageFile(file)
    if (url) apply(url)
    else toast.error('Échec de l\'upload de l\'image')
  }
  const [selectedShots, setSelectedShots] = useState<string[]>(['editorial'])
  const [selectedAccessoryShots, setSelectedAccessoryShots] = useState<string[]>([])

  // Mes personnages : uploads custom + avatars (Characters).
  const myCharacters = [
    ...customModels.map((url) => ({ id: url, label: 'Custom', photoUrl: url })),
    ...avatars.filter((avatar) => avatar.photoUrl).map((avatar) => ({ id: avatar.id, label: avatar.name, photoUrl: avatar.photoUrl as string })),
  ]
  // Système : catalogue de mannequins générés, filtré par cadrage + fond.
  // (Sexe / Nationalité / Morphologie pilotent la CRÉATION, pas l'affichage → la grille ne se vide jamais.)
  const heyozModels = shootingModels
    .filter((model) => model.url
      && model.shotType === shotType
      && (backgroundColor === 'ALL' || model.backgroundColor === backgroundColor))
    .map((model) => ({
      id: model.id,
      label: `${model.nationality ?? 'Modèle'} ${nationalityFlag(model.nationality)}`.trim(),
      photoUrl: model.url as string,
    }))
  const visibleModels = modelSource === 'mine' ? myCharacters : heyozModels
  const allKnownModels = [
    ...shootingModels.filter((m) => m.url).map((m) => ({ id: m.id, label: `${m.shotType} · ${m.backgroundColor}`, photoUrl: m.url as string })),
    ...myCharacters,
  ]
  const selectedModel = allKnownModels.find((model) => model.photoUrl === selectedModelUrl)
  const steps = buildSteps(selectedType)

  // Génère un mannequin Système pour le cadrage + la couleur sélectionnés, puis le sélectionne.
  async function generateShootingModel() {
    if (generatingModel) return
    if (backgroundColor === 'ALL') { toast.error('Choisis une couleur de fond pour générer'); return }
    setGeneratingModel(true)
    try {
      const dto = await actionGenerateShootingModel({ shotType, backgroundColor, gender: modelGender, nationality: modelNationality, bodyType: modelBodyType })
      const list = await actionListShootingModels()
      setShootingModels(list)
      if (dto.url) setSelectedModelUrl(dto.url)
      toast.success('Mannequin généré ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Échec de la génération') }
    finally { setGeneratingModel(false) }
  }

  // Scène « Générer avec IA » : décrit une scène à partir du produit (type + image) + du mannequin choisi.
  async function suggestScene() {
    if (suggestingScene) return
    const isAccessory = selectedType === 'accessory'
    const clothingUrl = isAccessory ? accessoryImageUrl : (clothingFrontUrl || clothingBackUrl)
    if (!clothingUrl) { toast.error(isAccessory ? 'Importe d\'abord un accessoire' : 'Importe d\'abord un vêtement'); return }
    setSuggestingScene(true)
    try {
      const modelHint = [selectedModel?.label, `${shotType.toLowerCase()} shot`].filter(Boolean).join(', ')
      const text = await actionSuggestFashionScene({
        clothingUrl,
        modelUrl: selectedModelUrl || undefined,
        garmentType: selectedType,
        modelHint,
        description: productDescription.trim() || undefined,
      })
      if (text) { setScenePrompt(text); setSelectedScene('') }
      else toast.error('Aucune scène générée')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Échec de la suggestion') }
    finally { setSuggestingScene(false) }
  }
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  function canContinue(id: StepId) {
    if (id === 'model') return Boolean(selectedModelUrl)
    return true
  }

  // Passage d'une étape à l'autre — la pile glissante (StepSlider) gère l'animation.
  function transitionTo(nextIndex: number, setup?: () => void) {
    setup?.()
    setCurrentStep(nextIndex)
  }

  function goNext() {
    if (!canContinue(stepId)) return
    transitionTo(Math.min(currentStep + 1, steps.length - 1))
  }

  function goBack() {
    transitionTo(Math.max(currentStep - 1, 0))
  }

  function chooseType(id: string) {
    transitionTo(1, () => {
      setSelectedType(id)
      if (id === 'accessory') setAccessoryImageUrl('')
    })
  }

  function toggleShot(shotId: string) {
    setSelectedShots((current) => {
      if (current.includes(shotId)) {
        if (current.length === 1) return current
        return current.filter((id) => id !== shotId)
      }
      return [...current, shotId]
    })
  }

  function toggleAccessoryShot(shotId: string) {
    setSelectedAccessoryShots((current) => (
      current.includes(shotId) ? current.filter((id) => id !== shotId) : [...current, shotId]
    ))
  }

  // Génération réelle (Nano Banana) — une image par type de prise sélectionné.
  async function generate() {
    if (generating) return
    const size = ratioToSize(selectedAspectRatio)
    const isAccessory = selectedType === 'accessory'
    // Vêtement en référence(s) DOMINANTE(s) (fidélité produit), puis le mannequin.
    const refs = (isAccessory
      ? [accessoryImageUrl]
      : [clothingFrontUrl, clothingBackUrl, selectedModelUrl]
    ).filter(Boolean)
    const shots = isAccessory
      ? ACCESSORY_SHOTS.filter((shot) => selectedAccessoryShots.includes(shot.id))
      : FASHION_SHOTS.filter((shot) => selectedShots.includes(shot.id))
    if (!shots.length) { toast.error('Sélectionne au moins un type de prise'); return }
    if (isAccessory && !accessoryImageUrl) { toast.error('Importe une image d\'accessoire'); return }

    setGenerating(true)
    setActiveShot(0)
    setResults([])
    try {
      // Analyse vision du produit (vêtement / accessoire) → identité + styling + décor adaptés.
      const productImg = isAccessory ? accessoryImageUrl : (clothingFrontUrl || clothingBackUrl)
      const look = productImg ? await actionDescribeProductScene({ imageUrl: productImg }).catch(() => null) : null
      const garment = [look?.product ?? (isAccessory ? 'the accessory' : 'the clothing product'), productDescription.trim()].filter(Boolean).join(' — ')

      const brandCtx = !useBrandCtx ? '' : [
        brand.name ? `Brand: ${brand.name}` : '',
        brand.website ? `brand site: ${brand.website}` : '',
        brand.communicationTone ? `tone ${brand.communicationTone}` : '',
        brand.targetAudience ? `audience: ${brand.targetAudience}` : '',
        brand.preferredWords.length ? `emphasize: ${brand.preferredWords.slice(0, 6).join(', ')}` : '',
      ].filter(Boolean).join(' · ')
      const all: { url: string }[] = []
      for (const shot of shots) {
        // Réalisme + créativité : direction photographique par prise + boosters photoréalistes.
        const realism = 'Shot on a professional full-frame camera, realistic skin pores and fabric texture, natural soft shadows and accurate materials, high dynamic range, sharp focus, hyper-detailed, award-winning fashion editorial photography, magazine quality, photorealistic — not CGI, no plastic look, no text, no watermark.'
        const fidelity = 'CRITICAL: reproduce the EXACT item shown in the reference image — identical shape, cut, colors, pattern, text, logo, fabric and proportions. Do not redesign, replace or invent a different item. Keep it perfectly recognizable.'
        const promptText = isAccessory
          ? [
              `Creative editorial fashion accessory shot of the accessory shown in the reference image${garment && garment !== 'the accessory' ? ` (${garment})` : ''} — ${shot.title}: ${shot.desc}.`,
              fidelity,
              `Art direction: ${shot.direction}.`,
              look?.holding ? `Presentation: ${look.holding}.` : '',
              `Setting: ${look?.background ?? 'a premium editorial environment that matches the accessory'}.`,
              brandCtx ? `On-brand context — ${brandCtx}.` : '',
              realism,
            ].filter(Boolean).join(' ')
          : [
              `Creative editorial fashion photoshoot: the same person from the model reference image wearing the EXACT garment shown in the clothing reference image${garment && garment !== 'the clothing product' ? ` (${garment})` : ''}.`,
              fidelity,
              look?.styling ? `The model is styled to complement the garment: ${look.styling}.` : '',
              `Shot: ${shot.title} — ${shot.desc}.`,
              `Art direction: ${shot.direction}.`,
              `Framing: ${shotType.toLowerCase()}.`,
              backgroundColor && backgroundColor !== 'ALL' ? `Background color: ${backgroundColor.toLowerCase()}.` : '',
              selectedScene ? `Scene: ${selectedScene}.` : (look?.background ? `Scene: ${look.background}.` : ''),
              scenePrompt ? `Background: ${scenePrompt}.` : '',
              brandCtx ? `On-brand context — ${brandCtx}.` : '',
              realism,
            ].filter(Boolean).join(' ')
        const res = await actionGenerateImage({ prompt: promptText, model: 'nano-banana', size, n: 1, ...(refs.length ? { imageUrl: refs } : {}) })
        const url = res.find((image) => image.url)?.url
        if (url) {
          all.push({ url })
          persistOutput({ type: 'image', sourceUrl: url, title: `Shooting mode · ${shot.title}`, engine: 'nano-banana', prompt: promptText.slice(0, 200), format: size }).catch(() => {})
        }
      }
      setResults(all)
      if (all.length) toast.success(`${all.length} visuel${all.length > 1 ? 's' : ''} généré${all.length > 1 ? 's' : ''}`)
      else toast.error('Aucune image générée')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }

  function renderStep(id: StepId) {
    if (id === 'type') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choose your photoshoot type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FASHION_TYPES.map(({ id, title, desc, icon: Icon, points }) => {
              const isSelected = selectedType === id
              return (
                <button key={id} onClick={() => chooseType(id)} className={`group relative text-left rounded-[16px] border-2 bg-bg-surface p-8 transition-all hover:border-accent/60 hover:shadow-neo ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
                  {isSelected && <span className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow-sm"><Check size={15} strokeWidth={3} /></span>}
                  <span className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Icon size={32} strokeWidth={2} /></span>
                  <h4 className="mt-4 font-display text-[20px] font-bold leading-7 text-text-primary">{title}</h4>
                  <p className="mt-2 text-[14px] leading-5 text-text-secondary">{desc}</p>
                  <ul className="mt-4 space-y-2">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-[14px] text-text-secondary"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{point}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (id === 'model') {
      return (
        <div className="w-full max-w-[760px]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-display text-[15px] font-extrabold text-text-primary">Select a model for your fashion photoshoot</h3>
            <button onClick={() => modelUploadInputRef.current?.click()} className="h-8 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-extrabold text-text-primary flex items-center gap-1.5 hover:border-accent/70 transition-colors shrink-0"><Upload size={14} /> Upload Custom</button>
            <input ref={modelUploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0], (url) => { setCustomModels((prev) => [url, ...prev]); setSelectedModelUrl(url) })} />
          </div>
          <div className="rounded-[7px] bg-fg/[0.08] p-0.5 grid grid-cols-2 mb-2">
            <button onClick={() => setModelSource('heyoz')} className={`h-5 rounded-[6px] text-[10px] font-bold transition ${modelSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>Modèles Système</button>
            <button onClick={() => setModelSource('mine')} className={`h-5 rounded-[6px] text-[10px] font-bold transition ${modelSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>My Characters</button>
          </div>
          {modelSource === 'heyoz' && (<>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Sexe</p>
              <div className="flex gap-1">
                {[{ v: 'All', l: 'Tous' }, { v: 'Female', l: 'Femme' }, { v: 'Male', l: 'Homme' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setModelGender(v)} className={`h-6 flex-1 rounded-[7px] text-[10px] font-bold transition ${modelGender === v ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Nationalité</p>
              <select value={modelNationality} onChange={(e) => setModelNationality(e.target.value)} className="h-6 w-full rounded-[7px] border border-border bg-bg-card px-2 py-0 text-[10px] font-bold text-text-primary outline-none focus:border-accent">
                <option value="All">Toutes</option>
                {MODEL_NATIONALITIES.map((n) => <option key={n.name} value={n.name}>{n.flag} {n.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Morphologie</p>
              <select value={modelBodyType} onChange={(e) => setModelBodyType(e.target.value)} className="h-6 w-full rounded-[7px] border border-border bg-bg-card px-2 py-0 text-[10px] font-bold text-text-primary outline-none focus:border-accent">
                <option value="All">Toutes</option>
                {MODEL_BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Shot Type</p>
              <div className="flex flex-wrap gap-1.5">
                {SHOT_TYPES.map((type) => (
                  <button key={type} onClick={() => setShotType(type)} className={`h-5 rounded-full px-2 text-[9px] font-bold transition ${shotType === type ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{type}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Background Color</p>
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_COLORS.map((color) => (
                  <button key={color} onClick={() => setBackgroundColor(color)} className={`h-5 rounded-full px-2 text-[9px] font-bold transition ${backgroundColor === color ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{color}</button>
                ))}
              </div>
            </div>
          </div>
          </>)}
          <div className="flex flex-wrap justify-center gap-3">
            {/* Système : carte de génération à la demande (cadrage + couleur courants) */}
            {modelSource === 'heyoz' && (
              <button
                onClick={generateShootingModel}
                disabled={generatingModel || backgroundColor === 'ALL'}
                title={backgroundColor === 'ALL' ? 'Choisis une couleur de fond pour générer' : `Générer un mannequin ${shotType} · ${backgroundColor}`}
                className="w-[112px] aspect-[3/5] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-2 px-2 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {generatingModel
                  ? <span className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  : <><span className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkles size={18} /></span>
                      <span className="text-[11px] font-extrabold text-text-primary leading-tight">Générer un mannequin</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-text-muted">{backgroundColor === 'ALL' ? 'Choisis une couleur' : ([modelGender === 'Male' ? 'Homme' : modelGender === 'Female' ? 'Femme' : null, modelNationality !== 'All' ? modelNationality : null, modelBodyType !== 'All' ? modelBodyType : null].filter(Boolean).join(' · ') || 'Aléatoire')}</span></>}
              </button>
            )}

            {visibleModels.map((model) => {
              const isSelected = selectedModelUrl === model.photoUrl
              return (
                <button key={model.id} onClick={() => setSelectedModelUrl(model.photoUrl)} className={`relative w-[112px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={model.photoUrl} alt={model.label} className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute left-1.5 bottom-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-extrabold text-zinc-950 shadow-neo-sm">{model.label}</span>
                  {isSelected && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center"><Check size={14} /></span>}
                </button>
              )
            })}

            {/* Onglets vides : messages d'aide */}
            {modelSource === 'mine' && visibleModels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserRound size={40} className="text-text-muted mb-3" strokeWidth={1.8} />
                <p className="text-[14px] font-extrabold text-text-primary">Aucun personnage</p>
                <p className="mt-1 text-[12px] text-text-secondary">Crée un avatar dans Characters, ou utilise « Upload Custom ».</p>
              </div>
            )}
            {modelSource === 'heyoz' && visibleModels.length === 0 && (
              <div className="flex w-full flex-col items-center justify-center py-6 text-center">
                <p className="text-[13px] font-bold text-text-primary">Aucun mannequin pour {shotType}{backgroundColor !== 'ALL' ? ` · ${backgroundColor}` : ''}</p>
                <p className="mt-1 text-[12px] text-text-secondary">Génère-en un avec la carte ci-dessus.</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={!selectedModelUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'accessoryUpload') {
      return (
        <div className="w-full max-w-[560px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Upload your accessory image</h3>
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Accessory Image *</p>
          <button onClick={() => accessoryInputRef.current?.click()} className="h-[170px] w-full rounded-[12px] border border-dashed border-border bg-bg-card flex flex-col items-center justify-center gap-3 text-text-primary hover:border-accent/70 transition-colors overflow-hidden">
            {accessoryImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={accessoryImageUrl} alt="Accessory" className="max-h-full max-w-full object-contain" />
            ) : (
              <>
                <ImageIcon size={34} strokeWidth={2.2} />
                <span className="flex items-center gap-2 text-[12px] font-extrabold"><Wand2 size={16} /> Click to upload your accessory image</span>
              </>
            )}
          </button>
          <input ref={accessoryInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0], setAccessoryImageUrl)} />
          <button type="button" onClick={() => openAssetPicker(setAccessoryImageUrl)} className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-text-secondary transition hover:text-accent"><Images size={13} /> Depuis mes Assets</button>
          <div className="mt-3 rounded-[12px] bg-fg/[0.04] px-4 py-3">
            <h4 className="text-[12px] font-extrabold text-text-primary">Tips for best results</h4>
            <ul className="mt-1.5 space-y-0.5 text-[12px] font-medium leading-relaxed text-text-secondary">
              <li>• Use a high-quality image with a clean background</li>
              <li>• Ensure the accessory is well-lit and clearly visible</li>
              <li>• Avoid blurry or low-resolution images</li>
            </ul>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Description du produit <span className="text-text-muted/70">(optionnel)</span></p>
            <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="ex. Montre automatique en acier, bracelet cuir marron, style classique haut de gamme…" className="h-[72px] w-full resize-none rounded-[12px] border border-border bg-bg-card px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-text-primary placeholder:text-text-dim outline-none focus:border-accent/70 focus:shadow-none" />
          </div>
          <div className="mt-4 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'scene') {
      return (
        <div className="w-full max-w-[620px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Describe your background scene (Optional)</h3>
          <div className="rounded-[12px] border border-border bg-bg-card overflow-hidden transition-colors focus-within:border-accent/70">
            <textarea value={scenePrompt} onChange={(event) => setScenePrompt(event.target.value)} placeholder="e.g. A sunlit minimalist loft with concrete floors and large windows, warm golden-hour lighting..." className="h-[104px] w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[13px] font-medium leading-relaxed text-text-primary placeholder:text-text-dim outline-none focus:shadow-none" />
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-2.5 py-2.5">
              <button onClick={suggestScene} disabled={suggestingScene} className="h-7 rounded-full bg-accent px-3 text-[12px] font-extrabold text-white inline-flex items-center gap-1.5 shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                <Sparkles size={13} /> {suggestingScene ? 'Génération…' : 'Générer avec IA'}
              </button>
              <span className="h-4 w-px bg-border" />
              {BACKGROUND_SCENES.map((scene) => (
                <button key={scene} onClick={() => setSelectedScene(selectedScene === scene ? '' : scene)} className={`h-7 rounded-full px-3 text-[12px] font-bold transition ${selectedScene === scene ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-accent/10'}`}>{scene}</button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'aspect') {
      return (
        <div className="w-full max-w-[640px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Select aspect ratio</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {DIMENSIONS.map((dimension) => {
              const selected = selectedAspectRatio === dimension
              return (
                <button key={dimension} onClick={() => setSelectedAspectRatio(dimension)} className={`h-[68px] rounded-[10px] border bg-bg-card flex flex-col items-center justify-center gap-1 px-2 py-1.5 transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
                  <span className="relative w-7 h-7 flex items-center justify-center">
                    <span className="absolute inset-0 border border-dashed border-accent/20" />
                    <span className={`${selected ? 'bg-accent border-accent' : 'bg-bg-card border-border-strong'} border-2`} style={ratioStyle(dimension)} />
                  </span>
                  <span className="text-[11px] font-extrabold">{dimension}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'clothing') {
      return (
        <div className="w-full max-w-[440px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Upload your clothing images</h3>
          <div className="space-y-3">
            {[
              { label: 'Clothing Front *', url: clothingFrontUrl, optional: false, inputRef: clothingFrontInputRef, apply: setClothingFrontUrl },
              { label: 'Clothing Back', optional: true, url: clothingBackUrl, inputRef: clothingBackInputRef, apply: setClothingBackUrl },
            ].map((item) => (
              <div key={item.label}>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {item.label}
                  {item.optional && <span className="ml-2 text-[10px] text-text-muted/70">(Optional)</span>}
                </p>
                <button onClick={() => item.inputRef.current?.click()} className="relative h-[150px] w-full rounded-[12px] border border-dashed border-border bg-bg-card overflow-hidden flex flex-col items-center justify-end pb-2.5 text-text-primary hover:border-accent/70 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.label} className="absolute top-2 h-[108px] w-[150px] object-contain" />
                  <span className="relative z-10 flex items-center gap-2 text-[12px] font-extrabold"><Wand2 size={16} /> Click to change your image</span>
                </button>
                <input ref={item.inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0], item.apply)} />
                <button type="button" onClick={() => openAssetPicker(item.apply)} className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-text-secondary transition hover:text-accent"><Images size={13} /> Depuis mes Assets</button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Description du produit <span className="text-text-muted/70">(optionnel)</span></p>
            <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="ex. T-shirt en coton bio, coupe oversize, coloris crème, marque éco-responsable…" className="h-[72px] w-full resize-none rounded-[12px] border border-border bg-bg-card px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-text-primary placeholder:text-text-dim outline-none focus:border-accent/70 focus:shadow-none" />
          </div>
          <div className="mt-4 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    // shot (final)
    const shots = selectedType === 'accessory' ? ACCESSORY_SHOTS : FASHION_SHOTS
    const shotCount = selectedType === 'accessory' ? selectedAccessoryShots.length : selectedShots.length
    return (
      <div className="w-full max-w-[680px]">
        <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Select your shot types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shots.map((shot) => {
            const Icon = shot.icon
            const selected = selectedType === 'accessory' ? selectedAccessoryShots.includes(shot.id) : selectedShots.includes(shot.id)
            return (
              <button key={shot.id} onClick={() => (selectedType === 'accessory' ? toggleAccessoryShot(shot.id) : toggleShot(shot.id))} className={`relative min-h-[84px] rounded-[12px] border-2 bg-bg-card p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-accent bg-accent/5' : 'border-border'}`}>
                <div className="flex gap-3">
                  <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={18} /></span>
                  <div className="min-w-0 pr-6">
                    <h4 className={`text-[14px] font-extrabold ${selected ? 'text-accent' : 'text-text-primary'}`}>{shot.title}</h4>
                    <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-text-secondary">{shot.desc}</p>
                  </div>
                </div>
                {selected && <span className="absolute right-3 top-3 text-accent"><CircleCheck size={16} /></span>}
              </button>
            )
          })}
        </div>

        <div className="mt-3 h-10 rounded-[12px] border border-border bg-bg-card px-4 flex items-center justify-between">
          <span className="text-[12px] font-extrabold text-text-primary">{shotCount} shot{shotCount !== 1 ? 's' : ''} selected</span>
          <span className="flex items-center gap-2 text-[12px] font-extrabold text-text-primary"><Gem size={14} fill="currentColor" /> {Math.max(1, shotCount) * 2} tokens</span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={goBack} />
            <button onClick={generate} disabled={generating || shotCount === 0} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white flex items-center gap-2.5 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
              {generating ? 'Génération…' : <><Sparkles size={16} /> Generate Fashion Photoshoot</>}
            </button>
          </div>
          <p className="text-[12px] font-bold text-text-secondary">Estimated time: {shotCount === 0 ? 0 : Math.max(1, shotCount) * 12} seconds</p>
        </div>
      </div>
    )
  }

  const resultUrls = results.map((r) => r.url)
  const hasResults = resultUrls.length > 0
  const fallbackPreview = selectedType === 'accessory' ? accessoryImageUrl : (selectedModel?.photoUrl ?? '')
  const activeUrl = hasResults ? (resultUrls[Math.min(activeShot, resultUrls.length - 1)] ?? '') : fallbackPreview

  return (
    <PageShell>
      <MainPanel>
        <WizardHeader title="Shooting mode" onBack={() => router.push('/creer/image')} />

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="min-w-0 min-h-0">
            <StepSlider index={Math.min(currentStep, steps.length - 1)}>
              {steps.map((id) => renderStep(id))}
            </StepSlider>
          </main>

          <aside className="min-h-0 flex flex-col overflow-hidden border-t border-border bg-bg-surface px-4 py-4 lg:border-l lg:border-t-0 lg:px-5 lg:py-5">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-text-primary">Preview</h2>
                <p className="mt-1 truncate text-[12px] font-medium text-text-secondary">{hasResults ? `${resultUrls.length} shot${resultUrls.length > 1 ? 's' : ''} generated` : 'Your results will appear here'}</p>
              </div>
              <button onClick={generate} disabled={generating} className="h-8 rounded-[10px] bg-accent px-3 text-[12px] font-extrabold text-white flex items-center gap-1.5 shadow-neo-solid hover:brightness-105 transition shrink-0 disabled:opacity-55 disabled:cursor-not-allowed"><Wand2 size={14} /> {hasResults ? 'Re-generate' : 'Edit with AI'}</button>
            </div>

            <div className="relative mt-4 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[13px] border border-border bg-bg-card px-5 text-center [background-image:radial-gradient(circle_at_50%_28%,rgba(255,92,40,0.07),transparent_70%)]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-bg-surface/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary shadow-sm backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${hasResults ? 'bg-green-600' : generating ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
                {hasResults ? `Shot ${Math.min(activeShot + 1, resultUrls.length)}/${resultUrls.length}` : generating ? 'Generating' : 'Preview'} · {selectedAspectRatio}
              </span>

              {generating ? (
                <div className="relative z-10 flex flex-col items-center gap-3 text-text-secondary">
                  <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <p className="text-[13px] font-semibold text-text-primary">Génération en cours…</p>
                </div>
              ) : activeUrl ? (
                <>
                  <button onClick={() => hasResults && setLightboxOpen(true)} className="group relative z-10 flex h-full w-full items-center justify-center py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeUrl} alt="Preview" className="max-h-full max-w-full rounded-[8px] object-contain shadow-neo-sm transition group-hover:brightness-95" />
                    {hasResults && <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"><span className="rounded-full bg-black/55 p-2 text-white"><Maximize2 size={18} /></span></span>}
                  </button>
                  {hasResults && (
                    <a href={activeUrl} download target="_blank" rel="noreferrer" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
                  )}
                </>
              ) : selectedType === 'accessory' ? (
                <div className="relative z-10"><Watch size={42} className="mx-auto mb-3 text-text-muted" strokeWidth={2} /><p className="text-[13px] font-bold text-text-primary">Upload an accessory image to see preview</p></div>
              ) : (
                <div className="relative z-10"><UserRound size={42} className="mx-auto mb-3 text-text-muted" strokeWidth={2} /><p className="text-[13px] font-bold text-text-primary">Select a fashion model to see preview</p></div>
              )}
            </div>

            {/* Miniatures des shots */}
            {resultUrls.length > 1 && (
              <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
                {resultUrls.map((url, index) => (
                  <button key={`${url}-${index}`} onClick={() => setActiveShot(index)} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[9px] border-2 transition ${index === activeShot ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Shot ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 shrink-0 rounded-[14px] border border-border bg-bg-card p-3.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-text-primary"><Sparkles size={13} className="text-accent" /> Tips</h3>
              <ul className="mt-2 space-y-1 text-[12px] font-medium leading-relaxed text-text-secondary">
                <li>• Use AI editing to adjust lighting, background, or styling</li>
                <li>• Upload your own custom images for more control</li>
                <li>• Click a shot to enlarge & download it</li>
              </ul>
            </div>
          </aside>
        </div>
      </MainPanel>

      <AssetPickerModal open={assetPickerOpen} onClose={() => setAssetPickerOpen(false)} onPick={(url) => assetApply?.(url)} types={['image']} closeOnPick title="Mes Assets (images)" />

      {lightboxOpen && activeUrl && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeUrl} alt="Shot" onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
          <a href={activeUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
        </div>
      )}
    </PageShell>
  )
}
