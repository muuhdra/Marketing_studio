'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Download, Gem, Image as ImageIcon, Info, Layers, Lightbulb, Maximize2, PlusCircle, Rocket, ScanLine, ShoppingCart, Sparkles, Wand2, X } from 'lucide-react'
import { actionListProducts, actionUploadProductImage, actionCreateProduct, actionDeleteProduct, type ProductDTO } from '@/lib/actions/products'
import { actionGenerateImage, actionDescribeProductScene } from '@/lib/actions/ai'
import { actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { persistOutput } from '@/lib/actions/outputs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { BackButton, ContinueButton, DevStepNav, MainPanel, PageShell, WizardHeader, ratioStyle, ratioToSize, StepSlider } from '@/components/features/creer/WizardKit'

// Nano Banana ne produit que 3 tailles → on n'expose que les 3 formats réels.
const DIMENSIONS: { ratio: string; label: string }[] = [
  { ratio: '9:16', label: 'Portrait' },
  { ratio: '1:1', label: 'Carré' },
  { ratio: '16:9', label: 'Paysage' },
]
const SLIDE_COUNTS = [5, 6, 7, 8]

const CAROUSEL_GOALS = [
  { id: 'showcase', title: 'Vitrine produit', desc: 'Séquence lifestyle, visuel d\'abord.', icon: ScanLine, details: 'Une suite de slides lifestyle, le visuel avant tout : ambiance, mises en situation et angles produit qui donnent envie. Idéal pour l\'image de marque et la découverte.' },
  { id: 'conversions', title: 'Booster les conversions', desc: 'Séquence orientée vente.', icon: ShoppingCart, details: 'Storytelling orienté vente : accroche, bénéfices, preuve, offre et appel à l\'action sur les derniers slides. Pensé pour transformer.' },
  { id: 'problem-solution', title: 'Problème / Solution', desc: 'Récit empathique reliant problème et solution.', icon: Lightbulb, details: 'Pose le problème de ton audience sur les premiers slides puis déroule ta solution étape par étape. Récit empathique qui crée l\'adhésion.' },
  { id: 'deep-dive', title: 'Zoom sur les atouts', desc: 'Pédagogie produit en profondeur.', icon: Layers, details: 'Décompose ton produit fonctionnalité par fonctionnalité, un atout par slide. Parfait pour les produits techniques ou à forte valeur.' },
  { id: 'launch', title: 'Lancement produit', desc: 'Séquence qui crée l\'engouement.', icon: Rocket, details: 'Crée l\'attente autour d\'une nouveauté : teasing, révélation, bénéfices clés et date de lancement. Ton événementiel.' },
]

type StepId = 'products' | 'images' | 'dimensions' | 'goals'

export default function CarouselCreatorPage() {
  const router = useRouter()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [selectedDimension, setSelectedDimension] = useState('9:16')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<{ url: string }[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [extraImages, setExtraImages] = useState<{ id: string; name: string; url: string }[]>([])
  const [openGoalInfo, setOpenGoalInfo] = useState<string | null>(null)

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  // Popover descriptif (i) des objectifs : ferme au clic en dehors (le (i) et le popover stoppent la propagation).
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

  // « Ajouter un produit » : importe une image, crée le produit et le sélectionne.
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

  // « Ajouter depuis la bibliothèque » : importe une image et l'ajoute à la sélection.
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

  const steps: StepId[] = ['products', 'images', 'dimensions', 'goals']
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImages = [
    ...selectedProducts
      .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
      .filter((item): item is { id: string; name: string; url: string } => Boolean(item.url)),
    ...extraImages,
  ]

  function canContinue(id: StepId) {
    if (id === 'products') return selectedProductIds.length > 0
    if (id === 'images') return selectedImageUrls.length > 0
    if (id === 'dimensions') return Boolean(selectedDimension)
    return true
  }

  function goNext() {
    if (!canContinue(stepId)) return
    if (currentStep >= steps.length - 1) return
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  // [DEV] Saut direct vers n'importe quelle étape, sans validation.
  function goToStep(id: StepId) {
    const idx = steps.indexOf(id)
    if (idx === -1) return
    setCurrentStep(idx)
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

  // Génération réelle (Nano Banana) — une séquence de slides cohérente, fidèle au produit.
  async function generate() {
    if (generating || !selectedGoalId) return
    const goal = CAROUSEL_GOALS.find((item) => item.id === selectedGoalId)
    const size = ratioToSize(selectedDimension)
    setGenerating(true)
    setActiveSlide(0)
    setResults([])
    try {
      // Analyse vision du produit → identité + décor cohérent ; on ancre sur l'image de référence.
      const productImg = selectedImageUrls[0]
      const scene = productImg ? await actionDescribeProductScene({ imageUrl: productImg }).catch(() => null) : null
      const product = scene?.product ?? 'the product'
      const background = scene?.background ?? 'a styled environment that matches the product'
      const fidelity = 'CRITICAL: reproduce the EXACT product shown in the reference image — identical shape, colors, text, logo, label and proportions. Do not redesign, replace or invent a different product. Keep it perfectly recognizable.'
      const promptText = [
        `Cohesive social media carousel slide featuring the product shown in the reference image${product && product !== 'the product' ? ` (${product})` : ''}.`,
        fidelity,
        goal ? `Angle: ${goal.title} — ${goal.details}.` : '',
        `Setting / style: ${background}.`,
        'Consistent style across slides, scroll-stopping, photorealistic, high quality, no text, no watermark.',
      ].filter(Boolean).join(' ')
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

  function renderStep(id: StepId) {
    if (id === 'products') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Que met-on en avant aujourd&apos;hui&nbsp;?</h3>
          <p className="mt-6 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 sélectionné{selectedProductIds.length > 1 ? 's' : ''} · {products.length} produit{products.length > 1 ? 's' : ''}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {products.map((product) => {
              const selected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`group relative text-left w-[176px] h-[164px] rounded-[14px] border bg-bg-card p-3 transition-all hover:border-accent/70 overflow-hidden ${selected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
                  <span role="button" tabIndex={-1} aria-label="Supprimer le produit" title="Supprimer le produit" onClick={(event) => { event.stopPropagation(); deleteProduct(product.id) }} className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"><X size={14} strokeWidth={2.5} /></span>
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
            <button onClick={addNewProduct} disabled={busy} className="w-[176px] min-h-[164px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-3 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              <span className="w-9 h-9 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={18} /></span>
              <span><span className="block text-[14px] font-semibold text-text-primary">Ajouter un produit</span><span className="block text-[12px] text-text-secondary">Importer une image produit</span></span>
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
            <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Choisis les images de ton carrousel</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedImageUrls.length} / 14 (max)</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={uploadLibraryImage} disabled={busy} className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Importer une image</span>
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
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis les dimensions de ton carrousel</h3>
          <div className="mx-auto grid max-w-[420px] grid-cols-3 gap-3">
            {DIMENSIONS.map(({ ratio, label }) => {
              const selected = selectedDimension === ratio
              return (
                <button key={ratio} onClick={() => setSelectedDimension(ratio)} className={`h-[112px] rounded-[12px] border bg-bg-card flex flex-col items-center justify-center gap-2 px-2 py-3 transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
                  <span className="relative w-10 h-10 flex items-center justify-center">
                    <span className="absolute inset-0 border border-dashed border-accent/20" />
                    <span className={`${selected ? 'bg-accent border-accent' : 'bg-bg-card border-border-strong'} border-2`} style={ratioStyle(ratio)} />
                  </span>
                  <span className="text-[13px] font-extrabold leading-none">{label}</span>
                  <span className="text-[11px] font-semibold text-text-secondary leading-none">{ratio}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={!selectedDimension} onClick={goNext} />
          </div>
        </div>
      )
    }

    return (
      <div className="w-full max-w-[768px]">
        <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis l&apos;objectif de ton carrousel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CAROUSEL_GOALS.map(({ id, title, desc, details, icon: Icon }) => {
            const selected = selectedGoalId === id
            return (
              <button key={id} onClick={() => setSelectedGoalId(id)} className={`relative h-[88px] rounded-[10px] border bg-bg-surface p-3 text-left transition-all hover:border-accent/70 ${selected ? 'border-2 border-accent bg-accent/5' : 'border-border'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${selected ? 'bg-accent/10 text-accent' : 'bg-fg/[0.07] text-text-primary'}`}><Icon size={15} strokeWidth={2.2} /></span>
                <p className="text-[13px] font-extrabold text-text-primary leading-tight">{title}</p>
                <p className="mt-0.5 pr-7 text-[11px] font-medium text-text-secondary truncate">{desc}</p>
                {selected && <span className="absolute right-2.5 top-2.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={13} /></span>}
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

        <div className="mx-auto mt-4 max-w-[420px] rounded-[10px] border border-border bg-bg-surface p-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-text-secondary mb-1.5">Nombre de slides</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SLIDE_COUNTS.map((count) => {
              const selected = slideCount === count
              return (
                <button key={count} onClick={() => setSlideCount(count)} className={`h-8 rounded-[8px] text-[13px] font-extrabold transition-colors ${selected ? 'bg-accent text-white' : 'bg-fg/[0.07] text-text-primary hover:bg-fg/[0.12]'}`}>{count}</button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <BackButton onClick={goBack} />
          <button onClick={generate} disabled={!selectedGoalId || generating} className="h-10 rounded-[10px] bg-accent px-6 text-[14px] font-extrabold text-white inline-flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
            {generating ? 'Génération…' : <>Créer le carrousel <Gem size={16} fill="currentColor" /> {slideCount}</>}
          </button>
        </div>
      </div>
    )
  }

  const previewImages = results.length ? results.map((r) => r.url) : selectedImageUrls
  const activeUrl = previewImages[Math.min(activeSlide, Math.max(0, previewImages.length - 1))] ?? ''
  const hasResults = results.length > 0

  return (
    <PageShell>
      <MainPanel>
        <WizardHeader title="Créateur de carrousel" onBack={() => router.push('/creer/image')} />

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_340px]">
          <main className="min-w-0 min-h-0">
            <StepSlider index={Math.min(currentStep, steps.length - 1)}>
              {steps.map((id) => renderStep(id))}
            </StepSlider>
          </main>

          <aside className="hidden xl:flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-bg-surface px-5 py-5">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-text-primary">Aperçu</h2>
                <p className="mt-1 truncate text-[12px] font-medium text-text-secondary">{hasResults ? `${results.length} slide${results.length > 1 ? 's' : ''} généré${results.length > 1 ? 's' : ''}` : 'Tes slides apparaîtront ici'}</p>
              </div>
              <button onClick={generate} disabled={generating || !selectedGoalId} className="h-8 rounded-[10px] bg-accent px-3 text-[12px] font-extrabold text-white flex items-center gap-1.5 shadow-neo-solid hover:brightness-105 transition shrink-0 disabled:opacity-55 disabled:cursor-not-allowed"><Wand2 size={14} /> {hasResults ? 'Re-générer' : 'Générer'}</button>
            </div>

            <div className="relative mt-4 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[13px] border border-border bg-bg-card px-5 text-center [background-image:radial-gradient(circle_at_50%_28%,rgba(255,92,40,0.07),transparent_70%)]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-bg-surface/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary shadow-sm backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${hasResults ? 'bg-green-600' : generating ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
                {hasResults ? `Slide ${Math.min(activeSlide + 1, results.length)}/${results.length}` : generating ? 'En cours' : 'Aperçu'} · {selectedDimension}
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
                    <img src={activeUrl} alt="Aperçu slide" className="max-h-full max-w-full rounded-[8px] object-contain shadow-neo-sm transition group-hover:brightness-95" />
                    {hasResults && <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"><span className="rounded-full bg-black/55 p-2 text-white"><Maximize2 size={18} /></span></span>}
                  </button>
                  {hasResults && (
                    <a href={activeUrl} download target="_blank" rel="noreferrer" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
                  )}
                </>
              ) : (
                <div className="relative z-10">
                  <ImageIcon size={42} className="mx-auto mb-3 text-text-muted" strokeWidth={2} />
                  <p className="text-[13px] font-bold text-text-primary">Sélectionne des images et un objectif</p>
                </div>
              )}
            </div>

            {/* Miniatures des slides */}
            {previewImages.length > 1 && (
              <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
                {previewImages.map((url, index) => (
                  <button key={`${url}-${index}`} onClick={() => setActiveSlide(index)} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[9px] border-2 transition ${index === activeSlide ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Slide ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 shrink-0 rounded-[14px] border border-border bg-bg-card p-3.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-text-primary"><Sparkles size={13} className="text-accent" /> Astuces</h3>
              <ul className="mt-2 space-y-1 text-[12px] font-medium leading-relaxed text-text-secondary">
                <li>• Garde un style cohérent sur tous les slides</li>
                <li>• Importe tes propres images pour plus de contrôle</li>
                <li>• Clique un slide pour l’agrandir et le télécharger</li>
              </ul>
            </div>
          </aside>
        </div>
      </MainPanel>

      {lightboxOpen && activeUrl && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeUrl} alt="Slide" onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
          <a href={activeUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
        </div>
      )}

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
    </PageShell>
  )
}
