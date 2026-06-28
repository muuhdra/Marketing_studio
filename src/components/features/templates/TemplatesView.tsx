'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Check, Video, Image as ImageIcon, Sparkles, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { VIDEO_TEMPLATES, IMAGE_TEMPLATES } from '@/lib/templates/library'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { useT } from '@/lib/i18n'

// ─── Modèle d'affichage unifié (DB ou repli mock) ────────────────────────────

type GalleryItem = {
  id: string
  kind: 'video' | 'image'
  label: string
  category: string | null
  url: string
  prompt: string | null
  aspect: string
  isMock: boolean
}

const MOCK_ASPECTS = ['aspect-[9/14]', 'aspect-[9/16]', 'aspect-[9/15]', 'aspect-[3/4]', 'aspect-[4/5]']

function mockItems(kind: 'video' | 'image'): GalleryItem[] {
  const src = kind === 'video' ? VIDEO_TEMPLATES : IMAGE_TEMPLATES
  return src.map((t) => ({
    id: `mock-${kind}-${t.id}`,
    kind,
    label: t.title,
    category: null,
    url: t.image,
    prompt: null,
    aspect: (t as { aspect?: string }).aspect ?? 'aspect-[4/5]',
    isMock: true,
  }))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TemplatesView() {
  const tr = useT()
  const router = useRouter()
  const [mode, setMode]       = useState<'video' | 'image'>('video')
  const [catOpen, setCatOpen] = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<GalleryItem | null>(null)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Templates réels du mode courant → repli sur la bibliothèque mock si la base est vide.
  const items = useMemo<GalleryItem[]>(() => {
    const real = templates
      .filter((t) => t.kind === mode)
      .map<GalleryItem>((t, i) => ({
        id: t.id,
        kind: mode,
        label: t.label,
        category: t.category,
        url: t.url,
        prompt: t.prompt,
        aspect: MOCK_ASPECTS[i % MOCK_ASPECTS.length],
        isMock: false,
      }))
    return real.length > 0 ? real : mockItems(mode)
  }, [templates, mode])

  // Catégories du filtre : dérivées du contenu réellement affiché (toujours cohérent).
  const categories = useMemo(
    () => Array.from(new Set(items.map((it) => it.category).filter(Boolean))).sort() as string[],
    [items]
  )

  const filtered = useMemo(
    () => (selectedCats.length === 0 ? items : items.filter((it) => it.category && selectedCats.includes(it.category))),
    [items, selectedCats]
  )

  function toggleCat(cat: string) {
    setSelectedCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  // Clic sur un template → ouvre le bon outil de création, pré-rempli avec son prompt.
  function useTemplate(it: GalleryItem) {
    const q = new URLSearchParams({ from: 'template' })
    // Le prompt du template (s'il existe) = structure d'inspiration, pas un script copié.
    // L'outil l'adapte au produit choisi lors de la génération.
    if (it.prompt) q.set('templatePrompt', it.prompt)
    if (it.kind === 'video') {
      q.set('type', 'broll-video')
      router.push(`/creer/video?${q.toString()}`)
    } else {
      // Côté image, on garde le prompt comme direction visuelle de départ.
      q.set('prompt', it.prompt ?? it.label)
      router.push(`/creer/image/statics?${q.toString()}`)
    }
  }

  return (
    <div className="-mx-8 -mb-8 -mt-6 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">

        {/* ── Header ── */}
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="grid h-8 w-8 place-items-center rounded-full text-text-primary transition-colors hover:bg-fg/[0.06]"
            >
              <ChevronLeft size={19} strokeWidth={2.5} />
            </Link>
            <h1 className="text-[17px] font-extrabold tracking-tight text-text-primary">{tr('templates.title')}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filtre catégories */}
            <div className="relative" ref={catRef}>
              <button
                onClick={() => setCatOpen((o) => !o)}
                className="flex items-center gap-2 rounded-[10px] border border-border bg-fg/[0.04] px-3 py-1.5 transition-colors hover:bg-fg/[0.08]"
              >
                <span className="text-[12px] font-extrabold text-text-primary">
                  {selectedCats.length === 0 ? tr('templates.allCategories') : selectedCats.length === 1 ? selectedCats[0] : tr('templates.selectedCount', { n: selectedCats.length })}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className={`text-text-muted transition-transform ${catOpen ? 'rotate-180' : ''}`} />
              </button>

              {catOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 max-h-[60vh] w-[240px] overflow-y-auto rounded-[14px] border border-border bg-bg-card shadow-neo-lg">
                  <button
                    onClick={() => setSelectedCats([])}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fg/[0.06]"
                  >
                    {selectedCats.length === 0
                      ? <Check size={16} strokeWidth={3} className="text-accent" />
                      : <span className="h-4 w-4" />}
                    <span className={`text-[14px] font-extrabold ${selectedCats.length === 0 ? 'text-accent' : 'text-text-primary'}`}>
                      {tr('templates.allCategories')}
                    </span>
                  </button>
                  <div className="mx-4 border-t border-border" />
                  {categories.map((cat) => {
                    const checked = selectedCats.includes(cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCat(cat)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-fg/[0.06]"
                      >
                        <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[4px] border-2 transition-colors ${
                          checked ? 'border-accent bg-accent' : 'border-border-strong bg-bg-card'
                        }`}>
                          {checked && <Check size={10} strokeWidth={3.5} className="text-white" />}
                        </span>
                        <span className="text-[13px] font-bold text-text-primary">{cat}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bascule Vidéo / Image */}
            <div className="flex h-8 items-center rounded-[9px] bg-fg/[0.08] p-0.5">
              <button
                onClick={() => { setMode('video'); setSelectedCats([]) }}
                className={`flex h-full items-center gap-1.5 rounded-[7px] px-3 text-[12px] font-extrabold transition-colors ${
                  mode === 'video' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Video size={14} strokeWidth={2.5} />
                {tr('templates.modeVideo')}
              </button>
              <button
                onClick={() => { setMode('image'); setSelectedCats([]) }}
                className={`flex h-full items-center gap-1.5 rounded-[7px] px-3 text-[12px] font-extrabold transition-colors ${
                  mode === 'image' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <ImageIcon size={14} strokeWidth={2.5} />
                {tr('templates.modeImage')}
              </button>
            </div>
          </div>
        </header>

        {/* ── Galerie ── */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-text-muted">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[13px] font-bold">{tr('templates.loading')}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.08]">
                {mode === 'video' ? <Video size={26} className="text-text-faint" /> : <ImageIcon size={26} className="text-text-faint" />}
              </div>
              <p className="text-[15px] font-extrabold text-text-primary">{tr('templates.emptyTitle')}</p>
              <p className="text-[13px] font-medium text-text-secondary">{tr('templates.emptyDesc')}</p>
            </div>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
              {filtered.map((it) => (
                <div
                  key={it.id}
                  onClick={() => setPreview(it)}
                  onMouseEnter={(e) => {
                    const v = e.currentTarget.querySelector('video')
                    if (!v) return
                    // Son au survol : autorisé si la page a déjà reçu une interaction
                    // (sticky activation). Sinon le navigateur peut refuser → repli muet.
                    v.muted = false
                    v.volume = 1
                    v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
                  }}
                  onMouseLeave={(e) => {
                    const v = e.currentTarget.querySelector('video')
                    if (v) { v.pause(); v.muted = true; v.currentTime = 0 }
                  }}
                  className="group relative mb-3 block w-full cursor-pointer overflow-hidden rounded-[14px] border border-border break-inside-avoid text-left"
                >
                  <div className={`relative w-full ${it.aspect}`}>
                    {it.kind === 'video' && !it.isMock ? (
                      <video
                        src={it.url}
                        muted loop playsInline preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.url}
                        alt={it.label}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <h3 className="text-[12px] font-extrabold leading-snug text-white drop-shadow-sm">{it.label}</h3>
                    </div>
                    {/* Bouton « Utiliser » au survol — lance l'outil sans ouvrir l'aperçu */}
                    <div className="absolute inset-0 flex items-end justify-center pb-9 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); useTemplate(it) }}
                        className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-extrabold text-white shadow-neo transition hover:brightness-105"
                      >
                        <Sparkles size={11} strokeWidth={2.5} />
                        {tr('templates.use')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </section>

      {/* ── Aperçu grand format ── */}
      {preview && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 p-6 animate-fade-in"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[88vh] w-full max-w-[420px] overflow-hidden rounded-[18px] bg-black shadow-neo-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            {preview.kind === 'video' && !preview.isMock ? (
              <video
                src={preview.url}
                autoPlay loop playsInline
                ref={(el) => {
                  if (!el) return
                  // Aperçu ouvert par un clic = geste utilisateur → lecture avec son autorisée.
                  el.muted = false
                  el.volume = 1
                  el.play().catch(() => { el.muted = true; el.play().catch(() => {}) })
                }}
                className="max-h-[88vh] w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.label} className="max-h-[88vh] w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
