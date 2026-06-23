'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Check, Download, Gem, Hand, Image as ImageIcon, Images, Maximize2, PlusCircle, Sparkles, Upload, UserCircle, UserRound, Wand2, X } from 'lucide-react'
import { actionListProducts, actionUploadProductImage, actionCreateProduct, actionDeleteProduct, type ProductDTO } from '@/lib/actions/products'
import { actionListAvatarsForPicker, actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { actionListProductModels, actionGenerateProductModel, actionUploadProductModel, type ProductModelDTO } from '@/lib/actions/product-models'
import { MODEL_NATIONALITIES, MODEL_BODY_TYPES, MODEL_SKIN_TONES, nationalityFlag } from '@/lib/fashion/model-traits'
import { actionGenerateImage, actionDescribeProductScene } from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { useBrand } from '@/lib/stores/brandStore'
import { AssetPickerModal } from '@/components/features/creer/AssetPicker'
import { BackButton, ContinueButton, DevStepNav, MainPanel, PageShell, WizardHeader, ratioStyle, ratioToSize, StepSlider } from '@/components/features/creer/WizardKit'

// Nano Banana ne produit que 3 tailles → on n'expose que les 3 formats réels.
const DIMENSIONS: { ratio: string; label: string }[] = [
  { ratio: '9:16', label: 'Portrait' },
  { ratio: '1:1', label: 'Carré' },
  { ratio: '16:9', label: 'Paysage' },
]
const ACTOR_CATEGORIES = ['BEAUTÉ', 'MODE', 'ALIMENTAIRE', 'GADGETS', 'COMPLÉMENTS', 'JOUETS']

const PHOTOSHOOT_TYPES = [
  { id: 'showcase', title: 'Vitrine produit', desc: 'Crée des shootings produit professionnels', icon: Box, points: ['Choisis un produit', 'Importe des images', 'Obtiens un shooting pro'] },
  { id: 'holding', title: 'Produit en main', desc: 'Génère des images d’avatars ou de mains tenant ton produit naturellement', icon: Hand, points: ['Choisis un acteur ou un gros plan de main', 'Positionne ton produit', 'Rendu réaliste généré par IA'] },
]

const HOLDING_STYLES = [
  { id: 'actor', title: 'Tenu par un acteur', desc: 'Plan d’un avatar tenant ton produit (buste ou corps entier)', icon: UserCircle, points: ['Choisis parmi des avatars variés', 'Positionne le produit librement', 'Idéal pour les gros produits'] },
  { id: 'hand', title: 'Tenu par une main', desc: 'Gros plan d’une main tenant ton produit naturellement', icon: Hand, points: ['Choisis un gros plan de main', 'Positionne le produit précisément', 'Idéal pour les petits produits'] },
]

const PLACEMENTS = [
  { id: 'auto', label: 'Auto', pos: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', prompt: 'naturally positioned by the pose, wherever it best showcases the product' },
  { id: 'center', label: 'Centre', pos: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', prompt: 'centered in the frame' },
  { id: 'left', label: 'Gauche', pos: 'left-[24%] top-1/2 -translate-x-1/2 -translate-y-1/2', prompt: 'on the left side of the frame' },
  { id: 'right', label: 'Droite', pos: 'left-[76%] top-1/2 -translate-x-1/2 -translate-y-1/2', prompt: 'on the right side of the frame' },
  { id: 'top', label: 'Haut', pos: 'left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2', prompt: 'raised up high' },
  { id: 'bottom', label: 'Bas', pos: 'left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2', prompt: 'held low in the frame' },
]

type StepId = 'type' | 'product' | 'productImage' | 'aspect' | 'holdingStyle' | 'actor' | 'hand' | 'position'

function buildSteps(type: string | null, style: string): StepId[] {
  if (type === 'showcase') return ['type', 'product', 'productImage', 'aspect']
  if (type === 'holding') {
    if (style === 'actor') return ['type', 'holdingStyle', 'actor', 'position']
    if (style === 'hand') return ['type', 'holdingStyle', 'hand', 'position']
    return ['type', 'holdingStyle']
  }
  return ['type']
}

export default function ProductPhotoshootPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Lien campagne = point d'entrée : ON depuis Production, OFF en création libre (dashboard).
  const [useBrandCtx] = useState(searchParams.get('from') === 'production')
  const toast = useToast()
  const brand = useBrand()
  const actorProductInputRef = useRef<HTMLInputElement | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedHoldingStyle, setSelectedHoldingStyle] = useState('')
  const [actorSource, setActorSource] = useState<'heyoz' | 'mine'>('heyoz')
  const [actorCategory, setActorCategory] = useState(ACTOR_CATEGORIES[0])
  const [actorGender, setActorGender] = useState('All')
  const [actorNationality, setActorNationality] = useState('All')
  const [actorBodyType, setActorBodyType] = useState('All')
  const [handGender, setHandGender] = useState('All')
  const [handSkin, setHandSkin] = useState('All')
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')
  const [selectedHandUrl, setSelectedHandUrl] = useState('')
  const [actorProductImageUrl, setActorProductImageUrl] = useState('')
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16')
  const [previewSubtitle, setPreviewSubtitle] = useState('Ton image sélectionnée apparaîtra ici')
  const [productModels, setProductModels] = useState<ProductModelDTO[]>([])
  const [busy, setBusy] = useState(false)
  const [generatingModel, setGeneratingModel] = useState(false)
  const [extraProductImages, setExtraProductImages] = useState<{ id: string; name: string; url: string }[]>([])
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)

  function pickProductAsset(url: string) {
    setExtraProductImages((list) => list.some((x) => x.url === url) ? list : [{ id: `asset-${url}`, name: 'Asset', url }, ...list])
    setSelectedProductImageUrl(url)
    setActorProductImageUrl(url)
  }
  const [productPlacement, setProductPlacement] = useState('auto')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
    actionListAvatarsForPicker().then(setAvatars).catch(() => setAvatars([]))
    actionListProductModels().then(setProductModels).catch(() => setProductModels([]))
  }, [])

  // Handoff depuis Production (?from=production&product=…) → pré-sélectionne le produit.
  useEffect(() => {
    if (!['production','template'].includes(searchParams.get('from') ?? '')) return
    const product = searchParams.get('product')
    if (product) setSelectedProductIds([product])
    toast.info('Pré-rempli')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sélecteur de fichier image.
  function pickImage(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'; input.accept = 'image/*'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })
  }
  async function reloadProductModels() {
    try { setProductModels(await actionListProductModels()) } catch { /* vide */ }
  }
  // Génère un acteur (catégorie courante) ou une main, persisté, puis le sélectionne.
  async function generateProductModel(kind: 'actor' | 'hand') {
    if (generatingModel) return
    setGeneratingModel(true)
    try {
      const dto = await actionGenerateProductModel({
        kind,
        category: kind === 'actor' ? actorCategory : null,
        ...(kind === 'actor'
          ? { gender: actorGender, nationality: actorNationality, bodyType: actorBodyType }
          : { gender: handGender, skinTone: handSkin }),
      })
      await reloadProductModels()
      if (dto.url) { if (kind === 'actor') setSelectedAvatarUrl(dto.url); else setSelectedHandUrl(dto.url) }
      toast.success(kind === 'actor' ? 'Acteur généré ✓' : 'Main générée ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Échec de la génération') }
    finally { setGeneratingModel(false) }
  }
  // Importe un acteur/main custom (persisté).
  async function uploadProductModel(kind: 'actor' | 'hand') {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('kind', kind)
      if (kind === 'actor') fd.append('category', actorCategory)
      const dto = await actionUploadProductModel(fd)
      await reloadProductModels()
      // L'import atterrit dans le catalogue Système (product_models) → on bascule la source pour le voir.
      if (dto.url) { if (kind === 'actor') { setSelectedAvatarUrl(dto.url); setActorSource('heyoz') } else setSelectedHandUrl(dto.url) }
      toast.success('Importé ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur upload') }
    finally { setBusy(false) }
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
  // « Ajouter depuis la bibliothèque » (étape image produit) : importe une image et la sélectionne.
  async function uploadProductLibraryImage() {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      if (!url) throw new Error('Upload échoué')
      setExtraProductImages((list) => [{ id: `img-${Date.now()}`, name: file.name, url }, ...list])
      setSelectedProductImageUrl(url)
      setPreviewSubtitle('Ton image sélectionnée apparaîtra ici')
      toast.success('Image ajoutée ✓')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur upload') }
    finally { setBusy(false) }
  }

  const steps = buildSteps(selectedType, selectedHoldingStyle)
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  const selectedTypeMeta = PHOTOSHOOT_TYPES.find((type) => type.id === selectedType)
  const SelectedIcon = selectedTypeMeta?.icon
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImageOptions = [
    ...selectedProducts
      .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
      .filter((image): image is { id: string; name: string; url: string } => Boolean(image.url)),
    ...extraProductImages,
  ]
  const previewProduct = productImageOptions.find((image) => image.url === selectedProductImageUrl)
  // Sur l'étape « Image produit », si une seule image est disponible, la pré-sélectionner (évite un clic).
  const singleProductImageUrl = productImageOptions.length === 1 ? productImageOptions[0].url : null
  useEffect(() => {
    if (stepId === 'productImage' && !selectedProductImageUrl && singleProductImageUrl) {
      setSelectedProductImageUrl(singleProductImageUrl)
    }
  }, [stepId, selectedProductImageUrl, singleProductImageUrl])
  // Acteurs : Mes acteurs (avatars) ou catalogue généré (product_models kind=actor) filtré par catégorie.
  const actorOptions = actorSource === 'mine'
    ? avatars.filter((avatar) => avatar.photoUrl).map((avatar) => ({ id: avatar.id, name: avatar.name, photoUrl: avatar.photoUrl as string }))
    : productModels
        .filter((model) => model.kind === 'actor' && model.category === actorCategory && model.url)
        .map((model) => ({
          id: model.id,
          name: `${model.nationality ?? actorCategory} ${nationalityFlag(model.nationality)}`.trim(),
          photoUrl: model.url as string,
        }))
  // Mains : catalogue généré (product_models kind=hand).
  const handOptions = productModels.filter((model) => model.kind === 'hand' && model.url).map((model) => ({ id: model.id, name: 'Main', photoUrl: model.url as string }))
  const selectedAvatar = actorOptions.find((avatar) => avatar.photoUrl === selectedAvatarUrl)
  const selectedHand = handOptions.find((hand) => hand.photoUrl === selectedHandUrl)
  const previewEmptyText = selectedProductIds.length > 0 || selectedType === 'showcase'
    ? 'Choisis une image produit pour l’aperçu'
    : selectedHoldingStyle === 'actor'
      ? 'Choisis un avatar pour l’aperçu'
      : selectedHoldingStyle === 'hand'
        ? 'Choisis une main pour l’aperçu'
        : 'Fais une sélection pour l’aperçu'

  function canContinue(id: StepId) {
    if (id === 'product') return selectedProductIds.length > 0
    if (id === 'productImage') return Boolean(selectedProductImageUrl)
    if (id === 'actor') return Boolean(selectedAvatarUrl)
    if (id === 'hand') return Boolean(selectedHandUrl)
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
      setSelectedHoldingStyle('')
      setPreviewSubtitle('Ton image sélectionnée apparaîtra ici')
    })
  }

  function chooseStyle(id: string) {
    transitionTo(2, () => {
      setSelectedHoldingStyle(id)
      if (id === 'actor') setSelectedHandUrl(''); else setSelectedAvatarUrl('')
      setPreviewSubtitle('Ton image sélectionnée apparaîtra ici')
    })
  }

  // [DEV] Saut direct vers n'importe quelle étape, sans validation.
  function goToStep(id: StepId) {
    let type = selectedType
    let style = selectedHoldingStyle
    if (id === 'product' || id === 'productImage' || id === 'aspect') type = 'showcase'
    else if (id === 'holdingStyle') type = 'holding'
    else if (id === 'actor') { type = 'holding'; style = 'actor' }
    else if (id === 'hand') { type = 'holding'; style = 'hand' }
    else if (id === 'position') { type = 'holding'; if (style !== 'hand') style = 'actor' }
    const list = buildSteps(type, style)
    const idx = list.indexOf(id)
    if (idx < 0) return
    setSelectedType(type)
    setSelectedHoldingStyle(style)
    setCurrentStep(idx)
  }

  async function handleActorProductUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const { url } = await actionUploadTempImage(dataUrl)
      setActorProductImageUrl(url)
      toast.success('Image produit ajoutée ✓')
    } catch {
      toast.error('Échec de l\'upload de l\'image')
    }
  }

  // Génération réelle (Nano Banana) — rendu affiché dans le panneau d'aperçu.
  async function generate() {
    if (generating) return
    const size = ratioToSize(selectedAspectRatio)
    const productImg = selectedType === 'showcase' ? selectedProductImageUrl : actorProductImageUrl
    setGenerating(true)
    try {
      // Analyse vision du produit → décor cohérent avec le produit (au lieu d'un fond générique/fake).
      setPreviewSubtitle('Analyse du produit…')
      const scene = productImg ? await actionDescribeProductScene({ imageUrl: productImg }).catch(() => null) : null
      const product = scene?.product ?? 'the product'
      const background = scene?.background ?? 'a styled environment that matches the product'
      const holding = scene?.holding ?? 'naturally holding the product toward the camera'
      const styling = scene?.styling ?? 'styled to suit the product'
      let refs: string[] = []
      let promptText = ''
      // Fidélité produit : on ANCRE sur l'image de référence, sans réinventer le produit.
      const fidelity = 'CRITICAL: reproduce the EXACT product shown in the reference image — identical shape, colors, text, logo, label and proportions. Do not redesign, replace or invent a different product. Keep it perfectly recognizable.'
      if (selectedType === 'showcase') {
        refs = [selectedProductImageUrl].filter(Boolean)
        promptText = `Professional lifestyle product photograph of the product shown in the reference image${product && product !== 'the product' ? ` (${product})` : ''}. ${fidelity} Place it naturally in this setting: ${background}. Soft commercial lighting matched to the scene, marketing-ready, photorealistic, high quality, no text, no watermark.`
      } else {
        // L'image produit en PREMIER (référence dominante), puis l'acteur/main.
        refs = [actorProductImageUrl, selectedHoldingStyle === 'hand' ? selectedHandUrl : selectedAvatarUrl].filter(Boolean)
        const placement = PLACEMENTS.find((p) => p.id === productPlacement)
        const holder = selectedHoldingStyle === 'hand'
          ? 'the same hand from the hand reference image'
          : 'the same person (face, identity and features) from the model reference image'
        promptText = `Realistic lifestyle advertising photo: ${holder} naturally holding the EXACT product from the product reference image. ${fidelity} ${holding}. Product ${placement?.prompt ?? 'centered in the frame'}, the product is the clear hero — prominently presented toward the camera, fully visible, unobstructed, sharp focus, fingers not covering it.${selectedHoldingStyle === 'hand' ? '' : ` Model styled as ${styling}.`} Setting: ${background}. Cohesive natural lighting, photorealistic, high quality, no text, no watermark.`
      }
      const brandCtx = !useBrandCtx ? '' : [
        brand.name ? `Brand: ${brand.name}` : '',
        brand.website ? `brand site: ${brand.website}` : '',
        brand.communicationTone ? `tone ${brand.communicationTone}` : '',
        brand.targetAudience ? `audience: ${brand.targetAudience}` : '',
        brand.preferredWords.length ? `emphasize: ${brand.preferredWords.slice(0, 6).join(', ')}` : '',
      ].filter(Boolean).join(' · ')
      if (brandCtx) promptText += ` On-brand context — ${brandCtx}.`
      setPreviewSubtitle('Génération en cours…')
      const res = await actionGenerateImage({ prompt: promptText, model: 'nano-banana', size, n: 1, ...(refs.length ? { imageUrl: refs } : {}) })
      const url = res.find((image) => image.url)?.url
      if (url) {
        setGeneratedUrl(url)
        setPreviewSubtitle('Rendu généré')
        persistOutput({ type: 'image', sourceUrl: url, title: 'Shooting produit', engine: 'nano-banana', prompt: promptText.slice(0, 200), format: size }).catch(() => {})
        toast.success('Image générée')
      } else {
        setPreviewSubtitle('Aucun rendu')
        toast.error('Aucune image générée')
      }
    } catch (error) {
      setPreviewSubtitle('Échec de la génération')
      toast.error(error instanceof Error ? error.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }

  function toggleProduct(productId: string) {
    if (!selectedProductIds.includes(productId) && selectedProductIds.length >= 5) {
      toast.error('Maximum 5 produits')
      return
    }
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
    setSelectedProductImageUrl('')
    setPreviewSubtitle('Ton image sélectionnée apparaîtra ici')
  }

  async function deleteProduct(id: string) {
    if (busy) return
    setBusy(true)
    try {
      await actionDeleteProduct(id)
      setSelectedProductIds((ids) => ids.filter((x) => x !== id))
      setSelectedProductImageUrl('')
      setProducts(await actionListProducts())
      toast.success('Produit supprimé')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Suppression impossible') }
    finally { setBusy(false) }
  }

  function renderStep(id: StepId) {
    if (id === 'type') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Choisis ton type de shooting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PHOTOSHOOT_TYPES.map(({ id, title, desc, icon: Icon, points }) => {
              const isSelected = selectedType === id
              return (
                <button key={id} onClick={() => chooseType(id)} className={`group relative text-left rounded-[16px] border-2 bg-bg-surface p-6 transition-all hover:border-accent/60 hover:shadow-neo ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
                  {isSelected && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-accent text-white shadow-sm"><Check size={14} strokeWidth={3} /></span>}
                  <span className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Icon size={26} strokeWidth={2} /></span>
                  <h4 className="mt-3 font-display text-[17px] font-bold leading-6 text-text-primary">{title}</h4>
                  <p className="mt-1.5 text-[13px] leading-5 text-text-secondary">{desc}</p>
                  <ul className="mt-3 space-y-1.5">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-[13px] text-text-secondary"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{point}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (id === 'holdingStyle') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Choisis le style de prise en main</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {HOLDING_STYLES.map(({ id, title, desc, icon: Icon, points }) => {
              const isSelected = selectedHoldingStyle === id
              return (
                <button key={id} onClick={() => chooseStyle(id)} className={`group relative text-left rounded-[16px] border-2 bg-bg-surface p-6 transition-all hover:border-accent/60 hover:shadow-neo ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
                  {isSelected && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-accent text-white shadow-sm"><Check size={14} strokeWidth={3} /></span>}
                  <span className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Icon size={26} strokeWidth={2} /></span>
                  <h4 className="mt-3 font-display text-[17px] font-bold leading-6 text-text-primary">{title}</h4>
                  <p className="mt-1.5 text-[13px] leading-5 text-text-secondary">{desc}</p>
                  <ul className="mt-3 space-y-1.5">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-[13px] text-text-secondary"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{point}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <BackButton onClick={goBack} />
          </div>
        </div>
      )
    }

    if (id === 'hand') {
      return (
        <div className="w-full max-w-[720px]">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="font-display text-[15px] font-extrabold text-text-primary">Choisis une main pour tenir ton produit</h3>
            <button onClick={() => uploadProductModel('hand')} disabled={busy} className="h-7 rounded-[8px] border border-border bg-bg-card px-2.5 text-[11px] font-extrabold text-text-primary flex items-center gap-1.5 hover:border-accent/70 transition-colors shrink-0 disabled:opacity-55"><Upload size={13} /> Importer</button>
          </div>
          <div className="mb-2.5 grid grid-cols-2 gap-2 max-w-[420px]">
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Sexe</p>
              <div className="flex gap-1">
                {[{ v: 'All', l: 'Tous' }, { v: 'Female', l: 'Femme' }, { v: 'Male', l: 'Homme' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setHandGender(v)} className={`h-6 flex-1 rounded-[7px] text-[10px] font-bold transition ${handGender === v ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Carnation</p>
              <select value={handSkin} onChange={(e) => setHandSkin(e.target.value)} className="h-6 w-full rounded-[7px] border border-border bg-bg-card px-2 py-0 text-[10px] font-bold text-text-primary outline-none focus:border-accent capitalize">
                <option value="All">Toutes</option>
                {MODEL_SKIN_TONES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button onClick={() => generateProductModel('hand')} disabled={generatingModel} className="w-[100px] aspect-[3/5] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-2 px-2 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              {generatingModel
                ? <span className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                : <><span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkles size={16} /></span><span className="text-[10px] font-extrabold text-text-primary leading-tight">Générer une main</span></>}
            </button>
            {handOptions.map((hand) => {
              const isSelected = selectedHandUrl === hand.photoUrl
              return (
                <button key={hand.id} onClick={() => { setSelectedHandUrl(hand.photoUrl); setPreviewSubtitle('Ton image sélectionnée apparaîtra ici') }} className={`relative w-[100px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hand.photoUrl} alt={hand.name} className="absolute inset-0 w-full h-full object-cover" />
                  {isSelected && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"><Check size={13} /></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={!selectedHandUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'actor') {
      return (
        <div className="w-full max-w-[720px]">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="font-display text-[15px] font-extrabold text-text-primary">Choisis un avatar pour tenir ton produit</h3>
            <button onClick={() => uploadProductModel('actor')} disabled={busy} className="h-7 rounded-[8px] border border-border bg-bg-card px-2.5 text-[11px] font-extrabold text-text-primary flex items-center gap-1.5 hover:border-accent/70 transition-colors shrink-0 disabled:opacity-55"><Upload size={13} /> Importer</button>
          </div>
          <div className="rounded-[8px] bg-fg/[0.08] p-0.5 grid grid-cols-2 mb-2.5">
            <button onClick={() => setActorSource('heyoz')} className={`h-6 rounded-[6px] text-[11px] font-bold transition ${actorSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>Acteurs Système</button>
            <button onClick={() => setActorSource('mine')} className={`h-6 rounded-[6px] text-[11px] font-bold transition ${actorSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>Mes acteurs</button>
          </div>
          {actorSource === 'heyoz' && (<>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {ACTOR_CATEGORIES.map((category) => (
                <button key={category} onClick={() => setActorCategory(category)} className={`h-6 rounded-full px-2.5 text-[11px] font-bold transition ${actorCategory === category ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{category}</button>
              ))}
            </div>
            <div className="mb-2.5 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Sexe</p>
                <div className="flex gap-1">
                  {[{ v: 'All', l: 'Tous' }, { v: 'Female', l: 'Femme' }, { v: 'Male', l: 'Homme' }].map(({ v, l }) => (
                    <button key={v} onClick={() => setActorGender(v)} className={`h-6 flex-1 rounded-[7px] text-[10px] font-bold transition ${actorGender === v ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Nationalité</p>
                <select value={actorNationality} onChange={(e) => setActorNationality(e.target.value)} className="h-6 w-full rounded-[7px] border border-border bg-bg-card px-2 py-0 text-[10px] font-bold text-text-primary outline-none focus:border-accent">
                  <option value="All">Toutes</option>
                  {MODEL_NATIONALITIES.map((n) => <option key={n.name} value={n.name}>{n.flag} {n.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Morphologie</p>
                <select value={actorBodyType} onChange={(e) => setActorBodyType(e.target.value)} className="h-6 w-full rounded-[7px] border border-border bg-bg-card px-2 py-0 text-[10px] font-bold text-text-primary outline-none focus:border-accent">
                  <option value="All">Toutes</option>
                  {MODEL_BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </>)}
          <div className="flex flex-wrap justify-center gap-2.5">
            {actorSource === 'heyoz' && (
              <button onClick={() => generateProductModel('actor')} disabled={generatingModel} className="w-[100px] aspect-[3/5] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-2 px-2 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
                {generatingModel
                  ? <span className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  : <><span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkles size={16} /></span><span className="text-[10px] font-extrabold text-text-primary leading-tight">Générer un acteur</span><span className="text-[8px] font-bold uppercase tracking-wide text-text-muted">{actorCategory}</span></>}
              </button>
            )}
            {actorOptions.map((actor) => {
              const isSelected = selectedAvatarUrl === actor.photoUrl
              return (
                <button key={actor.id} onClick={() => { setSelectedAvatarUrl(actor.photoUrl); setPreviewSubtitle('Ton image sélectionnée apparaîtra ici') }} className={`relative w-[100px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-extrabold text-zinc-950 shadow-neo-sm">{actor.name}</span>
                  {isSelected && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"><Check size={13} /></span>}
                </button>
              )
            })}
            {actorSource === 'mine' && actorOptions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserRound size={36} className="text-text-muted mb-2" strokeWidth={1.8} />
                <p className="text-[13px] font-extrabold text-text-primary">Aucun acteur</p>
                <p className="mt-1 text-[12px] text-text-secondary">Crée un avatar dans Characters, ou importe-en un.</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={!selectedAvatarUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (id === 'position') {
      return (
        <div className="w-full max-w-[760px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Positionne ton produit sur {selectedHoldingStyle === 'hand' ? 'la main' : 'l’avatar'}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">Image produit *</p>
              <button onClick={() => actorProductInputRef.current?.click()} className="h-[180px] w-full rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center px-6 hover:border-accent/70 hover:bg-accent/5 transition-colors overflow-hidden">
                {actorProductImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={actorProductImageUrl} alt="Produit importé" className="max-h-full max-w-full object-contain" />
                ) : (
                  <>
                    <ImageIcon size={26} className="mb-3 text-text-secondary" />
                    <span className="flex items-center gap-2 text-[12px] font-extrabold text-text-primary"><Sparkles size={15} /> Clique pour importer ton image</span>
                  </>
                )}
              </button>
              <input ref={actorProductInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleActorProductUpload(event.target.files?.[0])} />

              {/* Conseils — À faire / À éviter (propre, sans fausses vignettes) */}
              <div className="mt-4 rounded-[12px] border border-border bg-bg-surface p-4">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Conseils pour ton image</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-green-600"><span className="grid h-4 w-4 place-items-center rounded-full bg-green-600 text-white"><Check size={11} strokeWidth={3} /></span> À faire</p>
                    <ul className="space-y-1.5 text-[12px] font-medium text-text-secondary">
                      {['Fond propre', 'Un seul produit', 'Produit entier'].map((tip) => <li key={tip}>{tip}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-red-600"><span className="grid h-4 w-4 place-items-center rounded-full bg-red-600 text-white text-[10px] leading-none">×</span> À éviter</p>
                    <ul className="space-y-1.5 text-[12px] font-medium text-text-secondary">
                      {['Image incomplète', 'Avec mannequin', 'Plusieurs articles'].map((tip) => <li key={tip}>{tip}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{selectedHoldingStyle === 'hand' ? 'Main avec produit' : 'Avatar avec produit'}</p>
                {actorProductImageUrl && <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-extrabold text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Prêt</span>}
              </div>

              {/* Placement du produit — déplace l'aperçu ET guide la génération */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-text-muted self-center mr-0.5">Position</span>
                {PLACEMENTS.map((placement) => (
                  <button key={placement.id} onClick={() => setProductPlacement(placement.id)} className={`h-6 rounded-full px-2.5 text-[10px] font-bold transition ${productPlacement === placement.id ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{placement.label}</button>
                ))}
              </div>

              <div className="relative h-[300px] rounded-[12px] border border-border bg-bg-surface overflow-hidden">
                {generatedUrl ? (
                  <>
                    <button onClick={() => setLightboxOpen(true)} className="group absolute inset-0 z-10 flex items-center justify-center bg-bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={generatedUrl} alt="Rendu généré" className="max-h-full max-w-full object-contain transition group-hover:brightness-95" />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"><span className="rounded-full bg-black/55 p-2 text-white"><Maximize2 size={18} /></span></span>
                    </button>
                    <a href={generatedUrl} download target="_blank" rel="noreferrer" className="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
                  </>
                ) : (
                  <>
                    {selectedHoldingStyle === 'hand' && selectedHand?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedHand.photoUrl} alt={selectedHand.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : selectedAvatar?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedAvatar.photoUrl} alt={selectedAvatar.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-text-muted"><UserRound size={44} /></div>
                    )}

                    {actorProductImageUrl ? (
                      <>
                        {/* léger voile uniquement pour faire ressortir le produit */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                        <div className={`absolute ${PLACEMENTS.find((p) => p.id === productPlacement)?.pos} w-24 h-24 rounded-[14px] bg-white/95 border-2 border-white shadow-neo flex items-center justify-center p-2 ring-2 ring-accent/60 transition-all duration-300`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={actorProductImageUrl} alt="Placement produit" className="max-h-full max-w-full object-contain" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/45" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
                          <Sparkles size={30} className="mb-3" />
                          <p className="text-[15px] font-extrabold">Importe une image produit pour commencer</p>
                          <p className="mt-1.5 text-[12px] font-medium text-white/75">Choisis sa position et génère</p>
                        </div>
                      </>
                    )}
                  </>
                )}
                {generating && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-bg-surface/85 text-text-secondary">
                    <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <p className="text-[13px] font-semibold text-text-primary">Génération en cours…</p>
                  </div>
                )}
              </div>
              <button onClick={generate} disabled={!actorProductImageUrl || generating} className="mt-4 h-10 w-full rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white flex items-center justify-center gap-2.5 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                {generating ? 'Génération…' : <><Sparkles size={16} /> Générer l’image <Gem size={14} fill="currentColor" /> 2</>}
              </button>
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <BackButton onClick={goBack} />
          </div>
        </div>
      )
    }

    if (id === 'product') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center">Que met-on en avant aujourd’hui&nbsp;?</h3>
          <p className="mt-6 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 sélectionné{selectedProductIds.length > 1 ? 's' : ''} · {products.length} produit{products.length > 1 ? 's' : ''}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {products.map((product) => {
              const isSelected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`group relative text-left w-[176px] h-[164px] rounded-[14px] border bg-bg-card p-3 transition-all hover:border-accent/70 overflow-hidden ${isSelected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
                  <span role="button" tabIndex={-1} aria-label="Supprimer le produit" title="Supprimer le produit" onClick={(event) => { event.stopPropagation(); deleteProduct(product.id) }} className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"><X size={14} strokeWidth={2.5} /></span>
                  <div className="absolute left-1/2 top-2 w-[88px] h-[88px] -translate-x-1/2 overflow-hidden rounded-[10px] bg-bg-surface">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : <span className="h-full w-full flex items-center justify-center text-text-faint"><ImageIcon size={28} /></span>}
                  </div>
                  <p className="absolute left-3 bottom-3 max-w-[140px] truncate text-[13px] font-semibold text-text-primary">{product.name}</p>
                  {isSelected && <span className="absolute left-2 top-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-sm"><Check size={15} /></span>}
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

    if (id === 'productImage') {
      return (
        <div className="w-full max-w-[672px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center">Choisis l’image produit</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedProductImageUrl ? 1 : 0} / 1 sélectionné</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={uploadProductLibraryImage} disabled={busy} className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors disabled:opacity-55 disabled:cursor-not-allowed">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Importer une image</span>
            </button>
            <button onClick={() => setAssetPickerOpen(true)} className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><Images size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Depuis mes Assets</span>
            </button>
            {productImageOptions.map((image) => {
              const isSelected = selectedProductImageUrl === image.url
              return (
                <button key={`${image.id}-${image.url}`} onClick={() => { setSelectedProductImageUrl(image.url); setPreviewSubtitle('Ton image sélectionnée apparaîtra ici') }} className={`relative w-[150px] h-[150px] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className="absolute inset-0 w-full h-full object-contain" />
                  {isSelected && <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center"><Check size={16} /></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {currentStep > 0 && <BackButton onClick={goBack} />}
            <ContinueButton disabled={!selectedProductImageUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    // aspect
    return (
      <div className="w-full max-w-[672px]">
        <h3 className="font-display text-[16px] font-extrabold text-text-primary text-center mb-4">Choisis le ratio &amp; génère</h3>
        <div className="mx-auto grid max-w-[420px] grid-cols-3 gap-3">
          {DIMENSIONS.map(({ ratio, label }) => {
            const isSelected = selectedAspectRatio === ratio
            return (
              <button key={ratio} onClick={() => setSelectedAspectRatio(ratio)} className={`h-[100px] rounded-[12px] border bg-bg-card flex flex-col items-center justify-center gap-2 px-2 py-3 transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
                <span className="relative w-9 h-9 flex items-center justify-center">
                  <span className="absolute inset-0 border border-dashed border-accent/20" />
                  <span className={`${isSelected ? 'bg-accent border-accent' : 'bg-bg-card border-border-strong'} border-2`} style={ratioStyle(ratio)} />
                </span>
                <span className="text-[13px] font-extrabold leading-none">{label}</span>
                <span className="text-[11px] font-semibold text-text-secondary leading-none">{ratio}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <BackButton onClick={goBack} />
          <button onClick={generate} disabled={generating} className="h-10 rounded-[10px] bg-accent px-6 text-[13px] font-extrabold text-white flex items-center justify-center gap-2.5 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
            {generating ? 'Génération…' : <><Sparkles size={16} /> Générer <Gem size={14} fill="currentColor" /> 2</>}
          </button>
        </div>
        {(generating || generatedUrl) && (
          <div className="relative mx-auto mt-5 flex h-[300px] max-w-[420px] items-center justify-center overflow-hidden rounded-[12px] border border-border bg-bg-card">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-text-secondary">
                <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <p className="text-[13px] font-semibold text-text-primary">Génération en cours…</p>
              </div>
            ) : (
              <>
                <button onClick={() => setLightboxOpen(true)} className="group flex h-full w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedUrl} alt="Rendu généré" className="max-h-full max-w-full object-contain transition group-hover:brightness-95" />
                </button>
                <a href={generatedUrl} download target="_blank" rel="noreferrer" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // Panneau d'aperçu réservé aux étapes de sélection acteur / main.
  const showPreview = stepId === 'actor' || stepId === 'hand'

  return (
    <PageShell>
      <MainPanel>
        <WizardHeader title="Shooting produit" onBack={() => router.push('/creer/image')} />

        <div className={`grid min-h-0 flex-1 grid-cols-1 ${showPreview ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
          <main className="min-w-0 min-h-0">
            <StepSlider index={Math.min(currentStep, steps.length - 1)}>
              {steps.map((id) => renderStep(id))}
            </StepSlider>
          </main>

          {showPreview && (
          <aside className="min-h-0 flex flex-col overflow-hidden border-t border-border bg-bg-surface px-4 py-4 lg:border-l lg:border-t-0 lg:px-5 lg:py-5">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-text-primary">Aperçu</h2>
                <p className="mt-1 truncate text-[12px] font-medium text-text-secondary">{previewSubtitle}</p>
              </div>
              <button onClick={generate} disabled={generating} className="h-8 rounded-[10px] bg-accent px-3 text-[12px] font-extrabold text-white flex items-center gap-1.5 shadow-neo-solid hover:brightness-105 transition shrink-0 disabled:opacity-55 disabled:cursor-not-allowed"><Wand2 size={14} /> {generatedUrl ? 'Re-générer' : 'Éditer avec l’IA'}</button>
            </div>

            <div className="relative mt-4 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[13px] border border-border bg-bg-card px-5 text-center [background-image:radial-gradient(circle_at_50%_28%,rgba(255,92,40,0.07),transparent_70%)]">
              {/* trame discrète */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
              {/* chip statut + ratio */}
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-bg-surface/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary shadow-sm backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${generatedUrl ? 'bg-green-600' : generating ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
                {generatedUrl ? 'Rendu' : generating ? 'En cours' : 'Aperçu'} · {selectedAspectRatio}
              </span>

              {generating ? (
                <div className="relative z-10 flex flex-col items-center gap-3 text-text-secondary">
                  <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <p className="text-[13px] font-semibold text-text-primary">Génération en cours…</p>
                </div>
              ) : generatedUrl ? (
                <>
                  <button onClick={() => setLightboxOpen(true)} className="group relative z-10 flex h-full w-full items-center justify-center py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={generatedUrl} alt="Rendu généré" className="max-h-full max-w-full rounded-[8px] object-contain shadow-neo-sm transition group-hover:brightness-95" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"><span className="rounded-full bg-black/55 p-2 text-white"><Maximize2 size={18} /></span></span>
                  </button>
                  <a href={generatedUrl} download target="_blank" rel="noreferrer" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg-surface/90 text-text-primary shadow-sm backdrop-blur transition hover:bg-bg-surface hover:text-accent" aria-label="Télécharger"><Download size={15} /></a>
                </>
              ) : selectedHand?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedHand.photoUrl} alt={selectedHand.name} className="relative z-10 max-h-full max-w-full object-contain" />
              ) : selectedAvatar?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAvatar.photoUrl} alt={selectedAvatar.name} className="relative z-10 max-h-full max-w-full object-contain" />
              ) : previewProduct?.url && selectedProductImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewProduct.url} alt={previewProduct.name} className="relative z-10 max-h-full max-w-full object-contain" />
              ) : selectedTypeMeta && selectedType === 'holding' && selectedHoldingStyle ? (
                <div className="relative z-10">
                  <span className="mx-auto w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">{SelectedIcon && <SelectedIcon size={28} strokeWidth={2.2} />}</span>
                  <p className="text-[14px] font-extrabold text-text-primary">{selectedTypeMeta.title}</p>
                  <p className="mt-1.5 max-w-[260px] text-[12px] font-medium text-text-secondary">{selectedTypeMeta.desc}</p>
                </div>
              ) : (
                <div className="relative z-10">
                  <UserRound size={42} className="mx-auto mb-3 text-text-muted" strokeWidth={2} />
                  <p className="text-[13px] font-bold text-text-primary">{previewEmptyText}</p>
                </div>
              )}
            </div>

            <div className="mt-4 shrink-0 rounded-[14px] border border-border bg-bg-card p-3.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold text-text-primary"><Sparkles size={13} className="text-accent" /> Astuces</h3>
              <ul className="mt-2 space-y-1 text-[12px] font-medium leading-relaxed text-text-secondary">
                <li>• Utilise l’édition IA pour la lumière, le fond ou le style</li>
                <li>• Importe tes propres images pour plus de contrôle</li>
                <li>• Prévisualise avant de générer le rendu final</li>
              </ul>
            </div>
          </aside>
          )}
        </div>
      </MainPanel>

      <AssetPickerModal open={assetPickerOpen} onClose={() => setAssetPickerOpen(false)} onPick={(url) => pickProductAsset(url)} types={['image']} selectedUrls={[selectedProductImageUrl]} closeOnPick title="Mes Assets (images)" />

      <DevStepNav
        steps={[
          { id: 'type', label: 'Type' },
          { id: 'product', label: 'Produit' },
          { id: 'productImage', label: 'Image' },
          { id: 'aspect', label: 'Ratio' },
          { id: 'holdingStyle', label: 'Style' },
          { id: 'actor', label: 'Acteur' },
          { id: 'hand', label: 'Main' },
          { id: 'position', label: 'Position' },
        ]}
        active={stepId}
        onJump={goToStep}
      />

      {lightboxOpen && generatedUrl && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 p-6 animate-fade-in" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white hover:bg-white/10" aria-label="Fermer"><X size={18} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={generatedUrl} alt="Rendu généré" onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-[10px] object-contain" />
          <a href={generatedUrl} download target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold text-zinc-950 shadow-neo hover:brightness-95"><Download size={15} /> Télécharger</a>
        </div>
      )}
    </PageShell>
  )
}
