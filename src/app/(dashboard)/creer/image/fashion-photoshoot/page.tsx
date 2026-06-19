'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Camera, Check, ChevronDown, CircleCheck, CircleX, Gem, ImageIcon, RotateCcw, ScanSearch, Shirt, Sparkles, Upload, UserRound, Watch, Wand2 } from 'lucide-react'
import { actionGenerateImage } from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { useToast } from '@/lib/stores/toastStore'
import { AnimatedStep, ContinueButton, DevStepNav, WizardHeader, ratioStyle, ratioToSize, uploadImageFile, type AnimationPhase } from '@/components/features/creer/WizardKit'

const FASHION_TYPES = [
  { id: 'apparel', title: 'Apparel / Clothing', desc: 'Create professional fashion photoshoots with models wearing your clothing products', icon: Shirt, points: ['Choose a fashion model', 'Upload clothing images', 'Get 4 angle variations'] },
  { id: 'accessory', title: 'Fashion Accessory', desc: 'Generate styled product shots of fashion accessories like watches, bracelets, and jewelry', icon: Watch, points: ['Upload your accessory image', 'We generate styled product shots'] },
]

const SHOT_TYPES = ['UPPER BODY', 'LOWER BODY', 'FULL BODY']
const BACKGROUND_COLORS = ['ALL', 'BEIGE', 'LIGHT GREY', 'OFF WHITE', 'CREAM']
const BACKGROUND_SCENES = ['Editorial Street', 'Urban Street', 'Studio', 'Beach Sunset', 'Luxury Interior', 'Industrial Loft']
const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const CLOTHING_SAMPLE_URL = 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=700&q=80'
const GUIDELINE_IMAGES = [
  { id: 'clean', label: '', status: 'good', photoUrl: 'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=360&q=80' },
  { id: 'full', label: 'Clean background\nFull product shot\nSingle product', status: 'good', photoUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=360&q=80' },
  { id: 'selfie', label: 'Selfie', status: 'bad', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=360&q=80' },
  { id: 'incomplete', label: 'Incomplete', status: 'bad', photoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=360&q=80' },
  { id: 'multiple', label: 'Multiple items', status: 'bad', photoUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=360&q=80' },
]
const FASHION_SHOTS = [
  { id: 'editorial', title: 'Editorial Full Body', desc: 'Head-to-toe lifestyle shot with complete outfit in a styled environment', icon: Sparkles },
  { id: 'back', title: 'Back View', desc: 'Back view of the outfit showing rear design, stitching, and construction details', icon: RotateCcw },
  { id: 'lifestyle', title: 'Lifestyle / Candid', desc: 'Three-quarter candid moment with the model interacting naturally with the environment', icon: Camera },
  { id: 'detail', title: 'Detail & Texture', desc: 'Extreme macro closeup showcasing craftsmanship, stitching, and material quality', icon: ScanSearch },
]
const ACCESSORY_SHOTS = [
  { id: 'lifestyle-worn', title: 'Lifestyle Worn', desc: 'Person wearing or holding the accessory naturally in a styled editorial environment', icon: UserRound },
  { id: 'studio-product', title: 'Studio Product', desc: 'Clean product shot on a styled surface with professional lighting', icon: Box },
  { id: 'detail-macro', title: 'Detail Macro', desc: 'Extreme close-up highlighting the accessory’s craftsmanship, texture, and material quality', icon: ScanSearch },
]

const FASHION_MODELS = [
  { id: 'model-1', label: 'Pakistani 🇵🇰', photoUrl: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-2', label: 'British 🇬🇧', photoUrl: 'https://images.unsplash.com/photo-1520975682031-a9e3b68c8450?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-3', label: 'Filipino 🇵🇭', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-4', label: 'Brazilian 🇧🇷', photoUrl: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-5', label: 'Pakistani 🇵🇰', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-6', label: 'Italian 🇮🇹', photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-7', label: 'British 🇬🇧', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-8', label: 'Chinese 🇨🇳', photoUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-9', label: 'American 🇺🇸', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80' },
  { id: 'model-10', label: 'Japanese 🇯🇵', photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80' },
]

type StepId = 'type' | 'model' | 'scene' | 'aspect' | 'clothing' | 'shot' | 'accessoryUpload'

function buildSteps(type: string): StepId[] {
  if (type === 'apparel') return ['type', 'model', 'scene', 'aspect', 'clothing', 'shot']
  if (type === 'accessory') return ['type', 'model', 'accessoryUpload', 'aspect', 'shot']
  return ['type']
}

export default function FashionPhotoshootPage() {
  const router = useRouter()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [modelSource, setModelSource] = useState<'heyoz' | 'mine'>('heyoz')
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
  const accessoryInputRef = useRef<HTMLInputElement | null>(null)
  const clothingFrontInputRef = useRef<HTMLInputElement | null>(null)
  const clothingBackInputRef = useRef<HTMLInputElement | null>(null)
  const modelUploadInputRef = useRef<HTMLInputElement | null>(null)

  async function handleUpload(file: File | undefined, apply: (url: string) => void) {
    const url = await uploadImageFile(file)
    if (url) apply(url)
    else toast.error('Échec de l\'upload de l\'image')
  }
  const [selectedShots, setSelectedShots] = useState<string[]>(['editorial'])
  const [selectedAccessoryShots, setSelectedAccessoryShots] = useState<string[]>([])

  const selectedModel = FASHION_MODELS.find((model) => model.photoUrl === selectedModelUrl)
  const steps = buildSteps(selectedType)
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  function canContinue(id: StepId) {
    if (id === 'model') return Boolean(selectedModelUrl)
    return true
  }

  function transitionTo(nextIndex: number, setup?: () => void) {
    if (phase !== 'idle') return
    setPhase('exit')
    window.setTimeout(() => {
      setup?.()
      setCurrentStep(nextIndex)
      setPhase('enter')
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPhase('idle'))
      })
    }, 210)
  }

  function goNext() {
    if (!canContinue(stepId)) return
    transitionTo(Math.min(currentStep + 1, steps.length - 1))
  }

  function chooseType(id: string) {
    transitionTo(1, () => {
      setSelectedType(id)
      if (id === 'accessory') setAccessoryImageUrl('')
    })
  }

  // [DEV] Saut direct vers n'importe quelle étape, sans validation.
  function goToStep(id: StepId) {
    let type = selectedType
    if (id === 'scene' || id === 'clothing') type = 'apparel'
    else if (id === 'accessoryUpload') type = 'accessory'
    else if ((id === 'model' || id === 'aspect' || id === 'shot') && !type) type = 'apparel'
    const list = buildSteps(type)
    const idx = list.indexOf(id)
    if (idx < 0) return
    setSelectedType(type)
    setPhase('idle')
    setCurrentStep(idx)
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

  // Génération réelle (Nano Banana) — rendu affiché dans le panneau d'aperçu.
  async function generate() {
    if (generating) return
    const size = ratioToSize(selectedAspectRatio)
    let refs: string[] = []
    let promptText = ''
    if (selectedType === 'accessory') {
      refs = [accessoryImageUrl].filter(Boolean)
      promptText = 'Styled fashion accessory product shot, editorial lighting, premium look, high quality.'
    } else {
      refs = [selectedModelUrl, clothingFrontUrl, clothingBackUrl].filter(Boolean)
      promptText = [
        'Professional fashion photoshoot of a model wearing the clothing product.',
        `Shot type: ${shotType.toLowerCase()}.`,
        selectedScene ? `Scene: ${selectedScene}.` : '',
        scenePrompt ? `Background: ${scenePrompt}.` : '',
        'Cohesive styling, editorial quality.',
      ].filter(Boolean).join(' ')
    }
    setGenerating(true)
    try {
      const res = await actionGenerateImage({ prompt: promptText, model: 'nano-banana', size, n: 1, ...(refs.length ? { imageUrl: refs } : {}) })
      const url = res.find((image) => image.url)?.url
      if (url) {
        setGeneratedUrl(url)
        persistOutput({ type: 'image', sourceUrl: url, title: 'Shooting mode', engine: 'nano-banana', prompt: promptText.slice(0, 200), format: size }).catch(() => {})
        toast.success('Image générée')
      } else {
        toast.error('Aucune image générée')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }

  function renderCurrentStep() {
    if (stepId === 'type') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choose your photoshoot type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FASHION_TYPES.map(({ id, title, desc, icon: Icon, points }) => {
              const isSelected = selectedType === id
              return (
                <button key={id} onClick={() => chooseType(id)} className={`group text-left rounded-[16px] border-2 bg-bg-surface p-8 transition-all hover:border-accent/60 hover:shadow-neo ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
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

    if (stepId === 'model') {
      return (
        <div className="w-full max-w-[760px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Select a model for your fashion photoshoot</h3>
            <button onClick={() => modelUploadInputRef.current?.click()} className="h-9 rounded-[10px] border border-border bg-bg-card px-4 text-[13px] font-extrabold text-text-primary flex items-center gap-2 hover:border-accent/70 transition-colors shrink-0"><Upload size={16} /> Upload Custom</button>
            <input ref={modelUploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0], (url) => { setCustomModels((prev) => [url, ...prev]); setSelectedModelUrl(url) })} />
          </div>
          <div className="rounded-[7px] bg-fg/[0.08] p-0.5 grid grid-cols-2 mb-2.5">
            <button onClick={() => setModelSource('heyoz')} className={`h-6 rounded-[6px] text-[11px] font-bold transition ${modelSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>HeyOz Models</button>
            <button onClick={() => setModelSource('mine')} className={`h-6 rounded-[6px] text-[11px] font-bold transition ${modelSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>My Characters</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {['Gender', 'Ethnicity', 'Body Type'].map((label) => (
              <div key={label}>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">{label}</p>
                <button className="h-7 w-full rounded-[7px] border border-border bg-bg-card px-2.5 text-left text-[11px] font-bold text-text-primary flex items-center justify-between">All <ChevronDown size={14} className="text-text-muted" /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Shot Type</p>
              <div className="flex flex-wrap gap-1.5">
                {SHOT_TYPES.map((type) => (
                  <button key={type} onClick={() => setShotType(type)} className={`h-6 rounded-full px-2.5 text-[10px] font-bold transition ${shotType === type ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{type}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Background Color</p>
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_COLORS.map((color) => (
                  <button key={color} onClick={() => setBackgroundColor(color)} className={`h-6 rounded-full px-2.5 text-[10px] font-bold transition ${backgroundColor === color ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{color}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {customModels.map((url) => {
              const isSelected = selectedModelUrl === url
              return (
                <button key={url} onClick={() => setSelectedModelUrl(url)} className={`relative w-[112px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Custom model" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute left-1.5 bottom-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-extrabold text-zinc-950 shadow-neo-sm">Custom</span>
                  {isSelected && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center"><Check size={14} /></span>}
                </button>
              )
            })}
            {FASHION_MODELS.map((model) => {
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
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={!selectedModelUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'accessoryUpload') {
      return (
        <div className="w-full max-w-[640px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Upload your accessory image</h3>
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wider text-text-muted">Accessory Image *</p>
          <button onClick={() => accessoryInputRef.current?.click()} className="h-[240px] w-full rounded-[12px] border border-dashed border-border bg-bg-card flex flex-col items-center justify-center gap-4 text-text-primary hover:border-accent/70 transition-colors overflow-hidden">
            {accessoryImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={accessoryImageUrl} alt="Accessory" className="max-h-full max-w-full object-contain" />
            ) : (
              <>
                <ImageIcon size={44} strokeWidth={2.2} />
                <span className="flex items-center gap-2 text-[13px] font-extrabold"><Wand2 size={18} /> Click to upload your accessory image</span>
              </>
            )}
          </button>
          <input ref={accessoryInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0], setAccessoryImageUrl)} />
          <div className="mt-4 rounded-[12px] bg-fg/[0.04] px-5 py-4">
            <h4 className="text-[13px] font-extrabold text-text-primary">Tips for best results</h4>
            <ul className="mt-2 space-y-1 text-[13px] font-medium leading-relaxed text-text-secondary">
              <li>• Use a high-quality image with a clean background</li>
              <li>• Ensure the accessory is well-lit and clearly visible</li>
              <li>• Avoid blurry or low-resolution images</li>
            </ul>
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'scene') {
      return (
        <div className="w-full max-w-[680px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Describe your background scene (Optional)</h3>
          <div className="rounded-[12px] border border-border bg-bg-card overflow-hidden">
            <textarea value={scenePrompt} onChange={(event) => setScenePrompt(event.target.value)} placeholder="e.g. A sunlit minimalist loft with concrete floors and large windows, warm golden-hour lighting..." className="h-[140px] w-full resize-none bg-transparent px-4 py-4 text-[14px] font-medium leading-relaxed text-text-primary placeholder:text-text-dim outline-none" />
            <div className="flex flex-wrap gap-2 border-t border-border px-3 py-3">
              {BACKGROUND_SCENES.map((scene) => (
                <button key={scene} onClick={() => setSelectedScene(scene)} className={`h-8 rounded-full px-4 text-[13px] font-bold transition ${selectedScene === scene ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-accent/10'}`}>{scene}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'aspect') {
      return (
        <div className="w-full max-w-[672px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Select aspect ratio</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {DIMENSIONS.map((dimension) => {
              const selected = selectedAspectRatio === dimension
              return (
                <button key={dimension} onClick={() => setSelectedAspectRatio(dimension)} className={`h-[88px] rounded-[10px] border bg-bg-card flex flex-col items-center justify-center gap-1.5 px-2 py-2 transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
                  <span className="relative w-8 h-8 flex items-center justify-center">
                    <span className="absolute inset-0 border border-dashed border-accent/20" />
                    <span className={`${selected ? 'bg-accent border-accent' : 'bg-bg-card border-border-strong'} border-2`} style={ratioStyle(dimension)} />
                  </span>
                  <span className="text-[12px] font-extrabold">{dimension}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'clothing') {
      return (
        <div className="w-full max-w-[760px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Upload your clothing images</h3>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              {[
                { label: 'Clothing Front *', url: clothingFrontUrl, optional: false },
                { label: 'Clothing Back', optional: true, url: clothingBackUrl },
              ].map((item) => (
                <div key={item.label}>
                  <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wider text-text-muted">
                    {item.label}
                    {item.optional && <span className="ml-2 text-[10px] text-text-muted/70">(Optional)</span>}
                  </p>
                  <button className="relative h-[190px] w-full rounded-[12px] border border-dashed border-border bg-bg-card overflow-hidden flex flex-col items-center justify-end pb-3 text-text-primary hover:border-accent/70 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.label} className="absolute top-2 h-[140px] w-[200px] object-contain" />
                    <span className="relative z-10 flex items-center gap-2 text-[13px] font-extrabold"><Wand2 size={18} /> Click to change your image</span>
                  </button>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-text-muted"><CircleCheck size={16} /> Clothing Image Guidelines</p>
              <div className="rounded-[12px] bg-fg/[0.04] p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {GUIDELINE_IMAGES.map((item, index) => {
                    const isLarge = index === 0 || index === 4
                    return (
                      <div key={item.id} className={`relative rounded-[10px] overflow-hidden bg-bg-card ${isLarge ? 'row-span-2 h-[150px]' : 'h-[71px]'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.photoUrl} alt={item.id} className="absolute inset-0 h-full w-full object-cover" />
                        <span className={`absolute right-1.5 top-1.5 rounded-full ${item.status === 'good' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                          {item.status === 'good' ? <Check size={16} /> : <CircleX size={18} fill="currentColor" className="text-white" />}
                        </span>
                        {item.label && (
                          <span className="absolute inset-x-1.5 bottom-1.5 whitespace-pre-line rounded-[6px] bg-white/75 px-1.5 py-1 text-[10px] font-bold leading-snug text-zinc-900">{item.label}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    // shot (final)
    const shots = selectedType === 'accessory' ? ACCESSORY_SHOTS : FASHION_SHOTS
    const shotCount = selectedType === 'accessory' ? selectedAccessoryShots.length : selectedShots.length
    return (
      <div className="w-full max-w-[760px]">
        <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Select your shot types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shots.map((shot) => {
            const Icon = shot.icon
            const selected = selectedType === 'accessory' ? selectedAccessoryShots.includes(shot.id) : selectedShots.includes(shot.id)
            return (
              <button key={shot.id} onClick={() => (selectedType === 'accessory' ? toggleAccessoryShot(shot.id) : toggleShot(shot.id))} className={`relative min-h-[104px] rounded-[12px] border-2 bg-bg-card p-4 text-left transition-all hover:border-accent/70 ${selected ? 'border-accent bg-accent/5' : 'border-border'}`}>
                <div className="flex gap-3">
                  <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={20} /></span>
                  <div className="min-w-0 pr-6">
                    <h4 className={`text-[15px] font-extrabold ${selected ? 'text-accent' : 'text-text-primary'}`}>{shot.title}</h4>
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-text-secondary">{shot.desc}</p>
                  </div>
                </div>
                {selected && <span className="absolute right-3 top-3 text-accent"><CircleCheck size={18} /></span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4 h-12 rounded-[12px] border border-border bg-bg-card px-5 flex items-center justify-between">
          <span className="text-[13px] font-extrabold text-text-primary">{shotCount} {selectedType === 'accessory' ? 'shots' : 'shot'} selected</span>
          <span className="flex items-center gap-2 text-[13px] font-extrabold text-text-primary"><Gem size={16} fill="currentColor" /> {selectedType === 'accessory' ? shotCount * 2 : 2} tokens</span>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <button onClick={generate} disabled={generating || (selectedType === 'accessory' && selectedAccessoryShots.length === 0)} className="h-11 rounded-[10px] bg-accent px-8 text-[14px] font-extrabold text-white flex items-center gap-3 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
            {generating ? 'Génération…' : <><Sparkles size={18} /> Generate Fashion Photoshoot</>}
          </button>
          <p className="mt-4 text-[13px] font-bold text-text-secondary">Estimated time: {selectedType === 'accessory' && selectedAccessoryShots.length === 0 ? 0 : 12} seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-4 pt-2 pb-3">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
        <WizardHeader title="Shooting mode" onBack={() => router.push('/creer/image')} />

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_440px]">
          <main className="min-w-0 overflow-y-auto flex items-center justify-center px-8 py-10">
            <AnimatedStep key={stepId} phase={phase}>
              {renderCurrentStep()}
            </AnimatedStep>
          </main>

          <aside className="hidden xl:flex h-full min-h-0 flex-col overflow-y-auto border-l border-border bg-bg-surface px-6 py-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-extrabold text-text-primary">Preview</h2>
                <p className="mt-2 text-[13px] font-medium text-text-secondary">Your selected image will appear here</p>
              </div>
              <button className="h-9 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white flex items-center gap-2 shadow-neo-solid hover:brightness-105 transition shrink-0"><Wand2 size={16} /> Edit with AI</button>
            </div>

            <div className="flex-1 min-h-[340px] rounded-[14px] border border-border bg-bg-card flex flex-col items-center justify-center text-center px-8 overflow-hidden">
              {generatedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={generatedUrl} alt="Generated" className="max-h-full max-w-full object-contain" />
              ) : selectedType === 'accessory' ? (
                accessoryImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={accessoryImageUrl} alt="Accessory preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <>
                    <Watch size={48} className="mb-4 text-text-muted" strokeWidth={2} />
                    <p className="text-[13px] font-bold text-text-primary">Upload an accessory image to see preview</p>
                  </>
                )
              ) : selectedModel?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedModel.photoUrl} alt={selectedModel.label} className="max-h-full max-w-full object-contain" />
              ) : (
                <>
                  <UserRound size={48} className="mb-4 text-text-muted" strokeWidth={2} />
                  <p className="text-[13px] font-bold text-text-primary">Select a fashion model to see preview</p>
                </>
              )}
            </div>

            <div className="mt-5 rounded-[14px] border border-border bg-bg-card p-4">
              <h3 className="text-[13px] font-extrabold text-text-primary">Tips</h3>
              <ul className="mt-3 space-y-1 text-[13px] font-medium leading-relaxed text-text-secondary">
                <li>• Use AI editing to adjust lighting, background, or styling</li>
                <li>• Upload your own custom images for more control</li>
                <li>• Preview changes before generating final output</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <DevStepNav
        steps={[
          { id: 'type', label: 'Type' },
          { id: 'model', label: 'Model' },
          { id: 'scene', label: 'Scene' },
          { id: 'accessoryUpload', label: 'Accessory' },
          { id: 'aspect', label: 'Ratio' },
          { id: 'clothing', label: 'Clothing' },
          { id: 'shot', label: 'Shot' },
        ]}
        active={stepId}
        onJump={goToStep}
      />
    </div>
  )
}
