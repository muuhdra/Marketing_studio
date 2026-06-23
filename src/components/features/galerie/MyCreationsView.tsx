'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Image as ImageIcon, Video, Music, Download, Trash2, Loader2, Clock, X } from 'lucide-react'
import { listOutputs, deleteOutput, type OutputDTO } from '@/lib/actions/outputs'
import { useToast } from '@/lib/stores/toastStore'

type TypeFilter = 'all' | 'image' | 'video' | 'audio'
type SortOrder = 'recent' | 'old'

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Tous les types' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Vidéos' },
  { id: 'audio', label: 'Audios' },
]

// Heures restantes avant expiration (outputs conservés 48 h).
function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000))
}

export default function MyCreationsView() {
  const toast = useToast()
  const [outputs, setOutputs] = useState<OutputDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortOrder>('recent')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [preview, setPreview] = useState<OutputDTO | null>(null)

  useEffect(() => {
    listOutputs()
      .then(setOutputs)
      .catch(() => setOutputs([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const list = typeFilter === 'all' ? outputs : outputs.filter((o) => o.type === typeFilter)
    return [...list].sort((a, b) =>
      sort === 'recent'
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt)
    )
  }, [outputs, typeFilter, sort])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteOutput(id)
      setOutputs((prev) => prev.filter((o) => o.id !== id))
      toast.success('Création supprimée')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  function handleDownload(o: OutputDTO) {
    const a = document.createElement('a')
    a.href = o.url
    a.download = `${o.title ?? 'creation'}-${o.id}`.replace(/[^\w.-]+/g, '_')
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="-mx-8 -mb-8 -mt-6 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">

        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-4 sm:px-5">
          <h1 className="text-[17px] font-extrabold tracking-tight text-text-primary">Mes créations</h1>
          <span className="text-[12px] font-bold text-text-muted">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Grille */}
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-[13px] font-bold">Chargement de tes créations…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.08]">
                  <Video size={26} className="text-text-faint" />
                </div>
                <p className="text-[15px] font-extrabold text-text-primary">Aucune création</p>
                <p className="text-[13px] font-medium text-text-secondary">Génère des images, vidéos ou audios — ils apparaîtront ici (conservés 48 h).</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((o) => (
                  <div
                    key={o.id}
                    className="group relative flex flex-col overflow-hidden rounded-[14px] border border-border bg-fg/[0.03]"
                  >
                    <div
                      onClick={() => { if (o.type !== 'audio') setPreview(o) }}
                      className={`relative aspect-square w-full overflow-hidden bg-black/5 ${o.type !== 'audio' ? 'cursor-pointer' : ''}`}
                    >
                      {o.type === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.url} alt={o.title ?? ''} className="h-full w-full object-cover" />
                      ) : o.type === 'video' ? (
                        <video
                          src={o.url}
                          muted loop playsInline preload="metadata"
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-fg/[0.06]">
                          <Music size={28} className="text-text-faint" />
                          <audio src={o.url} controls className="w-[88%]" />
                        </div>
                      )}

                      {/* Badge type */}
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                        {o.type === 'image' ? <ImageIcon size={10} /> : o.type === 'video' ? <Video size={10} /> : <Music size={10} />}
                        {o.type === 'image' ? 'Image' : o.type === 'video' ? 'Vidéo' : 'Audio'}
                      </span>

                      {/* Actions au survol */}
                      <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownload(o) }}
                          title="Télécharger"
                          className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                        >
                          <Download size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(o.id) }}
                          disabled={deleting === o.id}
                          title="Supprimer"
                          className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white transition hover:bg-coral disabled:opacity-50"
                        >
                          {deleting === o.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 p-2.5">
                      <p className="truncate text-[12px] font-extrabold text-text-primary">{o.title ?? 'Sans titre'}</p>
                      <div className="flex items-center justify-between text-[10px] font-bold text-text-muted">
                        <span className="truncate">{o.engine ?? '—'}{o.format ? ` · ${o.format}` : ''}</span>
                        <span className="flex shrink-0 items-center gap-0.5"><Clock size={10} />{hoursLeft(o.expiresAt)}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Filtres */}
          <aside className="hidden w-[180px] shrink-0 flex-col border-l border-border bg-fg/[0.03] md:flex">
            <div className="flex h-[44px] items-center justify-between border-b border-border px-3">
              <h2 className="text-[12px] font-extrabold tracking-tight text-text-primary">Filtres</h2>
              <button
                type="button"
                onClick={() => { setTypeFilter('all'); setSort('recent') }}
                title="Réinitialiser"
                className="grid h-6 w-6 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"
              >
                <Filter size={12} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Type */}
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-muted">Type</label>
              <div className="mb-4 flex flex-col gap-0.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTypeFilter(opt.id)}
                    className={`flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[12px] font-bold transition ${
                      typeFilter === opt.id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-fg/[0.06]'
                    }`}
                  >
                    {opt.label}
                    <span className={typeFilter === opt.id ? 'text-white/80' : 'text-text-faint'}>
                      {opt.id === 'all' ? outputs.length : outputs.filter((o) => o.type === opt.id).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tri */}
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-text-muted">Trier</label>
              <div className="flex gap-1">
                {([['recent', 'Récent'], ['old', 'Ancien']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSort(id)}
                    className={`flex-1 rounded-[8px] px-2 py-1.5 text-[12px] font-bold transition ${
                      sort === id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-fg/[0.06]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Aperçu grand format */}
      {preview && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 p-6 animate-fade-in"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[88vh] w-full max-w-[560px] overflow-hidden rounded-[18px] bg-black shadow-neo-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            {preview.type === 'video' ? (
              <video
                src={preview.url}
                autoPlay loop playsInline
                ref={(el) => {
                  if (!el) return
                  el.muted = false; el.volume = 1
                  el.play().catch(() => { el.muted = true; el.play().catch(() => {}) })
                }}
                className="max-h-[88vh] w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.title ?? ''} className="max-h-[88vh] w-full object-contain" />
            )}

            {/* Action télécharger */}
            <button
              type="button"
              onClick={() => handleDownload(preview)}
              className="absolute bottom-3 left-1/2 flex h-8 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo transition hover:brightness-105"
            >
              <Download size={13} strokeWidth={2.5} />
              Télécharger
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
