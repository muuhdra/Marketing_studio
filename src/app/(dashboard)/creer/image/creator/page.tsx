'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMediaStore } from '@/lib/stores/mediaStore'
import { Plus, Image as ImageIcon, UserRound, Sparkles, Minus, Layers, X, ChevronDown, ChevronLeft, ImagePlus, Package, Check, Link2 as LinkIcon, Upload, Film, Search, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { PageShell, MainPanel, WizardHeader } from '@/components/features/creer/WizardKit'
import { actionGenerateImage } from '@/lib/actions/ai'
import { actionUploadTempImage, actionListAvatarsForPicker } from '@/lib/actions/avatar-assets'
import { actionUploadProductImage, actionCreateProduct, actionListProducts, actionAnalyzeProductUrl, actionDeleteProduct, type ProductDTO } from '@/lib/actions/products'
import { persistOutput } from '@/lib/actions/outputs'
import { estimateCost, formatCost } from '@/lib/ai/costs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import type { ImageResult } from '@/lib/ai/image'

const RATIOS = [
  { id: '1:1',  label: '1:1',  size: '1024x1024' as const },
  { id: '16:9', label: '16:9', size: '1792x1024' as const },
  { id: '9:16', label: '9:16', size: '1024x1792' as const },
]

export default function CustomImageCreatorPage() {
  const router = useRouter()
  const toast  = useToast()

  const [prompt, setPrompt]       = useState('')
  const [ratio, setRatio]         = useState(RATIOS[0])
  const [quality, setQuality]     = useState<'standard' | 'hd'>('standard')
  const [variations, setVariations] = useState(1)
  const [refs, setRefs]           = useState<{ url: string; label: string }[]>([])
  const [busy, setBusy]           = useState(false)
  const [generating, setGenerating] = useState(false)
  const [results, setResults]     = useState<ImageResult[]>([])
  const [lightbox, setLightbox]   = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [avatars, setAvatars]     = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [selAvatars, setSelAvatars] = useState<{ url: string; name: string }[]>([])
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  const [avatarSearch, setAvatarSearch] = useState('')
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [products, setProducts]   = useState<ProductDTO[]>([])
  const [selProduct, setSelProduct] = useState<number | null>(null)

  // Drawer « Ajouter un nouveau produit »
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pName, setPName]         = useState('')
  const [pDesc, setPDesc]         = useState('')
  const [pCurrency, setPCurrency] = useState('USD')
  const [pPrice, setPPrice]       = useState('')
  const [pBenefits, setPBenefits] = useState<string[]>([])
  const [pBenefitInput, setPBenefitInput] = useState('')
  const [pImage, setPImage]       = useState<{ path: string; url: string } | null>(null)
  const [pImages, setPImages]     = useState<{ path: string; url: string }[]>([])
  const [pUrl, setPUrl]           = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  function addRefs(items: { url: string; label: string }[]) {
    setRefs((r) => {
      const have = new Set(r.map((x) => x.url))
      return [...r, ...items.filter((it) => it.url && !have.has(it.url))]
    })
  }

  function pick(onFile: (f: File) => void) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => { const f = input.files?.[0]; if (f) onFile(f) }
    input.click()
  }
  async function uploadProductImg(file: File): Promise<{ path: string; url: string } | null> {
    if (!file.type.startsWith('image/')) { toast.error('Le fichier doit être une image'); return null }
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { path, signedUrl } = await actionUploadProductImage(fd)
      return { path, url: signedUrl ?? '' }
    } catch (e: any) { toast.error(e.message ?? 'Erreur upload'); return null }
    finally { setBusy(false) }
  }
  async function loadProducts() {
    try { setProducts(await actionListProducts()) } catch { /* vide */ }
  }
  async function deleteProduct(id: string) {
    if (busy) return
    setBusy(true)
    try {
      await actionDeleteProduct(id)
      setSelProduct(null)
      await loadProducts()
      toast.success('Produit supprimé')
    } catch (e: any) { toast.error(e.message ?? 'Suppression impossible') }
    finally { setBusy(false) }
  }
  function openProductModal() { setSelProduct(null); setProductModalOpen(true); loadProducts() }
  function resetProductForm() {
    setPName(''); setPDesc(''); setPCurrency('USD'); setPPrice(''); setPBenefits([]); setPBenefitInput(''); setPImage(null); setPImages([]); setPUrl('')
  }
  async function createProduct() {
    if (!pName.trim()) { toast.error('Donne un nom au produit'); return }
    setBusy(true)
    try {
      await actionCreateProduct({
        name: pName, description: pDesc || null, currency: pCurrency, price: pPrice || null,
        benefits: pBenefits, imagePath: pImage?.path ?? null, additionalPaths: pImages.map((x) => x.path), sourceUrl: pUrl || null,
      })
      toast.success('Produit créé ✓')
      resetProductForm(); setDrawerOpen(false)
      await loadProducts()
    } catch (e: any) { toast.error(e.message ?? 'Erreur création') }
    finally { setBusy(false) }
  }
  async function analyzeUrl() {
    if (!pUrl.trim()) { toast.error('Colle l\'URL d\'un produit'); return }
    setAnalyzing(true)
    try {
      const a = await actionAnalyzeProductUrl(pUrl.trim())
      if (a.name) setPName(a.name)
      if (a.description) setPDesc(a.description)
      if (a.price) setPPrice(a.price)
      if (a.currency) setPCurrency(a.currency)
      if (a.benefits?.length) setPBenefits(a.benefits)
      if (a.image) setPImage({ path: a.image.path, url: a.image.signedUrl ?? '' })
      toast.success('Produit analysé ✓')
    } catch (e: any) { toast.error(e.message ?? 'Analyse impossible') }
    finally { setAnalyzing(false) }
  }
  function addBenefit() {
    const b = pBenefitInput.trim()
    if (!b) return
    setPBenefits((arr) => [...arr, b]); setPBenefitInput('')
  }

  // ── Bibliothèque de médias ──
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTab, setMediaTab]   = useState<'assets' | 'creations'>('creations')
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([])
  const [selMedia, setSelMedia]   = useState<string[]>([])
  const creations = useMediaStore((s) => s.assets)
  useEffect(() => { useMediaStore.getState().loadFromServer() }, [])

  async function uploadMedia(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Le fichier doit être une image'); return }
    setBusy(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      setUploadedMedia((m) => [url, ...m]); setSelMedia([url]); setMediaTab('assets')
    } catch (e: any) { toast.error(e.message ?? 'Erreur upload') }
    finally { setBusy(false) }
  }
  function onDropMedia(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => { if (f.type.startsWith('image/')) uploadMedia(f) })
  }
  function toggleMedia(url: string) {
    setSelMedia((s) => s.includes(url) ? s.filter((x) => x !== url) : (s.length < 14 ? [...s, url] : s))
  }
  function useSelectedMedia() {
    if (selMedia.length) { addRefs(selMedia.map((u) => ({ url: u, label: 'Média' }))); toast.success(`${selMedia.length} média${selMedia.length > 1 ? 's' : ''} ajouté${selMedia.length > 1 ? 's' : ''} ✓`) }
    setMediaModalOpen(false)
  }

  // ── Fenêtre « Create Asset with AI » (générer une image puis l'ajouter à la bibliothèque) ──
  const ASPECTS = ['1:1', '16:9', '9:16', '4:5']
  const [aiOpen, setAiOpen]     = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAspect, setAiAspect] = useState('1:1')
  const [aiBusy, setAiBusy]     = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  function aspectToSize(a: string): '1024x1024' | '1792x1024' | '1024x1792' {
    if (a === '16:9') return '1792x1024'
    if (a === '9:16' || a === '4:5') return '1024x1792'
    return '1024x1024'
  }
  function openAiCreator() { setAiPrompt(''); setAiResult(null); setAiOpen(true) }
  async function generateAiMedia() {
    if (aiBusy) return
    if (!aiPrompt.trim()) { toast.error('Décris l\'image à générer'); return }
    setAiBusy(true); setAiResult(null)
    try {
      const size = aspectToSize(aiAspect)
      const res = await actionGenerateImage({ prompt: aiPrompt.trim(), model: 'nano-banana', size, quality: 'standard', n: 1 })
      const url = res[0]?.url
      if (!url) throw new Error('Aucune image générée')
      setAiResult(url)
      setUploadedMedia((m) => m.includes(url) ? m : [url, ...m])
      setSelMedia((s) => s.includes(url) ? s : [...s, url])
      setMediaTab('assets')
      persistOutput({ type: 'image', sourceUrl: url, title: `Image · ${aiAspect}`, engine: 'nano-banana', prompt: aiPrompt.slice(0, 200), format: size }).catch(() => {})
      toast.success('Image générée ✓')
    } catch (e: any) { toast.error(e.message ?? 'Échec de la génération') }
    finally { setAiBusy(false) }
  }

  async function openAvatarPicker() {
    setSelAvatars([]); setPreviewAvatarUrl(null); setAvatarSearch(''); setPickerOpen(true)
    try { setAvatars(await actionListAvatarsForPicker()) } catch { /* vide */ }
  }
  function toggleAvatar(url: string, name: string) {
    setPreviewAvatarUrl(url)
    setSelAvatars((s) => s.some((x) => x.url === url) ? [] : [{ url, name }])
  }
  function useSelectedAvatars() {
    if (selAvatars.length) { addRefs(selAvatars.map((a) => ({ url: a.url, label: a.name }))); toast.success(`${selAvatars.length} avatar${selAvatars.length > 1 ? 's' : ''} ajouté${selAvatars.length > 1 ? 's' : ''} ✓`) }
    setPickerOpen(false)
  }
  function useAvatarModel(avatar: { name: string; photoUrl: string }) {
    addRefs([{ url: avatar.photoUrl, label: avatar.name }])
    setSelAvatars([{ url: avatar.photoUrl, name: avatar.name }])
    toast.success(`${avatar.name} ajouté ✓`)
    setPickerOpen(false)
  }

  async function generate() {
    if (!prompt.trim()) { toast.error('Décris l\'image à créer'); return }
    setGenerating(true); setResults([])
    try {
      // Fidélité : si des références sont attachées (produit/avatar/média), on impose de les respecter.
      const refNote = refs.length
        ? ` Use the attached reference image${refs.length > 1 ? 's' : ''} faithfully: keep the same products and people exactly as shown (shape, colors, text, logo, identity, proportions). Do not invent or replace them.`
        : ''
      const res = await actionGenerateImage({
        prompt:  prompt.trim() + refNote,
        model:   'nano-banana',
        size:    ratio.size,
        quality,
        n:       variations,
        ...(refs.length ? { imageUrl: refs.map((r) => r.url) } : {}),
      })
      setResults(res)
      toast.success(`${res.length} image${res.length > 1 ? 's' : ''} générée${res.length > 1 ? 's' : ''}`)
      res.forEach((r) => {
        if (r.url) persistOutput({ type: 'image', sourceUrl: r.url, title: `Image · ${ratio.label}`, engine: 'nano-banana', prompt: prompt.slice(0, 200), format: ratio.size }).catch(() => {})
      })
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur de génération')
    } finally { setGenerating(false) }
  }

  const filteredAvatars = avatars.filter((a) => a.name.toLowerCase().includes(avatarSearch.trim().toLowerCase()))
  const activeAvatar = filteredAvatars.find((a) => a.photoUrl && a.photoUrl === previewAvatarUrl)
    ?? filteredAvatars.find((a) => a.photoUrl && selAvatars.some((x) => x.url === a.photoUrl))
    ?? filteredAvatars.find((a) => a.photoUrl)
    ?? null
  const selectedAvatarUrl = selAvatars[0]?.url ?? null

  return (
    <>
    <PageShell>
      <MainPanel>
        <WizardHeader title="Créateur d'image" onBack={() => router.push('/creer/image')} />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Contenu centré */}
          <div className="max-w-[760px] mx-auto px-6 pt-8 pb-12">
        <div className="text-center mb-7">
          <h2 className="font-display font-extrabold text-[26px] leading-tight text-zinc-950">Create an Image</h2>
          <p className="text-[15px] text-zinc-700 mt-2">Describe what you want · add context · generate</p>
        </div>

        {/* Composer */}
        <div className="bg-[#fbfaf9] border border-zinc-200 rounded-[18px] overflow-hidden shadow-[0_1px_2px_rgb(17_17_19/0.04),0_8px_22px_rgb(17_17_19/0.06)]">
          {/* Pièces jointes */}
          <div className="flex items-center gap-6 px-5 py-4 border-b border-zinc-200">
            <button onClick={openProductModal} disabled={busy} className="flex items-center gap-2 text-[14px] font-bold text-zinc-800 hover:text-zinc-950 transition-colors disabled:opacity-50">
              <Plus size={17} strokeWidth={2.1} /> Add Product
            </button>
            <button onClick={() => { setSelMedia([]); setMediaModalOpen(true); loadProducts() }} disabled={busy} className="flex items-center gap-2 text-[14px] font-bold text-zinc-800 hover:text-zinc-950 transition-colors disabled:opacity-50">
              <ImageIcon size={18} strokeWidth={2.1} /> Add Media
            </button>
            <button onClick={openAvatarPicker} disabled={busy} className="flex items-center gap-2 text-[14px] font-bold text-zinc-800 hover:text-zinc-950 transition-colors disabled:opacity-50">
              <UserRound size={18} strokeWidth={2.1} /> Add Avatar
            </button>
          </div>

          {/* Références attachées (multi) */}
          {refs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
              {refs.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-2 bg-bg-elevated border border-border rounded-neo px-2 py-1 text-[11px] text-text-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt="" className="w-5 h-5 rounded object-cover" />
                  {r.label}
                  <button onClick={() => setRefs(refs.filter((_, j) => j !== i))} className="text-text-dim hover:text-coral"><X size={13} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe the image you want to create..."
            className="w-full bg-transparent border-0 px-5 py-4 outline-none resize-none focus:shadow-none text-[15px] leading-relaxed text-zinc-950 placeholder:text-zinc-400 min-h-[150px]"
          />

          {/* Réglages bas */}
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-zinc-200 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[13px] font-extrabold text-zinc-800 whitespace-nowrap">Aspect Ratio</span>
              <div className="flex items-center gap-1 bg-zinc-200 rounded-[12px] p-0.5">
                {RATIOS.map((r) => (
                  <button key={r.id} onClick={() => setRatio(r)}
                    className={`h-9 px-3 rounded-[10px] inline-flex items-center gap-1.5 text-[13px] font-extrabold transition-colors ${ratio.id === r.id ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-700 hover:text-zinc-950'}`}>
                    <span className={`inline-block border border-current ${r.id === '1:1' ? 'w-3 h-3 rounded-[3px]' : r.id === '16:9' ? 'w-4 h-2 rounded-[2px]' : 'w-2 h-4 rounded-[2px]'}`} />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setQuality(quality === 'standard' ? 'hd' : 'standard')}
              className="h-9 flex items-center gap-2 px-3 rounded-[10px] text-[13px] font-extrabold text-zinc-800 hover:bg-zinc-100 transition-colors">
              <Layers size={17} /> {quality === 'standard' ? 'Standard' : 'HD'} <ChevronDown size={15} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Variations */}
        <div className="flex items-center justify-between mt-5 mb-4 px-1">
          <div>
            <p className="text-[15px] font-extrabold text-zinc-950">Variations</p>
            <p className="text-[13px] text-zinc-700 mt-0.5">How many images to generate</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setVariations((v) => Math.max(1, v - 1))} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 transition-colors" aria-label="Moins"><Minus size={16} /></button>
            <span className="text-[20px] font-extrabold text-zinc-950 w-6 text-center">{variations}</span>
            <button onClick={() => setVariations((v) => Math.min(4, v + 1))} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-950 hover:bg-zinc-50 transition-colors" aria-label="Plus"><Plus size={18} /></button>
          </div>
        </div>

        {/* Générer */}
        <button onClick={generate} disabled={generating || busy || !prompt.trim()}
          className="w-full h-12 rounded-[14px] bg-[#ff987f] text-white font-extrabold text-[16px] flex items-center justify-center gap-3 hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
          {generating
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating...</>
            : <><Sparkles size={19} /> Generate <span className="text-white/70">·</span> <span className="inline-flex items-center gap-1.5">{formatCost(estimateCost('nano-banana') * variations)}</span></>}
        </button>

        {/* Résultats */}
        {results.length > 0 && (
          <div className={`grid gap-3 mt-7 ${results.length === 1 ? 'grid-cols-1 max-w-[420px] mx-auto' : 'grid-cols-2'}`}>
            {results.map((r, i) => r.url && (
              <button key={i} onClick={() => setLightbox(r.url)} className="rounded-neo-lg overflow-hidden border border-border bg-bg-card hover:border-accent transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={`Variation ${i + 1}`} className="w-full object-cover" />
              </button>
            ))}
          </div>
        )}
          </div>
        </div>
      </MainPanel>
    </PageShell>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 rounded-neo border border-white/30 text-white flex items-center justify-center hover:bg-white/10"><X size={18} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[92vw] max-h-[88vh] object-contain rounded-neo-lg" />
        </div>
      )}

      {/* Modale — Bibliothèque de médias */}
      {mediaModalOpen && (() => {
        const creationImages = creations.filter((a) => a.type === 'image' && a.url).map((a) => a.url)
        const items = mediaTab === 'assets' ? uploadedMedia : creationImages
        return (
          <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in" onClick={() => setMediaModalOpen(false)}>
            <div className="w-full max-w-[1080px] max-h-[88vh] bg-bg-card border border-border rounded-neo-lg shadow-neo overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-display font-bold text-[19px] text-text-primary">Ta bibliothèque de médias</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-bg-elevated rounded-neo-md p-0.5">
                    <button onClick={() => setMediaTab('assets')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-neo text-[12.5px] font-semibold transition-colors ${mediaTab === 'assets' ? 'bg-bg-card text-text-primary shadow-neo-sm' : 'text-text-muted hover:text-text-primary'}`}><ImageIcon size={14} /> Médias</button>
                    <button onClick={() => setMediaTab('creations')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-neo text-[12.5px] font-semibold transition-colors ${mediaTab === 'creations' ? 'bg-bg-card text-text-primary shadow-neo-sm' : 'text-text-muted hover:text-text-primary'}`}><Film size={14} /> Créations</button>
                  </div>
                  <button onClick={() => setMediaModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={20} /></button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex min-h-0">
                {/* Grille */}
                <div className="flex-1 overflow-y-auto p-6">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16">
                      <ImageIcon size={48} className="text-text-faint mb-4" strokeWidth={1.5} />
                      <p className="text-[16px] font-bold text-text-primary">Aucune image pour le moment</p>
                      <p className="text-[13px] text-text-muted mt-1">Importe ta première image ou génère-en une.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                      {items.map((url, i) => {
                        const sel = selMedia.includes(url)
                        return (
                          <button key={i} onClick={() => toggleMedia(url)}
                            className={`relative rounded-neo-lg overflow-hidden border-2 aspect-square bg-bg-elevated transition-colors ${sel ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            {sel && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"><Check size={12} /></span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Panneau droit */}
                <div className="w-[320px] flex-shrink-0 border-l border-border p-5 flex flex-col gap-4 overflow-y-auto">
                  {/* Dropzone */}
                  <button
                    onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.onchange = () => onDropMedia(i.files); i.click() }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); onDropMedia(e.dataTransfer.files) }}
                    disabled={busy}
                    className="rounded-neo-lg border border-dashed border-border-strong bg-bg-surface p-6 flex flex-col items-center text-center hover:border-accent transition-colors disabled:opacity-50">
                    <Upload size={22} className="text-text-secondary mb-2" />
                    <span className="text-[14px] font-bold text-text-primary flex items-center gap-1.5"><ImageIcon size={15} /> Importer des images</span>
                    <span className="text-[11.5px] text-text-muted mt-1">Glisse-dépose ou clique pour choisir</span>
                    <span className="text-[10.5px] text-text-dim mt-2 leading-relaxed">Max 20 Mo / image</span>
                  </button>

                  <div className="flex items-center gap-3"><span className="flex-1 h-px bg-border" /><span className="text-[11px] text-text-dim font-semibold">OU</span><span className="flex-1 h-px bg-border" /></div>

                  <button onClick={openAiCreator} className="flex items-center justify-center gap-2 py-2.5 rounded-neo-md border border-border text-[13px] font-semibold text-text-primary hover:bg-fg/[0.05] transition">
                    <Sparkles size={15} className="text-accent" /> Créer avec l&apos;IA
                  </button>

                  <div>
                    <p className="nb-label mb-1.5">Produit</p>
                    <select
                      value=""
                      onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value)
                        if (p?.imageUrl) {
                          const img = p.imageUrl
                          setUploadedMedia((m) => m.includes(img) ? m : [img, ...m])
                          setSelMedia((s) => s.includes(img) ? s : [...s, img])
                          setMediaTab('assets')
                        }
                      }}
                      className="w-full bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent">
                      <option value="">{products.length ? 'Ajouter l\'image d\'un produit…' : 'Aucun produit'}</option>
                      {products.map((p) => <option key={p.id} value={p.id} disabled={!p.imageUrl}>{p.name}{p.imageUrl ? '' : ' (sans image)'}</option>)}
                    </select>
                  </div>

                  <div>
                    <p className="nb-label mb-1.5">Type d&apos;asset</p>
                    <span className="inline-flex items-center gap-1.5 bg-accent text-white rounded-neo-md px-3 py-1.5 text-[12px] font-bold"><ImageIcon size={13} /> Images</span>
                  </div>

                  <div className="mt-auto pt-2">
                    <button onClick={useSelectedMedia} disabled={selMedia.length === 0}
                      className="w-full py-3 rounded-neo-md bg-gradient-accent text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      <Check size={16} /> Utiliser la sélection{selMedia.length > 0 ? ` (${selMedia.length})` : ''}
                    </button>
                    <p className="text-center text-[11px] text-text-muted mt-2">Max 14 médias</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Fenêtre — Create Asset with AI */}
      {aiOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 px-5 py-7 animate-fade-in">
          <button type="button" aria-label="Fermer" onClick={() => setAiOpen(false)} className="absolute inset-0 cursor-default" />
          <div className="relative z-10 h-[min(82vh,720px)] w-full max-w-[1060px] overflow-hidden rounded-[12px] border border-[#cfcfcf] bg-[#eeeeee] text-[#17181b] shadow-neo">
            <button type="button" aria-label="Fermer" onClick={() => setAiOpen(false)} className="absolute right-6 top-5 z-20 text-[#202124] transition hover:text-[#e33508]"><X size={22} strokeWidth={2.25} /></button>

            <header className="flex h-[74px] items-center gap-3 border-b border-[#d2d2d2] px-7">
              <button type="button" aria-label="Retour" onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#15161a] transition hover:bg-[#dedede]"><ChevronLeft size={20} strokeWidth={2.4} /></button>
              <Sparkles size={21} strokeWidth={2.25} className="text-[#15161a]" />
              <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight">Create Asset with AI</h2>
            </header>

            <div className="grid h-[calc(100%-74px)] min-h-0 gap-5 overflow-y-auto px-7 py-7 lg:grid-cols-[1fr_390px]">
              <section className="flex min-h-[520px] flex-col">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#303136]">Image Preview</p>
                <div className="mt-3 flex min-h-[430px] flex-1 items-center justify-center overflow-hidden rounded-[9px] border border-[#c7c7c7] bg-[#e4e4e4] px-5 text-center">
                  {aiBusy ? (
                    <div className="flex flex-col items-center gap-4 text-[#3c3d41]">
                      <span className="h-9 w-9 rounded-full border-2 border-[#e33508] border-t-transparent animate-spin" />
                      <p className="text-[15px] font-semibold">Génération en cours…</p>
                    </div>
                  ) : aiResult ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={aiResult} alt="Image générée" className="max-h-full max-w-full object-contain rounded-[6px]" />
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
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., A professional product photo of a sleek coffee mug on a marble countertop, soft morning light, minimalist style"
                    className="min-h-[96px] flex-1 resize-none bg-transparent text-[15px] font-medium leading-relaxed text-[#1d1e22] outline-none placeholder:text-[#7d838d]"
                  />
                  <button type="button" onClick={() => setAiAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])} className="mt-auto flex w-fit items-center gap-2 pt-6 text-[14px] font-extrabold text-[#34353a] transition hover:text-[#e33508]">
                    <SlidersHorizontal size={16} strokeWidth={2.35} />
                    Aspect Ratio: {aiAspect}
                  </button>
                </div>
                <button type="button" onClick={generateAiMedia} disabled={aiBusy} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#d27a62] px-4 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-60">
                  <Sparkles size={17} strokeWidth={2.4} />
                  {aiBusy ? 'Generating…' : 'Create with AI'}
                </button>
                {aiResult && !aiBusy && (
                  <button type="button" onClick={() => setAiOpen(false)} className="mt-2 flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#c7c7c7] bg-[#e4e4e4] px-4 text-[14px] font-extrabold text-[#17181b] transition hover:border-[#bdbdbd]">
                    <Check size={16} /> Ajouté à la bibliothèque · Retour
                  </button>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Modale — Ajouter un produit */}
      {productModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in" onClick={() => setProductModalOpen(false)}>
          <div className="w-full max-w-[620px] max-h-[85vh] bg-bg-card border border-border rounded-neo-lg shadow-neo overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-accent" />
                <h3 className="font-display font-bold text-[17px] text-text-primary">Ajouter un produit</h3>
              </div>
              <button onClick={() => setProductModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[260px]">
              {products.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <span className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted mb-4"><Package size={26} /></span>
                  <p className="text-[14px] text-text-secondary mb-4">Aucun produit pour le moment.</p>
                  <button onClick={() => setDrawerOpen(true)} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-neo-md border border-border text-[13px] font-semibold text-text-primary hover:bg-fg/[0.05] transition disabled:opacity-50">
                    <Plus size={15} /> Ajouter un produit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {products.map((p, i) => (
                    <button key={p.id} onClick={() => setSelProduct(i)}
                      className={`group relative rounded-neo-lg overflow-hidden border-2 aspect-square bg-bg-elevated transition-colors ${selProduct === i ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
                      <span role="button" tabIndex={-1} aria-label="Supprimer le produit" title="Supprimer le produit" onClick={(event) => { event.stopPropagation(); deleteProduct(p.id) }} className="absolute left-1.5 top-1.5 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary shadow-neo-sm ring-1 ring-border backdrop-blur opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95"><X size={14} strokeWidth={2.5} /></span>
                      {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imageUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                        : <span className="absolute inset-0 flex items-center justify-center text-text-faint"><Package size={22} /></span>}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] font-semibold text-white truncate text-left">{p.name}</span>
                      {selProduct === i && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"><Check size={12} /></span>}
                    </button>
                  ))}
                  <button onClick={() => setDrawerOpen(true)} disabled={busy} className="rounded-neo-lg border border-dashed border-border aspect-square flex flex-col items-center justify-center gap-1 text-text-muted hover:border-accent hover:text-accent transition disabled:opacity-50">
                    <Plus size={20} /><span className="text-[11px] font-medium">Ajouter</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
              <button onClick={() => setProductModalOpen(false)} className="px-4 py-2 rounded-neo-md border border-border text-[13px] font-semibold text-text-primary hover:bg-fg/[0.05] transition">Annuler</button>
              <button onClick={() => { const p = selProduct != null ? products[selProduct] : null; if (p?.imageUrl) { addRefs([{ url: p.imageUrl, label: p.name }]); toast.success('Produit ajouté ✓') } else if (p) { toast.error('Ce produit n\'a pas d\'image') } setProductModalOpen(false) }}
                className="px-5 py-2 rounded-neo-md bg-accent text-white text-[13px] font-bold hover:brightness-105 transition">Terminé</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer — Ajouter un nouveau produit */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[1100] flex justify-end animate-fade-in">
          <div className="flex-1 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-[480px] h-full bg-bg-card shadow-neo-lg overflow-y-auto relative animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors z-10" aria-label="Fermer"><X size={20} /></button>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <h3 className="font-display font-bold text-[20px] text-text-primary">Ajouter un nouveau produit</h3>
                  <p className="text-[13px] text-text-muted mt-0.5">Crée un nouveau produit pour ta marque</p>
                </div>
                <button onClick={createProduct} className="flex items-center gap-1.5 px-4 py-2 rounded-neo-md bg-gradient-accent text-white text-[13px] font-bold hover:brightness-105 transition flex-shrink-0">
                  <Plus size={15} /> Créer le produit
                </button>
              </div>

              {/* Auto-remplir depuis URL */}
              <div>
                <p className="nb-label mb-2 flex items-center gap-1.5"><Sparkles size={13} className="text-accent" /> Auto-remplir depuis une URL</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-bg-input border border-border rounded-neo-md px-3 min-w-0">
                    <LinkIcon size={15} className="text-text-dim flex-shrink-0" />
                    <input value={pUrl} onChange={(e) => setPUrl(e.target.value)} placeholder="ex. https://tonsite.com/produits/<nom>" className="flex-1 min-w-0 bg-transparent border-0 outline-none py-2.5 text-[13px] text-text-primary placeholder:text-text-faint" />
                  </div>
                  <button onClick={analyzeUrl} disabled={analyzing || busy} className="flex items-center gap-1.5 px-4 rounded-neo-md bg-gradient-accent text-white text-[13px] font-bold hover:brightness-105 transition flex-shrink-0 disabled:opacity-60">
                    {analyzing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />} Analyser
                  </button>
                </div>
              </div>

              {/* Image + nom + description */}
              <div className="flex gap-4">
                <button onClick={() => pick(async (f) => { const r = await uploadProductImg(f); if (r) setPImage(r) })} disabled={busy}
                  className="w-28 h-28 rounded-neo-lg border border-border bg-bg-elevated flex items-center justify-center text-text-muted overflow-hidden flex-shrink-0 hover:border-accent transition disabled:opacity-50">
                  {pImage?.url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={pImage.url} alt="" className="w-full h-full object-cover" />
                    : <Package size={28} />}
                </button>
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <p className="nb-label mb-1.5">Nom</p>
                    <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nom du produit" className="w-full bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent" />
                  </div>
                  <div>
                    <p className="nb-label mb-1.5">Description</p>
                    <textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={3} placeholder="Décris ce produit…" className="w-full bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent resize-none" />
                  </div>
                </div>
              </div>

              {/* Tarif */}
              <div>
                <p className="nb-label mb-1.5">Tarif</p>
                <div className="flex gap-2">
                  <input value={pCurrency} onChange={(e) => setPCurrency(e.target.value.toUpperCase().slice(0, 4))} className="w-20 bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-center text-text-primary outline-none focus:border-accent" />
                  <input value={pPrice} onChange={(e) => setPPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00" className="flex-1 bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent" />
                </div>
              </div>

              {/* Avantages */}
              <div>
                <p className="nb-label mb-1.5">Avantages</p>
                <div className="flex gap-2">
                  <input value={pBenefitInput} onChange={(e) => setPBenefitInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } }} placeholder="Ajouter un avantage…" className="flex-1 bg-bg-input border border-border rounded-neo-md px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent" />
                  <button onClick={addBenefit} className="w-10 rounded-neo-md border border-border flex items-center justify-center text-text-secondary hover:bg-fg/[0.05] transition"><Plus size={16} /></button>
                </div>
                {pBenefits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pBenefits.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-bg-elevated border border-border rounded-full px-2.5 py-1 text-[12px] text-text-secondary">
                        {b}<button onClick={() => setPBenefits(pBenefits.filter((_, j) => j !== i))} className="text-text-dim hover:text-coral"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Images supplémentaires */}
              <div>
                <p className="nb-label mb-1.5">Images supplémentaires ({pImages.length})</p>
                <div className="flex flex-wrap gap-2">
                  {pImages.map((u, i) => (
                    <span key={i} className="relative w-20 h-20 rounded-neo-md overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setPImages(pImages.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-black/55 text-white flex items-center justify-center"><X size={11} /></button>
                    </span>
                  ))}
                  <button onClick={() => pick(async (f) => { const r = await uploadProductImg(f); if (r) setPImages((arr) => [...arr, r]) })} disabled={busy}
                    className="w-20 h-20 rounded-neo-md border border-dashed border-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-accent hover:text-accent transition disabled:opacity-50">
                    <Upload size={18} /><span className="text-[10px]">Upload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Picker d'avatar */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-[940px] h-[82vh] max-h-[82vh] bg-white text-zinc-950 border border-border rounded-neo-lg shadow-neo overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200">
              <h3 className="font-display font-bold text-[16px] text-zinc-950">Choisir un avatar</h3>
              <button onClick={() => setPickerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 transition-colors" aria-label="Fermer"><X size={18} /></button>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-h-0 flex flex-col">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <label className="h-10 flex flex-1 items-center gap-2.5 rounded-[10px] border border-zinc-200 bg-white px-3 shadow-sm min-w-0">
                      <Search size={17} className="text-zinc-700" />
                      <input
                        value={avatarSearch}
                        onChange={(e) => setAvatarSearch(e.target.value)}
                        placeholder="Rechercher un avatar…"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-semibold text-zinc-950 placeholder:text-zinc-500 focus:shadow-none"
                      />
                    </label>
                    <span className="flex-shrink-0 text-[12px] font-semibold text-zinc-500">{filteredAvatars.length} avatar{filteredAvatars.length > 1 ? 's' : ''}</span>
                    {(avatarSearch || selAvatars.length > 0) && (
                      <button onClick={() => { setAvatarSearch(''); setSelAvatars([]); setPreviewAvatarUrl(null) }} className="w-10 h-10 flex-shrink-0 rounded-[10px] border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 transition" aria-label="Réinitialiser">
                        <RotateCcw size={17} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {filteredAvatars.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center py-10">
                      <UserRound size={40} className="text-zinc-300 mb-3" strokeWidth={1.5} />
                      <p className="text-[15px] font-extrabold text-zinc-950">Aucun avatar disponible.</p>
                      <p className="text-[13px] text-zinc-500 mt-1">Crée un avatar dans Avatar Studio pour le retrouver ici.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {filteredAvatars.map((a, index) => {
                        const sel = a.photoUrl ? selectedAvatarUrl === a.photoUrl : false
                        const previewed = a.photoUrl ? activeAvatar?.photoUrl === a.photoUrl : false
                        return (
                          <button key={a.id} disabled={!a.photoUrl}
                            onClick={() => { if (a.photoUrl) toggleAvatar(a.photoUrl, a.name) }}
                            className={`group relative aspect-[4/5] rounded-[10px] overflow-hidden bg-zinc-100 border-2 transition disabled:opacity-40 ${sel ? 'border-accent ring-2 ring-accent/30' : previewed ? 'border-zinc-400' : 'border-zinc-200 hover:border-zinc-300'}`}>
                            {a.photoUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={a.photoUrl} alt={a.name} className="absolute inset-0 w-full h-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                              : <span className="absolute inset-0 flex items-center justify-center text-[12px] text-zinc-400">—</span>}
                            {sel && (
                              <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                            <span className="absolute left-2 bottom-2 max-w-[78%] rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none text-zinc-950 shadow-sm truncate">
                              {a.name || `Model ${index + 1}`}
                            </span>
                            {sel && <span className="absolute inset-0 rounded-[10px] ring-2 ring-inset ring-accent pointer-events-none" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="min-h-0 flex flex-col bg-zinc-50/70">
                {activeAvatar?.photoUrl ? (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-5">
                      <div className="relative aspect-[4/4.25] overflow-hidden rounded-[12px] bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeAvatar.photoUrl} alt={activeAvatar.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="pt-3.5">
                        <h3 className="font-display text-[18px] font-extrabold leading-tight text-zinc-950">{activeAvatar.name}</h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">Référence pour guider le visage et le style de la génération.</p>
                      </div>
                    </div>

                    <div className="h-[60px] flex items-center justify-between gap-3 border-t border-zinc-200/70 px-4">
                      <p className="min-w-0 text-[14px] font-medium text-zinc-800 truncate">Using <span className="font-extrabold text-zinc-950">{activeAvatar.name}</span></p>
                      <button onClick={() => useAvatarModel({ name: activeAvatar.name, photoUrl: activeAvatar.photoUrl! })}
                        className="h-10 flex-shrink-0 rounded-[10px] bg-accent px-4 text-[14px] font-extrabold text-white shadow-neo-solid hover:brightness-105 active:scale-[0.99] transition">
                        Use this model
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-8">
                    <UserRound size={42} className="text-zinc-300 mb-3" strokeWidth={1.5} />
                    <p className="text-[15px] font-extrabold text-zinc-950">Sélectionne un avatar</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
