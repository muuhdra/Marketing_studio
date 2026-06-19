'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Gem, Image as ImageIcon, Info, Layers, Lightbulb, PlusCircle, Rocket, ScanLine, ShoppingCart } from 'lucide-react'
import { actionListProducts, type ProductDTO } from '@/lib/actions/products'
import { actionGenerateImage } from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { useToast } from '@/lib/stores/toastStore'
import { AnimatedStep, ContinueButton, DevStepNav, WizardHeader, ratioStyle, ratioToSize, ResultsOverlay, type AnimationPhase } from '@/components/features/creer/WizardKit'

const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const SLIDE_COUNTS = [5, 6, 7, 8]

const CAROUSEL_GOALS = [
  { id: 'showcase', title: 'Vitrine produit', desc: 'Séquence lifestyle, visuel d\'abord.', icon: ScanLine },
  { id: 'conversions', title: 'Booster les conversions', desc: 'Séquence orientée vente.', icon: ShoppingCart },
  { id: 'problem-solution', title: 'Problème / Solution', desc: 'Récit empathique reliant problème et solution.', icon: Lightbulb },
  { id: 'deep-dive', title: 'Zoom sur les atouts', desc: 'Pédagogie produit en profondeur.', icon: Layers },
  { id: 'launch', title: 'Lancement produit', desc: 'Séquence qui crée l\'engouement.', icon: Rocket },
]

type StepId = 'products' | 'images' | 'dimensions' | 'goals'

export default function CarouselCreatorPage() {
  const router = useRouter()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [selectedDimension, setSelectedDimension] = useState('9:16')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [results, setResults] = useState<{ url: string }[]>([])

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const steps: StepId[] = ['products', 'images', 'dimensions', 'goals']
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImages = selectedProducts
    .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
    .filter((item): item is { id: string; name: string; url: string } => Boolean(item.url))

  function canContinue(id: StepId) {
    if (id === 'products') return selectedProductIds.length > 0
    if (id === 'images') return selectedImageUrls.length > 0
    if (id === 'dimensions') return Boolean(selectedDimension)
    return true
  }

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
    const idx = steps.indexOf(id)
    if (idx === -1) return
    setPhase('idle')
    setCurrentStep(idx)
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

  // Génération réelle (Nano Banana) — une séquence de slides cohérente.
  async function generate() {
    if (generating || !selectedGoalId) return
    const goal = CAROUSEL_GOALS.find((item) => item.id === selectedGoalId)
    const size = ratioToSize(selectedDimension)
    const promptText = [
      'Cohesive social media carousel slide for a product.',
      goal ? `Angle: ${goal.title} — ${goal.desc}` : '',
      'Consistent style across slides, scroll-stopping, high quality.',
    ].filter(Boolean).join(' ')
    setGenerating(true)
    setResultsOpen(true)
    setResults([])
    try {
      const res = await actionGenerateImage({
        prompt: promptText,
        model: 'nano-banana',
        size,
        n: slideCount,
        ...(selectedImageUrls.length ? { imageUrl: selectedImageUrls } : {}),
      })
      const urls = res.filter((image) => image.url).map((image) => ({ url: image.url }))
      setResults(urls)
      urls.forEach((image) => persistOutput({ type: 'image', sourceUrl: image.url, title: `Carrousel · ${goal?.title ?? ''}`.trim(), engine: 'nano-banana', prompt: promptText.slice(0, 200), format: size }).catch(() => {}))
      if (urls.length) toast.success(`${urls.length} slide${urls.length > 1 ? 's' : ''} généré${urls.length > 1 ? 's' : ''}`)
      else toast.error('Aucun slide généré')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }

  function renderCurrentStep() {
    if (stepId === 'products') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Que met-on en avant aujourd&apos;hui&nbsp;?</h3>
          <p className="mt-6 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 sélectionnés</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {products.slice(0, 5).map((product) => {
              const selected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`relative text-left w-[176px] h-[164px] rounded-[14px] border bg-bg-card p-3 transition-all hover:border-accent/70 overflow-hidden ${selected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
                  <div className="absolute left-1/2 top-2 w-[88px] h-[88px] -translate-x-1/2 overflow-hidden rounded-[10px] bg-bg-surface">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : <span className="h-full w-full flex items-center justify-center text-text-faint"><ImageIcon size={28} /></span>}
                  </div>
                  <p className="absolute left-3 bottom-3 max-w-[140px] truncate text-[13px] font-semibold text-text-primary">{product.name}</p>
                  {selected && <span className="absolute left-2 top-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={15} /></span>}
                </button>
              )
            })}
            <button className="w-[176px] min-h-[164px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-3 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-9 h-9 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={18} /></span>
              <span><span className="block text-[14px] font-semibold text-text-primary">Ajouter un produit</span><span className="block text-[12px] text-text-secondary">Créer un nouveau produit</span></span>
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
            <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Choisis les images de ton carrousel</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedImageUrls.length} / 14 (max)</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Ajouter depuis la bibliothèque</span>
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
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis les dimensions de ton carrousel</h3>
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
            <ContinueButton disabled={!selectedDimension} onClick={goNext} />
          </div>
        </div>
      )
    }

    return (
      <div className="w-full max-w-[768px]">
        <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis l&apos;objectif de ton carrousel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CAROUSEL_GOALS.map(({ id, title, desc, icon: Icon }) => {
            const selected = selectedGoalId === id
            return (
              <button key={id} onClick={() => setSelectedGoalId(id)} className={`relative h-[88px] rounded-[10px] border bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5' : 'border-border'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={15} strokeWidth={2.2} /></span>
                <p className="text-[13px] font-extrabold text-text-primary leading-tight">{title}</p>
                <p className="mt-0.5 text-[11px] font-medium text-text-secondary truncate">{desc}</p>
                <span className="absolute right-2.5 bottom-2.5 text-text-secondary"><Info size={14} /></span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-[10px] border border-border bg-bg-surface p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-text-secondary mb-2">Nombre de slides</p>
          <div className="grid grid-cols-4 gap-2">
            {SLIDE_COUNTS.map((count) => {
              const selected = slideCount === count
              return (
                <button key={count} onClick={() => setSlideCount(count)} className={`h-9 rounded-[8px] text-[14px] font-extrabold transition-colors ${selected ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>{count}</button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <button onClick={generate} disabled={!selectedGoalId || generating} className="h-10 rounded-[10px] bg-accent px-6 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
            {generating ? 'Génération…' : <>Créer le carrousel <Gem size={16} fill="currentColor" /> {slideCount}</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-4 pt-2 pb-3">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
        <WizardHeader title="Créateur de carrousel" onBack={() => router.push('/creer/image')} />
        <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-8 py-10">
          <AnimatedStep key={stepId} phase={phase}>
            {renderCurrentStep()}
          </AnimatedStep>
        </main>
      </section>

      <ResultsOverlay open={resultsOpen} generating={generating} results={results} title="Ton carrousel" onClose={() => setResultsOpen(false)} />

      <DevStepNav
        steps={[
          { id: 'products', label: 'Produit' },
          { id: 'images', label: 'Images' },
          { id: 'dimensions', label: 'Dimensions' },
          { id: 'goals', label: 'Objectif' },
        ]}
        active={stepId}
        onJump={goToStep}
      />
    </div>
  )
}
