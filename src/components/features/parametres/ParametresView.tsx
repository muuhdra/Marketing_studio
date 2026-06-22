'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useBrand, LANGUAGES, BRAND_CATEGORIES, type BrandListKey } from '@/lib/stores/brandStore'
import { useSettings } from '@/lib/stores/settingsStore'
import { useToast } from '@/lib/stores/toastStore'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useCampaignSettings, CONTENT_TYPES, DURATION_UNITS, CADENCE_PER } from '@/lib/stores/campaignSettingsStore'
import { useProduction } from '@/lib/stores/productionStore'
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
  type BrandTemplateDTO,
} from '@/lib/actions/brand-templates'

import {
  Box,
  BriefcaseBusiness,
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
  ArrowRight,
  ArrowUp,
  ShoppingBag,
  User,
  CalendarClock,
  Megaphone,
  Music,
  Palette,
  Plus,
  ShieldCheck,
  Save,
  SlidersHorizontal,
  Sparkles,
  Store,
  Upload,
  UsersRound,
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
    label: 'Identity',
    description: 'Core brand values and assets.',
    icon: ShieldCheck,
  },
  {
    id: 'tone',
    label: 'Tone',
    description: 'Voice guidelines and messaging style.',
    icon: Megaphone,
  },
  {
    id: 'audience',
    label: 'Audience',
    description: 'Target demographics and personas.',
    icon: UsersRound,
  },
  {
    id: 'campaign',
    label: 'Campaign',
    description: 'Duration, pre-campaign & content cadence.',
    icon: CalendarRange,
  },
]

type BrandTabId = (typeof brandTabs)[number]['id']

const colors = [
  { value: '#1A1A1A', bg: '#111111' },
  { value: '#F5F0EB', bg: '#cfcac4' },
  { value: '#C8A882', bg: '#a98d68' },
  { value: '#000000', bg: '#000000' },
]

const brandTypes = [
  { label: 'E-Commerce', description: 'Physical products', icon: Store, active: false },
  { label: 'SaaS / App', description: 'Digital products', icon: Laptop, active: false },
  { label: 'Service', description: 'Agency or Consulting', icon: BriefcaseBusiness, active: true },
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

// Liste éditable branchée au brandStore (puces ou lignes) + suppression par item.
function BrandList({ listKey, variant, emptyLabel }: { listKey: BrandListKey; variant: 'chip' | 'row'; emptyLabel: string }) {
  const items = useBrand((s) => s[listKey] as string[])
  const updateItem = useBrand((s) => s.updateItem)
  const removeItem = useBrand((s) => s.removeItem)

  if (items.length === 0) {
    return <p className="text-[12px] font-medium italic text-[#29292d]">{emptyLabel}</p>
  }

  if (variant === 'chip') {
    return (
      <div className="flex max-w-[460px] flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 rounded-[8px] bg-[#d8d8d8] px-2 py-1">
            <input value={item} onChange={(e) => updateItem(listKey, i, e.target.value)} className="w-[96px] bg-transparent text-[12px] font-semibold text-[#15161a] outline-none" />
            <button type="button" onClick={() => removeItem(listKey, i)} className="text-[#5a5a5e] transition hover:text-[#1a1a1d]" aria-label="Remove"><X size={12} /></button>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 py-2">
          <input value={item} onChange={(e) => updateItem(listKey, i, e.target.value)} className="flex-1 bg-transparent text-[12px] font-medium text-[#15161a] outline-none" />
          <button type="button" onClick={() => removeItem(listKey, i)} className="text-[#5a5a5e] transition hover:text-[#1a1a1d]" aria-label="Remove"><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

export default function ParametresView(_props: Props) {
  const [activeTab, setActiveTab] = useState<BrandTabId>('identity')
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
  const [isTemplateAiModalOpen, setIsTemplateAiModalOpen] = useState(false)
  const [folderColor, setFolderColor] = useState(folderColors[0])
  const searchParams = useSearchParams()
  const section = searchParams.get('section') ?? 'profile'

  // ── Profil de marque (persisté localStorage via brandStore) ──
  const brand = useBrand()
  const campaign = useCampaignSettings()
  const production = useProduction()
  const [prodPrompt, setProdPrompt] = useState('')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const setSettings = useSettings((s) => s.setSettings)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  async function handleLogoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try { brand.setField('logoDataUrl', await fileToDataUrl(file)) } catch { /* ignore */ }
  }
  function cycle(list: string[], current: string, key: 'language' | 'category') {
    const next = list[(list.indexOf(current) + 1) % list.length]
    brand.setField(key, next)
  }
  function updateName(value: string) {
    brand.setField('name', value)
    setSettings({ studioName: value || 'My Brand' })
  }

  // ── Produits (vrai backend Supabase) ──
  const toast = useToast()
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
      toast.success('Produit créé')
      resetProductForm()
      setIsProductDrawerOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la création') }
    finally { setCreating(false) }
  }

  async function deleteProduct(id: string) {
    try { await actionDeleteProduct(id); setProducts((p) => p.filter((x) => x.id !== id)); toast.success('Produit supprimé') }
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
      toast.success('Dossier créé')
      setFolderName(''); setIsCreateFolderOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la création') }
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
      toast.success('Asset importé')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'import') }
    finally { setUploadingAsset(false) }
  }

  async function deleteAsset(id: string) {
    try { await actionDeleteBrandAsset(id); setAssets((a) => a.filter((x) => x.id !== id)); toast.success('Asset supprimé') }
    catch { toast.error('Échec de la suppression') }
  }

  async function generateAsset() {
    if (generatingAssetAi) return
    if (!assetAiPrompt.trim()) { toast.error('Décris l\'image à générer'); return }
    setGeneratingAssetAi(true)
    try {
      const asset = await actionGenerateBrandAsset({ prompt: assetAiPrompt.trim(), aspect: assetAiAspect, folderId: activeFolderId })
      setAssets((a) => [asset, ...a])
      setAssetType('image')
      toast.success('Image générée')
      setAssetAiPrompt(''); setIsAssetAiOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération') }
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

  useEffect(() => { actionListBrandTemplates().then(setTemplates).catch(() => {}) }, [])

  async function uploadTemplate(file: File | undefined) {
    if (!file || uploadingTpl) return
    setUploadingTpl(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const tpl = await actionUploadBrandTemplate(fd)
      setTemplates((t) => [tpl, ...t])
      toast.success('Template importé')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de l\'import') }
    finally { setUploadingTpl(false) }
  }

  async function generateTemplate() {
    if (generatingTpl) return
    if (!aiPrompt.trim()) { toast.error('Décris le template à générer'); return }
    setGeneratingTpl(true)
    try {
      const tpl = await actionGenerateBrandTemplate({ prompt: aiPrompt.trim(), aspect: aiAspect })
      setTemplates((t) => [tpl, ...t])
      toast.success('Template généré')
      setAiPrompt(''); setIsTemplateAiModalOpen(false); setIsTemplatePickerOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec de la génération') }
    finally { setGeneratingTpl(false) }
  }

  async function deleteTemplate(id: string) {
    try { await actionDeleteBrandTemplate(id); setTemplates((t) => t.filter((x) => x.id !== id)); toast.success('Template supprimé') }
    catch { toast.error('Échec de la suppression') }
  }

  if (section === 'products') {
    return (
      <div className="animate-fade-in">
        <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
          <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2.5">
            <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Brand Products</h1>
            <button
              type="button"
              onClick={() => setIsProductDrawerOpen(true)}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-[#e33508] px-5 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <Plus size={18} strokeWidth={2.4} />
              Add new product
            </button>
          </header>

          {products.length === 0 ? (
            <div className="flex min-h-[calc(100vh-112px)] items-center justify-center px-6 py-16">
              <div className="-mt-28 flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-[#d5d5d5] text-[#2f3033]">
                  <Box size={31} strokeWidth={2.3} />
                </span>
                <p className="mt-5 text-[17px] font-semibold text-[#25262a]">No products found.</p>
                <button
                  type="button"
                  onClick={() => setIsProductDrawerOpen(true)}
                  className="mt-2.5 flex h-8 items-center gap-2 rounded-[8px] border border-[#d1d1d1] bg-[#e8e8e8] px-4 text-[13px] font-extrabold text-[#242529] shadow-sm transition hover:border-[#bdbdbd]"
                >
                  <Plus size={16} strokeWidth={2.4} />
                  Add product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-6 py-6 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} className="group relative overflow-hidden rounded-[12px] border border-[#d4d4d4] bg-[#e6e6e6]">
                  <div className="aspect-square w-full overflow-hidden bg-[#dadada]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[#9a9a9a]"><Box size={30} /></span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-[13px] font-extrabold text-[#1a1a1d]">{product.name}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#5a5a5e]">{product.price ? `${product.price} ${product.currency ?? ''}` : '—'}</p>
                  </div>
                  <button type="button" onClick={() => deleteProduct(product.id)} className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-[#1a1a1d]/85 text-white transition group-hover:grid" aria-label="Delete product"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isProductDrawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/75">
            <button
              type="button"
              aria-label="Close add product panel"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsProductDrawerOpen(false)}
            />
            <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto bg-[#eeeeee] px-5 py-6 text-[#1a1a1d] shadow-neo lg:px-6">
              <button
                type="button"
                aria-label="Close add product panel"
                onClick={() => setIsProductDrawerOpen(false)}
                className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border-2 border-[#e33508] text-[#55565a] transition hover:bg-[#eaded8] hover:text-[#e33508]"
              >
                <X size={16} strokeWidth={2.2} />
              </button>

              <div className="flex items-start justify-between gap-3 pr-9">
                <div>
                  <h2 className="font-display text-[17px] font-extrabold leading-tight tracking-tight">
                    Add new product
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium text-[#34353a]">Create a new product for your brand</p>
                </div>
                <button
                  type="button"
                  onClick={createProduct}
                  disabled={creating}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-[#e98d72] px-3.5 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  {creating ? 'Creating…' : 'Create product'}
                </button>
              </div>

              <div className="mt-6">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  <Sparkles size={13} className="text-[#e33508]" strokeWidth={2.3} />
                  Auto-fill from URL
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-8 min-w-0 items-center gap-2 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-2.5 text-[#242529]">
                    <LinkIcon size={14} strokeWidth={2.2} />
                    <input
                      aria-label="Product URL"
                      value={pUrl}
                      onChange={(e) => setPUrl(e.target.value)}
                      placeholder="e.g. https://yourwebsite.com/products/<product-name>"
                      className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold outline-none placeholder:text-[#3f4044]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={analyzeProductUrl}
                    disabled={analyzing || !pUrl.trim()}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-[#e98d72] px-3.5 text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Sparkles size={13} strokeWidth={2.3} />
                    {analyzing ? 'Analyzing…' : 'Analyze'}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3.5 md:grid-cols-[142px_1fr]">
                <button
                  type="button"
                  onClick={() => productImgRef.current?.click()}
                  aria-label="Upload product image"
                  className="grid aspect-square min-h-[132px] place-items-center overflow-hidden rounded-[9px] bg-[#cfcfcf] text-[#828282] transition hover:bg-[#c7c7c7]"
                >
                  {pImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pImage.url} alt="Product" className="h-full w-full object-cover" />
                  ) : (
                    <Box size={30} strokeWidth={2.2} />
                  )}
                </button>
                <input ref={productImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadProductImage(e.target.files?.[0])} />

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                      Name
                    </span>
                    <input
                      aria-label="Product name"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Entity name"
                      className="h-9 w-full rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                      Description
                    </span>
                    <textarea
                      aria-label="Product description"
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Describe this entity..."
                      className="h-[66px] w-full resize-none rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 py-2 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  $ Pricing
                </span>
                <div className="grid gap-2 sm:grid-cols-[64px_1fr]">
                  <button
                    type="button"
                    onClick={() => setPCurrency((c) => CURRENCIES[(CURRENCIES.indexOf(c) + 1) % CURRENCIES.length])}
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] text-[12px] font-semibold text-[#222327] shadow-sm transition hover:border-[#bdbdbd]"
                  >
                    {pCurrency}
                  </button>
                  <input
                    aria-label="Product price"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                  />
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  Benefits
                </span>
                <div className="grid gap-2 sm:grid-cols-[1fr_36px]">
                  <input
                    aria-label="Product benefit"
                    value={pBenefitDraft}
                    onChange={(e) => setPBenefitDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } }}
                    placeholder="Add a new benefit..."
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    aria-label="Add benefit"
                    className="grid h-8 place-items-center rounded-[7px] bg-[#dddddd] text-[#58595d] transition hover:bg-[#d4d4d4]"
                  >
                    <Plus size={16} strokeWidth={2.1} />
                  </button>
                </div>
                {pBenefits.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pBenefits.map((benefit, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-[7px] bg-[#dcdcdc] px-2 py-1 text-[11px] font-semibold text-[#222327]">
                        {benefit}
                        <button type="button" onClick={() => setPBenefits((b) => b.filter((_, j) => j !== i))} className="text-[#5a5a5e] hover:text-[#1a1a1d]" aria-label="Remove benefit"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-6">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  Additional images ({pAdditional.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {pAdditional.map((img, i) => (
                    <div key={i} className="group relative h-[92px] w-[92px] overflow-hidden rounded-[9px] border border-[#d1d1d1] bg-[#e4e4e4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setPAdditional((a) => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded-full bg-[#1a1a1d]/85 text-white group-hover:grid" aria-label="Remove image"><X size={11} /></button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => additionalImgRef.current?.click()}
                    className="grid h-[92px] w-[92px] place-items-center rounded-[9px] border-2 border-dashed border-[#aaaaaa] bg-[#e4e4e4] text-[#232428] transition hover:border-[#e33508] hover:text-[#e33508]"
                  >
                    <span className="flex flex-col items-center gap-1.5 text-[11px] font-semibold">
                      <Upload size={15} strokeWidth={2.2} />
                      Upload
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
      <div className="animate-fade-in">
        <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
          <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">Brand Assets</h1>
            <button
              type="button"
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[#e33508] px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <FolderPlus size={16} strokeWidth={2.35} />
              Create Folder
            </button>
          </header>

          <div className="grid min-h-[calc(100vh-108px)] lg:grid-cols-[1fr_230px]">
            <main className="flex flex-col px-6 py-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className={`h-7 rounded-[8px] px-3 text-[11px] font-extrabold transition ${activeFolderId === null ? 'bg-[#1a1a1d] text-white' : 'border border-[#d0d0d0] bg-[#e4e4e4] text-[#25262a] hover:border-[#bbbbbb]'}`}
                >
                  All
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFolderId(f.id)}
                    className={`flex h-7 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-extrabold transition ${activeFolderId === f.id ? 'bg-[#1a1a1d] text-white' : 'border border-[#d0d0d0] bg-[#e4e4e4] text-[#25262a] hover:border-[#bbbbbb]'}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color ?? '#888888' }} />
                    {f.name}
                  </button>
                ))}
              </div>

              {visibleAssets.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <div className="flex flex-col items-center text-center">
                    <ImageIcon size={46} strokeWidth={2.2} className="text-[#2c2c30]" />
                    <p className="mt-4 text-[15px] font-extrabold text-[#17181b]">No {assetType === 'image' ? 'images' : assetType === 'video' ? 'videos' : 'audio'} yet</p>
                    <p className="mt-1.5 text-[12px] font-semibold text-[#34353a]">Upload your first file to get started</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {visibleAssets.map((asset) => (
                    <div key={asset.id} className="group relative overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-[#e6e6e6]">
                      <div className="aspect-square w-full overflow-hidden bg-[#dadada]">
                        {asset.type === 'image' && asset.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        ) : asset.type === 'video' && asset.url ? (
                          <video src={asset.url} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[#8a8a8a]">{asset.type === 'audio' ? <Music size={28} /> : <Video size={28} />}</span>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-[#1a1a1d]">{asset.name}</p>
                      <button type="button" onClick={() => deleteAsset(asset.id)} className="absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-[#1a1a1d]/85 text-white group-hover:grid" aria-label="Delete asset"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </main>

            <aside className="border-t border-[#d1d1d1] px-3.5 py-4 lg:border-l lg:border-t-0">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">Asset Type</h2>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {([['image', ImageIcon, 'Images'], ['video', Video, 'Videos'], ['audio', Music, 'Audio']] as [AssetType, typeof ImageIcon, string][]).map(([t, Icon, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAssetType(t)}
                    className={`flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-extrabold shadow-neo-sm transition ${
                      assetType === t ? 'bg-[#e33508] text-white' : 'border border-[#d0d0d0] bg-[#e4e4e4] text-[#25262a] hover:border-[#bbbbbb]'
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
                className="mt-4 flex min-h-[174px] w-full flex-col items-center justify-center rounded-[9px] border-2 border-dashed border-[#9f9f9f] bg-[#e4e4e4] px-4 text-center text-[#222327] transition hover:border-[#e33508] disabled:opacity-60"
              >
                <FileUp size={23} strokeWidth={2.2} />
                <span className="mt-3.5 flex items-center gap-1.5 text-[14px] font-extrabold">
                  <Upload size={13} strokeWidth={2.4} />
                  {uploadingAsset ? 'Importing…' : `Upload ${assetType === 'image' ? 'Images' : assetType === 'video' ? 'Videos' : 'Audio'}`}
                </span>
                <span className="mt-2 text-[11px] font-medium leading-snug text-[#34353a]">
                  Drag &amp; drop or click to select
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#6a6b70]">
                  Supported file types:
                  <Info size={11} strokeWidth={2.2} />
                </span>
                <span className="mt-3 max-w-[170px] text-[11px] font-medium leading-snug text-[#626368]">
                  Max 100MB for videos, 20MB for images, 25MB for audios
                </span>
              </button>
              <input ref={assetUploadRef} type="file" accept={ASSET_ACCEPT[assetType]} className="hidden" onChange={(e) => uploadAsset(e.target.files?.[0])} />

              <div className="my-4 flex items-center gap-2.5">
                <span className="h-px flex-1 bg-[#d1d1d1]" />
                <span className="text-[11px] font-extrabold uppercase text-[#5f6065]">Or</span>
                <span className="h-px flex-1 bg-[#d1d1d1]" />
              </div>

              <button
                type="button"
                onClick={() => setIsAssetAiOpen(true)}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#d1d1d1] bg-[#e4e4e4] text-[12px] font-extrabold text-[#202124] shadow-sm transition hover:border-[#bdbdbd]"
              >
                <Sparkles size={14} strokeWidth={2.3} />
                Create with AI
              </button>
            </aside>
          </div>
        </section>

        {isCreateFolderOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <button
              type="button"
              aria-label="Close create folder modal"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsCreateFolderOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[560px] rounded-[14px] border border-[#cfcfcf] bg-[#eeeeee] px-7 py-7 text-[#17181b] shadow-neo">
              <button
                type="button"
                aria-label="Close create folder modal"
                onClick={() => setIsCreateFolderOpen(false)}
                className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full text-[#4d4e52] transition hover:bg-[#dedede] hover:text-[#111111]"
              >
                <X size={20} strokeWidth={2.1} />
              </button>

              <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Create Folder</h2>
              <p className="mt-2 text-[16px] font-medium text-[#292a2e]">
                Create a new folder in the current directory.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-[112px_1fr] sm:items-end">
                <span aria-hidden className="relative block h-[78px] w-[104px]">
                  <span
                    className="absolute left-0 top-[18px] h-[56px] w-[104px] rounded-[10px] border-[4px] border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span
                    className="absolute left-0 top-0 h-[34px] w-[50px] rounded-t-[10px] border-[4px] border-b-0 border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span className="absolute left-[42px] top-[16px] h-[12px] w-[48px] rounded-tr-[10px] bg-[#050505]" />
                </span>

                <label className="block">
                  <span className="block text-[12px] font-extrabold uppercase tracking-wide text-[#34353a]">
                    Folder Name
                  </span>
                  <input
                    autoFocus
                    aria-label="Folder name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createFolder() } }}
                    placeholder="Enter folder name"
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#e33508] bg-[#eeeeee] px-3 text-[16px] font-medium text-[#1d1e22] outline-none ring-1 ring-[#e33508]/20 placeholder:text-[#333438]"
                  />
                </label>
              </div>

              <div className="mt-9">
                <span className="block text-[12px] font-extrabold uppercase tracking-wide text-[#34353a]">Color</span>
                <div className="mt-3 flex flex-wrap gap-3">
                  {folderColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select folder color ${color}`}
                      onClick={() => setFolderColor(color)}
                      className={`h-12 w-12 rounded-[9px] border transition ${
                        folderColor === color
                          ? 'border-[#e33508] ring-2 ring-[#e33508] ring-offset-2 ring-offset-[#eeeeee]'
                          : 'border-transparent hover:ring-2 hover:ring-black/15'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="h-10 rounded-[9px] border border-[#d1d1d1] bg-[#e8e8e8] px-5 text-[14px] font-extrabold text-[#17181b] shadow-sm transition hover:border-[#bcbcbc]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createFolder}
                  disabled={creatingFolder}
                  className="flex h-10 items-center gap-2 rounded-[9px] bg-[#e33508] px-5 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                >
                  <Plus size={17} strokeWidth={2.4} />
                  {creatingFolder ? 'Creating…' : 'Create Folder'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAssetAiOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-5 py-7">
            <button type="button" aria-label="Close AI asset creator" onClick={() => setIsAssetAiOpen(false)} className="absolute inset-0 cursor-default" />
            <div className="relative z-10 h-[min(82vh,720px)] w-full max-w-[1060px] overflow-hidden rounded-[12px] border border-[#cfcfcf] bg-[#eeeeee] text-[#17181b] shadow-neo">
              <button type="button" aria-label="Close" onClick={() => setIsAssetAiOpen(false)} className="absolute right-6 top-5 z-20 text-[#202124] transition hover:text-[#e33508]"><X size={22} strokeWidth={2.25} /></button>

              <header className="flex h-[74px] items-center gap-3 border-b border-[#d2d2d2] px-7">
                <button type="button" aria-label="Back" onClick={() => setIsAssetAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#15161a] transition hover:bg-[#dedede]"><ChevronLeft size={20} strokeWidth={2.4} /></button>
                <Sparkles size={21} strokeWidth={2.25} className="text-[#15161a]" />
                <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight">Create Asset with AI</h2>
              </header>

              <div className="grid h-[calc(100%-74px)] min-h-0 gap-5 overflow-y-auto px-7 py-7 lg:grid-cols-[1fr_390px]">
                <section className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#303136]">Image Preview</p>
                  <div className="mt-3 flex min-h-[430px] flex-1 items-center justify-center rounded-[9px] border border-[#c7c7c7] bg-[#e4e4e4] px-5 text-center">
                    {generatingAssetAi ? (
                      <div className="flex flex-col items-center gap-4 text-[#3c3d41]">
                        <span className="h-9 w-9 rounded-full border-2 border-[#e33508] border-t-transparent animate-spin" />
                        <p className="text-[15px] font-semibold">Génération en cours…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImagePlus size={54} strokeWidth={2.35} className="text-[#77787d]" />
                        <p className="mt-5 text-[15px] font-medium text-[#222327]">Describe your image and click &quot;Create with AI&quot;</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#303136]">Describe the image you want to create</p>
                  <div className="mt-3 flex min-h-[180px] flex-col rounded-[9px] border border-[#c7c7c7] bg-[#e4e4e4] p-4">
                    <textarea
                      value={assetAiPrompt}
                      onChange={(e) => setAssetAiPrompt(e.target.value)}
                      placeholder="e.g., A professional product photo of a sleek coffee mug on a marble countertop, soft morning light, minimalist style"
                      className="min-h-[96px] flex-1 resize-none bg-transparent text-[15px] font-medium leading-relaxed text-[#1d1e22] outline-none placeholder:text-[#7d838d]"
                    />
                    <button type="button" onClick={() => setAssetAiAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])} className="mt-auto flex w-fit items-center gap-2 pt-6 text-[14px] font-extrabold text-[#34353a] transition hover:text-[#e33508]">
                      <SlidersHorizontal size={16} strokeWidth={2.35} />
                      Aspect Ratio: {assetAiAspect}
                    </button>
                  </div>
                  <button type="button" onClick={generateAsset} disabled={generatingAssetAi} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#d27a62] px-4 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60">
                    <Sparkles size={17} strokeWidth={2.4} />
                    {generatingAssetAi ? 'Generating…' : <>Create with AI <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" /> 2</>}
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
      <div className="animate-fade-in">
        <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
          <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">Brand Templates</h1>
            <button
              type="button"
              onClick={() => setIsTemplatePickerOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[#e33508] px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <Plus size={16} strokeWidth={2.35} />
              Upload Template
            </button>
          </header>

          {templates.length === 0 ? (
            <div className="flex min-h-[calc(100vh-108px)] items-start justify-center px-6 py-16">
              <div className="mt-[72px] flex max-w-[560px] flex-col items-center text-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-[#d1d1d1] text-[#27282c]">
                  <ImagePlus size={38} strokeWidth={2.3} />
                </span>
                <h2 className="mt-5 font-display text-[22px] font-extrabold leading-tight tracking-tight">
                  No Templates Yet
                </h2>
                <p className="mt-4 text-[16px] font-medium leading-snug text-[#34353a]">
                  Upload your ad templates to reuse them in future campaigns.
                  <br />
                  Your templates will be available when creating static ads.
                </p>
                <button
                  type="button"
                  onClick={() => setIsTemplatePickerOpen(true)}
                  className="mt-4 flex h-10 items-center gap-2 rounded-[9px] bg-[#e33508] px-6 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  <Plus size={17} strokeWidth={2.4} />
                  Upload Your First Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-6 py-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {templates.map((tpl) => (
                <div key={tpl.id} className="group relative overflow-hidden rounded-[12px] border border-[#d4d4d4] bg-[#e6e6e6]">
                  <div className="aspect-square w-full overflow-hidden bg-[#dadada]">
                    {tpl.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tpl.url} alt={tpl.name} className="h-full w-full object-cover" />
                    ) : <span className="grid h-full w-full place-items-center text-[#9a9a9a]"><ImageIcon size={28} /></span>}
                  </div>
                  <p className="truncate px-2.5 py-2 text-[12px] font-semibold text-[#1a1a1d]">{tpl.name}</p>
                  <button type="button" onClick={() => deleteTemplate(tpl.id)} className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-[#1a1a1d]/85 text-white group-hover:grid" aria-label="Delete template"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isTemplatePickerOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6 py-8">
            <button
              type="button"
              aria-label="Close template selector"
              onClick={() => setIsTemplatePickerOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div className="relative z-10 h-[min(84vh,760px)] w-full max-w-[1120px] overflow-hidden rounded-[12px] border border-[#cfcfcf] bg-[#eeeeee] text-[#17181b] shadow-neo">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsTemplatePickerOpen(false)}
                className="absolute right-5 top-4 z-20 text-[#202124] transition hover:text-[#e33508]"
              >
                <X size={20} strokeWidth={2.25} />
              </button>

              <div className="grid h-full min-h-0 overflow-y-auto lg:grid-cols-[1fr_260px] lg:overflow-hidden">
                <main className="flex min-h-[480px] flex-col lg:min-h-0">
                  <header className="border-b border-[#d7d7d7] px-6 py-4">
                    <h2 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">
                      Select Brand Template
                    </h2>
                  </header>

                  {templates.length === 0 ? (
                    <div className="flex flex-1 items-start justify-center px-5 py-12">
                      <div className="mt-6 flex flex-col items-center text-center">
                        <ImageIcon size={48} strokeWidth={2.45} className="text-[#1f2024]" />
                        <p className="mt-5 text-[17px] font-extrabold text-[#15161a]">No images yet</p>
                        <p className="mt-2 text-[14px] font-medium text-[#3c3d41]">
                          Upload your first image to get started
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
                      {templates.map((tpl) => (
                        <div key={tpl.id} className="group relative overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-[#e6e6e6]">
                          <div className="aspect-square w-full overflow-hidden bg-[#dadada]">
                            {tpl.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={tpl.url} alt={tpl.name} className="h-full w-full object-cover" />
                            ) : <span className="grid h-full w-full place-items-center text-[#9a9a9a]"><ImageIcon size={24} /></span>}
                          </div>
                          <button type="button" onClick={() => deleteTemplate(tpl.id)} className="absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-[#1a1a1d]/85 text-white group-hover:grid" aria-label="Delete template"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </main>

                <aside className="flex min-h-[480px] flex-col border-t border-[#d1d1d1] px-5 py-10 lg:min-h-0 lg:border-l lg:border-t-0 lg:py-14">
                  <button
                    type="button"
                    onClick={() => tplUploadRef.current?.click()}
                    disabled={uploadingTpl}
                    className="flex min-h-[150px] flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#a9a9a9] px-4 text-center transition hover:border-[#e33508] hover:bg-white/35 disabled:opacity-60"
                  >
                    <FileUp size={25} strokeWidth={2.2} className="text-[#25262a]" />
                    <span className="mt-4 flex items-center gap-2 text-[15px] font-extrabold text-[#17181b]">
                      <ImageIcon size={15} strokeWidth={2.25} />
                      {uploadingTpl ? 'Importing…' : 'Upload Templates'}
                    </span>
                    <span className="mt-3 text-[13px] font-medium leading-snug text-[#3f4044]">
                      Drag &amp; drop or click to select
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#67686d]">
                      Supported file types: <Info size={13} strokeWidth={2.1} />
                    </span>
                    <span className="mt-4 max-w-[190px] text-[12px] font-semibold leading-snug text-[#606166]">
                      Max 100MB for videos, 20MB for images, 25MB for audios
                    </span>
                  </button>

                  <input ref={tplUploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadTemplate(e.target.files?.[0])} />

                  <div className="my-5 flex items-center gap-3 text-[12px] font-extrabold text-[#45464a]">
                    <span className="h-px flex-1 bg-[#d1d1d1]" />
                    OR
                    <span className="h-px flex-1 bg-[#d1d1d1]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTemplateAiModalOpen(true)}
                    className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#d4d4d4] bg-[#f4f4f4] text-[13px] font-extrabold text-[#17181b] shadow-sm transition hover:border-[#c3c3c3]"
                  >
                    <Sparkles size={16} strokeWidth={2.35} />
                    Create with AI
                  </button>

                  <div className="mt-6">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#36373b]">Selected Product</p>
                    <button
                      type="button"
                      className="mt-2 flex h-10 w-full items-center justify-between rounded-[9px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-left shadow-sm"
                    >
                      <span className="flex items-center gap-2.5 text-[14px] font-extrabold text-[#202126]">
                        <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#d3d3d3] text-[12px] font-extrabold">
                          P
                        </span>
                        My Brand
                      </span>
                      <ChevronDown size={16} strokeWidth={2.25} />
                    </button>
                  </div>

                  <div className="mt-5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#36373b]">Asset Type</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex h-8 items-center gap-2 rounded-[8px] bg-[#e33508] px-3.5 text-[12px] font-extrabold uppercase text-white shadow-neo-sm"
                    >
                      <ImageIcon size={15} strokeWidth={2.3} />
                      Images
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="mt-8 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#de8067] px-4 text-[13px] font-extrabold text-white opacity-80 shadow-neo-sm lg:mt-auto"
                  >
                    <CheckCircle2 size={15} strokeWidth={2.4} />
                    Use Selected
                  </button>
                </aside>
              </div>
            </div>
          </div>
        ) : null}

        {isTemplateAiModalOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-5 py-7">
            <button
              type="button"
              aria-label="Close AI asset creator"
              onClick={() => setIsTemplateAiModalOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div className="relative z-10 h-[min(82vh,720px)] w-full max-w-[1060px] overflow-hidden rounded-[12px] border border-[#cfcfcf] bg-[#eeeeee] text-[#17181b] shadow-neo">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsTemplateAiModalOpen(false)}
                className="absolute right-6 top-5 z-20 text-[#202124] transition hover:text-[#e33508]"
              >
                <X size={22} strokeWidth={2.25} />
              </button>

              <header className="flex h-[74px] items-center gap-3 border-b border-[#d2d2d2] px-7">
                <button
                  type="button"
                  aria-label="Back to template selector"
                  onClick={() => setIsTemplateAiModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-[#15161a] transition hover:bg-[#dedede]"
                >
                  <ChevronLeft size={20} strokeWidth={2.4} />
                </button>
                <Sparkles size={21} strokeWidth={2.25} className="text-[#15161a]" />
                <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight">
                  Create Asset with AI
                </h2>
              </header>

              <div className="grid h-[calc(100%-74px)] min-h-0 gap-5 overflow-y-auto px-7 py-7 lg:grid-cols-[1fr_390px]">
                <section className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#303136]">
                    Image Preview
                  </p>
                  <div className="mt-3 flex min-h-[430px] flex-1 items-center justify-center rounded-[9px] border border-[#c7c7c7] bg-[#e4e4e4] px-5 text-center">
                    {generatingTpl ? (
                      <div className="flex flex-col items-center gap-4 text-[#3c3d41]">
                        <span className="h-9 w-9 rounded-full border-2 border-[#e33508] border-t-transparent animate-spin" />
                        <p className="text-[15px] font-semibold">Génération en cours…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImagePlus size={54} strokeWidth={2.35} className="text-[#77787d]" />
                        <p className="mt-5 text-[15px] font-medium text-[#222327]">
                          Describe your image and click &quot;Create with AI&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="flex min-h-[520px] flex-col">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#303136]">
                    Describe the image you want to create
                  </p>
                  <div className="mt-3 flex min-h-[180px] flex-col rounded-[9px] border border-[#c7c7c7] bg-[#e4e4e4] p-4">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., A professional product photo of a sleek coffee mug on a marble countertop, soft morning light, minimalist style"
                      className="min-h-[96px] flex-1 resize-none bg-transparent text-[15px] font-medium leading-relaxed text-[#1d1e22] outline-none placeholder:text-[#7d838d]"
                    />
                    <button
                      type="button"
                      onClick={() => setAiAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])}
                      className="mt-auto flex w-fit items-center gap-2 pt-6 text-[14px] font-extrabold text-[#34353a] transition hover:text-[#e33508]"
                    >
                      <SlidersHorizontal size={16} strokeWidth={2.35} />
                      Aspect Ratio: {aiAspect}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={generateTemplate}
                    disabled={generatingTpl}
                    className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#d27a62] px-4 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Sparkles size={17} strokeWidth={2.4} />
                    {generatingTpl ? 'Generating…' : <>Create with AI <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" /> 2</>}
                  </button>

                  <div className="mt-auto flex items-center justify-end gap-5 pt-8">
                    <button
                      type="button"
                      onClick={() => setIsTemplateAiModalOpen(false)}
                      className="flex h-10 items-center gap-2 rounded-[8px] px-3 text-[14px] font-extrabold text-[#17181b] transition hover:bg-[#dedede]"
                    >
                      <X size={17} strokeWidth={2.4} />
                      Discard
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex h-10 items-center gap-2 rounded-[8px] bg-[#d27a62] px-7 text-[14px] font-extrabold text-white opacity-85 shadow-neo-sm"
                    >
                      <Save size={16} strokeWidth={2.25} />
                      Save to Library
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
        setProdPrompt(buildPrompt(id))
      }
    }

    // Lancement : marque la carte produite (incrémente le compteur du jour)
    const handleLaunch = () => {
      if (!selectedCard) return
      const label = CONTENT_TYPES.find((c) => c.id === selectedCard)?.label ?? 'Contenu'
      production.markProduced(selectedCard)
      toast.success(`Production lancée : ${label}`)
      setSelectedCard(null)
      setProdPrompt('')
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
              ? 'cursor-not-allowed border-[#d7d7d7] bg-[#f0f0f0] opacity-70'
              : isSelected
                ? 'border-[#ff4a1c] bg-[#fff6f2] ring-2 ring-[#ff4a1c]/25'
                : 'border-[#d7d7d7] bg-white hover:-translate-y-0.5 hover:border-[#ff4a1c] hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-[8px] ${locked ? 'bg-[#e4e4e4] text-[#999]' : 'bg-[#fbe9e2] text-[#ff4a1c]'}`}>
              <Icon size={16} strokeWidth={2.4} />
            </span>
            {locked ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                <CheckCircle2 size={11} strokeWidth={2.6} /> Terminé
              </span>
            ) : isSelected ? (
              <span className="flex items-center gap-1 rounded-full bg-[#ff4a1c] px-2 py-0.5 text-[10px] font-extrabold text-white">
                <CheckCircle2 size={11} strokeWidth={2.6} /> Sélectionné
              </span>
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f4f4] text-[#888] transition-colors group-hover:bg-[#ff4a1c] group-hover:text-white">
                <ArrowRight size={13} strokeWidth={2.6} />
              </span>
            )}
          </div>
          <div className="mt-2.5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-[#111]">{t.label}</h3>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#666]">{meta.desc}</p>
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#999]">
              {count}/{quota} produit{quota > 1 ? 's' : ''} aujourd'hui
            </p>
          </div>
        </button>
      )
    }

    return (
      <div className="animate-fade-in relative flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-[#f4f4f4] text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,0.10)]">
        {/* Header */}
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#e5e5e5] px-5 sm:px-6 bg-transparent">
          <h1 className="text-[19px] font-extrabold tracking-tight text-[#111]">Production</h1>
          <Link
            href="/parametres?section=profile"
            className="flex h-[34px] items-center gap-1.5 rounded-[8px] border border-[#d1d1d1] bg-transparent px-3.5 text-[12px] font-extrabold text-[#111] shadow-sm transition-colors hover:bg-black/5"
          >
            <SlidersHorizontal size={14} strokeWidth={2.4} />
            Réglages campagne
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-5 pt-2 sm:px-5">
          <div className="mx-auto w-full max-w-[760px]">
            {(
              <>
                {noneSelected && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#f0d9cd] bg-[#fdf3ee] px-3 py-2">
                    <Info size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-[#ff4a1c]" />
                    <p className="text-[12px] font-semibold leading-snug text-[#7a4326]">
                      Aucun type de contenu n'a encore été sélectionné dans les réglages de la campagne — voici tout le catalogue.{' '}
                      <Link href="/parametres?section=profile" className="underline underline-offset-2 hover:text-[#ff4a1c]">
                        Configurer la campagne
                      </Link>
                    </p>
                  </div>
                )}
                {/* Jour-J */}
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#ff4a1c] text-white">
                    <Megaphone size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-extrabold tracking-tight text-[#111]">Jour J — Campagne</h2>
                    <p className="text-[12px] font-semibold text-[#666]">
                      {campaign.campaignCount}× / {campaign.campaignPer === 'day' ? 'jour' : campaign.campaignPer === 'week' ? 'semaine' : 'mois'} · {dayTypes.length} type{dayTypes.length > 1 ? 's' : ''} de contenu
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
                      <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#111] text-white">
                        <CalendarClock size={14} strokeWidth={2.5} />
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold tracking-tight text-[#111]">Pré-campagne</h2>
                        <p className="text-[12px] font-semibold text-[#666]">
                          {campaign.preCount}× / {campaign.prePer === 'day' ? 'jour' : campaign.prePer === 'week' ? 'semaine' : 'mois'} · {preTypes.length} type{preTypes.length > 1 ? 's' : ''} de contenu
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
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-bold text-[#ff4a1c]">
                      <CheckCircle2 size={13} strokeWidth={2.6} />
                      {CONTENT_TYPES.find((c) => c.id === selectedCard)?.label} sélectionné — prompt généré, cliquez sur Envoyer pour lancer.
                    </div>
                  ) : (
                    <div className="mb-2 px-1 text-[12px] font-semibold text-[#888]">
                      Cliquez sur une carte ci-dessus pour générer automatiquement son prompt.
                    </div>
                  )}
                  <div className={`rounded-[14px] border bg-white p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition-colors ${selectedCard ? 'border-[#ff4a1c]' : 'border-[#e5e5e5]'}`}>
                    <textarea
                      value={prodPrompt}
                      onChange={(e) => setProdPrompt(e.target.value)}
                      placeholder="Cliquez sur une carte ou écrivez votre prompt…"
                      rows={2}
                      className="w-full resize-none bg-transparent px-1.5 pt-0.5 pb-1.5 text-[13px] text-[#111] outline-none placeholder:text-[#9a9a9a]"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#f1f1f1] text-[#333] transition-colors hover:bg-[#e6e6e6]"
                          aria-label="Ajouter"
                        >
                          <Plus size={15} strokeWidth={2.6} />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 items-center gap-1.5 rounded-[9px] bg-[#f1f1f1] px-2.5 text-[12px] font-extrabold text-[#222] transition-colors hover:bg-[#e6e6e6]"
                        >
                          <ShoppingBag size={14} strokeWidth={2.3} />
                          Product
                        </button>
                        <button
                          type="button"
                          className="flex h-8 items-center gap-1.5 rounded-[9px] bg-[#f1f1f1] px-2.5 text-[12px] font-extrabold text-[#222] transition-colors hover:bg-[#e6e6e6]"
                        >
                          <User size={14} strokeWidth={2.3} />
                          Avatar
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleLaunch}
                        disabled={!selectedCard || !prodPrompt.trim()}
                        className="grid h-9 w-9 place-items-center rounded-full bg-[#ff8a5c] text-white shadow-sm transition-all hover:bg-[#ff7a45] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Lancer la production"
                      >
                        <ArrowUp size={16} strokeWidth={2.8} />
                      </button>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {['Create ads', 'Make UGC ad', 'Brand insights', 'Research competitors'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setProdPrompt(s)}
                        className="rounded-[8px] bg-[#ececec] px-2.5 py-1 text-[11px] font-extrabold text-[#444] transition-colors hover:bg-[#e0e0e0]"
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
      </div>
    )
  }

  if (section === 'competitors') {
    return (
      <div className="animate-fade-in relative flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-[#f4f4f4] text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,0.10)]">
        {/* Header */}
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#e5e5e5] px-5 sm:px-6 bg-transparent">
          <h1 className="text-[19px] font-extrabold tracking-tight text-[#111]">Competitor Intel</h1>
          <button
            type="button"
            className="flex h-[34px] items-center gap-1.5 rounded-[8px] border border-[#d1d1d1] bg-transparent px-3.5 text-[12px] font-extrabold text-[#111] shadow-sm transition-colors hover:bg-black/5"
          >
            <Sparkles size={14} strokeWidth={2.4} />
            Discover competitors
          </button>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="-mt-56 w-full max-w-[600px] flex flex-col items-center">
            <h2 className="flex items-center justify-center gap-2 text-[22px] font-extrabold tracking-tight text-[#111]">
              <Sparkles size={24} className="text-[#ff4a1c]" strokeWidth={2.5} />
              Here are brands we think are your competitors
            </h2>
            <p className="mt-3.5 text-[14px] font-semibold text-[#555]">
              Select up to 5 to start tracking their ad strategies
            </p>

            <div className="mt-8 relative w-full">
              <Search size={17} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                type="text"
                placeholder="Search for a brand..."
                className="h-[42px] w-full rounded-[8px] border border-[#dcdcdc] bg-transparent pl-12 pr-4 text-[14px] font-semibold text-[#111] outline-none transition-colors placeholder:text-[#777] focus:border-[#ff4a1c] focus:bg-white"
              />
            </div>
          </div>
        </main>

      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
        <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2.5">
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Brand Details</h1>
          <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#2c2c30]">
            <CheckCircle2 size={17} className="text-emerald-600" />
            Saved
          </div>
        </header>

        <div className="grid gap-8 px-5 py-9 lg:grid-cols-[180px_1fr] lg:px-6 lg:py-12">
          <aside className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {brandTabs.map((tab) => {
              const Icon = tab.icon

              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-[132px] w-[148px] flex-shrink-0 flex-col items-start justify-between rounded-[15px] border-2 px-4 py-4 text-left transition lg:w-full ${
                    activeTab === tab.id
                      ? 'border-[#e33508] bg-[#eaded8] text-[#e33508]'
                      : 'border-[#d1d1d1] bg-transparent text-[#1f2024] hover:border-[#b8b8b8]'
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full ${
                      activeTab === tab.id ? 'bg-[#e7cec5] text-[#e33508]' : 'bg-[#d9d9d9] text-[#2c2c2f]'
                    }`}
                  >
                    <Icon size={23} strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block font-display text-[18px] font-extrabold leading-tight tracking-tight">
                      {tab.label}
                    </span>
                    <span className={`mt-1.5 block text-[13px] font-medium leading-tight ${activeTab === tab.id ? 'text-[#2f2f33]' : 'text-[#333438]'}`}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </aside>

          {activeTab === 'identity' ? (
          <div className="grid gap-x-5 gap-y-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(390px,1.05fr)]">
            <div className="grid gap-5 md:grid-cols-[118px_1fr] xl:col-span-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#d4d4d4] text-center text-[#202124] transition hover:bg-[#cccccc]"
              >
                {brand.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-[11px] font-extrabold">
                    <Upload size={17} strokeWidth={2.3} />
                    Upload logo
                  </span>
                )}
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />

              <div className="min-w-0">
                <input
                  aria-label="Brand name"
                  value={brand.name}
                  onChange={(e) => updateName(e.target.value)}
                  className="h-10 w-full border-0 border-b border-[#d1d1d1] bg-transparent px-0 font-display text-[18px] font-extrabold text-[#111111] outline-none focus:border-[#e33508]"
                />

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_300px]">
                  <label className="block">
                    <span className="mb-2 block text-[15px] font-extrabold">Brand Category</span>
                    <button
                      type="button"
                      onClick={() => cycle(BRAND_CATEGORIES, brand.category, 'category')}
                      className="flex h-8 w-full items-center rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5 text-left transition hover:border-[#b8b8b8]"
                    >
                      <span className="rounded-full border border-[#c9c9c9] bg-[#dddddd] px-2.5 py-0.5 text-[9px] font-extrabold uppercase">
                        {brand.category}
                      </span>
                    </button>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[15px] font-extrabold">Language</span>
                    <button
                      type="button"
                      onClick={() => cycle(LANGUAGES, brand.language, 'language')}
                      className="flex h-8 w-full items-center justify-between rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5 text-left transition hover:border-[#b8b8b8]"
                    >
                      <span className="text-[13px] font-medium">{brand.language}</span>
                      <ChevronDown size={15} className="text-[#77777a]" />
                    </button>
                  </label>
                </div>
              </div>
            </div>

            {/* Brand DNA Section - Full Width */}
            <div className="xl:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="block text-[15px] font-extrabold">Brand DNA (ADN de la Marque)</span>
              </div>
              <div className="relative flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#d4d4d4] bg-[#e8e8e8]/50 p-6 transition-colors hover:border-[#b8b8b8] hover:bg-[#e8e8e8]">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm mb-3">
                  <FileText size={22} className="text-[#e33508]" />
                </div>
                <h3 className="text-[14px] font-extrabold text-[#111]">Upload your Brand DNA</h3>
                <p className="mt-1 text-[12px] font-medium text-[#666]">
                  Drag and drop your file here, or <span className="font-bold text-[#e33508]">browse</span>
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#888]">
                  Supported formats: .pdf, .doc, .docx, .md (Max 10MB)
                </p>
                <input type="file" accept=".pdf,.doc,.docx,.md" className="absolute inset-0 cursor-pointer opacity-0" />
              </div>
            </div>

            <div>
              <label className="block">
                <span className="mb-2 block text-[15px] font-extrabold">Brand Description</span>
                <div className="relative">
                  <textarea
                    value={brand.description}
                    onChange={(e) => brand.setField('description', e.target.value)}
                    className="h-[92px] w-full resize-none rounded-[9px] border border-[#d4d4d4] bg-[#e8e8e8] p-3 text-[13px] font-medium leading-snug text-[#111111] outline-none focus:border-[#e33508]"
                    maxLength={2000}
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-[#44454a]">{brand.description.length}/2000</span>
                </div>
              </label>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Palette size={16} className="text-[#e33508]" />
                  <h2 className="text-[15px] font-extrabold">Brand Colors</h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {brand.colors.map((color, i) => (
                    <div key={`${color}-${i}`} className="group relative text-center">
                      <span
                        className="block h-[44px] w-[44px] rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <button
                        type="button"
                        onClick={() => brand.removeItem('colors', i)}
                        className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-[#1a1a1d] text-white group-hover:grid"
                        aria-label="Remove color"
                      >
                        <X size={12} />
                      </button>
                      <span className="mt-1.5 block text-[11px] font-extrabold uppercase text-[#77777b]">{color}</span>
                    </div>
                  ))}
                  <label
                    className="grid h-[44px] w-[44px] cursor-pointer place-items-center rounded-full border-2 border-dashed border-[#bfbfbf] text-[#77777b] transition hover:border-[#e33508] hover:text-[#e33508]"
                    aria-label="Add brand color"
                  >
                    <Plus size={20} />
                    <input type="color" className="sr-only" onChange={(e) => brand.addItem('colors', e.target.value.toUpperCase())} />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-[15px] font-extrabold">Brand Type</h2>
              <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-3">
                {brandTypes.map((type) => {
                  const Icon = type.icon
                  const isActive = brand.brandType === type.label

                  return (
                    <button
                      key={type.label}
                      type="button"
                      onClick={() => brand.setField('brandType', type.label)}
                      className={`min-h-[92px] rounded-[10px] border-2 px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-[#e33508] bg-[#eaded8]'
                          : 'border-[#d4d4d4] bg-[#e4e4e4] hover:border-[#bcbcbc]'
                      }`}
                    >
                      <span
                        className={`mb-3 grid h-8 w-8 place-items-center rounded-full ${
                          isActive ? 'bg-[#e7cec5] text-[#e33508]' : 'bg-[#d4d4d4] text-[#343438]'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.3} />
                      </span>
                      <span className="block text-[13px] font-extrabold leading-tight">{type.label}</span>
                      <span className="mt-1 block text-[11px] font-medium leading-tight text-[#34353a]">{type.description}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-extrabold">Key Features</h2>
                  <button
                    type="button"
                    onClick={() => brand.addItem('keyFeatures')}
                    className="grid h-7 w-7 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                    aria-label="Add key feature"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <BrandList listKey="keyFeatures" variant="row" emptyLabel="Add Key Features." />
              </div>
            </div>
          </div>
          ) : null}

          {activeTab === 'tone' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2.5 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <Megaphone size={15} className="text-[#e33508]" />
                  Communication Tone
                </span>
                <input
                  aria-label="Communication tone"
                  value={brand.communicationTone}
                  onChange={(e) => brand.setField('communicationTone', e.target.value)}
                  className="h-8 w-full rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5 text-[12px] font-medium text-[#111111] outline-none focus:border-[#e33508]"
                />
              </label>

              <div className="mt-8 grid gap-x-6 gap-y-7 xl:grid-cols-2">
                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Preferred Words</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('preferredWords')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add preferred word"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="preferredWords" variant="chip" emptyLabel="Add preferred words." />
                </section>

                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Words to Avoid</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('wordsToAvoid')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add word to avoid"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="wordsToAvoid" variant="chip" emptyLabel="Add words to avoid." />
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Good Examples</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('goodExamples')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add good example"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="goodExamples" variant="row" emptyLabel="Add Good Examples." />
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Bad Examples</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('badExamples')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add bad example"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="badExamples" variant="row" emptyLabel="Add Bad Examples." />
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'audience' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2.5 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <UsersRound size={15} className="text-[#e33508]" />
                  Target Audience
                </span>
                <div className="relative">
                  <textarea
                    aria-label="Target audience"
                    value={brand.targetAudience}
                    onChange={(e) => brand.setField('targetAudience', e.target.value)}
                    maxLength={1000}
                    className="h-[82px] w-full resize-none rounded-[9px] border border-[#d4d4d4] bg-[#e8e8e8] p-3 text-[12px] font-medium leading-snug text-[#111111] outline-none focus:border-[#e33508]"
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-[#44454a]">{brand.targetAudience.length}/1000</span>
                </div>
              </label>

              <div className="mt-8 grid gap-x-6 gap-y-7 xl:grid-cols-2">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Audience Desires</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('audienceDesires')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add audience desire"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="audienceDesires" variant="row" emptyLabel="Add audience desires." />
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Audience Problems</h2>
                    <button
                      type="button"
                      onClick={() => brand.addItem('audienceProblems')}
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add audience problem"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <BrandList listKey="audienceProblems" variant="row" emptyLabel="Add audience problems." />
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'campaign' ? (
            <div className="max-w-[720px] space-y-8 pt-1">
              {/* Campaign */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <CalendarRange size={16} className="text-[#e33508]" />
                  <h2 className="text-[15px] font-extrabold">Campaign</h2>
                </div>
                <label className="block max-w-[320px]">
                  <span className="mb-2 block text-[13px] font-extrabold">Duration</span>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={campaign.campaignDuration} onChange={(e) => campaign.setField('campaignDuration', Math.max(1, Number(e.target.value) || 1))} className="h-9 w-24 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]" />
                    <select value={campaign.campaignUnit} onChange={(e) => campaign.setField('campaignUnit', e.target.value as (typeof DURATION_UNITS)[number])} className="h-9 flex-1 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]">
                      {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </label>
                <div className="mt-5">
                  <span className="mb-2 block text-[13px] font-extrabold">Content to create</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" min={1} value={campaign.campaignCount} onChange={(e) => campaign.setField('campaignCount', Math.max(1, Number(e.target.value) || 1))} className="h-9 w-20 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]" />
                    <span className="text-[13px] font-semibold text-[#34353a]">content(s) per</span>
                    <select value={campaign.campaignPer} onChange={(e) => campaign.setField('campaignPer', e.target.value as (typeof CADENCE_PER)[number])} className="h-9 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]">
                      {CADENCE_PER.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CONTENT_TYPES.map((ct) => {
                      const on = campaign.campaignTypes.includes(ct.id)
                      return (
                        <button key={ct.id} type="button" onClick={() => campaign.toggleType('campaign', ct.id)} className={`h-8 rounded-full px-3.5 text-[12px] font-extrabold transition ${on ? 'bg-[#e33508] text-white' : 'bg-[#e0e0e0] text-[#25262a] hover:bg-[#d6d6d6]'}`}>{ct.label}</button>
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* Pre-campaign */}
              <section className="border-t border-[#d7d7d7] pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-[#e33508]" />
                    <h2 className="text-[15px] font-extrabold">Pre-campaign</h2>
                  </div>
                  <button type="button" onClick={() => campaign.setField('preEnabled', !campaign.preEnabled)} className={`relative h-6 w-11 rounded-full transition-colors ${campaign.preEnabled ? 'bg-[#e33508]' : 'bg-[#c9c9c9]'}`} aria-pressed={campaign.preEnabled} aria-label="Toggle pre-campaign">
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${campaign.preEnabled ? 'translate-x-[23px]' : 'translate-x-1'}`} />
                  </button>
                </div>

                {campaign.preEnabled ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-[13px] font-extrabold">Start date</span>
                        <input type="date" value={campaign.preStartDate} onChange={(e) => campaign.setField('preStartDate', e.target.value)} className="h-9 w-full rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-[13px] font-extrabold">Duration</span>
                        <div className="flex gap-2">
                          <input type="number" min={1} value={campaign.preDuration} onChange={(e) => campaign.setField('preDuration', Math.max(1, Number(e.target.value) || 1))} className="h-9 w-24 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]" />
                          <select value={campaign.preUnit} onChange={(e) => campaign.setField('preUnit', e.target.value as (typeof DURATION_UNITS)[number])} className="h-9 flex-1 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]">
                            {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </label>
                    </div>
                    <div>
                      <span className="mb-2 block text-[13px] font-extrabold">Content to create</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="number" min={1} value={campaign.preCount} onChange={(e) => campaign.setField('preCount', Math.max(1, Number(e.target.value) || 1))} className="h-9 w-20 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]" />
                        <span className="text-[13px] font-semibold text-[#34353a]">content(s) per</span>
                        <select value={campaign.prePer} onChange={(e) => campaign.setField('prePer', e.target.value as (typeof CADENCE_PER)[number])} className="h-9 rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2 text-[13px] font-semibold text-[#111] outline-none focus:border-[#e33508]">
                          {CADENCE_PER.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CONTENT_TYPES.map((ct) => {
                          const on = campaign.preTypes.includes(ct.id)
                          return (
                            <button key={ct.id} type="button" onClick={() => campaign.toggleType('pre', ct.id)} className={`h-8 rounded-full px-3.5 text-[12px] font-extrabold transition ${on ? 'bg-[#e33508] text-white' : 'bg-[#e0e0e0] text-[#25262a] hover:bg-[#d6d6d6]'}`}>{ct.label}</button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] font-medium italic text-[#34353a]">Active la pré-campagne pour planifier du contenu avant le lancement.</p>
                )}
              </section>

              {/* Post-campaign (à venir) */}
              <section className="border-t border-[#d7d7d7] pt-6">
                <div className="flex items-center gap-2 text-[#7a7b80]">
                  <Info size={16} />
                  <h2 className="text-[15px] font-extrabold">Post-campaign</h2>
                  <span className="rounded-full bg-[#dcdcdc] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#4d4e52]">Coming soon</span>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
