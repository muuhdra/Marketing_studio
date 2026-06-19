'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Check, Gem, Hand, Image as ImageIcon, PlusCircle, Sparkles, Upload, UserCircle, UserRound, Wand2 } from 'lucide-react'
import { actionListProducts, type ProductDTO } from '@/lib/actions/products'
import { actionListAvatarsForPicker, actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { actionGenerateImage } from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { AnimatedStep, ContinueButton, DevStepNav, WizardHeader, ratioStyle, ratioToSize, type AnimationPhase } from '@/components/features/creer/WizardKit'

const DIMENSIONS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const ACTOR_CATEGORIES = ['BEAUTÉ', 'MODE', 'ALIMENTAIRE', 'GADGETS', 'COMPLÉMENTS', 'JOUETS']

const FALLBACK_ACTORS = [
  { id: 'actor-1', name: 'Mina', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-2', name: 'Rose', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-3', name: 'Hana', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-4', name: 'Sora', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-5', name: 'Nari', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-6', name: 'Yuna', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-7', name: 'Lina', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80' },
  { id: 'actor-8', name: 'Mika', category: 'BEAUTÉ', photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80' },
]

const FALLBACK_HANDS = [
  { id: 'hand-1', name: 'Open Palm', photoUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-2', name: 'Pinch Grip', photoUrl: 'https://images.unsplash.com/photo-1505238680356-667803448bb6?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-3', name: 'Soft Hold', photoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-4', name: 'Side Reach', photoUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-5', name: 'Palm Up', photoUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-6', name: 'Natural Reach', photoUrl: 'https://images.unsplash.com/photo-1583744946564-b52d01e7f922?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-7', name: 'Close Grip', photoUrl: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-8', name: 'Studio Hand', photoUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-9', name: 'Clean Shadow', photoUrl: 'https://images.unsplash.com/photo-1507038732509-8b1a5fdf1ddc?auto=format&fit=crop&w=600&q=80' },
  { id: 'hand-10', name: 'Product Ready', photoUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=600&q=80' },
]

const PHOTOSHOOT_TYPES = [
  { id: 'showcase', title: 'Vitrine produit', desc: 'Crée des shootings produit professionnels', icon: Box, points: ['Choisis un produit', 'Importe des images', 'Obtiens un shooting pro'] },
  { id: 'holding', title: 'Produit en main', desc: 'Génère des images d’avatars ou de mains tenant ton produit naturellement', icon: Hand, points: ['Choisis un acteur ou un gros plan de main', 'Positionne ton produit', 'Rendu réaliste généré par IA'] },
]

const HOLDING_STYLES = [
  { id: 'actor', title: 'Tenu par un acteur', desc: 'Plan d’un avatar tenant ton produit (buste ou corps entier)', icon: UserCircle, points: ['Choisis parmi des avatars variés', 'Positionne le produit librement', 'Idéal pour les gros produits'] },
  { id: 'hand', title: 'Tenu par une main', desc: 'Gros plan d’une main tenant ton produit naturellement', icon: Hand, points: ['Choisis un gros plan de main', 'Positionne le produit précisément', 'Idéal pour les petits produits'] },
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
  const toast = useToast()
  const actorProductInputRef = useRef<HTMLInputElement | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedHoldingStyle, setSelectedHoldingStyle] = useState('')
  const [actorSource, setActorSource] = useState<'heyoz' | 'mine'>('heyoz')
  const [actorCategory, setActorCategory] = useState(ACTOR_CATEGORIES[0])
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')
  const [selectedHandUrl, setSelectedHandUrl] = useState('')
  const [actorProductImageUrl, setActorProductImageUrl] = useState('')
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16')
  const [previewSubtitle, setPreviewSubtitle] = useState('Ton image sélectionnée apparaîtra ici')

  useEffect(() => {
    actionListProducts().then(setProducts).catch(() => setProducts([]))
    actionListAvatarsForPicker().then(setAvatars).catch(() => setAvatars([]))
  }, [])

  const steps = buildSteps(selectedType, selectedHoldingStyle)
  const stepId = steps[Math.min(currentStep, steps.length - 1)]

  const selectedTypeMeta = PHOTOSHOOT_TYPES.find((type) => type.id === selectedType)
  const SelectedIcon = selectedTypeMeta?.icon
  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id))
  const productImageOptions = selectedProducts
    .map((product) => ({ id: product.id, name: product.name, url: product.imageUrl }))
    .filter((image): image is { id: string; name: string; url: string } => Boolean(image.url))
  const previewProduct = productImageOptions.find((image) => image.url === selectedProductImageUrl)
  const actorOptions = actorSource === 'mine'
    ? avatars.map((avatar) => ({ id: avatar.id, name: avatar.name, category: 'MES ACTEURS', photoUrl: avatar.photoUrl })).filter((avatar): avatar is { id: string; name: string; category: string; photoUrl: string } => Boolean(avatar.photoUrl))
    : FALLBACK_ACTORS.filter((actor) => actor.category === actorCategory)
  const selectedAvatar = actorOptions.find((avatar) => avatar.photoUrl === selectedAvatarUrl)
  const selectedHand = FALLBACK_HANDS.find((hand) => hand.photoUrl === selectedHandUrl)
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

  // Transition « scroll » entre étapes (exit → contenu → enter).
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
    setPhase('idle')
    setCurrentStep(idx)
  }

  async function handleActorProductUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const { url } = await actionUploadTempImage(dataUrl)
      setActorProductImageUrl(url)
    } catch {
      toast.error('Échec de l\'upload de l\'image')
    }
  }

  // Génération réelle (Nano Banana) — rendu affiché dans le panneau d'aperçu.
  async function generate() {
    if (generating) return
    const size = ratioToSize(selectedAspectRatio)
    let refs: string[] = []
    let promptText = ''
    if (selectedType === 'showcase') {
      refs = [selectedProductImageUrl].filter(Boolean)
      promptText = 'Professional studio product photoshoot of the product, clean styled background, soft commercial lighting, marketing-ready, high quality.'
    } else {
      refs = [selectedHoldingStyle === 'hand' ? selectedHandUrl : selectedAvatarUrl, actorProductImageUrl].filter(Boolean)
      promptText = `Realistic photo of ${selectedHoldingStyle === 'hand' ? 'a hand' : 'a model'} naturally holding the product, professional photoshoot, cohesive lighting and styling.`
    }
    setGenerating(true)
    setPreviewSubtitle('Génération en cours…')
    try {
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
    setSelectedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId)
      if (current.length >= 5) return current
      return [...current, productId]
    })
    setSelectedProductImageUrl('')
    setPreviewSubtitle('Ton image sélectionnée apparaîtra ici')
  }

  function renderCurrentStep() {
    if (stepId === 'type') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis ton type de shooting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PHOTOSHOOT_TYPES.map(({ id, title, desc, icon: Icon, points }) => {
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

    if (stepId === 'holdingStyle') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis le style de prise en main</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOLDING_STYLES.map(({ id, title, desc, icon: Icon, points }) => {
              const isSelected = selectedHoldingStyle === id
              return (
                <button key={id} onClick={() => chooseStyle(id)} className={`group text-left rounded-[16px] border-2 bg-bg-surface p-8 transition-all hover:border-accent/60 hover:shadow-neo ${isSelected ? 'border-accent shadow-neo' : 'border-border'}`}>
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

    if (stepId === 'hand') {
      return (
        <div className="w-full max-w-[760px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Choisis une main pour tenir ton produit</h3>
            <button className="h-9 rounded-[10px] border border-border bg-bg-card px-4 text-[13px] font-extrabold text-text-primary flex items-center gap-2 hover:border-accent/70 transition-colors shrink-0"><Upload size={16} /> Importer</button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {FALLBACK_HANDS.map((hand) => {
              const isSelected = selectedHandUrl === hand.photoUrl
              return (
                <button key={hand.id} onClick={() => { setSelectedHandUrl(hand.photoUrl); setPreviewSubtitle('Ton image sélectionnée apparaîtra ici') }} className={`relative w-[112px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hand.photoUrl} alt={hand.name} className="absolute inset-0 w-full h-full object-cover" />
                  {isSelected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center"><Check size={15} /></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={!selectedHandUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'actor') {
      return (
        <div className="w-full max-w-[760px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="font-display text-[18px] font-extrabold text-text-primary">Choisis un avatar pour tenir ton produit</h3>
            <button className="h-9 rounded-[10px] border border-border bg-bg-card px-4 text-[13px] font-extrabold text-text-primary flex items-center gap-2 hover:border-accent/70 transition-colors shrink-0"><Upload size={16} /> Importer</button>
          </div>
          <div className="rounded-[10px] bg-fg/[0.08] p-1 grid grid-cols-2 mb-5">
            <button onClick={() => setActorSource('heyoz')} className={`h-8 rounded-[8px] text-[13px] font-bold transition ${actorSource === 'heyoz' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>Acteurs HeyOz</button>
            <button onClick={() => setActorSource('mine')} className={`h-8 rounded-[8px] text-[13px] font-bold transition ${actorSource === 'mine' ? 'bg-bg-card shadow-neo-sm text-text-primary' : 'text-text-primary/80'}`}>Mes acteurs</button>
          </div>
          {actorSource === 'heyoz' && (
            <div className="mb-5 flex flex-wrap gap-2">
              {ACTOR_CATEGORIES.map((category) => (
                <button key={category} onClick={() => setActorCategory(category)} className={`h-8 rounded-full px-4 text-[13px] font-bold transition ${actorCategory === category ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-primary hover:bg-accent/10'}`}>{category}</button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {actorOptions.map((actor) => {
              const isSelected = selectedAvatarUrl === actor.photoUrl
              return (
                <button key={actor.id} onClick={() => { setSelectedAvatarUrl(actor.photoUrl); setPreviewSubtitle('Ton image sélectionnée apparaîtra ici') }} className={`relative w-[112px] aspect-[3/5] rounded-[12px] border bg-bg-card overflow-hidden transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent shadow-neo' : 'border-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={actor.photoUrl} alt={actor.name} className="absolute inset-0 w-full h-full object-cover" />
                  {isSelected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center"><Check size={15} /></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={!selectedAvatarUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    if (stepId === 'position') {
      return (
        <div className="w-full max-w-[760px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Positionne ton produit sur {selectedHoldingStyle === 'hand' ? 'la main' : 'l’avatar'}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-wider text-text-muted mb-2">Image produit *</p>
              <button onClick={() => actorProductInputRef.current?.click()} className="h-[240px] w-full rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center px-6 hover:border-accent/70 hover:bg-accent/5 transition-colors overflow-hidden">
                {actorProductImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={actorProductImageUrl} alt="Produit importé" className="max-h-full max-w-full object-contain" />
                ) : (
                  <>
                    <ImageIcon size={28} className="mb-4 text-text-secondary" />
                    <span className="flex items-center gap-2 text-[13px] font-extrabold text-text-primary"><Sparkles size={16} /> Clique pour importer ton image</span>
                  </>
                )}
              </button>
              <input ref={actorProductInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleActorProductUpload(event.target.files?.[0])} />
              <div className="mt-4 rounded-[12px] bg-bg-surface border border-border p-4 flex items-center justify-center gap-3">
                <div className="w-[120px] h-[150px] rounded-[10px] bg-gradient-to-b from-orange-100 to-orange-200 border border-border flex flex-col justify-end p-3 relative">
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><Check size={14} /></span>
                  <span className="text-[10px] text-text-primary font-medium">✓ Fond propre</span>
                  <span className="text-[10px] text-text-primary font-medium">✓ Un seul produit</span>
                  <span className="text-[10px] text-text-primary font-medium">✓ Produit entier</span>
                </div>
                <div className="space-y-2">
                  {['Incomplet', 'Avec mannequin', 'Plusieurs articles'].map((label) => (
                    <div key={label} className="relative w-[92px] h-[52px] rounded-[8px] bg-gradient-to-br from-fg/[0.10] to-orange-100 border border-border overflow-hidden flex items-end justify-center pb-1.5">
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[11px] leading-none flex items-center justify-center">×</span>
                      <span className="text-[9px] font-bold text-white drop-shadow">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-wider text-text-muted mb-2">{selectedHoldingStyle === 'hand' ? 'Main avec produit' : 'Avatar avec produit'}</p>
              <div className="relative h-[400px] rounded-[12px] border border-border bg-bg-surface overflow-hidden">
                {selectedHoldingStyle === 'hand' && selectedHand?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedHand.photoUrl} alt={selectedHand.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : selectedAvatar?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedAvatar.photoUrl} alt={selectedAvatar.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-muted"><UserRound size={48} /></div>
                )}
                <div className="absolute inset-0 bg-black/45" />
                {actorProductImageUrl && (
                  <div className="absolute left-1/2 top-[54%] -translate-x-1/2 w-24 h-24 rounded-[12px] bg-white/90 border border-white shadow-neo flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={actorProductImageUrl} alt="Placement produit" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
                  <Sparkles size={32} className="mb-4" />
                  <p className="text-[16px] font-extrabold">{actorProductImageUrl ? 'Prêt à générer' : 'Importe une image produit pour commencer'}</p>
                  <p className="mt-2 text-[13px] font-medium text-white/75">Positionne-le sur {selectedHoldingStyle === 'hand' ? 'la main' : 'l’avatar'} et génère</p>
                </div>
              </div>
              <button onClick={generate} disabled={!actorProductImageUrl || generating} className="mt-4 h-11 w-full rounded-[10px] bg-accent px-8 text-[14px] font-extrabold text-white flex items-center justify-center gap-3 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
                {generating ? 'Génération…' : <><Sparkles size={17} /> Générer l’image <Gem size={16} fill="currentColor" /> 2</>}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (stepId === 'product') {
      return (
        <div className="w-full max-w-[768px]">
          <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Que met-on en avant aujourd’hui&nbsp;?</h3>
          <p className="mt-6 text-right text-[12px] font-medium text-text-primary">{selectedProductIds.length} / 5 sélectionnés</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {products.slice(0, 5).map((product) => {
              const isSelected = selectedProductIds.includes(product.id)
              return (
                <button key={product.id} onClick={() => toggleProduct(product.id)} className={`relative text-left w-[176px] h-[164px] rounded-[14px] border bg-bg-card p-3 transition-all hover:border-accent/70 overflow-hidden ${isSelected ? 'border-accent ring-2 ring-accent/20 shadow-neo' : 'border-border'}`}>
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

    if (stepId === 'productImage') {
      return (
        <div className="w-full max-w-[672px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center">Choisis l’image produit</h3>
            <p className="justify-self-end text-[12px] font-medium text-text-primary">{selectedProductImageUrl ? 1 : 0} / 1 sélectionné</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button className="w-[150px] min-h-[150px] rounded-[12px] border-2 border-dashed border-border-strong bg-bg-card flex flex-col items-center justify-center text-center gap-4 px-5 hover:border-accent/70 hover:bg-accent/5 transition-colors">
              <span className="w-10 h-10 rounded-full bg-fg/[0.10] flex items-center justify-center text-text-primary"><PlusCircle size={20} /></span>
              <span className="text-[14px] font-semibold text-text-primary">Ajouter depuis la bibliothèque</span>
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
          <div className="mt-6 flex justify-center">
            <ContinueButton disabled={!selectedProductImageUrl} onClick={goNext} />
          </div>
        </div>
      )
    }

    // aspect
    return (
      <div className="w-full max-w-[672px]">
        <h3 className="font-display text-[18px] font-extrabold text-text-primary text-center mb-6">Choisis le ratio &amp; génère</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {DIMENSIONS.map((dimension) => {
            const isSelected = selectedAspectRatio === dimension
            return (
              <button key={dimension} onClick={() => setSelectedAspectRatio(dimension)} className={`h-[88px] rounded-[10px] border bg-bg-card flex flex-col items-center justify-center gap-1.5 px-2 py-2 transition-all hover:border-accent/70 ${isSelected ? 'border-2 border-accent bg-accent/5 text-accent' : 'border-border text-text-primary'}`}>
                <span className="relative w-8 h-8 flex items-center justify-center">
                  <span className="absolute inset-0 border border-dashed border-accent/20" />
                  <span className={`${isSelected ? 'bg-accent border-accent' : 'bg-bg-card border-border-strong'} border-2`} style={ratioStyle(dimension)} />
                </span>
                <span className="text-[12px] font-extrabold">{dimension}</span>
              </button>
            )
          })}
        </div>
        <button onClick={generate} disabled={generating} className="mt-6 h-11 w-full rounded-[10px] bg-accent px-8 text-[14px] font-extrabold text-white flex items-center justify-center gap-3 shadow-neo-solid hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed">
          {generating ? 'Génération…' : <><Sparkles size={17} /> Générer <Gem size={16} fill="currentColor" /> 2</>}
        </button>
      </div>
    )
  }

  return (
    <div className="page animate-fade-in -mx-8 -mt-2 h-[calc(100vh-8px)] px-4 pt-2 pb-3">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
        <WizardHeader title="Shooting produit" onBack={() => router.push('/creer/image')} />

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_440px]">
          <main className="min-w-0 overflow-y-auto flex items-center justify-center px-8 py-10">
            <AnimatedStep key={stepId} phase={phase}>
              {renderCurrentStep()}
            </AnimatedStep>
          </main>

          <aside className="hidden xl:flex h-full min-h-0 flex-col overflow-y-auto border-l border-border bg-bg-surface px-6 py-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-extrabold text-text-primary">Aperçu</h2>
                <p className="mt-2 text-[13px] font-medium text-text-secondary">{previewSubtitle}</p>
              </div>
              <button className="h-9 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white flex items-center gap-2 shadow-neo-solid hover:brightness-105 transition shrink-0"><Wand2 size={16} /> Éditer avec l’IA</button>
            </div>

            <div className="flex-1 min-h-[340px] rounded-[14px] border border-border bg-bg-card flex flex-col items-center justify-center text-center px-8 overflow-hidden">
              {generatedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={generatedUrl} alt="Rendu généré" className="max-h-full max-w-full object-contain" />
              ) : selectedHand?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedHand.photoUrl} alt={selectedHand.name} className="max-h-full max-w-full object-contain" />
              ) : selectedAvatar?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAvatar.photoUrl} alt={selectedAvatar.name} className="max-h-full max-w-full object-contain" />
              ) : previewProduct?.url && selectedProductImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewProduct.url} alt={previewProduct.name} className="max-h-full max-w-full object-contain" />
              ) : selectedTypeMeta && selectedType === 'holding' && selectedHoldingStyle ? (
                <>
                  <span className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-4">{SelectedIcon && <SelectedIcon size={34} strokeWidth={2.2} />}</span>
                  <p className="text-[14px] font-extrabold text-text-primary">{selectedTypeMeta.title}</p>
                  <p className="mt-2 max-w-[300px] text-[13px] font-medium text-text-secondary">{selectedTypeMeta.desc}</p>
                </>
              ) : (
                <>
                  <UserRound size={48} className="mb-4 text-text-muted" strokeWidth={2} />
                  <p className="text-[13px] font-bold text-text-primary">{previewEmptyText}</p>
                </>
              )}
            </div>

            <div className="mt-5 rounded-[14px] border border-border bg-bg-card p-4">
              <h3 className="text-[13px] font-extrabold text-text-primary">Astuces</h3>
              <ul className="mt-3 space-y-1 text-[13px] font-medium leading-relaxed text-text-secondary">
                <li>• Utilise l’édition IA pour la lumière, le fond ou le style</li>
                <li>• Importe tes propres images pour plus de contrôle</li>
                <li>• Prévisualise avant de générer le rendu final</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

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
    </div>
  )
}
