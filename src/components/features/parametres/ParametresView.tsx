'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBrand, LANGUAGES, BRAND_CATEGORIES, type BrandListKey } from '@/lib/stores/brandStore'
import { useBrands } from '@/lib/stores/brandsStore'
import { TeamPanel } from './TeamPanel'
import { useSettings } from '@/lib/stores/settingsStore'
import { useToast } from '@/lib/stores/toastStore'
import { useT } from '@/lib/i18n'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useCampaignSettings, CONTENT_TYPES, DURATION_UNITS, CADENCE_PER } from '@/lib/stores/campaignSettingsStore'
import { useBrandSave } from '@/lib/stores/brandSaveStore'
import { useProduction } from '@/lib/stores/productionStore'
import { actionListAvatarsForPicker } from '@/lib/actions/avatar-assets'
import { actionGenerateProductionPrompt, actionDiscoverCompetitors, actionAnalyzeCompetitorStrategy } from '@/lib/actions/ai'
import type { CompetitorStrategy } from '@/lib/ai/research'
import {
  actionListProducts,
  actionCreateProduct,
  actionUploadProductImage,
  actionAnalyzeProductUrl,
  actionDeleteProduct,
  type ProductDTO,
} from '@/lib/actions/products'
import {
  actionListFolders,
  actionCreateFolder,
  actionDeleteFolder,
  actionListBrandAssets,
  actionUploadBrandAsset,
  actionGenerateBrandAsset,
  actionDeleteBrandAsset,
  type FolderDTO,
  type BrandAssetDTO,
  type AssetType,
} from '@/lib/actions/brand-assets'
import {
  actionListBrandTemplates,
  actionUploadBrandTemplate,
  actionGenerateBrandTemplate,
  actionDeleteBrandTemplate,
  actionSetActiveBrandTemplates,
  type BrandTemplateDTO,
} from '@/lib/actions/brand-templates'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { actionAnalyzeBrandUrl } from '@/lib/actions/brands'

import {
  Box,
  BriefcaseBusiness,
  Check,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  FileText,
  FileUp,
  FolderPlus,
  ImageIcon,
  ImagePlus,
  Info,
  Laptop,
  Layers,
  LinkIcon,
  Clapperboard,
  Shirt,
  ArrowUp,
  ShoppingBag,
  User,
  CalendarClock,
  Megaphone,
  Music,
  Palette,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Store,
  Upload,
  UsersRound,
  Users,
  Video,
  X,
  Search,
  MessageSquare,
} from 'lucide-react'

interface Props {
  currentUser: { email: string; createdAt: string | null } | null
}

const brandTabs = [
  {
    id: 'identity',
    label: 'Identité',
    description: 'Valeurs et éléments fondateurs de la marque.',
    icon: ShieldCheck,
  },
  {
    id: 'tone',
    label: 'Ton',
    description: 'Voix de la marque et style de message.',
    icon: Megaphone,
  },
  {
    id: 'audience',
    label: 'Audience',
    description: 'Cible démographique et personas.',
    icon: UsersRound,
  },
  {
    id: 'campaign',
    label: 'Campagne',
    description: 'Durée, pré-campagne et cadence de contenu.',
    icon: CalendarRange,
  },
  {
    id: 'team',
    label: 'Équipe',
    description: 'Membres partageant cette marque.',
    icon: Users,
  },
] as const

type BrandTabId = (typeof brandTabs)[number]['id']

const colors = [
  { value: '#1A1A1A', bg: '#111111' },
  { value: '#F5F0EB', bg: '#cfcac4' },
  { value: '#C8A882', bg: '#a98d68' },
  { value: '#000000', bg: '#000000' },
]

const brandTypes = [
  { label: 'E-Commerce', description: 'Produits physiques', icon: Store, active: false },
  { label: 'SaaS / App', description: 'Produits digitaux', icon: Laptop, active: false },
  { label: 'Service', description: 'Agence ou conseil', icon: BriefcaseBusiness, active: true },
]

// Libellés FR (affichage) pour les valeurs anglaises stockées (durée / cadence / type de contenu).
const UNIT_FR: Record<string, string> = { days: 'jours', weeks: 'semaines', months: 'mois' }
const PER_FR: Record<string, string> = { day: 'jour', week: 'semaine', month: 'mois' }
const CONTENT_FR: Record<string, string> = {
  static: 'Pub statique',
  carousel: 'Carrousel',
  product: 'Shooting produit',
  fashion: 'Shooting mode',
  'actor-video': 'Vidéo acteur',
  'broll-video': 'Vidéo B-roll',
}

// Préréglages rapides de ton de communication (clic → remplit le champ).
const TONE_PRESETS = [
  'Amical & accessible',
  'Professionnel & fiable',
  'Audacieux & énergique',
  'Luxe & raffiné',
  'Ludique & décalé',
  'Inspirant & motivant',
  'Minimaliste & direct',
  'Chaleureux & humain',
]

const preferredWords = ['quality', 'essential', 'everyday', 'accessible', 'sustainable']
const wordsToAvoid = ['cheap', 'luxury', 'exclusive']
const audienceDesires = ['Effortless everyday style', 'Products that last', 'Guilt-free purchases']
const audienceProblems = [
  'Finding affordable quality clothing',
  'Overwhelmed by too many choices',
  'Concerned about sustainability',
]
const folderColors = ['#c73538', '#d18707', '#159b70', '#356bc4', '#7048c5', '#bd3b85', '#1295a3', '#66a80f']

// Menu déroulant propre (menu blanc, option active en accent) — remplace les boutons « cycle »
// et les <select> natifs (rendu sombre macOS). `display` permet d'afficher un libellé FR
// tout en conservant la valeur stockée brute.
function BrandSelect({ value, options, onChange, display }: { value: string; options: readonly string[]; onChange: (value: string) => void; display?: (value: string) => string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const label = (v: string) => (display ? display(v) : v)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between rounded-[8px] border border-border bg-fg/[0.12] px-2.5 text-left text-[12px] font-bold text-text-primary transition-colors hover:border-accent focus:border-accent"
      >
        <span className="truncate">{label(value)}</span>
        <ChevronDown size={14} className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-[220px] overflow-y-auto rounded-[10px] border border-[#e2e2e2] bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false) }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${value === opt ? 'bg-[#fff1ec] text-[#e64414]' : 'text-[#111114] hover:bg-[#f4f4f4]'}`}
            >
              {label(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Liste éditable branchée au brandStore (puces ou lignes) + suppression par item.
function BrandList({ listKey, variant, emptyLabel }: { listKey: BrandListKey; variant: 'chip' | 'row'; emptyLabel: string }) {
  const tr = useT()
  const items = useBrand((s) => s[listKey] as string[])
  const updateItem = useBrand((s) => s.updateItem)
  const removeItem = useBrand((s) => s.removeItem)

  if (items.length === 0) {
    return <p className="text-[12px] font-medium italic text-text-muted">{emptyLabel}</p>
  }

  if (variant === 'chip') {
    return (
      <div className="flex max-w-[460px] flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 rounded-[8px] bg-fg/[0.12] px-2 py-1">
            <input value={item} onChange={(e) => updateItem(listKey, i, e.target.value)} className="w-[96px] bg-transparent text-[12px] font-bold text-text-primary outline-none" />
            <button type="button" onClick={() => removeItem(listKey, i)} className="text-text-muted transition hover:text-coral" aria-label={tr("common.delete")}><X size={12} /></button>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-[8px] border border-border bg-fg/[0.12] px-3 py-1.5 transition-colors focus-within:border-accent">
          <input value={item} onChange={(e) => updateItem(listKey, i, e.target.value)} className="flex-1 bg-transparent text-[12px] font-bold text-text-primary outline-none" />
          <button type="button" onClick={() => removeItem(listKey, i)} className="text-text-muted transition hover:text-coral" aria-label={tr("common.delete")}><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

export default function ParametresView(_props: Props) {
  const tr = useT()
  const [activeTab, setActiveTab] = useState<BrandTabId>('identity')
  const activeBrandId = useBrands((s) => s.activeBrandId)
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
  const [isTemplateAiModalOpen, setIsTemplateAiModalOpen] = useState(false)
  const [folderColor, setFolderColor] = useState(folderColors[0])
  const searchParams = useSearchParams()
  const router = useRouter()
  const section = searchParams.get('section') ?? 'profile'

  // ── Profil de marque (chargé/sauvé par marque active via BrandProfileSync) ──
  const brand = useBrand()
  const saveStatus = useBrandSave((s) => s.status)
  const campaign = useCampaignSettings()
  const production = useProduction()
  const [prodPrompt, setProdPrompt] = useState('')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [prodProductId, setProdProductId] = useState<string | null>(null)
  const [prodAvatarId, setProdAvatarId] = useState<string | null>(null)
  const [prodAttachMenu, setProdAttachMenu] = useState<'product' | 'avatar' | 'competitor' | null>(null)
  const [prodAvatars, setProdAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [generatingProdPrompt, setGeneratingProdPrompt] = useState(false)
  const [prodCompetitor, setProdCompetitor] = useState<string | null>(null) // inspiration concurrent (optionnel)
  // Veille concurrentielle — persistée dans le brandStore (survit à la navigation)
  const competitors = brand.competitors ?? []
  const [discoveringComp, setDiscoveringComp] = useState(false)
  const [compQuery, setCompQuery] = useState('')
  useEffect(() => { actionListAvatarsForPicker().then(setProdAvatars).catch(() => {}) }, [])

  // Découverte (remplace) ou analyse ciblée (fusionne, dédoublonne par nom).
  async function discoverComp(query?: string) {
    if (discoveringComp) return
    setDiscoveringComp(true)
    try {
      const res = await actionDiscoverCompetitors({
        brandName: brand.name,
        category: brand.category,
        description: brand.description,
        audience: brand.targetAudience,
        query: query?.trim() || undefined,
      })
      if (res.competitors.length === 0) { toast.info(tr('params.comp.tNotFound')); return }
      if (query?.trim()) {
        const existing = brand.competitors ?? []
        const seen = new Set(existing.map((c) => c.name.toLowerCase()))
        const merged = [...res.competitors.filter((c) => !seen.has(c.name.toLowerCase())), ...existing]
        brand.setField('competitors', merged)
        setCompQuery('')
      } else {
        brand.setField('competitors', res.competitors)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Recherche impossible')
    } finally {
      setDiscoveringComp(false)
    }
  }

  function removeCompetitor(index: number) {
    const removed = (brand.competitors ?? [])[index]?.name
    brand.setField('competitors', (brand.competitors ?? []).filter((_, i) => i !== index))
    if (removed) brand.setField('trackedCompetitors', (brand.trackedCompetitors ?? []).filter((n) => n !== removed))
  }

  const tracked = brand.trackedCompetitors ?? []
  function toggleTracked(name: string) {
    if (tracked.includes(name)) {
      brand.setField('trackedCompetitors', tracked.filter((n) => n !== name))
    } else if (tracked.length >= 3) {
      toast.info('3 concurrents maximum à suivre')
    } else {
      brand.setField('trackedCompetitors', [...tracked, name])
    }
  }

  // Analyse profonde d'un concurrent → playbook adapté à notre marque (modale).
  const [strategyFor, setStrategyFor] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<CompetitorStrategy | null>(null)
  const [loadingStrategy, setLoadingStrategy] = useState(false)

  // Depuis le playbook → préparer une pub inspirée de ce concurrent dans Production.
  function useCompetitorInProduction(name: string) {
    setProdCompetitor(name)
    const t = brand.trackedCompetitors ?? []
    if (!t.includes(name) && t.length < 3) brand.setField('trackedCompetitors', [...t, name]) // pour qu'il apparaisse dans le sélecteur
    setStrategyFor(null)
    setStrategy(null)
    toast.info('Concurrent sélectionné comme inspiration — choisis un type de contenu')
    router.push('/parametres?section=production')
  }

  async function analyzeStrategy(competitorName: string) {
    setStrategyFor(competitorName)
    setStrategy(null)
    setLoadingStrategy(true)
    try {
      const res = await actionAnalyzeCompetitorStrategy({
        competitor: competitorName,
        brandName: brand.name,
        description: brand.description,
        tone: brand.communicationTone,
        audience: brand.targetAudience,
        product: products[0]?.name,
        dna: brand.dnaText,
      })
      setStrategy(res)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analyse impossible')
      setStrategyFor(null)
    } finally {
      setLoadingStrategy(false)
    }
  }

  // Prompt créatif IA : analyse le produit + l'ADN/ton/audience de la marque pour un brief sur-mesure.
  async function genCreativePrompt(cardId: string, productId: string | null, contentLabel: string) {
    setGeneratingProdPrompt(true)
    try {
      const prod = productId ? products.find((p) => p.id === productId) : undefined
      const res = await actionGenerateProductionPrompt({
        contentType: contentLabel,
        brand: {
          name: brand.name,
          website: brand.website,
          description: brand.description,
          tone: brand.communicationTone,
          audience: brand.targetAudience,
          keyFeatures: brand.keyFeatures,
          preferredWords: brand.preferredWords,
          wordsToAvoid: brand.wordsToAvoid,
          audienceDesires: brand.audienceDesires,
          audienceProblems: brand.audienceProblems,
          dna: brand.dnaText,
        },
        product: prod ? { name: prod.name, description: prod.description ?? undefined, benefits: prod.benefits, price: prod.price ?? undefined } : undefined,
        inspiredBy: (() => {
          const comp = prodCompetitor ? (brand.competitors ?? []).find((c) => c.name === prodCompetitor) : undefined
          return comp ? { name: comp.name, positioning: comp.positioning, angles: comp.adAngles } : undefined
        })(),
        language: 'fr',
      })
      if (res.prompt) setProdPrompt(res.prompt)
    } catch {
      toast.error(tr('params.tPromptFailed'))
    } finally {
      setGeneratingProdPrompt(false)
    }
  }
  const setSettings = useSettings((s) => s.setSettings)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  async function handleLogoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try { brand.setField('logoDataUrl', await fileToDataUrl(file)) } catch { /* ignore */ }
  }
  function updateName(value: string) {
    brand.setField('name', value)
    setSettings({ studioName: value || 'My Brand' })
  }

  // ── Importer le profil depuis le site de la marque ──
  const [importingBrand, setImportingBrand] = useState(false)
  async function importBrandFromSite() {
    const url = brand.website.trim()
    if (!url) { toast.error('Ajoute d\'abord l\'URL de ton site'); return }
    setImportingBrand(true)
    try {
      const a = await actionAnalyzeBrandUrl(url)
      if (a.name) updateName(a.name)
      if (a.description) brand.setField('description', a.description)
      if (a.category && BRAND_CATEGORIES.includes(a.category)) brand.setField('category', a.category)
      if (a.communicationTone) brand.setField('communicationTone', a.communicationTone)
      if (a.targetAudience) brand.setField('targetAudience', a.targetAudience)
      if (a.keyFeatures?.length) brand.setField('keyFeatures', a.keyFeatures)
      if (a.preferredWords?.length) brand.setField('preferredWords', a.preferredWords)
      if (a.audienceDesires?.length) brand.setField('audienceDesires', a.audienceDesires)
      if (a.audienceProblems?.length) brand.setField('audienceProblems', a.audienceProblems)
      toast.success(tr('params.tProfilePrefilled'))
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Analyse du site impossible') }
    finally { setImportingBrand(false) }
  }

  // ── Produits (vrai backend Supabase) ──
  const toast = useToast()

  // Import du document ADN : on stocke le nom, et le texte pour les formats texte (injectable en prompt).
  async function handleDnaUpload(file: File | undefined) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Fichier trop lourd (max 10 Mo)'); return }
    brand.setField('dnaFileName', file.name)
    const isText = /\.(md|txt)$/i.test(file.name) || file.type.startsWith('text/')
    try { brand.setField('dnaText', isText ? (await file.text()).slice(0, 20000) : '') } catch { /* ignore */ }
    toast.success(tr('params.tDnaImported'))
  }
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [pName, setPName] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pCurrency, setPCurrency] = useState('USD')
  const [pPrice, setPPrice] = useState('')
  const [pBenefits, setPBenefits] = useState<string[]>([])
  const [pBenefitDraft, setPBenefitDraft] = useState('')
  const [pImage, setPImage] = useState<{ path: string; url: string } | null>(null)
  const [pAdditional, setPAdditional] = useState<{ path: string; url: string }[]>([])
  const [pUrl, setPUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [creating, setCreating] = useState(false)
  const productImgRef = useRef<HTMLInputElement | null>(null)
  const additionalImgRef = useRef<HTMLInputElement | null>(null)
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD']

  useEffect(() => { actionListProducts().then(setProducts).catch(() => {}) }, [])

  function resetProductForm() {
    setPName(''); setPDesc(''); setPCurrency('USD'); setPPrice(''); setPBenefits([]); setPBenefitDraft(''); setPImage(null); setPAdditional([]); setPUrl('')
  }

  async function uploadProductImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const fd = new FormData(); fd.append('file', file)
      const { path, signedUrl } = await actionUploadProductImage(fd)
      setPImage({ path, url: signedUrl ?? '' })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'upload') }
  }

  async function uploadAdditionalImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const fd = new FormData(); fd.append('file', file)
      const { path, signedUrl } = await actionUploadProductImage(fd)
      setPAdditional((a) => [...a, { path, url: signedUrl ?? '' }])
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'upload') }
  }

  async function analyzeProductUrl() {
    if (!pUrl.trim() || analyzing) return
    setAnalyzing(true)
    try {
      const a = await actionAnalyzeProductUrl(pUrl.trim())
      if (a.name) setPName(a.name)
      if (a.description) setPDesc(a.description)
      if (a.price) setPPrice(a.price)
      if (a.currency) setPCurrency(a.currency)
      if (a.benefits?.length) setPBenefits(a.benefits)
      if (a.image) setPImage({ path: a.image.path, url: a.image.signedUrl ?? '' })
      toast.success('Fiche pré-remplie')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'analyse') }
    finally { setAnalyzing(false) }
  }

  function addBenefit() {
    const v = pBenefitDraft.trim()
    if (!v) return
    setPBenefits((b) => [...b, v]); setPBenefitDraft('')
  }

  async function createProduct() {
    if (creating) return
    if (!pName.trim()) { toast.error('Nom requis'); return }
    setCreating(true)
    try {
      await actionCreateProduct({ name: pName, description: pDesc || null, currency: pCurrency, price: pPrice || null, benefits: pBenefits, imagePath: pImage?.path ?? null, additionalPaths: pAdditional.map((a) => a.path) })
      setProducts(await actionListProducts())
      toast.success(tr("params.prod.tCreated"))
      resetProductForm()
      setIsProductDrawerOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : tr("params.prod.tCreateFailed")) }
    finally { setCreating(false) }
  }

  async function deleteProduct(id: string) {
    try { await actionDeleteProduct(id); setProducts((p) => p.filter((x) => x.id !== id)); toast.success(tr("params.prod.tDeleted")) }
    catch { toast.error('Échec de la suppression') }
  }

  // ── Brand Assets (vrai backend Supabase) ──
  const [folders, setFolders] = useState<FolderDTO[]>([])
  const [assets, setAssets] = useState<BrandAssetDTO[]>([])
  const [assetType, setAssetType] = useState<AssetType>('image')
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const assetUploadRef = useRef<HTMLInputElement | null>(null)
  const ASSET_ACCEPT: Record<AssetType, string> = { image: 'image/*', video: 'video/*', audio: 'audio/*' }
  const [isAssetAiOpen, setIsAssetAiOpen] = useState(false)
  const [assetAiPrompt, setAssetAiPrompt] = useState('')
  const [assetAiAspect, setAssetAiAspect] = useState('1:1')
  const [generatingAssetAi, setGeneratingAssetAi] = useState(false)

  useEffect(() => {
    actionListFolders().then(setFolders).catch(() => {})
    actionListBrandAssets().then(setAssets).catch(() => {})
  }, [])

  const visibleAssets = assets.filter((a) => a.type === assetType && (activeFolderId ? a.folderId === activeFolderId : true))

  async function createFolder() {
    if (creatingFolder) return
    if (!folderName.trim()) { toast.error('Nom de dossier requis'); return }
    setCreatingFolder(true)
    try {
      const folder = await actionCreateFolder({ name: folderName.trim(), color: folderColor })
      setFolders((f) => [folder, ...f])
      toast.success(tr("params.asset.tFolderCreated"))
      setFolderName(''); setIsCreateFolderOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : tr("params.prod.tCreateFailed")) }
    finally { setCreatingFolder(false) }
  }

  async function uploadAsset(file: File | undefined) {
    if (!file || uploadingAsset) return
    setUploadingAsset(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', assetType)
      if (activeFolderId) fd.append('folderId', activeFolderId)
      const asset = await actionUploadBrandAsset(fd)
      setAssets((a) => [asset, ...a])
      toast.success(tr("params.asset.tImported"))
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'import') }
    finally { setUploadingAsset(false) }
  }

  async function deleteAsset(id: string) {
    try { await actionDeleteBrandAsset(id); setAssets((a) => a.filter((x) => x.id !== id)); toast.success(tr("params.asset.tAssetDeleted")) }
    catch { toast.error('Échec de la suppression') }
  }

  async function deleteFolder(id: string) {
    try {
      await actionDeleteFolder(id)
      setFolders((f) => f.filter((x) => x.id !== id))
      if (activeFolderId === id) setActiveFolderId(null)
      actionListBrandAssets().then(setAssets).catch(() => {}) // les fichiers du dossier ont pu changer
      toast.success(tr("params.asset.tFolderDeleted"))
    } catch { toast.error('Échec de la suppression du dossier') }
  }

  async function generateAsset() {
    if (generatingAssetAi) return
    if (!assetAiPrompt.trim()) { toast.error(tr("params.asset.tNeedPrompt")); return }
    setGeneratingAssetAi(true)
    try {
      const asset = await actionGenerateBrandAsset({ prompt: assetAiPrompt.trim(), aspect: assetAiAspect, folderId: activeFolderId })
      setAssets((a) => [asset, ...a])
      setAssetType('image')
      toast.success(tr("params.asset.tImageGenerated"))
      setAssetAiPrompt(''); setIsAssetAiOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : tr("params.asset.tGenFailed")) }
    finally { setGeneratingAssetAi(false) }
  }

  // ── Brand Templates (vrai backend Supabase + génération IA) ──
  const [templates, setTemplates] = useState<BrandTemplateDTO[]>([])
  const [uploadingTpl, setUploadingTpl] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAspect, setAiAspect] = useState('1:1')
  const [generatingTpl, setGeneratingTpl] = useState(false)
  const tplUploadRef = useRef<HTMLInputElement | null>(null)
  const ASPECTS = ['1:1', '16:9', '9:16', '4:5']
  const [selectedTplIds, setSelectedTplIds] = useState<Set<string>>(new Set())
  const [savingTplSelection, setSavingTplSelection] = useState(false)
  const [systemTemplates, setSystemTemplates] = useState<TemplateDTO[]>([])
  const [selectedSysIds, setSelectedSysIds] = useState<Set<string>>(new Set())
  const [tplTab, setTplTab] = useState<'mine' | 'system'>('mine')

  useEffect(() => {
    actionListBrandTemplates().then((t) => {
      setTemplates(t)
      setSelectedTplIds(new Set(t.filter((x) => x.active).map((x) => x.id))) // pré-coche les actifs
    }).catch(() => {})
    // Templates Images du système (catalogue global) + sélection déjà mémorisée pour la marque.
    listTemplates().then((all) => setSystemTemplates(all.filter((t) => t.kind === 'image'))).catch(() => {})
    setSelectedSysIds(new Set(brand.activeSystemTemplateIds ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSysSelected(id: string) {
    setSelectedSysIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleTplSelected(id: string) {
    setSelectedTplIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function saveTplSelection() {
    if (savingTplSelection) return
    setSavingTplSelection(true)
    try {
      const ids = Array.from(selectedTplIds)
      await actionSetActiveBrandTemplates(ids)
      setTemplates((list) => list.map((t) => ({ ...t, active: selectedTplIds.has(t.id) })))
      brand.setField('activeSystemTemplateIds', Array.from(selectedSysIds)) // sélection système (localStorage)
      const total = ids.length + selectedSysIds.size
      toast.success(`${total} template(s) actif(s) enregistré(s)`)
      setIsTemplatePickerOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'enregistrement') }
    finally { setSavingTplSelection(false) }
  }

  async function uploadTemplate(file: File | undefined) {
    if (!file || uploadingTpl) return
    setUploadingTpl(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const tpl = await actionUploadBrandTemplate(fd)
      setTemplates((t) => [tpl, ...t])
      toast.success(tr("params.tpl.tImported"))
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'import') }
    finally { setUploadingTpl(false) }
  }

  async function generateTemplate() {
    if (generatingTpl) return
    if (!aiPrompt.trim()) { toast.error(tr("params.tpl.tNeedPrompt")); return }
    setGeneratingTpl(true)
    try {
      const tpl = await actionGenerateBrandTemplate({ prompt: aiPrompt.trim(), aspect: aiAspect })
      setTemplates((t) => [tpl, ...t])
      toast.success(tr("params.tpl.tGenerated"))
      // On garde le sélecteur ouvert pour valider la sélection ; on ferme juste la modale IA.
      setAiPrompt(''); setIsTemplateAiModalOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : tr("params.asset.tGenFailed")) }
    finally { setGeneratingTpl(false) }
  }

  async function deleteTemplate(id: string) {
    try { await actionDeleteBrandTemplate(id); setTemplates((t) => t.filter((x) => x.id !== id)); toast.success(tr("params.tpl.tDeleted")) }
    catch { toast.error('Échec de la suppression') }
  }

  if (section === 'products') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border px-5">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight text-text-primary">{tr('params.prod.title')}</h1>
            <button
              type="button"
              onClick={() => setIsProductDrawerOpen(true)}
              className="flex h-9 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <Plus size={16} strokeWidth={2.4} />
              {tr('params.prod.add')}
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-16">
              <div className="flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-fg/[0.08] text-text-secondary">
                  <Box size={31} strokeWidth={2.3} />
                </span>
                <p className="mt-5 text-[15px] font-semibold text-text-secondary">{tr('params.prod.empty')}</p>
                <button
                  type="button"
                  onClick={() => setIsProductDrawerOpen(true)}
                  className="mt-2.5 flex h-8 items-center gap-2 rounded-[8px] border border-border bg-fg/[0.06] px-4 text-[13px] font-extrabold text-text-primary shadow-sm transition hover:border-accent/60"
                >
                  <Plus size={16} strokeWidth={2.4} />
                  {tr('params.prod.add')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} className="group relative overflow-hidden rounded-[12px] border border-border bg-fg/[0.04]">
                  <div className="aspect-square w-full overflow-hidden bg-fg/[0.06]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-text-faint"><Box size={30} /></span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-[13px] font-extrabold text-text-primary">{product.name}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-text-muted">{product.price ? `${product.price} ${product.currency ?? ''}` : '—'}</p>
                  </div>
                  <button type="button" onClick={() => deleteProduct(product.id)} className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-black/70 text-white transition group-hover:grid" aria-label={tr('params.prod.delete')}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>

        {isProductDrawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/75">
            <button
              type="button"
              aria-label={tr("params.prod.closePanel")}
              className="absolute inset-0 cursor-default"
              onClick={() => setIsProductDrawerOpen(false)}
            />
            <aside className="relative z-10 h-full w-full max-w-[440px] overflow-y-auto bg-bg-card px-4 py-5 text-text-primary shadow-neo lg:px-5">
              <button
                type="button"
                aria-label={tr("params.prod.closePanel")}
                onClick={() => setIsProductDrawerOpen(false)}
                className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-fg/[0.06] text-text-secondary transition hover:bg-fg/[0.12] hover:text-text-primary"
              >
                <X size={15} strokeWidth={2.4} />
              </button>

              <div className="flex items-start justify-between gap-3 pr-9">
                <div>
                  <h2 className="font-display text-[15px] font-extrabold leading-tight tracking-tight">{tr("params.prod.add")}</h2>
                  <p className="mt-0.5 text-[12px] font-medium text-text-secondary">{tr("params.prod.drawerSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={createProduct}
                  disabled={creating}
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] bg-accent px-3 text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  {creating ? tr("params.prod.creating") : tr("params.prod.create")}
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                  <Sparkles size={13} className="text-accent" strokeWidth={2.3} />
                  {tr("params.prod.prefillUrl")}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-8 min-w-0 items-center gap-2 rounded-[7px] border border-border bg-fg/[0.06] px-2.5 text-text-primary">
                    <LinkIcon size={14} strokeWidth={2.2} />
                    <input
                      aria-label={tr("params.prod.urlAria")}
                      value={pUrl}
                      onChange={(e) => setPUrl(e.target.value)}
                      placeholder="https://tasite.com/produits/mon-produit"
                      className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold outline-none placeholder:text-text-muted"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={analyzeProductUrl}
                    disabled={analyzing || !pUrl.trim()}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-accent px-3.5 text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Sparkles size={13} strokeWidth={2.3} />
                    {analyzing ? tr("params.prod.analyzing") : tr("params.prod.analyze")}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[104px_1fr]">
                <button
                  type="button"
                  onClick={() => productImgRef.current?.click()}
                  aria-label={tr("params.prod.importImage")}
                  className="grid aspect-square min-h-[96px] place-items-center overflow-hidden rounded-[9px] bg-fg/[0.08] text-text-faint transition hover:bg-fg/[0.12]"
                >
                  {pImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pImage.url} alt="Product" className="h-full w-full object-cover" />
                  ) : (
                    <Box size={26} strokeWidth={2.2} />
                  )}
                </button>
                <input ref={productImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadProductImage(e.target.files?.[0])} />

                <div className="space-y-2.5">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                      {tr("params.prod.name")}
                    </span>
                    <input
                      aria-label={tr("params.prod.name")}
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder={tr("params.prod.namePlaceholder")}
                      className="h-8 w-full rounded-[7px] border border-border bg-fg/[0.06] px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                      {tr("params.prod.description")}
                    </span>
                    <textarea
                      aria-label={tr("params.prod.description")}
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder={tr("params.prod.descPlaceholder")}
                      className="h-[54px] w-full resize-none rounded-[7px] border border-border bg-fg/[0.06] px-3 py-2 text-[12px] font-semibold text-text-primary outline-none focus:border-accent"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                  {tr("params.prod.price")}
                </span>
                <div className="grid gap-2 sm:grid-cols-[84px_1fr]">
                  <BrandSelect value={pCurrency} options={CURRENCIES} onChange={(v) => setPCurrency(v)} />
                  <input
                    aria-label={tr("params.prod.price")}
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-8 rounded-[7px] border border-border bg-fg/[0.06] px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                  {tr("params.prod.benefits")}
                </span>
                <div className="grid gap-2 sm:grid-cols-[1fr_36px]">
                  <input
                    aria-label={tr("params.prod.benefits")}
                    value={pBenefitDraft}
                    onChange={(e) => setPBenefitDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } }}
                    placeholder={tr("params.prod.benefitPlaceholder")}
                    className="h-8 rounded-[7px] border border-border bg-fg/[0.06] px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    aria-label={tr("params.prod.addBenefit")}
                    className="grid h-8 place-items-center rounded-[7px] bg-fg/[0.06] text-text-muted transition hover:bg-fg/[0.12]"
                  >
                    <Plus size={16} strokeWidth={2.1} />
                  </button>
                </div>
                {pBenefits.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pBenefits.map((benefit, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-[7px] bg-fg/[0.08] px-2 py-1 text-[11px] font-semibold text-text-primary">
                        {benefit}
                        <button type="button" onClick={() => setPBenefits((b) => b.filter((_, j) => j !== i))} className="text-text-muted hover:text-text-primary" aria-label={tr("params.prod.removeBenefit")}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                  {tr("params.prod.additionalImages")} ({pAdditional.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {pAdditional.map((img, i) => (
                    <div key={i} className="group relative h-[80px] w-[80px] overflow-hidden rounded-[9px] border border-border bg-fg/[0.06]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setPAdditional((a) => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded-full bg-black/70 text-white group-hover:grid" aria-label={tr("params.prod.removeImage")}><X size={11} /></button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => additionalImgRef.current?.click()}
                    className="grid h-[80px] w-[80px] place-items-center rounded-[9px] border-2 border-dashed border-border-strong bg-fg/[0.06] text-text-secondary transition hover:border-accent hover:text-accent"
                  >
                    <span className="flex flex-col items-center gap-1.5 text-[11px] font-semibold">
                      <Upload size={15} strokeWidth={2.2} />
                      {tr("params.prod.importImg")}
                    </span>
                  </button>
                  <input ref={additionalImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAdditionalImage(e.target.files?.[0])} />
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    )
  }

  if (section === 'assets') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border px-5">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight text-text-primary">{tr("params.asset.title")}</h1>
            <button
              type="button"
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <FolderPlus size={16} strokeWidth={2.35} />
              {tr("params.asset.createFolder")}
            </button>
          </header>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_230px]">
            <main className="flex flex-col overflow-y-auto px-5 py-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className={`h-6 rounded-[8px] px-2.5 text-[10px] font-extrabold transition ${activeFolderId === null ? 'bg-accent text-white' : 'border border-border bg-fg/[0.06] text-text-secondary hover:border-accent/60'}`}
                >{tr("params.asset.all")}</button>
                {folders.map((f) => (
                  <div key={f.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(f.id)}
                      className={`flex h-6 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-extrabold transition ${activeFolderId === f.id ? 'bg-accent text-white' : 'border border-border bg-fg/[0.06] text-text-secondary hover:border-accent/60'}`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color ?? '#888888' }} />
                      {f.name}
                    </button>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={tr("params.asset.deleteFolder")}
                      onClick={(e) => { e.stopPropagation(); deleteFolder(f.id) }}
                      className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer place-items-center rounded-full bg-coral text-white shadow-sm transition hover:scale-110 group-hover:grid"
                    >
                      <X size={10} strokeWidth={2.8} />
                    </span>
                  </div>
                ))}
              </div>

              {visibleAssets.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <div className="flex flex-col items-center text-center">
                    <ImageIcon size={38} strokeWidth={2.2} className="text-text-secondary" />
                    <p className="mt-4 text-[14px] font-extrabold text-text-primary">{tr("params.asset.emptyTitle")}</p>
                    <p className="mt-1.5 text-[12px] font-semibold text-text-secondary">{tr("params.asset.emptyDesc")}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                  {visibleAssets.map((asset) => (
                    <div key={asset.id} className="group relative overflow-hidden rounded-[10px] border border-border bg-fg/[0.04]">
                      <div className="aspect-square w-full overflow-hidden bg-fg/[0.06]">
                        {asset.type === 'image' && asset.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        ) : asset.type === 'video' && asset.url ? (
                          <video src={asset.url} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-text-faint">{asset.type === 'audio' ? <Music size={28} /> : <Video size={28} />}</span>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-text-primary">{asset.name}</p>
                      <button type="button" onClick={() => deleteAsset(asset.id)} className="absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-black/70 text-white group-hover:grid" aria-label={tr("params.asset.deleteFile")}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </main>

            <aside className="border-t border-border px-3 py-3.5 lg:border-l lg:border-t-0">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">{tr("params.asset.fileType")}</h2>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {([['image', ImageIcon, tr('params.asset.images')], ['video', Video, tr('params.asset.videos')], ['audio', Music, tr('params.asset.audio')]] as [AssetType, typeof ImageIcon, string][]).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAssetType(t)}
                    className={`flex h-6 items-center gap-1.5 rounded-[8px] px-2 text-[10px] font-extrabold shadow-neo-sm transition ${
                      assetType === t ? 'bg-accent text-white' : 'border border-border bg-fg/[0.06] text-text-secondary hover:border-accent/60'
                    }`}
                  >
                    <Icon size={13} strokeWidth={2.3} />
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => assetUploadRef.current?.click()}
                disabled={uploadingAsset}
                className="mt-3.5 flex min-h-[140px] w-full flex-col items-center justify-center rounded-[9px] border-2 border-dashed border-border-strong bg-fg/[0.06] px-4 text-center text-text-primary transition hover:border-accent disabled:opacity-60"
              >
                <FileUp size={20} strokeWidth={2.2} />
                <span className="mt-3 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <Upload size={13} strokeWidth={2.4} />
                  {uploadingAsset ? tr('params.asset.importing') : tr(assetType === 'image' ? 'params.asset.importImages' : assetType === 'video' ? 'params.asset.importVideos' : 'params.asset.importAudio')}
                </span>
                <span className="mt-1.5 text-[11px] font-medium leading-snug text-text-secondary">
                  {tr("params.asset.dropHint")}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                  {tr("params.asset.acceptedTypes")}
                  <Info size={11} strokeWidth={2.2} />
                </span>
                <span className="mt-2 max-w-[170px] text-[10px] font-medium leading-snug text-text-muted">
                  {tr("params.asset.sizeLimits")}
                </span>
              </button>
              <input ref={assetUploadRef} type="file" accept={ASSET_ACCEPT[assetType]} className="hidden" onChange={(e) => uploadAsset(e.target.files?.[0])} />

              <div className="my-3 flex items-center gap-2.5">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-extrabold uppercase text-text-muted">{tr("params.asset.or")}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={() => setIsAssetAiOpen(true)}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] border border-border bg-fg/[0.06] text-[12px] font-extrabold text-text-primary shadow-sm transition hover:border-accent/60"
              >
                <Sparkles size={14} strokeWidth={2.3} />
                {tr("params.asset.createWithAi")}
              </button>
            </aside>
          </div>
        </section>

        {isCreateFolderOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <button
              type="button"
              aria-label={tr("params.asset.closeWindow")}
              className="absolute inset-0 cursor-default"
              onClick={() => setIsCreateFolderOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[420px] rounded-[14px] border border-border bg-bg-card px-5 py-5 text-text-primary shadow-neo">
              <button
                type="button"
                aria-label={tr("params.asset.closeWindow")}
                onClick={() => setIsCreateFolderOpen(false)}
                className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"
              >
                <X size={17} strokeWidth={2.2} />
              </button>

              <h2 className="font-display text-[17px] font-extrabold leading-tight tracking-tight">{tr("params.asset.createFolder")}</h2>
              <p className="mt-1 text-[12px] font-medium text-text-secondary">
                {tr("params.asset.createFolderDesc")}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-[88px_1fr] sm:items-end">
                <span aria-hidden className="relative block h-[60px] w-[80px]">
                  <span
                    className="absolute left-0 top-[14px] h-[44px] w-[80px] rounded-[8px] border-[3px] border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span
                    className="absolute left-0 top-0 h-[26px] w-[40px] rounded-t-[8px] border-[3px] border-b-0 border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span className="absolute left-[33px] top-[12px] h-[10px] w-[38px] rounded-tr-[8px] bg-[#050505]" />
                </span>

                <label className="block">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wide text-text-secondary">
                    {tr("params.asset.folderName")}
                  </span>
                  <input
                    autoFocus
                    aria-label={tr("params.asset.folderName")}
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createFolder() } }}
                    placeholder={tr("params.asset.folderName")}
                    className="mt-1.5 h-9 w-full rounded-[8px] border border-accent bg-bg-card px-3 text-[13px] font-medium text-text-primary outline-none ring-1 ring-accent/20 placeholder:text-text-muted"
                  />
                </label>
              </div>

              <div className="mt-5">
                <span className="block text-[11px] font-extrabold uppercase tracking-wide text-text-secondary">{tr("params.asset.color")}</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {folderColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Couleur du dossier ${color}`}
                      onClick={() => setFolderColor(color)}
                      className={`h-9 w-9 rounded-[8px] border transition ${
                        folderColor === color
                          ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-bg-card'
                          : 'border-transparent hover:ring-2 hover:ring-black/15'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="h-9 rounded-[9px] border border-border bg-fg/[0.06] px-4 text-[13px] font-extrabold text-text-primary shadow-sm transition hover:border-accent/60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={createFolder}
                  disabled={creatingFolder}
                  className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                >
                  <Plus size={15} strokeWidth={2.4} />
                  {creatingFolder ? tr("params.asset.creating") : tr("params.asset.createFolderBtn")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAssetAiOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-5 py-7">
            <button type="button" aria-label={tr("params.asset.closeAi")} onClick={() => setIsAssetAiOpen(false)} className="absolute inset-0 cursor-default" />
            <div className="relative z-10 h-[min(82vh,720px)] w-full max-w-[1060px] overflow-hidden rounded-[12px] border border-border bg-bg-card text-text-primary shadow-neo">
              <button type="button" aria-label={tr('params.close')} onClick={() => setIsAssetAiOpen(false)} className="absolute right-6 top-5 z-20 text-text-primary transition hover:text-accent"><X size={22} strokeWidth={2.25} /></button>

              <header className="flex h-[74px] items-center gap-3 border-b border-border px-7">
                <button type="button" aria-label={tr("params.back")} onClick={() => setIsAssetAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-text-primary transition hover:bg-fg/[0.08]"><ChevronLeft size={20} strokeWidth={2.4} /></button>
                <Sparkles size={21} strokeWidth={2.25} className="text-text-primary" />
                <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight">{tr("params.asset.aiTitle")}</h2>
              </header>

              <div className="grid h-[calc(100%-74px)] min-h-0 gap-5 overflow-y-auto px-7 py-7 lg:grid-cols-[1fr_390px]">
                <section className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">{tr("params.asset.imagePreview")}</p>
                  <div className="mt-3 flex min-h-[430px] flex-1 items-center justify-center rounded-[9px] border border-border bg-fg/[0.06] px-5 text-center">
                    {generatingAssetAi ? (
                      <div className="flex flex-col items-center gap-4 text-text-secondary">
                        <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        <p className="text-[15px] font-semibold">{tr("params.asset.generatingFull")}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImagePlus size={54} strokeWidth={2.35} className="text-text-faint" />
                        <p className="mt-5 text-[15px] font-medium text-text-primary">{tr('params.asset.describeHint')}</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">{tr("params.asset.describePrompt")}</p>
                  <div className="mt-3 flex min-h-[180px] flex-col rounded-[9px] border border-border bg-fg/[0.06] p-4">
                    <textarea
                      value={assetAiPrompt}
                      onChange={(e) => setAssetAiPrompt(e.target.value)}
                      placeholder={tr("params.asset.aiPlaceholder")}
                      className="min-h-[96px] flex-1 resize-none bg-transparent text-[15px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
                    />
                    <button type="button" onClick={() => setAssetAiAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])} className="mt-auto flex w-fit items-center gap-2 pt-6 text-[14px] font-extrabold text-text-secondary transition hover:text-accent">
                      <SlidersHorizontal size={16} strokeWidth={2.35} />
                      {tr("params.asset.format")} {assetAiAspect}
                    </button>
                  </div>
                  <button type="button" onClick={generateAsset} disabled={generatingAssetAi} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-accent px-4 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60">
                    <Sparkles size={17} strokeWidth={2.4} />
                    {generatingAssetAi ? tr('params.asset.generating') : <>{tr('params.asset.createWithAi')} <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" /> 2</>}
                  </button>
                </aside>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (section === 'templates') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
          <header className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border px-5">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight text-text-primary">{tr("params.tpl.title")}</h1>
            <button
              type="button"
              onClick={() => setIsTemplatePickerOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <Plus size={16} strokeWidth={2.35} />
              {tr("params.tpl.import")}
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-10">
              <div className="flex max-w-[460px] flex-col items-center text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-fg/[0.08] text-text-secondary">
                  <ImagePlus size={22} strokeWidth={2.3} />
                </span>
                <h2 className="mt-3 font-display text-[15px] font-extrabold leading-tight tracking-tight">
                  {tr("params.tpl.emptyTitle")}
                </h2>
                <p className="mt-1.5 text-[12px] font-medium leading-snug text-text-secondary">
                  {tr("params.tpl.emptyDesc1")}
                  <br />
                  {tr("params.tpl.emptyDesc2")}
                </p>
                <button
                  type="button"
                  onClick={() => setIsTemplatePickerOpen(true)}
                  className="mt-4 flex h-8 items-center gap-2 rounded-[9px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  {tr("params.tpl.importFirst")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {templates.map((tpl) => (
                <div key={tpl.id} className="group relative overflow-hidden rounded-[12px] border border-border bg-fg/[0.04]">
                  <div className="aspect-square w-full overflow-hidden bg-fg/[0.06]">
                    {tpl.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tpl.url} alt={tpl.name} className="h-full w-full object-cover" />
                    ) : <span className="grid h-full w-full place-items-center text-text-faint"><ImageIcon size={28} /></span>}
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-text-primary">{tpl.name}</p>
                  <button type="button" onClick={() => deleteTemplate(tpl.id)} className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-black/70 text-white group-hover:grid" aria-label={tr("params.tpl.delete")}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>

        {isTemplatePickerOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6 py-8">
            <button
              type="button"
              aria-label={tr("params.asset.closeWindow")}
              onClick={() => setIsTemplatePickerOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div className="relative z-10 h-[min(82vh,680px)] w-full max-w-[980px] overflow-hidden rounded-[12px] border border-border bg-bg-card text-text-primary shadow-neo">
              <button
                type="button"
                aria-label={tr("params.close")}
                onClick={() => setIsTemplatePickerOpen(false)}
                className="absolute right-5 top-4 z-20 grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"
              >
                <X size={18} strokeWidth={2.25} />
              </button>

              <div className="grid h-full min-h-0 overflow-y-auto lg:grid-cols-[1fr_300px] lg:overflow-hidden">
                <main className="flex min-h-[480px] flex-col lg:min-h-0">
                  <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-2.5">
                    <div className="flex items-center gap-1 rounded-[9px] bg-fg/[0.06] p-0.5">
                      {([['mine', tr("params.tpl.tabMine", { n: selectedTplIds.size })], ['system', tr("params.tpl.tabSystem", { n: selectedSysIds.size })]] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTplTab(id)}
                          className={`rounded-[7px] px-3 py-1.5 text-[12px] font-extrabold transition ${tplTab === id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </header>

                  {tplTab === 'mine' ? (
                    templates.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center px-5 py-12">
                        <div className="flex flex-col items-center text-center">
                          <ImageIcon size={42} strokeWidth={2.45} className="text-text-faint" />
                          <p className="mt-4 text-[15px] font-extrabold text-text-primary">{tr("params.tpl.noTemplate")}</p>
                          <p className="mt-1.5 text-[13px] font-medium text-text-secondary">
                            {tr("params.tpl.noTemplateDesc")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
                        {templates.map((tpl) => {
                          const sel = selectedTplIds.has(tpl.id)
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => toggleTplSelected(tpl.id)}
                              className={`group relative overflow-hidden rounded-[10px] border-2 bg-fg/[0.04] text-left transition-all ${sel ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-accent/50'}`}
                            >
                              <div className="aspect-square w-full overflow-hidden bg-fg/[0.06]">
                                {tpl.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={tpl.url} alt={tpl.name} className="h-full w-full object-cover" />
                                ) : <span className="grid h-full w-full place-items-center text-text-faint"><ImageIcon size={24} /></span>}
                              </div>
                              <span className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 transition ${sel ? 'border-accent bg-accent text-white' : 'border-white/80 bg-black/30 text-transparent'}`}>
                                <Check size={12} strokeWidth={3} />
                              </span>
                              <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id) }} className="absolute right-1.5 top-1.5 hidden h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/70 text-white group-hover:grid hover:bg-coral" aria-label={tr("params.tpl.delete")}><X size={12} /></span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    systemTemplates.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center px-5 py-12">
                        <p className="text-[13px] font-medium text-text-secondary">{tr("params.tpl.noSystem")}</p>
                      </div>
                    ) : (
                      <div className="grid flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
                        {systemTemplates.map((tpl) => {
                          const sel = selectedSysIds.has(tpl.id)
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => toggleSysSelected(tpl.id)}
                              title={tpl.label}
                              className={`group relative overflow-hidden rounded-[10px] border-2 bg-fg/[0.04] text-left transition-all ${sel ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-accent/50'}`}
                            >
                              <div className="aspect-square w-full overflow-hidden bg-fg/[0.06]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tpl.url} alt={tpl.label} className="h-full w-full object-cover" />
                              </div>
                              <span className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 transition ${sel ? 'border-accent bg-accent text-white' : 'border-white/80 bg-black/30 text-transparent'}`}>
                                <Check size={12} strokeWidth={3} />
                              </span>
                              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-bold text-white">{tpl.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                    <button
                      type="button"
                      onClick={() => tplTab === 'mine'
                        ? setSelectedTplIds(new Set(templates.map((t) => t.id)))
                        : setSelectedSysIds(new Set(systemTemplates.map((t) => t.id)))}
                      disabled={tplTab === 'mine' ? templates.length === 0 : systemTemplates.length === 0}
                      className="text-[12px] font-extrabold text-text-secondary transition hover:text-accent disabled:opacity-40"
                    >{tr("params.tpl.selectAll")}</button>
                    <button
                      type="button"
                      onClick={saveTplSelection}
                      disabled={savingTplSelection}
                      className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                    >
                      {savingTplSelection ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Enregistrement…</> : <><Check size={15} strokeWidth={2.6} /> {tr("params.tpl.validateSelection")}</>}
                    </button>
                  </div>
                </main>

                <aside className="flex min-h-[400px] flex-col border-t border-border px-4 py-6 lg:min-h-0 lg:border-l lg:border-t-0 lg:py-8">
                  <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-text-secondary">{tr("params.tpl.import")}</h3>
                  <button
                    type="button"
                    onClick={() => tplUploadRef.current?.click()}
                    disabled={uploadingTpl}
                    className="flex min-h-[150px] flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border-strong bg-fg/[0.03] px-4 text-center transition hover:border-accent hover:bg-accent/5 disabled:opacity-60"
                  >
                    <FileUp size={22} strokeWidth={2.2} className="text-text-secondary" />
                    <span className="mt-3 flex items-center gap-2 text-[13px] font-extrabold text-text-primary">
                      <ImageIcon size={15} strokeWidth={2.25} />
                      {uploadingTpl ? tr("params.asset.importing") : tr("params.tpl.clickToImport")}
                    </span>
                    <span className="mt-1.5 text-[12px] font-medium leading-snug text-text-secondary">
                      {tr("params.asset.dropHint")}
                    </span>
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {tr("params.tpl.formats")}
                    </span>
                  </button>

                  <input ref={tplUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadTemplate(e.target.files?.[0])} />

                  <div className="my-4 flex items-center gap-3 text-[11px] font-extrabold text-text-muted">
                    <span className="h-px flex-1 bg-border" />
                    OU
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTemplateAiModalOpen(true)}
                    className="flex h-9 items-center justify-center gap-2 rounded-[9px] border border-border bg-fg/[0.04] text-[13px] font-extrabold text-text-primary shadow-sm transition hover:border-accent/60"
                  >
                    <Sparkles size={16} strokeWidth={2.35} />
                    {tr("params.asset.createWithAi")}
                  </button>

                  <p className="mt-5 text-[11px] font-medium leading-snug text-text-muted">
                    {tr("params.tpl.reusableHint")}
                  </p>
                </aside>
              </div>
            </div>
          </div>
        ) : null}

        {isTemplateAiModalOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-5 py-7">
            <button
              type="button"
              aria-label={tr("params.asset.closeAi")}
              onClick={() => setIsTemplateAiModalOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div className="relative z-10 h-[min(80vh,640px)] w-full max-w-[940px] overflow-hidden rounded-[12px] border border-border bg-bg-card text-text-primary shadow-neo">
              <button
                type="button"
                aria-label={tr("params.close")}
                onClick={() => setIsTemplateAiModalOpen(false)}
                className="absolute right-6 top-5 z-20 text-text-primary transition hover:text-accent"
              >
                <X size={22} strokeWidth={2.25} />
              </button>

              <header className="flex h-[60px] items-center gap-3 border-b border-border px-6">
                <button
                  type="button"
                  aria-label={tr("params.back")}
                  onClick={() => setIsTemplateAiModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-text-primary transition hover:bg-fg/[0.08]"
                >
                  <ChevronLeft size={20} strokeWidth={2.4} />
                </button>
                <Sparkles size={21} strokeWidth={2.25} className="text-text-primary" />
                <h2 className="font-display text-[17px] font-extrabold leading-tight tracking-tight">{tr("params.asset.aiTitle")}</h2>
              </header>

              <div className="grid h-[calc(100%-60px)] min-h-0 gap-5 overflow-y-auto px-7 py-7 lg:grid-cols-[1fr_390px]">
                <section className="flex min-h-[420px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">{tr("params.asset.imagePreview")}</p>
                  <div className="mt-2.5 flex min-h-[340px] flex-1 items-center justify-center rounded-[9px] border border-border bg-fg/[0.06] px-5 text-center">
                    {generatingTpl ? (
                      <div className="flex flex-col items-center gap-4 text-text-secondary">
                        <span className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        <p className="text-[15px] font-semibold">{tr("params.asset.generatingFull")}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImagePlus size={42} strokeWidth={2.35} className="text-text-faint" />
                        <p className="mt-4 text-[13px] font-medium text-text-primary">
                          {tr("params.asset.describeHint")}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="flex min-h-[420px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">{tr("params.asset.describePrompt")}</p>
                  <div className="mt-2.5 flex min-h-[150px] flex-col rounded-[9px] border border-border bg-fg/[0.06] p-3.5">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={tr("params.asset.aiPlaceholder")}
                      className="min-h-[80px] flex-1 resize-none bg-transparent text-[13px] font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      onClick={() => setAiAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])}
                      className="mt-auto flex w-fit items-center gap-2 pt-6 text-[14px] font-extrabold text-text-secondary transition hover:text-accent"
                    >
                      <SlidersHorizontal size={16} strokeWidth={2.35} />
                      {tr("params.asset.format")} {aiAspect}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={generateTemplate}
                    disabled={generatingTpl}
                    className="mt-3 flex h-9 items-center justify-center gap-2 rounded-[8px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Sparkles size={17} strokeWidth={2.4} />
                    {generatingTpl ? tr("params.asset.generating") : <>{tr("params.asset.createWithAi")} <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" /> 2</>}
                  </button>

                  <div className="mt-auto flex items-center justify-end pt-6">
                    <button
                      type="button"
                      onClick={() => setIsTemplateAiModalOpen(false)}
                      className="flex h-9 items-center gap-2 rounded-[8px] px-3 text-[13px] font-extrabold text-text-secondary transition hover:bg-fg/[0.08]"
                    >
                      <X size={16} strokeWidth={2.4} />
                      {tr("params.close")}
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (section === 'production') {
    const PROD_META: Record<string, { href: string; icon: typeof ImageIcon; desc: string }> = {
      'static': { href: '/creer/image/statics', icon: ImageIcon, desc: 'Visuel publicitaire unique, prêt à diffuser.' },
      'carousel': { href: '/creer/image/carousel', icon: Layers, desc: 'Série de visuels coordonnés pour un carrousel.' },
      'product': { href: '/creer/image/product-photoshoot', icon: Box, desc: 'Shooting produit studio généré par IA.' },
      'fashion': { href: '/creer/image/fashion-photoshoot', icon: Shirt, desc: 'Shooting mode sur mannequin IA.' },
      'actor-video': { href: '/creer/video', icon: Video, desc: 'Vidéo avec acteur réaliste et voix off.' },
      'broll-video': { href: '/creer/video', icon: Clapperboard, desc: 'Vidéo B-roll d\'ambiance pour la marque.' },
    }

    const selectedTypes = CONTENT_TYPES.filter((t) => (campaign.campaignTypes ?? []).includes(t.id))
    // Fallback : si aucun type n'a été sélectionné dans les réglages, on présente tout le catalogue
    const noneSelected = selectedTypes.length === 0
    const dayTypes = noneSelected ? [...CONTENT_TYPES] : selectedTypes
    const preTypes = campaign.preEnabled
      ? CONTENT_TYPES.filter((t) => (campaign.preTypes ?? []).includes(t.id))
      : []

    // Quota = nombre de contenus à produire par cadence (réglages campagne)
    const dayQuota = Math.max(1, campaign.campaignCount || 1)
    const preQuota = Math.max(1, campaign.preCount || 1)

    const brandName = brand.name?.trim() || 'la marque'
    const buildPrompt = (id: string): string => {
      switch (id) {
        case 'static': return `Crée une publicité statique pour ${brandName} : accroche percutante, visuel haute conversion, format prêt à diffuser.`
        case 'carousel': return `Crée un carrousel de 3 à 5 visuels coordonnés pour ${brandName}, racontant les bénéfices clés du produit.`
        case 'product': return `Génère un shooting produit studio pour ${brandName} : fond épuré, lumière premium, plusieurs angles.`
        case 'fashion': return `Génère un shooting mode éditorial pour ${brandName} sur mannequin IA, style tendance.`
        case 'actor-video': return `Crée une vidéo avec un acteur réaliste présentant ${brandName} en voix off, ton authentique et engageant.`
        case 'broll-video': return `Crée une vidéo B-roll d'ambiance pour ${brandName} : plans esthétiques, rythme dynamique, sans dialogue.`
        default: return `Crée un contenu marketing pour ${brandName}.`
      }
    }

    // Sélection d'une carte : verrouille le choix (une seule à la fois) et génère le prompt
    const handleSelectCard = (id: string) => {
      if (selectedCard === id) {
        setSelectedCard(null)
        setProdPrompt('')
      } else {
        setSelectedCard(id)
        setProdPrompt(buildPrompt(id)) // baseline instantané
        const label = CONTENT_TYPES.find((c) => c.id === id)?.label ?? 'Contenu'
        genCreativePrompt(id, prodProductId, label) // remplacé par le brief créatif IA
      }
    }

    const prodProduct = products.find((p) => p.id === prodProductId)
    const prodAvatar = prodAvatars.find((a) => a.id === prodAvatarId)

    // Lancement : marque la carte produite (compteur du jour) PUIS ouvre l'outil de création
    // correspondant, en passant le prompt + le produit/avatar attachés (handoff via query).
    const handleLaunch = () => {
      if (!selectedCard) return
      const meta = PROD_META[selectedCard]
      if (!meta) return
      const label = CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu'
      production.markProduced(selectedCard)
      const params = new URLSearchParams({ from: 'production', type: selectedCard })
      if (prodPrompt.trim()) params.set('prompt', prodPrompt.trim())
      if (prodProductId) params.set('product', prodProductId)
      if (prodAvatarId) params.set('avatar', prodAvatarId)
      toast.success(tr("params.production.tLaunched", { label }))
      router.push(`${meta.href}?${params.toString()}`)
    }

    const renderCard = (t: { id: string; label: string }, quota: number) => {
      const meta = PROD_META[t.id]
      if (!meta) return null
      const Icon = meta.icon
      const count = production.countOf(t.id)
      const locked = count >= quota
      const isSelected = selectedCard === t.id

      return (
        <button
          key={t.id}
          type="button"
          disabled={locked}
          onClick={() => handleSelectCard(t.id)}
          className={`group relative flex flex-col justify-between rounded-[11px] border-2 p-3 text-left shadow-sm transition-all ${
            locked
              ? 'cursor-not-allowed border-border bg-fg/[0.06] opacity-70'
              : isSelected
                ? 'border-accent bg-accent/5 ring-2 ring-accent/25'
                : 'border-border bg-bg-card hover:-translate-y-0.5 hover:border-accent hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-[8px] ${locked ? 'bg-fg/[0.08] text-text-muted' : 'bg-accent/12 text-accent'}`}>
              <Icon size={16} strokeWidth={2.4} />
            </span>
            {locked ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                <CheckCircle2 size={11} strokeWidth={2.6} /> {tr("params.production.done")}
              </span>
            ) : isSelected ? (
              <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-white">
                <CheckCircle2 size={11} strokeWidth={2.6} /> {tr("params.production.selected")}
              </span>
            ) : null}
          </div>
          <div className="mt-2.5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-text-primary">{t.label}</h3>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-text-secondary">{meta.desc}</p>
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-text-muted">
              {count}/{quota} {tr("params.production.producedToday")}
            </p>
          </div>
        </button>
      )
    }

    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-5 sm:px-6">
          <h1 className="text-[19px] font-extrabold tracking-tight text-text-primary">Production</h1>
          <Link
            href="/parametres?section=profile"
            className="flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-fg/[0.04] px-3.5 text-[12px] font-extrabold text-text-primary shadow-sm transition-colors hover:border-accent/60"
          >
            <SlidersHorizontal size={14} strokeWidth={2.4} />
            {tr("params.production.campaignSettings")}
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-5 pt-2 sm:px-5">
          <div className="mx-auto w-full max-w-[760px]">
            {(
              <>
                {noneSelected && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-accent/30 bg-accent/5 px-3 py-2">
                    <Info size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-accent" />
                    <p className="text-[12px] font-semibold leading-snug text-text-secondary">
                      {tr("params.production.noneSelected")}{" "}
                      <Link href="/parametres?section=profile" className="underline underline-offset-2 hover:text-accent">
                        {tr("params.production.configureCampaign")}
                      </Link>
                    </p>
                  </div>
                )}
                {/* Jour-J */}
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent text-white">
                    <Megaphone size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-extrabold tracking-tight text-text-primary">{tr("params.production.dDay")}</h2>
                    <p className="text-[12px] font-semibold text-text-secondary">
                      {campaign.campaignCount}× / {campaign.campaignPer === 'day' ? tr('params.production.perDay') : campaign.campaignPer === 'week' ? tr('params.production.perWeek') : tr('params.production.perMonth')} · {dayTypes.length} {tr('params.production.typesContent')}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayTypes.map((t) => renderCard(t, dayQuota))}
                </div>

                {/* Pré-campagne */}
                {preTypes.length > 0 && (
                  <>
                    <div className="mt-7 flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-fg/[0.85] text-white">
                        <CalendarClock size={14} strokeWidth={2.5} />
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold tracking-tight text-text-primary">{tr("params.production.preCampaign")}</h2>
                        <p className="text-[12px] font-semibold text-text-secondary">
                          {campaign.preCount}× / {campaign.prePer === 'day' ? tr('params.production.perDay') : campaign.prePer === 'week' ? tr('params.production.perWeek') : tr('params.production.perMonth')} · {preTypes.length} {tr('params.production.typesContent')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {preTypes.map((t) => renderCard(t, preQuota))}
                    </div>
                  </>
                )}

                {/* Composer IA */}
                <div className="mt-8 mb-1">
                  {selectedCard ? (
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-accent">
                        {generatingProdPrompt
                          ? <><span className="h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" /> {tr("params.production.briefRunning")}</>
                          : <><CheckCircle2 size={13} strokeWidth={2.6} /> {CONTENT_TYPES.find((c) => c.id === selectedCard)?.label} — {tr("params.production.promptReady")}</>}
                      </span>
                      <button
                        type="button"
                        onClick={() => genCreativePrompt(selectedCard, prodProductId, CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu')}
                        disabled={generatingProdPrompt}
                        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-extrabold text-text-secondary transition hover:text-accent disabled:opacity-50"
                        title={tr("params.production.regenerateTitle")}
                      >
                        <Sparkles size={13} strokeWidth={2.4} /> {tr("params.production.regenerate")}
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2 px-1 text-[12px] font-semibold text-text-muted">
                      {tr("params.production.clickCard")}
                    </div>
                  )}
                  <div className={`rounded-[14px] border bg-bg-card px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition-all ${selectedCard ? 'border-accent ring-2 ring-accent/15' : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15'}`}>
                    <textarea
                      value={prodPrompt}
                      onChange={(e) => setProdPrompt(e.target.value)}
                      placeholder={tr("params.production.promptPlaceholder")}
                      rows={3}
                      className="block w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-text-primary outline-none ring-0 placeholder:text-text-muted focus:ring-0"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Produit */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setProdAttachMenu((m) => (m === 'product' ? null : 'product'))}
                            className={`flex h-8 max-w-[160px] items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-extrabold transition-colors ${prodProduct ? 'bg-accent/10 text-accent' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.10]'}`}
                          >
                            <ShoppingBag size={14} strokeWidth={2.3} />
                            <span className="truncate">{prodProduct ? prodProduct.name : tr("params.production.product")}</span>
                            {prodProduct && <X size={12} strokeWidth={2.6} onClick={(e) => { e.stopPropagation(); setProdProductId(null) }} className="shrink-0 hover:scale-110" />}
                          </button>
                          {prodAttachMenu === 'product' && (
                            <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[220px] w-[220px] overflow-y-auto rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                              {products.length === 0 ? (
                                <p className="px-3 py-2 text-[12px] font-medium text-text-muted">{tr("params.production.noProduct")}</p>
                              ) : products.map((p) => (
                                <button key={p.id} type="button" onClick={() => { setProdProductId(p.id); setProdAttachMenu(null); if (selectedCard) genCreativePrompt(selectedCard, p.id, CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu') }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${prodProductId === p.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}>
                                  <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-fg/[0.08]">
                                    {p.imageUrl ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />) : <ShoppingBag size={12} className="text-text-muted" />}
                                  </span>
                                  <span className="truncate">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Avatar */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setProdAttachMenu((m) => (m === 'avatar' ? null : 'avatar'))}
                            className={`flex h-8 max-w-[160px] items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-extrabold transition-colors ${prodAvatar ? 'bg-accent/10 text-accent' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.10]'}`}
                          >
                            <User size={14} strokeWidth={2.3} />
                            <span className="truncate">{prodAvatar ? prodAvatar.name : tr("params.production.avatar")}</span>
                            {prodAvatar && <X size={12} strokeWidth={2.6} onClick={(e) => { e.stopPropagation(); setProdAvatarId(null) }} className="shrink-0 hover:scale-110" />}
                          </button>
                          {prodAttachMenu === 'avatar' && (
                            <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[220px] w-[220px] overflow-y-auto rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                              {prodAvatars.length === 0 ? (
                                <p className="px-3 py-2 text-[12px] font-medium text-text-muted">{tr("params.production.noCharacter")}</p>
                              ) : prodAvatars.map((a) => (
                                <button key={a.id} type="button" onClick={() => { setProdAvatarId(a.id); setProdAttachMenu(null) }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${prodAvatarId === a.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}>
                                  <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-fg/[0.08]">
                                    {a.photoUrl ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={a.photoUrl} alt="" className="h-full w-full object-cover" />) : <User size={12} className="text-text-muted" />}
                                  </span>
                                  <span className="truncate">{a.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Inspiration concurrent (optionnel) — visible si des concurrents sont suivis */}
                        {tracked.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setProdAttachMenu((m) => (m === 'competitor' ? null : 'competitor'))}
                              className={`flex h-8 max-w-[180px] items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-extrabold transition-colors ${prodCompetitor ? 'bg-accent/10 text-accent' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.10]'}`}
                              title={tr("params.production.competitorInspire")}
                            >
                              <Swords size={14} strokeWidth={2.3} />
                              <span className="truncate">{prodCompetitor ? tr("params.production.inspiredBy", { name: prodCompetitor }) : tr("params.production.competitor")}</span>
                              {prodCompetitor && <X size={12} strokeWidth={2.6} onClick={(e) => { e.stopPropagation(); setProdCompetitor(null); if (selectedCard) genCreativePrompt(selectedCard, prodProductId, CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu') }} className="shrink-0 hover:scale-110" />}
                            </button>
                            {prodAttachMenu === 'competitor' && (
                              <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[220px] w-[220px] overflow-y-auto rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                                <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-muted">{tr("params.production.trackedCompetitors")}</p>
                                {tracked.map((name) => (
                                  <button key={name} type="button" onClick={() => { setProdCompetitor(name); setProdAttachMenu(null); if (selectedCard) genCreativePrompt(selectedCard, prodProductId, CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu') }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${prodCompetitor === name ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}>
                                    <Swords size={12} className="shrink-0 text-text-muted" /> <span className="truncate">{name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleLaunch}
                        disabled={!selectedCard || !prodPrompt.trim()}
                        className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={tr("params.production.launch")}
                      >
                        <ArrowUp size={16} strokeWidth={2.8} />
                      </button>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[tr('params.production.sugAds'), tr('params.production.sugUgc'), tr('params.production.sugBrand'), tr('params.production.sugCompetitors')].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setProdPrompt(s)}
                        className="rounded-[8px] bg-fg/[0.06] px-2.5 py-1 text-[11px] font-extrabold text-text-secondary transition-colors hover:bg-fg/[0.10]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
        </section>
      </div>
    )
  }

  if (section === 'competitors') {
    return (
      <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
        <section className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[19px] font-extrabold tracking-tight text-text-primary">{tr("params.comp.title")}</h1>
            {competitors.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-fg/[0.06] px-2 py-0.5 text-[12px] font-extrabold text-text-secondary">{competitors.length}</span>
            )}
            {tracked.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-extrabold text-accent"><Check size={11} strokeWidth={3} /> {tr("params.comp.tracked", { n: tracked.length })}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => discoverComp()}
            disabled={discoveringComp}
            className="flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
          >
            {discoveringComp ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> {tr("params.comp.searching")}</> : <><Sparkles size={14} strokeWidth={2.4} /> {competitors.length > 0 ? tr("params.comp.relaunch") : tr("params.comp.discover")}</>}
          </button>
        </header>

        {/* Toolbar : analyse d'une marque précise */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-5 py-2.5 sm:px-6">
          <div className="relative w-full max-w-[360px]">
            <Search size={14} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={compQuery}
              onChange={(e) => setCompQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && compQuery.trim()) discoverComp(compQuery.trim()) }}
              placeholder={tr("params.comp.analyzeBrandPlaceholder")}
              className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.04] !pl-9 pr-3 text-[12px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={() => compQuery.trim() && discoverComp(compQuery.trim())}
            disabled={!compQuery.trim() || discoveringComp}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-fg/[0.04] px-3 text-[12px] font-extrabold text-text-primary transition-colors hover:border-accent/60 disabled:opacity-50"
          >
            <Sparkles size={13} strokeWidth={2.3} /> {tr("params.comp.analyze")}
          </button>
        </div>

        {/* Contenu */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:px-6">
          {discoveringComp ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              <p className="mt-4 text-[13px] font-semibold text-text-secondary">{tr("params.comp.analyzingMarket")}</p>
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.06] text-accent">
                <Swords size={24} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-[16px] font-extrabold tracking-tight text-text-primary">{tr("params.comp.emptyTitle")}</h2>
              <p className="mt-1.5 max-w-[380px] text-[13px] font-medium text-text-secondary">
                {tr("params.comp.emptyDesc")}
              </p>
              <button
                type="button"
                onClick={() => discoverComp()}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
              >
                <Sparkles size={15} strokeWidth={2.4} /> {tr("params.comp.discover")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {competitors.map((c, i) => {
                const isTracked = tracked.includes(c.name)
                return (
                <div key={`${c.name}-${i}`} className={`group relative flex flex-col rounded-[14px] border-2 bg-fg/[0.03] p-4 transition-colors ${isTracked ? 'border-accent ring-2 ring-accent/15' : 'border-border'}`}>
                  <button
                    type="button"
                    onClick={() => removeCompetitor(i)}
                    aria-label={tr("params.comp.remove")}
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-bg-card/95 text-text-secondary opacity-0 shadow-neo-sm ring-1 ring-border backdrop-blur transition-all hover:bg-coral hover:text-white hover:ring-coral group-hover:opacity-100"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                  <div className="flex items-start justify-between gap-2 pr-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-fg/[0.08] text-[10px] font-extrabold text-text-secondary">{i + 1}</span>
                        <h3 className="truncate text-[14px] font-extrabold leading-tight text-text-primary">{c.name}</h3>
                      </div>
                      {c.scale && <span className="mt-1 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-accent">{c.scale}</span>}
                    </div>
                    {c.website && (
                      <a href={`https://${c.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-bold text-accent hover:underline">{c.website.replace(/^https?:\/\//, '')}</a>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12px] font-medium leading-snug text-text-secondary">{c.description}</p>
                  {c.positioning && (
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-text-muted"><span className="font-extrabold text-text-secondary">{tr("params.comp.positioning")}</span> {c.positioning}</p>
                  )}
                  {c.adAngles?.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2.5">
                      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-text-muted">{tr("params.comp.adAngles")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.adAngles.map((a, j) => (
                          <span key={j} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTracked(c.name)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-extrabold transition ${isTracked ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-secondary hover:bg-fg/[0.12] hover:text-text-primary'}`}
                      title={isTracked ? 'Ne plus suivre' : 'Suivre ce concurrent (max 3)'}
                    >
                      {isTracked ? <><Check size={13} strokeWidth={2.8} /> {tr("params.comp.tracking")}</> : tr("params.comp.track")}
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeStrategy(c.name)}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-accent/10 text-[12px] font-extrabold text-accent transition hover:bg-accent hover:text-white"
                    >
                      <Swords size={13} strokeWidth={2.4} /> {tr("params.comp.analyze")}
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
        </section>

        {/* Modale : analyse profonde + playbook adapté à notre marque */}
        {strategyFor && (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={() => { if (!loadingStrategy) { setStrategyFor(null); setStrategy(null) } }} />
            <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-full max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent/12 text-accent"><Swords size={15} strokeWidth={2.4} /></span>
                  <div>
                    <h2 className="text-[15px] font-extrabold leading-tight tracking-tight text-text-primary">{strategyFor}</h2>
                    <p className="text-[11px] font-semibold text-text-muted">{tr("params.comp.modalSubtitle")}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { if (!loadingStrategy) { setStrategyFor(null); setStrategy(null) } }} className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"><X size={16} strokeWidth={2.3} /></button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {loadingStrategy || !strategy ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                    <p className="mt-4 text-[13px] font-semibold text-text-secondary">{tr("params.comp.spying")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {strategy.recommendations.length > 0 && (
                      <div className="rounded-[12px] border border-accent/30 bg-accent/5 p-3.5">
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-accent"><Sparkles size={13} strokeWidth={2.5} /> {tr("params.comp.playbook")}</p>
                        <ul className="space-y-1.5">
                          {strategy.recommendations.map((r, i) => (
                            <li key={i} className="flex gap-2 text-[12px] font-semibold leading-snug text-text-primary"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        [tr('params.comp.catStrengths'), strategy.strengths],
                        [tr('params.comp.catWinning'), strategy.winningAngles],
                        [tr('params.comp.catFormats'), strategy.contentFormats],
                        [tr('params.comp.catOffers'), strategy.offers],
                        [tr('params.comp.catChannels'), strategy.channels],
                        [tr('params.comp.catWeaknesses'), strategy.weaknesses],
                      ] as const).filter(([, items]) => items.length > 0).map(([title, items]) => (
                        <div key={title} className="rounded-[10px] border border-border bg-fg/[0.03] p-3">
                          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-text-muted">{title}</p>
                          <ul className="space-y-1">
                            {items.map((it, i) => (
                              <li key={i} className="flex gap-1.5 text-[12px] font-medium leading-snug text-text-secondary"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-text-muted" />{it}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {strategy.sources.length > 0 && (
                      <p className="text-[10px] font-medium text-text-muted">{tr("params.comp.sources")} {strategy.sources.slice(0, 3).map((s, i) => <a key={i} href={s.startsWith('http') ? s : `https://${s}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{(i ? ', ' : '') + s.replace(/^https?:\/\//, '').slice(0, 40)}</a>)}</p>
                    )}
                  </div>
                )}
              </div>
              {strategy && !loadingStrategy && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
                  <p className="text-[11px] font-medium text-text-muted">{tr("params.comp.inspireFooter")}</p>
                  <button
                    type="button"
                    onClick={() => useCompetitorInProduction(strategyFor)}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                  >
                    <Sparkles size={15} strokeWidth={2.4} /> {tr("params.comp.createInspired")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        <header className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-border px-5">
          <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight text-text-primary">{tr('params.title')}</h1>
          {saveStatus === 'saving' ? (
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-text-muted">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-text-muted/40 border-t-text-muted animate-spin" />
              {tr('params.saving')}
            </div>
          ) : saveStatus === 'error' ? (
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-coral">
              <Info size={16} />
              {tr('params.saveError')}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-text-secondary">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {tr('params.saved')}
            </div>
          )}
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-6 lg:grid-cols-[170px_1fr] lg:px-6">
          <aside className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {brandTabs.map((tab) => {
              const Icon = tab.icon

              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-[104px] w-[128px] flex-shrink-0 flex-col items-start justify-between rounded-[15px] border-2 px-4 py-4 text-left transition lg:w-full ${
                    activeTab === tab.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-transparent text-text-primary hover:border-border-strong'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      activeTab === tab.id ? 'bg-accent/15 text-accent' : 'bg-fg/[0.06] text-text-secondary'
                    }`}
                  >
                    <Icon size={19} strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block font-display text-[12px] font-extrabold leading-tight tracking-tight">
                      {tr(`params.tab${tab.id.charAt(0).toUpperCase()}${tab.id.slice(1)}`)}
                    </span>
                    <span className={`mt-1.5 block text-[13px] font-medium leading-tight ${activeTab === tab.id ? 'text-text-secondary' : 'text-text-secondary'}`}>
                      {tr(`params.tab${tab.id.charAt(0).toUpperCase()}${tab.id.slice(1)}Desc`)}
                    </span>
                  </span>
                </button>
              )
            })}
          </aside>

          {activeTab === 'identity' ? (
          <div className="grid gap-x-5 gap-y-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(390px,1.05fr)]">
            <div className="grid gap-5 md:grid-cols-[118px_1fr] xl:col-span-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-fg/[0.06] text-center text-text-primary transition hover:bg-fg/[0.08]"
              >
                {brand.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-[11px] font-extrabold">
                    <Upload size={17} strokeWidth={2.3} />
                    Logo
                  </span>
                )}
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />

              <div className="min-w-0">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">{tr('params.brandName')}</span>
                  <input
                    aria-label={tr('params.brandName')}
                    value={brand.name}
                    onChange={(e) => updateName(e.target.value)}
                    placeholder={tr('params.brandNamePlaceholder')}
                    className="h-9 w-full rounded-[8px] border border-border bg-fg/[0.12] px-3 font-display text-[15px] font-extrabold text-text-primary outline-none transition-colors placeholder:font-medium placeholder:text-text-muted focus:border-accent"
                  />
                </label>

                <div className="mt-4">
                  <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">{tr('params.website')} <span className="font-medium text-text-muted">{tr('params.optional')}</span></span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      inputMode="url"
                      aria-label={tr('params.website')}
                      value={brand.website}
                      onChange={(e) => brand.setField('website', e.target.value)}
                      placeholder="https://exemple.com"
                      className="h-9 flex-1 rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[13px] font-semibold text-text-primary outline-none transition-colors placeholder:font-medium placeholder:text-text-muted focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={importBrandFromSite}
                      disabled={importingBrand || !brand.website.trim()}
                      title={tr('params.importTitle')}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-accent px-3 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-50"
                    >
                      <Sparkles size={14} strokeWidth={2.4} />
                      {importingBrand ? tr('params.importing') : tr('params.import')}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-text-muted">{tr('params.importHint')}</p>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_280px]">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-extrabold">{tr('params.brandCategory')}</span>
                    <BrandSelect value={brand.category} options={BRAND_CATEGORIES} onChange={(v) => brand.setField('category', v)} />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-extrabold">{tr('params.language')}</span>
                    <BrandSelect value={brand.language} options={LANGUAGES} onChange={(v) => brand.setField('language', v)} />
                  </label>
                </div>
              </div>
            </div>

            {/* Brand DNA Section - Full Width */}
            <div className="xl:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="block text-[14px] font-extrabold">{tr('params.dnaTitle')}</span>
              </div>
              <div className="relative flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border bg-fg/[0.03] p-4 transition-colors hover:border-accent/60 hover:bg-accent/5">
                <div className="mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-bg-card shadow-sm">
                  <FileText size={20} className="text-accent" />
                </div>
                {brand.dnaFileName ? (
                  <>
                    <h3 className="max-w-[280px] truncate text-[13px] font-extrabold text-text-primary">{brand.dnaFileName}</h3>
                    <p className="mt-1 text-[11px] font-semibold text-accent">{tr('params.dnaImported')}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-[13px] font-extrabold text-text-primary">{tr('params.dnaImport')}</h3>
                    <p className="mt-1 text-[11px] font-medium text-text-muted">
                      {tr('params.dnaDrop')} <span className="font-bold text-accent">{tr('params.browse')}</span>
                    </p>
                    <p className="mt-1.5 text-[10px] font-semibold text-text-faint">
                      {tr('params.dnaFormats')}
                    </p>
                  </>
                )}
                <input type="file" accept=".pdf,.doc,.docx,.md,.txt" onChange={(e) => handleDnaUpload(e.target.files?.[0])} className="absolute inset-0 cursor-pointer opacity-0" />
              </div>
            </div>

            <div>
              <label className="block">
                <span className="mb-2 block text-[12px] font-extrabold">{tr('params.description')}</span>
                <div className="relative">
                  <textarea
                    value={brand.description}
                    onChange={(e) => brand.setField('description', e.target.value)}
                    className="h-[78px] w-full resize-none rounded-[9px] border border-border bg-fg/[0.04] p-3 text-[12px] font-medium leading-snug text-text-primary outline-none focus:border-accent"
                    maxLength={2000}
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-text-muted">{brand.description.length}/2000</span>
                </div>
              </label>

              <div className="mt-5">
                <div className="mb-2.5 flex items-center gap-2">
                  <Palette size={14} className="text-accent" />
                  <h2 className="text-[12px] font-extrabold">{tr('params.brandColors')}</h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {brand.colors.map((color, i) => (
                    <div key={`${color}-${i}`} className="group relative text-center">
                      <span
                        className="block h-[38px] w-[38px] rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <button
                        type="button"
                        onClick={() => brand.removeItem('colors', i)}
                        className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-fg/[0.85] text-white group-hover:grid"
                        aria-label={tr('params.removeColor')}
                      >
                        <X size={12} />
                      </button>
                      <span className="mt-1.5 block text-[11px] font-extrabold uppercase text-text-muted">{color}</span>
                    </div>
                  ))}
                  <label
                    className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-full border-2 border-dashed border-border-strong text-text-muted transition hover:border-accent hover:text-accent"
                    aria-label={tr('params.addColor')}
                  >
                    <Plus size={20} />
                    <input type="color" className="sr-only" onChange={(e) => brand.addItem('colors', e.target.value.toUpperCase())} />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-[12px] font-extrabold">{tr('params.brandType')}</h2>
              <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-3">
                {brandTypes.map((type) => {
                  const Icon = type.icon
                  const isActive = brand.brandType === type.label

                  return (
                    <button
                      key={type.label}
                      type="button"
                      onClick={() => brand.setField('brandType', type.label)}
                      className={`min-h-[78px] rounded-[10px] border-2 px-2.5 py-2.5 text-left transition ${
                        isActive
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-fg/[0.04] hover:border-border-strong'
                      }`}
                    >
                      <span
                        className={`mb-2 grid h-7 w-7 place-items-center rounded-full ${
                          isActive ? 'bg-accent/15 text-accent' : 'bg-fg/[0.06] text-text-secondary'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.3} />
                      </span>
                      <span className="block text-[13px] font-extrabold leading-tight">{type.label}</span>
                      <span className="mt-1 block text-[11px] font-medium leading-tight text-text-secondary">{type.description}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[12px] font-extrabold">{tr('params.keyPoints')}</h2>
                  <button
                    type="button"
                    onClick={() => brand.addItem('keyFeatures')}
                    className="grid h-7 w-7 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                    aria-label={tr('params.addKeyFeature')}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <BrandList listKey="keyFeatures" variant="row" emptyLabel={tr('params.emptyList')} />
              </div>
            </div>
          </div>
          ) : null}

          {activeTab === 'tone' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold">
                  <Megaphone size={15} className="text-accent" />
                  {tr('params.toneLabel')}
                </span>
                <input
                  aria-label={tr('params.toneLabel')}
                  value={brand.communicationTone}
                  onChange={(e) => brand.setField('communicationTone', e.target.value)}
                  placeholder={tr('params.tonePlaceholder')}
                  className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.04] px-2.5 text-[12px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TONE_PRESETS.map((preset) => {
                  const active = brand.communicationTone.trim().toLowerCase() === preset.toLowerCase()
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => brand.setField('communicationTone', preset)}
                      className={`h-6 rounded-full px-2.5 text-[11px] font-extrabold transition-colors ${active ? 'bg-accent text-white' : 'bg-fg/[0.06] text-text-secondary hover:bg-fg/[0.12] hover:text-text-primary'}`}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-5 xl:grid-cols-2">
                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.preferredWords')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('preferredWords')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addPreferredWord')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="preferredWords" variant="chip" emptyLabel={tr('params.emptyList')} />
                </section>

                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.avoidWords')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('wordsToAvoid')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addAvoidWord')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="wordsToAvoid" variant="chip" emptyLabel={tr('params.emptyList')} />
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.goodExamples')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('goodExamples')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addGoodExample')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="goodExamples" variant="row" emptyLabel={tr('params.emptyList')} />
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.badExamples')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('badExamples')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addBadExample')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="badExamples" variant="row" emptyLabel={tr('params.emptyList')} />
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'audience' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold">
                  <UsersRound size={15} className="text-accent" />
                  {tr('params.targetAudience')}
                </span>
                <div className="relative">
                  <textarea
                    aria-label={tr('params.targetAudience')}
                    value={brand.targetAudience}
                    onChange={(e) => brand.setField('targetAudience', e.target.value)}
                    maxLength={1000}
                    placeholder={tr('params.audiencePlaceholder')}
                    className="h-[70px] w-full resize-none rounded-[9px] border border-border bg-fg/[0.04] p-3 pr-14 text-[12px] font-medium leading-snug text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-text-muted">{brand.targetAudience.length}/1000</span>
                </div>
              </label>

              <div className="mt-6 grid gap-x-6 gap-y-5 xl:grid-cols-2">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.audienceDesires')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('audienceDesires')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addDesire')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="audienceDesires" variant="row" emptyLabel={tr('params.emptyList')} />
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">{tr('params.audienceProblems')}</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('audienceProblems')}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-fg/[0.08]"
                      aria-label={tr('params.addProblem')}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="audienceProblems" variant="row" emptyLabel={tr('params.emptyList')} />
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'campaign' ? (
            <div className="max-w-[720px] space-y-6 pt-1">
              {/* Campaign */}
              <section>
                <div className="mb-2.5 flex items-center gap-2">
                  <CalendarRange size={14} className="text-accent" />
                  <h2 className="text-[12px] font-extrabold">{tr('params.tabCampaign')}</h2>
                </div>
                <label className="block max-w-[320px]">
                  <span className="mb-1.5 block text-[12px] font-extrabold">{tr("params.duration")}</span>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={campaign.campaignDuration} onChange={(e) => campaign.setField('campaignDuration', Math.max(1, Number(e.target.value) || 1))} className="h-8 w-24 rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[12px] font-bold text-text-primary outline-none focus:border-accent" />
                    <div className="flex-1"><BrandSelect value={campaign.campaignUnit} options={DURATION_UNITS} onChange={(v) => campaign.setField('campaignUnit', v as (typeof DURATION_UNITS)[number])} display={(v) => UNIT_FR[v] ?? v} /></div>
                  </div>
                </label>
                <div className="mt-5">
                  <span className="mb-1.5 block text-[12px] font-extrabold">{tr("params.contentToCreate")}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" min={1} value={campaign.campaignCount} onChange={(e) => campaign.setField('campaignCount', Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20 rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[12px] font-bold text-text-primary outline-none focus:border-accent" />
                    <span className="text-[12px] font-semibold text-text-secondary">{tr("params.contentsPer")}</span>
                    <div className="w-[130px]"><BrandSelect value={campaign.campaignPer} options={CADENCE_PER} onChange={(v) => campaign.setField('campaignPer', v as (typeof CADENCE_PER)[number])} display={(v) => PER_FR[v] ?? v} /></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CONTENT_TYPES.map((ct) => {
                      const on = campaign.campaignTypes.includes(ct.id)
                      return (
                        <button key={ct.id} type="button" onClick={() => campaign.toggleType('campaign', ct.id)} className={`h-7 rounded-full px-3 text-[11px] font-extrabold transition ${on ? 'bg-accent text-white' : 'bg-fg/[0.12] text-text-secondary hover:bg-fg/[0.18] hover:text-text-primary'}`}>{CONTENT_FR[ct.id] ?? ct.label}</button>
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* Pre-campaign */}
              <section className="border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone size={14} className="text-accent" />
                    <h2 className="text-[12px] font-extrabold">{tr('params.preCampaign')}</h2>
                  </div>
                  <button type="button" onClick={() => campaign.setField('preEnabled', !campaign.preEnabled)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${campaign.preEnabled ? 'bg-accent' : 'bg-fg/[0.15]'}`} aria-pressed={campaign.preEnabled} aria-label={tr('params.enablePreCampaign')}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${campaign.preEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {campaign.preEnabled ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-extrabold">{tr("params.startDate")}</span>
                        <input type="date" value={campaign.preStartDate} onChange={(e) => campaign.setField('preStartDate', e.target.value)} className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[12px] font-bold text-text-primary outline-none focus:border-accent" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-extrabold">{tr("params.duration")}</span>
                        <div className="flex gap-2">
                          <input type="number" min={1} value={campaign.preDuration} onChange={(e) => campaign.setField('preDuration', Math.max(1, Number(e.target.value) || 1))} className="h-8 w-24 rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[12px] font-bold text-text-primary outline-none focus:border-accent" />
                          <div className="flex-1"><BrandSelect value={campaign.preUnit} options={DURATION_UNITS} onChange={(v) => campaign.setField('preUnit', v as (typeof DURATION_UNITS)[number])} display={(v) => UNIT_FR[v] ?? v} /></div>
                        </div>
                      </label>
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12px] font-extrabold">{tr("params.contentToCreate")}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="number" min={1} value={campaign.preCount} onChange={(e) => campaign.setField('preCount', Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20 rounded-[8px] border border-border bg-fg/[0.12] px-3 text-[12px] font-bold text-text-primary outline-none focus:border-accent" />
                        <span className="text-[12px] font-semibold text-text-secondary">{tr("params.contentsPer")}</span>
                        <div className="w-[130px]"><BrandSelect value={campaign.prePer} options={CADENCE_PER} onChange={(v) => campaign.setField('prePer', v as (typeof CADENCE_PER)[number])} display={(v) => PER_FR[v] ?? v} /></div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CONTENT_TYPES.map((ct) => {
                          const on = campaign.preTypes.includes(ct.id)
                          return (
                            <button key={ct.id} type="button" onClick={() => campaign.toggleType('pre', ct.id)} className={`h-7 rounded-full px-3 text-[11px] font-extrabold transition ${on ? 'bg-accent text-white' : 'bg-fg/[0.12] text-text-secondary hover:bg-fg/[0.18] hover:text-text-primary'}`}>{CONTENT_FR[ct.id] ?? ct.label}</button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] font-medium italic text-text-secondary">{tr('params.preCampaignHint')}</p>
                )}
              </section>

              {/* Post-campaign (à venir) */}
              <section className="border-t border-border pt-5">
                <div className="flex items-center gap-2 text-text-muted">
                  <Info size={14} />
                  <h2 className="text-[12px] font-extrabold">{tr('params.postCampaign')}</h2>
                  <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-text-muted">{tr('params.soon')}</span>
                </div>
              </section>
            </div>
          ) : null}
          {activeTab === 'team' ? (
            <TeamPanel brandId={activeBrandId} />
          ) : null}
        </div>
      </section>
    </div>
  )
}
