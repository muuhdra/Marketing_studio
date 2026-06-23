'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Images,
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
import { actionListProducts, actionUploadProductImage, actionCreateProduct, actionDeleteProduct, type ProductDTO } from '@/lib/actions/products'
import { actionListBrandTemplates, actionUploadBrandTemplate, type BrandTemplateDTO } from '@/lib/actions/brand-templates'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { TEMPLATE_CATEGORIES } from '@/lib/templates/library'
import { useBrand } from '@/lib/stores/brandStore'
import { actionGenerateImage, actionDescribeProductScene } from '@/lib/actions/ai'
import { actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { actionListBrandAssets, type BrandAssetDTO } from '@/lib/actions/brand-assets'
import { persistOutput } from '@/lib/actions/outputs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { MainPanel, PageShell, ratioToSize, ResultsOverlay, StepSlider } from '@/components/features/creer/WizardKit'

const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']

type Flow = 'scratch' | 'template'
type StepId = 'choose-flow' | 'templates' | 'products' | 'images' | 'dimensions' | 'goals' | 'details'

interface TemplateCard {
  id: string
  label: string
  category: string
  url: string | null
  tone: string
  headline: string
  sub: string
}

const GOALS = [
  { id: 'drive-sales', title: 'Drive Sales', desc: 'Action-oriented ad designed to convert.', icon: ShoppingCart, details: 'Pousse à l\'achat immédiat : offre claire, prix mis en avant et appel à l\'action fort. Idéal pour les promos, le déstockage et le retargeting.' },
  { id: 'stop-scroll', title: 'Stop the Scroll', desc: 'Attention-grabbing creative.', icon: Eye, details: 'Visuel choc pensé pour arrêter le pouce dans le feed : contraste élevé, accroche forte, aucun temps mort. Parfait pour la notoriété et le haut de tunnel.' },
  { id: 'transformation', title: 'Transformation', desc: 'Show the benefit or problem solved.', icon: TrendingUp, details: 'Montre l\'avant / après ou le problème résolu par ton produit. Démontre le bénéfice concret de façon visuelle et mémorable.' },
  { id: 'feature-spotlight', title: 'Feature Spotlight', desc: 'Highlight what makes it unique.', icon: Zap, details: 'Met en avant une fonctionnalité ou un atout différenciant précis, avec un visuel qui le rend évident en un coup d\'œil.' },
  { id: 'product-hero', title: 'Product Hero', desc: 'Premium product showcase.', icon: Star, details: 'Sublime ton produit en héros de l\'image : éclairage premium, cadrage soigné, fond épuré. Idéal pour une marque haut de gamme.' },
  { id: 'new-launch', title: 'New Launch', desc: 'Generate launch excitement.', icon: Rocket, details: 'Crée l\'attente et l\'engouement autour d\'un nouveau produit ou d\'une nouveauté, avec un ton événementiel.' },
  { id: 'urgency-scarcity', title: 'Urgency & Scarcity', desc: 'Drive immediate action.', icon: Clock, details: 'Joue sur le temps limité ou le stock restreint (offre flash, édition limitée) pour déclencher une action immédiate.' },
  { id: 'lifestyle', title: 'Lifestyle', desc: 'Sell the aspirational life.', icon: Heart, details: 'Vend le style de vie aspirationnel associé au produit plutôt que le produit seul : mise en situation, ambiance, émotion.' },
  { id: 'social-proof', title: 'Social Proof', desc: 'Build trust with ratings and reviews.', icon: ThumbsUp, details: 'Renforce la confiance avec des notes, avis et témoignages clients mis en valeur visuellement. Lève les objections d\'achat.' },
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 rounded-[8px] bg-fg/[0.08] px-4 text-[14px] font-extrabold text-text-primary inline-flex items-center gap-2 hover:bg-fg/[0.12] transition"
    >
      <ChevronDown size={16} className="rotate-90" /> Retour
    </button>
  )
}

export default function StaticsCreatorPage() {
  return <StepFlow />
}

function StepFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateSource, setTemplateSource] = useState<'heyoz' | 'brand'>('heyoz')
  const [templateCategory, setTemplateCategory] = useState(TEMPLATE_CATEGORIES[0])
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [selectedDimension, setSelectedDimension] = useState('9:16')
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(['stop-scroll'])
  const [visualDirection, setVisualDirection] = useState('')
  // Structure d'inspiration issue d'un template sélectionné (Templates → « Utiliser »).
  const [templateStructure, setTemplateStructure] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [variationsToGenerate, setVariationsToGenerate] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [goalsModalOpen, setGoalsModalOpen] = useState(false)
  const [goalsSnapshot, setGoalsSnapshot] = useState<string[]>([])
  const [openGoalInfo, setOpenGoalInfo] = useState<string | null>(null)
  const [includeCta, setIncludeCta] = useState(true)
  const [customHeadline, setCustomHeadline] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCard | null>(null)
  const [generating, setGenerating] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [results, setResults] = useState<{ url: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<TemplateCard[]>([])
  const [extraImages, setExtraImages] = useState<{ id: string; name: string; url: string }[]>([])
  const [brandAssets, setBrandAssets] = useState<BrandAssetDTO[]>([])
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [brandTemplates, setBrandTemplates] = useState<BrandTemplateDTO[]>([])
  const [systemTemplates, setSystemTemplates] = useState<TemplateDTO[]>([])
  const brand = useBrand()
  const activeSysIds = brand.activeSystemTemplateIds

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
    actionListBrandTemplates().then(setBrandTemplates).catch(() => setBrandTemplates([]))
    listTemplates().then((list) => setSystemTemplates(list.filter((t) => t.kind === 'image'))).catch(() => setSystemTemplates([]))
    actionListBrandAssets().then((a) => setBrandAssets(a.filter((x) => x.type === 'image' && x.url))).catch(() => setBrandAssets([]))
  }, [])

  // Handoff depuis Production (?from=production&prompt=…&product=…) ou Templates
  // (?from=template&templatePrompt=… → structure d'inspiration adaptée au produit).
  useEffect(() => {
    if (!['production','template'].includes(searchParams.get('from') ?? '')) return
    const prompt = searchParams.get('prompt')
    const product = searchParams.get('product')
    const tpl = searchParams.get('templatePrompt')
    if (tpl) setTemplateStructure(tpl)
    if (prompt) setVisualDirection(prompt)
    if (product) setSelectedProductIds([product])
    setSelectedFlow('scratch')   // flux direct (sans template) : on entre dans le wizard
    setCurrentStep(1)            // étape « products » du flux scratch
    toast.info(tpl ? 'Template appliqué — sa structure inspirera la création autour de ton produit' : 'Pré-rempli')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Popover descriptif (i) des goals : ferme au clic en dehors (le (i) et le popover stoppent la propagation).
  useEffect(() => {
    if (!openGoalInfo) return
    const close = () => setOpenGoalInfo(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openGoalInfo])

  // Sélecteur de fichier image → renvoie le File choisi.
  function pickImage(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = 'image/*'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })
  }

  // Upload Custom (étape templates).
  // Onglet « brand » → persiste un vrai brand template (table brand_templates).
  // Onglet « Système » → template de session (non persisté), juste pour cette génération.
  async function uploadCustomTemplate() {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    try {
      if (templateSource === 'brand') {
        const fd = new FormData(); fd.append('file', file)
        const dto = await actionUploadBrandTemplate(fd)
        const list = await actionListBrandTemplates()
        setBrandTemplates(list)
        setSelectedTemplateIds((ids) => [...ids, `brand-${dto.id}`])
        toast.success('Brand template importé ✓')
      } else {
        const { url } = await actionUploadTempImage(await fileToDataUrl(file))
        if (!url) throw new Error('Upload échoué')
        const card: TemplateCard = { id: `custom-${Date.now()}`, label: file.name.replace(/\.[^.]+$/, ''), category: templateCategory, url, tone: 'from-zinc-100 via-white to-orange-100', headline: file.name, sub: 'Custom' }
        setCustomTemplates((list) => [card, ...list])
        setSelectedTemplateIds((ids) => [...ids, card.id])
        toast.success('Template importé ✓')
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur upload') }
    finally { setBusy(false) }
  }

  // Add more from library (étape images) : importe une image et l'ajoute à la sélection.
  async function uploadLibraryImage() {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      if (!url) throw new Error('Upload échoué')
      setExtraImages((list) => [{ id: `img-${Date.now()}`, name: file.name, url }, ...list])
      setSelectedImageUrls((urls) => urls.includes(url) ? urls : [...urls, url])
      toast.success('Image ajoutée ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur upload') }
    finally { setBusy(false) }
  }

  // Add new product (étape products) : importe une image, crée le produit et le sélectionne.
  async function addNewProduct() {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { path } = await actionUploadProductImage(fd)
      const name = file.name.replace(/\.[^.]+$/, '') || 'Nouveau produit'
      await actionCreateProduct({ name, description: null, currency: 'USD', price: null, benefits: [], imagePath: path, additionalPaths: [], sourceUrl: null })
      const list = await actionListProducts()
      setProducts(list)
      const created = list.find((product) => product.name === name)
      if (created) toggleProduct(created.id)
      toast.success('Produit créé ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur création') }
    finally { setBusy(false) }
  }

  const steps = useMemo<StepId[]>(() => {
    if (selectedFlow === 'template') return ['choose-flow', 'templates', 'products', 'images', 'dimensions', 'goals', 'details']
    if (selectedFlow === 'scratch') return ['choose-flow', 'products', 'images', 'dimensions', 'goals', 'details']
    return ['choose-flow']
  }, [selectedFlow])

  const stepId = steps[Math.min(currentStep, steps.length - 1)]
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImages = [
    ...selectedProducts
      .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
      .filter((item): item is { id: string; name: string; url: string } => Boolean(item.url)),
    ...extraImages,
  ]

  // Curation : on propose les templates « actifs » sélectionnés dans Brand → Templates.
  // Fallback : si la marque n'a rien curé, on montre tout le catalogue (pas d'écran vide).
  // Système (catalogue volumineux) → on ne montre que les templates sélectionnés (sinon tout).
  const curatedSystem = activeSysIds.length ? systemTemplates.filter((t) => activeSysIds.includes(t.id)) : systemTemplates
  // Brand (peu nombreux, tous à l'utilisateur) → on montre tout mais les actifs d'abord (priorité).
  const curatedBrand = [...brandTemplates].sort((a, b) => Number(b.active) - Number(a.active))
  // Templates système (table content_templates, kind=image) → cartes.
  const baseCards: TemplateCard[] = curatedSystem.map((template) => ({
    id: `sys-${template.id}`,
    label: template.label,
    category: template.category,
    url: template.url,
    tone: 'from-zinc-100 via-white to-orange-100',
    headline: template.label,
    sub: template.category,
  }))
  // Catégories dérivées des templates réels (fallback sur les verticales si la base est vide).
  const dbCategories = Array.from(new Set(baseCards.map((card) => card.category)))
  const categories = dbCategories.length ? dbCategories : TEMPLATE_CATEGORIES
  const activeCategory = categories.includes(templateCategory) ? templateCategory : categories[0]
  // Brand templates de l'utilisateur (table brand_templates) → cartes.
  const brandCards: TemplateCard[] = curatedBrand.map((template) => ({
    id: `brand-${template.id}`,
    label: template.name,
    category: 'Brand',
    url: template.url,
    tone: 'from-zinc-100 via-white to-orange-100',
    headline: template.name,
    sub: 'Brand',
  }))
  const templateCards = [...customTemplates, ...brandCards, ...baseCards]
  const visibleTemplates = templateSource === 'brand'
    ? brandCards
    : [...customTemplates, ...baseCards.filter((template) => template.category === activeCategory)]
  const selectedTemplates = templateCards.filter((template) => selectedTemplateIds.includes(template.id))

  function goNext() {
    if (!canContinue(stepId)) return
    if (currentStep >= steps.length - 1) return
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  // Choix du flow → sélection + avance automatique (comme Shooting Mode/Produit/Carrousel).
  // On fixe l'index directement car `steps` (useMemo) n'est recalculé qu'au prochain rendu.
  function chooseFlow(flow: Flow) {
    setSelectedFlow(flow)
    setCurrentStep(1)
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
      // Analyse vision du produit → identité + décor ; on ancre sur l'image de référence.
      const productImg = selectedImageUrls[0]
      const scene = productImg ? await actionDescribeProductScene({ imageUrl: productImg }).catch(() => null) : null
      const product = scene?.product ?? 'the product'
      const hasTemplate = selectedTemplates.some((t) => t.url)
      const fidelity = 'CRITICAL: reproduce the EXACT product shown in the reference image — identical shape, colors, text, logo, label and proportions. Do not redesign, replace or invent a different product. Keep it perfectly recognizable.'
      // Contexte de marque (Profil) → toutes les générations respectent l'ADN/ton/audience.
      const brandCtx = [
        brand.name ? `Brand: ${brand.name}` : '',
        brand.communicationTone ? `tone ${brand.communicationTone}` : '',
        brand.targetAudience ? `audience: ${brand.targetAudience}` : '',
        brand.preferredWords.length ? `emphasize: ${brand.preferredWords.slice(0, 6).join(', ')}` : '',
        brand.wordsToAvoid.length ? `avoid: ${brand.wordsToAvoid.slice(0, 6).join(', ')}` : '',
      ].filter(Boolean).join(' · ')
      const all: { url: string }[] = []
      for (const goalId of goalIds) {
        const goal = GOALS.find((item) => item.id === goalId)
        const promptText = [
          productImg
            ? `Professional static advertisement creative featuring the product shown in the reference image${product && product !== 'the product' ? ` (${product})` : ''}.`
            : 'Professional static advertisement creative for a product.',
          productImg ? fidelity : '',
          hasTemplate ? 'Use the provided template image only as layout and style inspiration (composition, mood) — keep the product faithful.' : '',
          goal ? `Goal: ${goal.title} — ${goal.details}.` : '',
          scene?.background ? `Setting / style: ${scene.background}.` : '',
          templateStructure ? `Reference structure (from a proven template) — follow its composition, layout, framing, color treatment and overall style, but feature OUR product faithfully and never copy the original subject, brand or text: """${templateStructure}""".` : '',
          visualDirection ? `Visual direction: ${visualDirection}.` : '',
          brandCtx ? `On-brand context — ${brandCtx}.` : '',
          includeCta && ctaText ? `Include a call-to-action: "${ctaText}".` : '',
          customHeadline ? `Headline: "${customHeadline}".` : '',
          'High-quality, conversion-focused social media ad, clean composition, photorealistic.',
        ].filter(Boolean).join(' ')
        const res = await actionGenerateImage({
          prompt: promptText,
          model: 'nano-banana',
          size,
          quality: 'standard',
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
    if (!selectedProductIds.includes(productId) && selectedProductIds.length >= 5) {
      toast.error('Maximum 5 produits')
      return
    }
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
    setSelectedImageUrls([])
  }

  async function deleteProduct(id: string) {
    if (busy) return
    setBusy(true)
    try {
      await actionDeleteProduct(id)
      setSelectedProductIds((ids) => ids.filter((x) => x !== id))
      setProducts(await actionListProducts())
      toast.success('Produit supprimé')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible') }
    finally { setBusy(false) }
  }

  function toggleImage(url: string) {
    if (!selectedImageUrls.includes(url) && selectedImageUrls.length >= 14) {
      toast.error('Maximum 14 images')
      return
    }
    setSelectedImageUrls((current) => current.includes(url)
      ? current.filter((item) => item !== url)
      : [...current, url])
  }

  function openGoalsModal() { setGoalsSnapshot(selectedGoalIds); setOpenGoalInfo(null); setGoalsModalOpen(true) }
  function cancelGoalsModal() { setSelectedGoalIds(goalsSnapshot); setOpenGoalInfo(null); setGoalsModalOpen(false) }

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

  function renderStep(id: StepId) {
    if (id === 'choose-flow') {
      return (
        <div className="w-full max-w-[768px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {OPTIONS.map(({ id, title, desc, icon: Icon, points }) => {
              const selected = selectedFlow === id
              return (
                <button
                  key={id}
                  onClick={() => chooseFlow(id)}
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
        </div>
      )
    }

    if (id === 'templates') {
      return (
        <div className="w-full max-w-[768px] self-start">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[16px] font-extrabold text-text-primary">Choose templates</h3>
            <button onClick={uploadCustomTemplate} disabled={busy} className="h-8 rounded-[9px] border border-border bg-bg-card px-3 text-[12px] font-extrabold text-text-primary shadow-sm flex items-center gap-1.5 hover:bg-bg-surface transition disabled:opacity-55 disabled:cursor-not-allowed">
              <Upload size={14} /> Upload Custom
            </button>
          </div>

          <div className="mt-3 rounded-[9px] bg-fg/[0.07] p-0.5 grid grid-cols-2">
            <button onClick={() => setTemplateSource('heyoz')} className={`h-7 rounded-[7px] text-[12px] font-bold transition-colors ${templateSource === 'heyoz' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Templates Système</button>
            <button onClick={() => setTemplateSource('brand')} className={`h-7 rounded-[7px] text-[12px] font-bold transition-colors ${templateSource === 'brand' ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Your Brand Templates</button>
          </div>

          {templateSource === 'heyoz' && (
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1.5">
              {categories.map((category) => (
                <button key={category} onClick={() => setTemplateCategory(category)} className={`h-7 flex-shrink-0 rounded-full px-3 text-[12px] font-bold transition-colors ${activeCategory === category ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>
                  {category}
                </button>
              ))}
            </div>
          )}

          <p className="mt-2.5 text-[11px] font-semibold text-text-secondary">
            {visibleTemplates.length} template{visibleTemplates.length > 1 ? 's' : ''}
            {templateSource === 'heyoz' ? ` · ${activeCategory}` : ' · Brand'}
          </p>

          <div className="mt-2.5 max-h-[360px] overflow-y-auto pr-1">
            {visibleTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchX size={28} className="text-text-muted" />
                <p className="mt-3 text-[15px] font-bold text-text-primary">
                  {templateSource === 'brand' ? 'No brand templates yet' : 'Aucun template dans cette catégorie'}
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {templateSource === 'brand' ? 'Use « Upload Custom » to add your first brand template' : 'Ajoute des templates image depuis l’admin /templates, ou importe-en un.'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleTemplates.map((template) => {
                const selected = selectedTemplateIds.includes(template.id)
                return (
                  <div key={template.id} onClick={() => toggleTemplate(template.id)} className={`group relative aspect-square rounded-[12px] overflow-hidden border-2 bg-bg-card cursor-pointer transition-all hover:border-accent/70 ${selected ? 'border-accent shadow-neo' : 'border-transparent'}`}>
                    {template.url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={template.url} alt={template.label} className="absolute inset-0 h-full w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/65 to-transparent" />
                        <span className="absolute inset-x-2.5 bottom-2 line-clamp-2 text-left text-[11px] font-bold leading-tight text-white drop-shadow">{template.label}</span>
                      </>
                    ) : (
                      <span className={`absolute inset-0 bg-gradient-to-br ${template.tone}`}>
                        <span className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/35 to-transparent" />
                        <span className="absolute inset-x-3 top-3 text-left text-[13px] font-extrabold leading-tight text-white drop-shadow">{template.headline}</span>
                        <span className="absolute left-3 bottom-3 rounded-full bg-bg-card/85 px-2.5 py-1 text-[11px] font-extrabold text-text-primary">{template.sub}</span>
                      </span>
                    )}
                    <button
                      onClick={(event) => { event.stopPropagation(); setPreviewTemplate(template) }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-bg-card/90 backdrop-blur flex items-center justify-center text-text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-card"
                      aria-label="Aperçu du template"
                    >
                      <Eye size={15} />
                    </button>
                    {selected && <span className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-neo-solid"><Check size={14} strokeWidth={3} /></span>}
                  </div>
                )
              })}
            </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[14px] font-extrabold text-text-primary">Selected Templates ({selectedTemplates.length})</p>
            <div className="flex items-center gap-3">
              {currentStep > 0 && <BackButton onClick={goBack} />}
              <ContinueButton disabled={selectedTemplateIds.length === 0} onClick={goNext} />
            </div>
          </div>
        </div>
      )
    }

    if (id === 'products') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">What are we promoting today?</h3>
          <p className="mt-5 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 selected</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {products.map((product) => {
              const selected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`group relative text-left w-[176px] h-[164px] rounded-[14px] border bg-bg-card p-3 transition-all hover:border-accent/70 overflow-hidden ${selected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
                  <span role="button" tabIndex={-1} aria-label="Supprimer le produit" title="Supprimer le produit" onClick={(event) => { event.stopPropagation(); deleteProduct(product.id) }} className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"><X size={14} strokeWidth={2.5} /></span>
                  <div className="absolute left-1/2 top-1 w-[92px] h-[92px] -translate-x-1/2 overflow-hidden rounded-[11px] bg-bg-surface">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : <span className="h-full w-full flex items-center justify-center text-text-faint"><ImageIcon size={26} /></span>}
                  </div>
                  <p className="absolute left-3 bottom-3 max-w-[120px] truncate text-[13px] font-semibold text-text-primary">{product.name}</p>
                  {selected && <span className="absolute left-2.5 top-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={13} strokeWidth={3} /></span>}
                </button>
              )
            })}
            <button onClick={addNewProduct} disabled={busy} className="w-[176px] min-h-[164px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-2.5 px-4 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              <span className="w-9 h-9 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={18} /></span>
              <span><span className="block text-[14px] font-semibold text-text-primary">Add new product</span><span className="block text-[11px] text-text-secondary">Importer une image produit</span></span>
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={selectedProductIds.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'images') {
      return (
        <div className="w-full max-w-[672px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Select images for your ad</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedImageUrls.length} / 14 (max)</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={uploadLibraryImage} disabled={busy} className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Importer une image</span>
            </button>
            <button onClick={() => setAssetPickerOpen(true)} className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><Images size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Depuis mes Assets</span>
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
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={selectedImageUrls.length === 0} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'dimensions') {
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
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'goals') {
      // Les objectifs sélectionnés (y compris via la modale « View all ») remontent en tête,
      // pour rester visibles dans la grille inline de 5.
      const inlineGoals = [
        ...GOALS.filter((goal) => selectedGoalIds.includes(goal.id)),
        ...GOALS.filter((goal) => !selectedGoalIds.includes(goal.id)),
      ].slice(0, 5)
      const moreCount = Math.max(0, GOALS.length - inlineGoals.length)
      return (
        <div className="w-full max-w-[672px]">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="w-5 h-5 rounded-full bg-fg/[0.07] text-text-secondary flex items-center justify-center text-[12px] font-extrabold">4</span>
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Select your ad goals</h3>
          </div>
          <div className="mb-3 grid grid-cols-[1fr_auto] items-end">
            <p className="text-[12px] font-bold text-text-primary">Choose one or more goals for your static ad</p>
            <p className="text-[12px] font-bold text-text-primary">{selectedGoalIds.length} goal{selectedGoalIds.length !== 1 ? 's' : ''} selected</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inlineGoals.map(({ id, title, desc, details, icon: Icon }) => {
              const selected = selectedGoalIds.includes(id)
              return (
                <button key={id} onClick={() => toggleGoal(id)} className={`relative h-[115px] min-h-[76px] rounded-[10px] border bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5' : 'border-border'}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={16} /></span>
                  <p className="text-[14px] font-extrabold text-text-primary leading-tight">{title}</p>
                  <p className="mt-1 pr-7 text-[12px] font-medium text-text-secondary truncate">{desc}</p>
                  {selected && <span className="absolute right-3 top-3 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={13} /></span>}
                  <span className="absolute right-2.5 bottom-3">
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={openGoalInfo === id ? 'Masquer la description' : 'Voir la description'}
                      onClick={(event) => { event.stopPropagation(); setOpenGoalInfo((current) => current === id ? null : id) }}
                      className={`grid h-6 w-6 cursor-pointer place-items-center rounded-full transition-colors ${openGoalInfo === id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-fg/[0.08] hover:text-accent'}`}
                    >
                      <Info size={15} />
                    </span>
                    {openGoalInfo === id && (
                      <span onClick={(event) => event.stopPropagation()} className="absolute bottom-full right-0 mb-2 z-30 block w-[200px] cursor-default rounded-[10px] border border-border bg-bg-card p-3 text-left text-[12px] font-medium leading-relaxed text-text-secondary shadow-neo-lg">
                        <span className="mb-1 block text-[12px] font-extrabold text-text-primary">{title}</span>
                        {details}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
            <button onClick={openGoalsModal} className="h-[115px] min-h-[76px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card p-3 flex flex-col items-center justify-center text-center hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-9 h-9 rounded-full bg-fg/[0.07] text-text-primary flex items-center justify-center mb-2"><Grid2X2 size={16} /></span>
              <span className="text-[14px] font-extrabold text-text-primary">View all goals</span>
              <span className="mt-1 text-[12px] font-medium text-text-secondary">{moreCount > 0 ? `Explore ${moreCount} more goal${moreCount > 1 ? 's' : ''}` : 'Browse all goals'}</span>
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
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
          <textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} placeholder='e.g., "Use bold typography and vibrant colors" or "Focus on minimalist design"' className="h-20 min-h-20 w-full resize-none border-0 bg-bg-card px-3 py-2 text-[14px] font-medium text-text-primary placeholder:text-text-dim outline-none focus:shadow-none focus:ring-0" />
          <div className="h-12 border-t border-border bg-fg/[0.04] flex items-center justify-between px-3">
            <label className="flex items-center gap-3 min-w-0">
              <Megaphone size={16} className="text-text-primary" />
              <span className="text-[14px] font-extrabold text-text-primary">CTA</span>
              <input value={ctaText} onChange={(event) => { setCtaText(event.target.value); if (event.target.value.trim()) setIncludeCta(true) }} placeholder='e.g., "Shop Now"' className="min-w-0 w-[165px] h-6 border-0 border-b border-accent/70 rounded-none bg-transparent px-0 py-0 text-[12px] font-medium text-text-primary placeholder:text-text-dim outline-none focus:shadow-none focus:ring-0" />
            </label>
            <button onClick={() => setAdvancedOpen(true)} className="flex items-center gap-3 text-[12px] font-extrabold text-text-primary hover:text-accent transition-colors">
              <Settings size={16} /> Advanced Options
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[12px] border border-border bg-bg-surface p-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_150px_1.2fr] items-center gap-4">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-text-secondary mb-2">Variations to generate</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 4, 6].map((value) => (
                  <button key={value} onClick={() => setVariationsToGenerate(value)} className={`h-8 rounded-[8px] text-[14px] font-extrabold transition-colors ${variationsToGenerate === value ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <p className="self-center text-[12px] font-medium text-text-primary">{variationsToGenerate} variation{variationsToGenerate > 1 ? 's' : ''} per goal</p>
            <div>
              <p className="mb-2 text-center text-[12px] font-extrabold text-text-primary">Total Goals: {selectedGoalIds.length}</p>
              <button onClick={generate} disabled={generating} className="h-9 w-full rounded-[8px] bg-accent px-5 text-[13px] font-extrabold text-white flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                {generating ? 'Génération…' : <>Create ({variationsToGenerate * Math.max(1, selectedGoalIds.length)}) Ad <Gem size={15} fill="currentColor" /> {variationsToGenerate * Math.max(1, selectedGoalIds.length)}</>}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <BackButton onClick={goBack} />
        </div>
      </div>
    )
  }

  return (
    <PageShell>
      <MainPanel>
        <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
          <button onClick={() => router.push('/creer/image')} className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <span className="w-px h-7 bg-border" />
          <h1 className="font-display text-[20px] font-extrabold tracking-tight text-text-primary">Statics Creator</h1>
        </header>

        <main className="flex-1 min-h-0">
          <StepSlider index={Math.min(currentStep, steps.length - 1)}>
            {steps.map((id) => renderStep(id))}
          </StepSlider>
        </main>
      </MainPanel>

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
        <div className="fixed inset-0 z-[1200] bg-black/75 flex items-center justify-center p-6 animate-fade-in" onClick={cancelGoalsModal}>
          <div className="w-full max-w-[720px] rounded-[16px] bg-bg-card shadow-neo-lg px-6 py-6" onClick={(event) => { event.stopPropagation(); setOpenGoalInfo(null) }}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-display text-[18px] font-extrabold text-text-primary">Select Ad Goals</h2>
                <p className="mt-1 text-[13px] font-medium text-text-secondary">Choose one or more advertising goals. Multiple selections will create variations for each goal.</p>
              </div>
              <button onClick={cancelGoalsModal} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {GOALS.map(({ id, title, desc, details, icon: Icon }) => {
                const selected = selectedGoalIds.includes(id)
                return (
                  <button key={id} onClick={() => toggleGoal(id)} className={`relative h-[100px] rounded-[12px] border-2 bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={16} /></span>
                    <p className="text-[13px] font-extrabold text-text-primary leading-tight">{title}</p>
                    <p className="mt-0.5 pr-7 text-[11px] font-medium text-text-secondary truncate">{desc}</p>
                    {selected && <span className="absolute right-3 top-3 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={13} /></span>}
                    <span className="absolute right-2.5 bottom-2.5">
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={openGoalInfo === id ? 'Masquer la description' : 'Voir la description'}
                        onClick={(event) => { event.stopPropagation(); setOpenGoalInfo((current) => current === id ? null : id) }}
                        className={`grid h-6 w-6 cursor-pointer place-items-center rounded-full transition-colors ${openGoalInfo === id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-fg/[0.08] hover:text-accent'}`}
                      >
                        <Info size={14} />
                      </span>
                      {openGoalInfo === id && (
                        <span onClick={(event) => event.stopPropagation()} className="absolute bottom-full right-0 mb-2 z-30 block w-[200px] cursor-default rounded-[10px] border border-border bg-bg-card p-3 text-left text-[12px] font-medium leading-relaxed text-text-secondary shadow-neo-lg">
                          <span className="mb-1 block text-[12px] font-extrabold text-text-primary">{title}</span>
                          {details}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={cancelGoalsModal} className="h-10 rounded-[10px] border border-border bg-bg-card px-5 text-[13px] font-extrabold text-text-primary shadow-sm hover:bg-bg-surface transition">Cancel</button>
              <button onClick={() => setGoalsModalOpen(false)} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed" disabled={selectedGoalIds.length === 0}>Done ({selectedGoalIds.length} selected)</button>
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
              <button onClick={() => setIncludeCta((value) => !value)} role="switch" aria-checked={includeCta} className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${includeCta ? 'bg-accent' : 'bg-fg/[0.15]'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${includeCta ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className={`mt-5 transition-opacity ${includeCta ? '' : 'opacity-50'}`}>
              <label className="block text-[14px] font-extrabold text-text-primary mb-2">Call-to-action text</label>
              <input value={ctaText} onChange={(event) => setCtaText(event.target.value)} disabled={!includeCta} placeholder="Shop Now" className="h-10 w-full rounded-[10px] border border-border bg-bg-card px-4 text-[14px] font-medium text-text-primary placeholder:text-text-dim outline-none focus:border-accent focus:shadow-none focus:ring-0 disabled:cursor-not-allowed" />
            </div>
            <div className="mt-5">
              <label className="block text-[14px] font-extrabold text-text-primary mb-2">Custom headline (optional)</label>
              <textarea value={customHeadline} onChange={(event) => setCustomHeadline(event.target.value)} placeholder="Leave empty to auto-generate" className="min-h-[84px] w-full resize-y rounded-[10px] border border-border bg-bg-card px-4 py-3 text-[14px] font-medium text-text-primary placeholder:text-text-dim outline-none focus:border-accent focus:shadow-none focus:ring-0" />
              <p className="mt-2 text-[12px] font-medium text-text-secondary">Override the default headline for your ad</p>
            </div>
            <div className="mt-7 flex justify-end">
              <button onClick={() => setAdvancedOpen(false)} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white hover:brightness-105 transition">Done</button>
            </div>
          </div>
        </div>
      )}

      <ResultsOverlay open={resultsOpen} generating={generating} results={results} title="Tes pubs statiques" onClose={() => setResultsOpen(false)} />

      {/* Sélecteur : utiliser un asset de marque comme référence */}
      {assetPickerOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 p-6 animate-fade-in" onClick={() => setAssetPickerOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-neo-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[15px] font-extrabold tracking-tight text-text-primary">Mes Assets (images)</h2>
              <button type="button" onClick={() => setAssetPickerOpen(false)} className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"><X size={16} strokeWidth={2.3} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {brandAssets.length === 0 ? (
                <p className="py-12 text-center text-[13px] font-medium text-text-secondary">Aucune image dans tes Assets. Ajoute-en dans Brand → Assets.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {brandAssets.map((a) => {
                    const sel = a.url ? selectedImageUrls.includes(a.url) : false
                    return (
                      <button key={a.id} type="button" onClick={() => a.url && toggleImage(a.url)} className={`group relative aspect-square overflow-hidden rounded-[10px] border-2 bg-fg/[0.04] transition-all ${sel ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-accent/50'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {a.url && <img src={a.url} alt={a.name} className="h-full w-full object-cover" />}
                        {sel && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white"><Check size={12} strokeWidth={3} /></span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-[12px] font-semibold text-text-muted">{selectedImageUrls.length} sélectionnée(s)</span>
              <button type="button" onClick={() => setAssetPickerOpen(false)} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105">Terminé</button>
            </div>
          </div>
        </div>
      )}

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
    </PageShell>
  )
}
