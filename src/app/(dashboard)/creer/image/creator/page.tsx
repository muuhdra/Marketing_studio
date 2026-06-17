'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMediaStore } from '@/lib/stores/mediaStore'
import { ArrowLeft, Plus, Image as ImageIcon, UserRound, Sparkles, Minus, Layers, X, ChevronDown, Package, Check, Link2 as LinkIcon, Upload, Film } from 'lucide-react'
import { actionGenerateImage } from '@/lib/actions/ai'
import { actionUploadTempImage, actionListAvatarsForPicker } from '@/lib/actions/avatar-assets'
import { actionUploadProductImage, actionCreateProduct, actionListProducts, actionAnalyzeProductUrl, type ProductDTO } from '@/lib/actions/products'
import { persistOutput } from '@/lib/actions/outputs'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import type { ImageResult } from '@/lib/ai/image'

const RATIOS = [
  { id: '1:1',  label: '1:1',  size: '1024x1024' as const },
  { id: '16:9', label: '16:9', size: '1792x1024' as const },
  { id: '9:16', label: '9:16', size: '1024x1792' as const },
]
const UNIT_COST = 0.04   // Nano Banana ~$0.039 / image

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

  async function openAvatarPicker() {
    setSelAvatars([]); setPickerOpen(true)
    try { setAvatars(await actionListAvatarsForPicker()) } catch { /* vide */ }
  }
  function toggleAvatar(url: string, name: string) {
    setSelAvatars((s) => s.some((x) => x.url === url) ? s.filter((x) => x.url !== url) : [...s, { url, name }])
  }
  function useSelectedAvatars() {
    if (selAvatars.length) { addRefs(selAvatars.map((a) => ({ url: a.url, label: a.name }))); toast.success(`${selAvatars.length} avatar${selAvatars.length > 1 ? 's' : ''} ajouté${selAvatars.length > 1 ? 's' : ''} ✓`) }
    setPickerOpen(false)
  }

  async function generate() {
    if (!prompt.trim()) { toast.error('Décris l\'image à créer'); return }
    setGenerating(true); setResults([])
    try {
      const res = await actionGenerateImage({
        prompt:  prompt.trim(),
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

  const cost = (UNIT_COST * variations).toFixed(2)

  return (
    <div className="animate-fade-in -mx-8 -mt-2">

      {/* Barre de titre */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-bg-base/80 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.push('/creer/image')} className="w-9 h-9 rounded-neo-md flex items-center justify-center text-text-secondary hover:bg-fg/[0.05] transition-colors" aria-label="Retour">
          <ArrowLeft size={18} />
        </button>
        <span className="w-px h-5 bg-border" />
        <h1 className="font-display font-bold text-[18px] text-text-primary">Créateur d&apos;image</h1>
      </div>

      {/* Contenu centré */}
      <div className="max-w-[820px] mx-auto px-6 pt-12 pb-16">
        <div className="text-center mb-7">
          <h2 className="font-display font-extrabold text-[28px] text-text-primary">Créer une image</h2>
          <p className="text-[14px] text-text-muted mt-1.5">Décris ce que tu veux · ajoute du contexte · génère</p>
        </div>

        {/* Composer */}
        <div className="bg-bg-surface border border-border rounded-neo-xl overflow-hidden shadow-neo-sm">
          {/* Pièces jointes */}
          <div className="flex items-center gap-1 px-3 py-2.5 border-b border-border">
            <button onClick={openProductModal} disabled={busy} className="flex items-center gap-2 px-3 py-1.5 rounded-neo-md text-[13px] font-medium text-text-secondary hover:bg-fg/[0.05] hover:text-text-primary transition-colors disabled:opacity-50">
              <Plus size={16} /> Ajouter un produit
            </button>
            <button onClick={() => { setSelMedia([]); setMediaModalOpen(true); loadProducts() }} disabled={busy} className="flex items-center gap-2 px-3 py-1.5 rounded-neo-md text-[13px] font-medium text-text-secondary hover:bg-fg/[0.05] hover:text-text-primary transition-colors disabled:opacity-50">
              <ImageIcon size={16} /> Ajouter un média
            </button>
            <button onClick={openAvatarPicker} disabled={busy} className="flex items-center gap-2 px-3 py-1.5 rounded-neo-md text-[13px] font-medium text-text-secondary hover:bg-fg/[0.05] hover:text-text-primary transition-colors disabled:opacity-50">
              <UserRound size={16} /> Ajouter un avatar
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
            rows={5}
            placeholder="Décris l'image que tu veux créer…"
            className="w-full bg-transparent border-0 p-4 outline-none resize-none focus:shadow-none text-[14px] leading-relaxed text-text-primary placeholder:text-text-faint min-h-[140px]"
          />

          {/* Réglages bas */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border flex-wrap">
            <div className="flex items-center gap-2">
              <span className="nb-label">Ratio</span>
              <div className="flex items-center gap-1 bg-bg-elevated rounded-neo-md p-0.5">
                {RATIOS.map((r) => (
                  <button key={r.id} onClick={() => setRatio(r)}
                    className={`px-3 py-1.5 rounded-neo text-[12px] font-semibold transition-colors ${ratio.id === r.id ? 'bg-bg-card text-text-primary shadow-neo-sm' : 'text-text-muted hover:text-text-primary'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setQuality(quality === 'standard' ? 'hd' : 'standard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-neo-md text-[12px] font-semibold text-text-secondary hover:bg-fg/[0.05] transition-colors">
              <Layers size={14} /> {quality === 'standard' ? 'Standard' : 'HD'} <ChevronDown size={13} />
            </button>
          </div>
        </div>

        {/* Variations */}
        <div className="flex items-center justify-between mt-5 mb-3">
          <div>
            <p className="text-[14px] font-bold text-text-primary">Variations</p>
            <p className="text-[12px] text-text-muted">Combien d&apos;images générer</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setVariations((v) => Math.max(1, v - 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:bg-fg/[0.05] transition-colors" aria-label="Moins"><Minus size={16} /></button>
            <span className="text-[16px] font-bold text-text-primary w-5 text-center">{variations}</span>
            <button onClick={() => setVariations((v) => Math.min(4, v + 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:bg-fg/[0.05] transition-colors" aria-label="Plus"><Plus size={16} /></button>
          </div>
        </div>

        {/* Générer */}
        <button onClick={generate} disabled={generating || busy || !prompt.trim()}
          className="w-full py-3.5 rounded-neo-lg bg-gradient-accent text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed">
          {generating
            ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Génération…</>
            : <><Sparkles size={18} /> Générer · ~{cost} $</>}
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

                  <button onClick={() => setMediaModalOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-neo-md border border-border text-[13px] font-semibold text-text-primary hover:bg-fg/[0.05] transition">
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
                      className={`relative rounded-neo-lg overflow-hidden border-2 aspect-square bg-bg-elevated transition-colors ${selProduct === i ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
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

      {/* Picker d'avatar (multi-sélection) */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-[640px] max-h-[85vh] bg-bg-card border border-border rounded-neo-lg shadow-neo overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-display font-bold text-[17px] text-text-primary">Choisir un avatar</h3>
              <button onClick={() => setPickerOpen(false)} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 min-h-[240px]">
              {avatars.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <UserRound size={40} className="text-text-faint mb-3" strokeWidth={1.5} />
                  <p className="text-[13px] text-text-secondary">Aucun avatar disponible.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {avatars.map((a) => {
                    const sel = a.photoUrl ? selAvatars.some((x) => x.url === a.photoUrl) : false
                    return (
                      <button key={a.id} disabled={!a.photoUrl}
                        onClick={() => { if (a.photoUrl) toggleAvatar(a.photoUrl, a.name) }}
                        className={`relative rounded-neo-lg overflow-hidden border-2 aspect-[4/5] bg-bg-elevated transition-colors disabled:opacity-40 ${sel ? 'border-accent' : 'border-transparent hover:border-border-strong'}`}>
                        {a.photoUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.photoUrl} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                          : <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-faint">—</span>}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] font-semibold text-white truncate text-left">{a.name}</span>
                        {sel && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"><Check size={12} /></span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
              <button onClick={() => setPickerOpen(false)} className="px-4 py-2 rounded-neo-md border border-border text-[13px] font-semibold text-text-primary hover:bg-fg/[0.05] transition">Annuler</button>
              <button onClick={useSelectedAvatars} disabled={selAvatars.length === 0} className="px-5 py-2 rounded-neo-md bg-gradient-accent text-white text-[13px] font-bold hover:brightness-105 transition disabled:opacity-50">
                Utiliser la sélection{selAvatars.length > 0 ? ` (${selAvatars.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
