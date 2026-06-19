'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Gem,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Info,
  Megaphone,
  PlusCircle,
  Rocket,
  SearchX,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { actionListProducts, type ProductDTO } from '@/lib/actions/products'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { actionGenerateImage } from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { useToast } from '@/lib/stores/toastStore'
import { ratioToSize, ResultsOverlay } from '@/components/features/creer/WizardKit'

const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const TEMPLATE_CATEGORIES = ['Beauté & soins', 'Santé & bien-être', 'Alimentaire & snacks', 'Boissons', 'Tech & gadgets', 'Services']

type Flow = 'scratch' | 'template'
type StepId = 'choose-flow' | 'templates' | 'products' | 'images' | 'dimensions' | 'goals' | 'details'
type AnimationPhase = 'idle' | 'exit' | 'enter'

interface TemplateCard {
  id: string
  label: string
  category: string
  url: string | null
  tone: string
  headline: string
  sub: string
}

const FALLBACK_TEMPLATES: TemplateCard[] = [
  { id: 'fallback-1', label: 'Wash & Shave Cream', category: 'Beauté & soins', url: null, tone: 'from-pink-100 via-orange-100 to-stone-100', headline: '2-IN-1 WASH & SHAVE CREAM', sub: 'epzen' },
  { id: 'fallback-2', label: 'Pink Clay Mask', category: 'Beauté & soins', url: null, tone: 'from-stone-200 via-rose-100 to-amber-100', headline: 'Australias #1 Pink Clay Mask', sub: 'Detoxify & Brighten' },
  { id: 'fallback-3', label: 'Hand & Body Lotion', category: 'Beauté & soins', url: null, tone: 'from-orange-50 via-white to-blue-100', headline: 'HAND & BODY LOTION', sub: 'NATIVE' },
  { id: 'fallback-4', label: 'Black Friday Offer', category: 'Beauté & soins', url: null, tone: 'from-cyan-100 via-white to-orange-100', headline: '45% OFF EVERYTHING', sub: 'BLACK friday' },
  { id: 'fallback-5', label: 'Base Face Milk', category: 'Beauté & soins', url: null, tone: 'from-stone-200 via-orange-100 to-rose-100', headline: 'THE BASE FACE MILK', sub: 'LOGO' },
  { id: 'fallback-6', label: 'Results Skincare', category: 'Beauté & soins', url: null, tone: 'from-amber-900 via-stone-700 to-orange-200', headline: 'Results in 2-3 weeks', sub: 'BERMUDA' },
  { id: 'fallback-7', label: 'Marine Collagen Sleep Mask', category: 'Beauté & soins', url: null, tone: 'from-pink-200 via-rose-100 to-orange-100', headline: 'Pink Marine Collagen Sleep Mask', sub: 'new' },
  { id: 'fallback-8', label: 'Nomade Essence', category: 'Beauté & soins', url: null, tone: 'from-amber-50 via-stone-100 to-green-50', headline: 'DISCOVER THE ESSENCE OF NOMADE', sub: 'EMS' },
]

const GOALS = [
  { id: 'drive-sales', title: 'Drive Sales', desc: 'Action-oriented ad designed to convert.', icon: ShoppingCart },
  { id: 'stop-scroll', title: 'Stop the Scroll', desc: 'Attention-grabbing creative.', icon: Eye },
  { id: 'transformation', title: 'Transformation', desc: 'Show the benefit or problem solved.', icon: TrendingUp },
  { id: 'feature-spotlight', title: 'Feature Spotlight', desc: 'Highlight what makes it unique.', icon: Zap },
  { id: 'product-hero', title: 'Product Hero', desc: 'Premium product showcase.', icon: Star },
  { id: 'new-launch', title: 'New Launch', desc: 'Generate launch excitement.', icon: Rocket },
  { id: 'urgency-scarcity', title: 'Urgency & Scarcity', desc: 'Drive immediate action.', icon: Clock },
  { id: 'lifestyle', title: 'Lifestyle', desc: 'Sell the aspirational life.', icon: Heart },
  { id: 'social-proof', title: 'Social Proof', desc: 'Build trust with ratings and reviews.', icon: ThumbsUp },
]

const OPTIONS = [
  {
    id: 'scratch' as const,
    title: 'Create from Scratch',
    desc: 'Upload your product image and let AI generate a professional advertisement from scratch',
    icon: Sparkles,
    points: ['Upload product photo(s)', 'Describe anything specific', 'Generate up to 10 variations'],
  },
  {
    id: 'template' as const,
    title: 'Clone a Template',
    desc: 'Start with an existing template and customize it with your product',
    icon: ImageIcon,
    points: ['Upload or select templates', 'Upload product photo', 'Describe any changes'],
  },
]

function AnimatedStep({ phase, children }: { phase: AnimationPhase; children: ReactNode }) {
  // Effet « scroll » : l'étape sortante glisse vers le haut, la suivante remonte depuis le bas.
  const stateClass = phase === 'exit'
    ? 'opacity-0 -translate-y-16 duration-200'
    : phase === 'enter'
      ? 'opacity-0 translate-y-20 duration-[450ms]'
      : 'opacity-100 translate-y-0 duration-[450ms]'

  return (
    <div className={`w-full flex justify-center transition-all ease-out will-change-transform ${stateClass}`}>
      {children}
    </div>
  )
}

function ContinueButton({ disabled, onClick, children = 'Continue' }: { disabled?: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-9 rounded-[8px] bg-accent px-5 text-[14px] font-extrabold text-white inline-flex items-center gap-3 shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed"
    >
      {children} <ChevronDown size={16} />
    </button>
  )
}

export default function StaticsCreatorPage() {
  return <StepFlow />
}

function StepFlow() {
  const router = useRouter()
  const toast = useToast()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateSource, setTemplateSource] = useState<'heyoz' | 'brand'>('heyoz')
  const [templateCategory, setTemplateCategory] = useState(TEMPLATE_CATEGORIES[0])
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [selectedDimension, setSelectedDimension] = useState('9:16')
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(['stop-scroll'])
  const [visualDirection, setVisualDirection] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [selectedModel, setSelectedModel] = useState<'pro' | 'standard' | 'ultra'>('standard')
  const [variationsToGenerate, setVariationsToGenerate] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [goalsModalOpen, setGoalsModalOpen] = useState(false)
  const [includeCta, setIncludeCta] = useState(true)
  const [customHeadline, setCustomHeadline] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCard | null>(null)
  const [generating, setGenerating] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [results, setResults] = useState<{ url: string }[]>([])

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
    listTemplates().then(setTemplates).catch(() => setTemplates([]))
  }, [])

  const steps = useMemo<StepId[]>(() => {
    if (selectedFlow === 'template') return ['choose-flow', 'templates', 'products', 'images', 'dimensions', 'goals', 'details']
    if (selectedFlow === 'scratch') return ['choose-flow', 'products', 'images', 'dimensions', 'goals', 'details']
    return ['choose-flow']
  }, [selectedFlow])

  const stepId = steps[Math.min(currentStep, steps.length - 1)]
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImages = selectedProducts
    .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
    .filter((item): item is { id: string; name: string; url: string } => Boolean(item.url))

  const dbTemplateCards: TemplateCard[] = templates
    .filter((template) => template.active && template.kind === 'image')
    .map((template) => ({
      id: template.id,
      label: template.label,
      category: template.category,
      url: template.url,
      headline: template.label,
      sub: template.description ?? template.category,
      tone: 'from-zinc-100 via-white to-orange-100',
    }))
  const templateCards = dbTemplateCards.length > 0 ? dbTemplateCards : FALLBACK_TEMPLATES
  const visibleTemplates = templateSource === 'brand'
    ? templateCards.filter((template) => selectedTemplateIds.includes(template.id))
    : templateCards.filter((template) => template.category === templateCategory)
  const selectedTemplates = templateCards.filter((template) => selectedTemplateIds.includes(template.id))

  function goNext() {
    if (phase !== 'idle' || !canContinue(stepId)) return
    if (currentStep >= steps.length - 1) return
    setPhase('exit')
    window.setTimeout(() => {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
      setPhase('enter')
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPhase('idle'))
      })
    }, 210)
  }

  // [DEV] Saut direct vers n'importe quelle étape, sans validation.
  function goToStep(id: StepId) {
    let flow = selectedFlow
    if (id === 'templates') flow = 'template'
    else if (id !== 'choose-flow' && !flow) flow = 'scratch'
    const list: StepId[] = flow === 'template'
      ? ['choose-flow', 'templates', 'products', 'images', 'dimensions', 'goals', 'details']
      : ['choose-flow', 'products', 'images', 'dimensions', 'goals', 'details']
    const idx = list.indexOf(id)
    if (idx === -1) return
    setSelectedFlow(flow)
    setPhase('idle')
    setCurrentStep(idx)
  }

  // Génération réelle (Nano Banana) — une passe par objectif sélectionné.
  async function generate() {
    if (generating) return
    const goalIds = selectedGoalIds.length ? selectedGoalIds : ['stop-scroll']
    const size = ratioToSize(selectedDimension)
    const refs = [
      ...selectedImageUrls,
      ...selectedTemplates.map((template) => template.url).filter((url): url is string => Boolean(url)),
    ]
    setGenerating(true)
    setResultsOpen(true)
    setResults([])
    try {
      const all: { url: string }[] = []
      for (const goalId of goalIds) {
        const goal = GOALS.find((item) => item.id === goalId)
        const promptText = [
          'Professional static advertisement creative for a product.',
          goal ? `Goal: ${goal.title} — ${goal.desc}` : '',
          visualDirection ? `Visual direction: ${visualDirection}.` : '',
          includeCta && ctaText ? `Include a call-to-action: "${ctaText}".` : '',
          customHeadline ? `Headline: "${customHeadline}".` : '',
          'High-quality, conversion-focused social media ad, clean composition.',
        ].filter(Boolean).join(' ')
        const res = await actionGenerateImage({
          prompt: promptText,
          model: 'nano-banana',
          size,
          quality: selectedModel === 'standard' ? 'standard' : 'hd',
          n: variationsToGenerate,
          ...(refs.length ? { imageUrl: refs } : {}),
        })
        res.forEach((image) => {
          if (!image.url) return
          all.push({ url: image.url })
          persistOutput({ type: 'image', sourceUrl: image.url, title: `Pub statique · ${goal?.title ?? ''}`.trim(), engine: 'nano-banana', prompt: promptText.slice(0, 200), format: size }).catch(() => {})
        })
      }
      setResults(all)
      if (all.length) toast.success(`${all.length} visuel${all.length > 1 ? 's' : ''} généré${all.length > 1 ? 's' : ''}`)
      else toast.error('Aucun visuel généré')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }

  function canContinue(id: StepId) {
    if (id === 'choose-flow') return Boolean(selectedFlow)
    if (id === 'templates') return selectedTemplateIds.length > 0
    if (id === 'products') return selectedProductIds.length > 0
    if (id === 'images') return selectedImageUrls.length > 0
    if (id === 'goals') return selectedGoalIds.length > 0
    return true
  }

  function toggleTemplate(templateId: string) {
    setSelectedTemplateIds((current) => (
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    ))
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId)
      if (current.length >= 5) return current
      return [...current, productId]
    })
    setSelectedImageUrls([])
  }

  function toggleImage(url: string) {
    setSelectedImageUrls((current) => {
      if (current.includes(url)) return current.filter((item) => item !== url)
      if (current.length >= 14) return current
      return [...current, url]
    })
  }

  function toggleGoal(goalId: string) {
    setSelectedGoalIds((current) => (
      current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId]
    ))
  }

  function ratioStyle(ratio: string) {
    const [w, h] = ratio.split(':').map(Number)
    if (!w || !h) return { width: 40, height: 40 }
    const max = 40
    if (w >= h) return { width: max, height: Math.max(14, Math.round(max * h / w)) }
    return { width: Math.max(14, Math.round(max * w / h)), height: max }
  }

  function renderCurrentStep() {
    if (stepId === 'choose-flow') {
      return (
        <div className="w-full max-w-[768px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {OPTIONS.map(({ id, title, desc, icon: Icon, points }) => {
              const selected = selectedFlow === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedFlow(id)}
                  className={`group relative min-h-[276px] text-left rounded-[16px] border-2 bg-bg-surface p-8 transition-all hover:border-accent/60 hover:shadow-neo overflow-hidden ${selected ? 'border-accent ring-4 ring-accent/20 shadow-neo' : 'border-border'}`}
                >
                  <span className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <Icon size={32} strokeWidth={2} />
                  </span>
                  <h2 className="mt-4 font-display text-[20px] font-bold leading-7 text-text-primary">{title}</h2>
                  <p className="mt-2 text-[14px] leading-5 text-text-secondary">{desc}</p>
                  <ul className="mt-4 space-y-2">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-[14px] leading-5 text-text-secondary">
                        <span className="w-[6px] h-[6px] rounded-full bg-accent flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  {selected && (
                    <span className="absolute right-4 top-4 rounded-full bg-accent p-2 text-white shadow-neo-solid">
                      <Check size={20} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <ContinueButton disabled={!selectedFlow} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'templates') {
      return (
        <div className="w-full max-w-[768px]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Choose templates</h3>
            <button className="h-10 rounded-[10px] border border-border bg-bg-card px-5 text-[14px] font-extrabold text-text-primary shadow-sm flex items-center gap-3 hover:bg-bg-surface transition">
              <Upload size={18} /> Upload Custom
            </button>
          </div>

          <div className="mt-4 rounded-[10px] bg-fg/[0.07] p-1 grid grid-cols-2">
            <button onClick={() => setTemplateSource('heyoz')} className={`h-8 rounded-[8px] text-[13px] font-bold transition-colors ${templateSource === 'heyoz' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>HeyOz Templates</button>
            <button onClick={() => setTemplateSource('brand')} className={`h-8 rounded-[8px] text-[13px] font-bold transition-colors ${templateSource === 'brand' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Your Brand Templates</button>
          </div>

          {templateSource === 'heyoz' && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {TEMPLATE_CATEGORIES.map((category) => (
                <button key={category} onClick={() => setTemplateCategory(category)} className={`h-8 flex-shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors ${templateCategory === category ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 max-h-[250px] overflow-y-auto pr-1">
            {templateSource === 'brand' && visibleTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchX size={28} className="text-text-muted" />
                <p className="mt-3 text-[15px] font-bold text-text-primary">No brand templates yet</p>
                <p className="mt-1 text-[13px] text-text-secondary">Upload templates from the Brand Templates page</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleTemplates.map((template) => {
                const selected = selectedTemplateIds.includes(template.id)
                return (
                  <div key={template.id} onClick={() => toggleTemplate(template.id)} className={`group relative aspect-square rounded-[12px] overflow-hidden border-2 bg-bg-card cursor-pointer transition-all hover:border-accent/70 ${selected ? 'border-accent shadow-neo' : 'border-transparent'}`}>
                    {template.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={template.url} alt={template.label} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className={`absolute inset-0 bg-gradient-to-br ${template.tone}`}>
                        <span className="absolute inset-x-4 top-4 text-left text-[14px] font-extrabold leading-tight text-white drop-shadow-sm">{template.headline}</span>
                        <span className="absolute left-4 bottom-4 rounded-full bg-bg-card/70 px-3 py-1 text-[11px] font-extrabold text-text-primary">{template.sub}</span>
                      </span>
                    )}
                    <button
                      onClick={(event) => { event.stopPropagation(); setPreviewTemplate(template) }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-bg-card/90 backdrop-blur flex items-center justify-center text-text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-card"
                      aria-label="Aperçu du template"
                    >
                      <Eye size={15} />
                    </button>
                    {selected && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-neo-solid"><Check size={24} /></span>}
                  </div>
                )
              })}
            </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[14px] font-extrabold text-text-primary">Selected Templates ({selectedTemplates.length})</p>
            <ContinueButton disabled={selectedTemplateIds.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'products') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">What are we promoting today?</h3>
          <p className="mt-6 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 selected</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {products.slice(0, 5).map((product) => {
              const selected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`relative text-left w-[224px] h-[208px] rounded-[16px] border bg-bg-card p-4 transition-all hover:border-accent/70 overflow-hidden ${selected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
                  <div className="absolute left-1/2 top-1 w-[112px] h-[112px] -translate-x-1/2 overflow-hidden rounded-[12px] bg-bg-surface">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : <span className="h-full w-full flex items-center justify-center text-text-faint"><ImageIcon size={32} /></span>}
                  </div>
                  <p className="absolute left-4 bottom-4 max-w-[154px] truncate text-[14px] font-semibold text-text-primary">{product.name}</p>
                  {selected && <span className="absolute left-3 top-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={16} /></span>}
                </button>
              )
            })}
            <button className="w-[224px] min-h-[208px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-6 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span><span className="block text-[16px] font-semibold text-text-primary">Add new product</span><span className="block text-[12px] text-text-secondary">Create a new product</span></span>
            </button>
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={selectedProductIds.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'images') {
      return (
        <div className="w-full max-w-[672px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Select images for your ad</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedImageUrls.length} / 14 (max)</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Add more from library</span>
            </button>
            {productImages.map((image) => {
              const selected = selectedImageUrls.includes(image.url)
              return (
                <button key={`${image.id}-${image.url}`} onClick={() => toggleImage(image.url)} className={`relative w-[150px] h-[150px] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${selected ? 'border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className="absolute inset-0 w-full h-full object-contain" />
                  {selected && <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center"><Check size={16} /></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={selectedImageUrls.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'dimensions') {
      return (
        <div className="w-full max-w-[672px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Select the dimensions for your ad</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {DIMENSIONS.map((dimension) => {
              const selected = selectedDimension === dimension
              return (
                <button key={dimension} onClick={() => setSelectedDimension(dimension)} className={`h-[88px] rounded-[10px] border bg-bg-card flex flex-col items-center justify-center gap-1.5 px-2 py-2 transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
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

    if (stepId === 'goals') {
      return (
        <div className="w-full max-w-[672px]">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="w-5 h-5 rounded-full bg-fg/[0.07] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">4</span>
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Select your ad goals</h3>
          </div>
          <div className="mb-3 grid grid-cols-[1fr_auto] items-end">
            <p className="text-[12px] font-bold text-text-primary">Choose one or more goals for your static ad</p>
            <p className="text-[12px] font-bold text-text-primary">{selectedGoalIds.length} goal selected</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GOALS.slice(0, 5).map(({ id, title, desc, icon: Icon }) => {
              const selected = selectedGoalIds.includes(id)
              return (
                <button key={id} onClick={() => toggleGoal(id)} className={`relative h-[115px] min-h-[76px] rounded-[10px] border bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5' : 'border-border'}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={16} /></span>
                  <p className="text-[14px] font-extrabold text-text-primary leading-tight">{title}</p>
                  <p className="mt-1 text-[12px] font-medium text-text-secondary truncate">{desc}</p>
                  <span className="absolute right-3 bottom-4 text-text-secondary"><Info size={16} /></span>
                </button>
              )
            })}
            <button onClick={() => setGoalsModalOpen(true)} className="h-[115px] min-h-[76px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card p-3 flex flex-col items-center justify-center text-center hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-9 h-9 rounded-full bg-fg/[0.07] text-text-primary flex items-center justify-center mb-2"><Grid2X2 size={16} /></span>
              <span className="text-[14px] font-extrabold text-text-primary">View all goals</span>
              <span className="mt-1 text-[12px] font-medium text-text-secondary">Explore 4 more goals</span>
            </button>
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={selectedGoalIds.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    return (
      <div className="w-full max-w-[672px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="w-5 h-5 rounded-full bg-fg/[0.07] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">5</span>
          <h3 className="font-display text-[18px] font-extrabold text-text-primary">Add some details</h3>
        </div>

        <label className="block text-[12px] font-extrabold text-text-primary mb-2">Additional Visual Direction (Optional)</label>
        <div className="rounded-[8px] border border-border overflow-hidden bg-bg-card">
          <textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} placeholder='e.g., "Use bold typography and vibrant colors" or "Focus on minimalist design"' className="h-20 min-h-20 w-full resize-none border-0 bg-bg-card px-3 py-2 text-[14px] font-medium text-text-primary placeholder:text-text-dim focus:shadow-none" />
          <div className="h-12 border-t border-border bg-fg/[0.04] flex items-center justify-between px-3">
            <label className="flex items-center gap-3 min-w-0">
              <Megaphone size={16} className="text-text-primary" />
              <span className="text-[14px] font-extrabold text-text-primary">CTA</span>
              <input value={ctaText} onChange={(event) => setCtaText(event.target.value)} placeholder='e.g., "Shop Now"' className="min-w-0 w-[165px] h-6 border-0 border-b border-accent/70 rounded-none bg-transparent px-0 py-0 text-[12px] font-medium text-text-primary placeholder:text-text-dim focus:shadow-none" />
            </label>
            <button onClick={() => setAdvancedOpen(true)} className="flex items-center gap-3 text-[12px] font-extrabold text-text-primary hover:text-accent transition-colors">
              <Settings size={16} /> Advanced Options
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[12px] font-bold text-text-primary mb-2">Select Model</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'pro' as const, title: 'Pro', desc: 'Highest quality' },
              { id: 'standard' as const, title: 'Standard', desc: 'Fast & efficient' },
              { id: 'ultra' as const, title: 'Ultra', desc: 'GPT-image 2 · best typography', badge: 'NEW' },
            ].map((model) => {
              const selected = selectedModel === model.id
              return (
                <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`relative h-[96px] rounded-[10px] border bg-bg-card text-center flex flex-col items-center justify-center transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5' : 'border-border'}`}>
                  {model.badge && <span className="absolute -right-2 -top-2 rounded-[5px] bg-accent px-2 py-1 text-[14px] font-extrabold text-white">{model.badge}</span>}
                  <p className="text-[16px] font-extrabold text-text-primary">{model.title}</p>
                  <p className="mt-2 text-[12px] font-medium text-text-secondary">{model.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[12px] border border-border bg-bg-surface p-3">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_1.2fr] items-center gap-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-text-secondary mb-3">Variations to generate</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 4, 6].map((value) => (
                  <button key={value} onClick={() => setVariationsToGenerate(value)} className={`h-10 rounded-[10px] text-[16px] font-extrabold transition-colors ${variationsToGenerate === value ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <p className="self-center text-[14px] font-medium text-text-primary">{variationsToGenerate} variation per goal</p>
            <div>
              <p className="mb-3 text-center text-[14px] font-extrabold text-text-primary">Total Goals: {selectedGoalIds.length}</p>
              <button onClick={generate} disabled={generating} className="h-10 w-full rounded-[8px] bg-accent px-6 text-[14px] font-extrabold text-white flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                {generating ? 'Génération…' : <>Create ({variationsToGenerate * Math.max(1, selectedGoalIds.length)}) Ad <Gem size={18} fill="currentColor" /> {variationsToGenerate * Math.max(1, selectedGoalIds.length)}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-4 pt-2 pb-3">
      {/* Section principale unifiée : header intégré + contenu, un seul panneau plein écran */}
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
        <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
          <button onClick={() => router.push('/creer/image')} className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <span className="w-px h-7 bg-border" />
          <h1 className="font-display text-[20px] font-extrabold tracking-tight text-text-primary">Statics Creator</h1>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-8 py-10">
          <AnimatedStep key={stepId} phase={phase}>
            {renderCurrentStep()}
          </AnimatedStep>
        </main>
      </section>

      {/* [DEV] Navigation libre entre toutes les étapes (à retirer en prod) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 rounded-full border border-border bg-bg-card/95 backdrop-blur px-2 py-1.5 shadow-neo-lg">
        <span className="px-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">Dev</span>
        {([
          { id: 'choose-flow', label: 'Flow' },
          { id: 'templates', label: 'Templates' },
          { id: 'products', label: 'Products' },
          { id: 'images', label: 'Images' },
          { id: 'dimensions', label: 'Dimensions' },
          { id: 'goals', label: 'Goals' },
          { id: 'details', label: 'Details' },
        ] as { id: StepId; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => goToStep(id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${stepId === id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-fg/[0.06]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {goalsModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/75 flex items-center justify-center p-6 animate-fade-in" onClick={() => setGoalsModalOpen(false)}>
          <div className="w-full max-w-[720px] rounded-[16px] bg-bg-card shadow-neo-lg px-6 py-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-display text-[18px] font-extrabold text-text-primary">Select Ad Goals</h2>
                <p className="mt-1 text-[13px] font-medium text-text-secondary">Choose one or more advertising goals. Multiple selections will create variations for each goal.</p>
              </div>
              <button onClick={() => setGoalsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {GOALS.map(({ id, title, desc, icon: Icon }) => {
                const selected = selectedGoalIds.includes(id)
                return (
                  <button key={id} onClick={() => toggleGoal(id)} className={`relative h-[100px] rounded-[12px] border-2 bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={16} /></span>
                    <p className="text-[13px] font-extrabold text-text-primary leading-tight">{title}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-text-secondary truncate">{desc}</p>
                    <span className="absolute right-3 bottom-3 text-text-secondary"><Info size={15} /></span>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setGoalsModalOpen(false)} className="h-10 rounded-[10px] border border-border bg-bg-card px-5 text-[13px] font-extrabold text-text-primary shadow-sm hover:bg-bg-surface transition">Cancel</button>
              <button onClick={() => setGoalsModalOpen(false)} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-sm hover:brightness-105 transition">Done ({selectedGoalIds.length} selected)</button>
            </div>
          </div>
        </div>
      )}

      {advancedOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/75 flex items-center justify-center p-6 animate-fade-in" onClick={() => setAdvancedOpen(false)}>
          <div className="w-full max-w-[460px] rounded-[16px] bg-bg-card shadow-neo-lg px-6 py-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-display text-[18px] font-extrabold text-text-primary">Advanced Options</h2>
                <p className="mt-1 text-[13px] font-medium text-text-secondary">Fine-tune your ad generation settings</p>
              </div>
              <button onClick={() => setAdvancedOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-[14px] font-extrabold text-text-primary">Include call-to-action</p>
              <button onClick={() => setIncludeCta((value) => !value)} className={`relative h-6 w-11 rounded-full transition-colors ${includeCta ? 'bg-accent' : 'bg-fg/[0.12]'}`} aria-pressed={includeCta}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-bg-card shadow-sm transition-transform ${includeCta ? 'translate-x-[23px]' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="mt-5">
              <label className="block text-[14px] font-extrabold text-text-primary mb-2">Call-to-action text</label>
              <input value={ctaText} onChange={(event) => setCtaText(event.target.value)} placeholder="Shop Now" className="h-10 w-full rounded-[10px] border border-border bg-bg-card px-4 text-[14px] font-medium text-text-primary placeholder:text-text-dim focus:border-accent focus:shadow-none" />
            </div>
            <div className="mt-5">
              <label className="block text-[14px] font-extrabold text-text-primary mb-2">Custom headline (optional)</label>
              <textarea value={customHeadline} onChange={(event) => setCustomHeadline(event.target.value)} placeholder="Leave empty to auto-generate" className="min-h-[84px] w-full resize-y rounded-[10px] border border-border bg-bg-card px-4 py-3 text-[14px] font-medium text-text-primary placeholder:text-text-dim focus:border-accent focus:shadow-none" />
              <p className="mt-2 text-[12px] font-medium text-text-secondary">Override the default headline for your ad</p>
            </div>
            <div className="mt-7 flex justify-end">
              <button onClick={() => setAdvancedOpen(false)} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white hover:brightness-105 transition">Done</button>
            </div>
          </div>
        </div>
      )}

      <ResultsOverlay open={resultsOpen} generating={generating} results={results} title="Tes pubs statiques" onClose={() => setResultsOpen(false)} />

      {previewTemplate && (
        <div className="fixed inset-0 z-[1300] bg-black/75 flex items-center justify-center p-6 animate-fade-in" onClick={() => setPreviewTemplate(null)}>
          <div className="w-full max-w-[420px] rounded-[16px] bg-bg-card shadow-neo-lg overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="relative aspect-square w-full bg-bg-surface">
              {previewTemplate.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewTemplate.url} alt={previewTemplate.label} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className={`absolute inset-0 bg-gradient-to-br ${previewTemplate.tone}`}>
                  <span className="absolute inset-x-6 top-6 text-left text-[22px] font-extrabold leading-tight text-white drop-shadow-sm">{previewTemplate.headline}</span>
                  <span className="absolute left-6 bottom-6 rounded-full bg-bg-card/70 px-3 py-1 text-[12px] font-extrabold text-text-primary">{previewTemplate.sub}</span>
                </span>
              )}
              <button onClick={() => setPreviewTemplate(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-card/90 backdrop-blur flex items-center justify-center text-text-primary shadow-sm hover:bg-bg-card transition-colors" aria-label="Fermer"><X size={18} /></button>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-text-primary truncate">{previewTemplate.label}</p>
                <p className="text-[12px] font-medium text-text-secondary truncate">{previewTemplate.category}</p>
              </div>
              <button
                onClick={() => toggleTemplate(previewTemplate.id)}
                className={`h-9 shrink-0 rounded-[10px] px-4 text-[13px] font-extrabold transition ${selectedTemplateIds.includes(previewTemplate.id) ? 'bg-accent text-white hover:brightness-105' : 'border border-border bg-bg-card text-text-primary hover:bg-bg-surface'}`}
              >
                {selectedTemplateIds.includes(previewTemplate.id) ? 'Selected ✓' : 'Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
