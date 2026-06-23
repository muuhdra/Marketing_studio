'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownUp,
  ChevronDown,
  Megaphone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { listCampaigns, createCampaign, deleteCampaign } from '@/lib/actions/campaigns'
import { useToast } from '@/lib/stores/toastStore'

type Campaign = Awaited<ReturnType<typeof listCampaigns>>[number]
type SortDir = 'newest' | 'oldest'
type TypeFilter = 'all' | 'generale' | 'speciale'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pre_campaign: 'Pré-campagne',
  active: 'Active',
  post_campaign: 'Post-campagne',
  archived: 'Archivée',
}
const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-fg/[0.08] text-text-secondary',
  pre_campaign: 'bg-amber-500/15 text-amber-600',
  active: 'bg-emerald-500/15 text-emerald-600',
  post_campaign: 'bg-sky-500/15 text-sky-600',
  archived: 'bg-fg/[0.08] text-text-muted',
}

export default function CampaignsView() {
  const router = useRouter()
  const toast = useToast()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('newest')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'generale' | 'speciale'>('generale')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      setCampaigns(await listCampaigns())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    let list = campaigns
    if (typeFilter !== 'all') list = list.filter((c) => c.campaign_type === typeFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q))
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortDir === 'newest' ? db - da : da - db
    })
    return list
  }, [campaigns, typeFilter, search, sortDir])

  function openModal() {
    setName('')
    setType('generale')
    setStartDate('')
    setEndDate('')
    setModalOpen(true)
  }

  async function create() {
    if (creating) return
    if (!name.trim()) { toast.error('Donne un nom à la campagne'); return }
    if (startDate && endDate && endDate < startDate) { toast.error('La date de fin doit suivre la date de début'); return }
    setCreating(true)
    try {
      const c = await createCampaign({
        name: name.trim(),
        campaignType: type,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      toast.success('Campagne créée ✓')
      setModalOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création impossible')
    } finally {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteCampaign(id)
      setCampaigns((list) => list.filter((c) => c.id !== id))
      toast.success('Campagne supprimée')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible')
    }
  }

  const typeLabel = typeFilter === 'all' ? 'Tous les types' : typeFilter === 'generale' ? 'Générale' : 'Spéciale'

  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        {/* Header */}
        <header className="flex h-[56px] flex-shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[19px] font-extrabold tracking-tight text-text-primary">Campagnes</h1>
            {!loading && (
              <span className="inline-flex items-center rounded-full bg-fg/[0.06] px-2 py-0.5 text-[12px] font-extrabold text-text-secondary">{campaigns.length}</span>
            )}
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
          >
            <Plus size={15} strokeWidth={2.8} /> Créer une campagne
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5 border-b border-border px-5 py-2.5">
          <div className="relative w-[260px]">
            <Search size={14} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une campagne…"
              className="h-8 w-full rounded-[8px] border border-border bg-fg/[0.03] pl-9 pr-3 text-[12px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
            />
          </div>

          {/* Filtre type */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setTypeMenuOpen((o) => !o); setSortMenuOpen(false) }}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-extrabold text-text-secondary transition-colors hover:border-accent"
            >
              {typeLabel}
              <ChevronDown size={13} strokeWidth={2.5} className={`text-text-muted transition-transform ${typeMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {typeMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-[170px] overflow-hidden rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                {([['all', 'Tous les types'], ['generale', 'Générale'], ['speciale', 'Spéciale']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setTypeFilter(v); setTypeMenuOpen(false) }}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${typeFilter === v ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tri */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setSortMenuOpen((o) => !o); setTypeMenuOpen(false) }}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-extrabold text-text-secondary transition-colors hover:border-accent"
            >
              <ArrowDownUp size={12} strokeWidth={2.5} className="text-text-muted" />
              {sortDir === 'newest' ? 'Plus récentes' : 'Plus anciennes'}
              <ChevronDown size={13} strokeWidth={2.5} className={`text-text-muted transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-[170px] overflow-hidden rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                {([['newest', 'Plus récentes'], ['oldest', 'Plus anciennes']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setSortDir(v); setSortMenuOpen(false) }}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${sortDir === v ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <span className="h-7 w-7 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-fg/[0.06] text-text-primary">
                <Megaphone size={22} strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 text-[16px] font-extrabold tracking-tight text-text-primary">
                {campaigns.length === 0 ? 'Aucune campagne pour l’instant' : 'Aucun résultat'}
              </h2>
              <p className="mt-1.5 max-w-[300px] text-[13px] font-medium text-text-secondary">
                {campaigns.length === 0
                  ? 'Crée ta première campagne pour piloter tes stratégies publicitaires.'
                  : 'Aucune campagne ne correspond à ta recherche.'}
              </p>
              {campaigns.length === 0 && (
                <button
                  type="button"
                  onClick={openModal}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                >
                  <Plus size={14} strokeWidth={2.8} /> Créer une campagne
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/campaigns`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/campaigns`) }}
                  className="group relative cursor-pointer rounded-[14px] border border-border bg-bg-surface p-4 text-left shadow-neo-sm transition-all hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-neo"
                >
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="Supprimer la campagne"
                    onClick={(e) => { e.stopPropagation(); remove(c.id) }}
                    className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg-card/95 text-text-secondary opacity-0 shadow-neo-sm ring-1 ring-border backdrop-blur transition-all duration-150 hover:bg-coral hover:text-white hover:ring-coral hover:scale-110 active:scale-95 group-hover:opacity-100"
                  >
                    <Trash2 size={13} strokeWidth={2.4} />
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-text-secondary">
                      {c.campaign_type === 'speciale' ? 'Spéciale' : 'Générale'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLE[c.status] ?? 'bg-fg/[0.08] text-text-secondary'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>

                  <h3 className="mt-3 truncate pr-6 text-[15px] font-extrabold leading-tight text-text-primary">{c.name}</h3>
                  <p className="mt-1 text-[11px] font-medium text-text-muted">
                    {c.start_date ? `Du ${c.start_date}${c.end_date ? ` au ${c.end_date}` : ''}` : `Créée le ${new Date(c.created_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modale de création */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]" onClick={() => !creating && setModalOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95">
            <div className="overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-[16px] font-extrabold tracking-tight text-text-primary">Nouvelle campagne</h2>
                <button type="button" onClick={() => !creating && setModalOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-fg/[0.06] hover:text-text-primary">
                  <X size={17} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Nom de la campagne</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') create() }}
                    placeholder="ex. Soldes d’été 2026"
                    autoFocus
                    className="h-9 w-full rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[13px] font-medium text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Type de campagne</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['generale', 'Générale', 'Plan de contenu régulier'], ['speciale', 'Spéciale', 'Temps fort / lancement']] as const).map(([v, l, d]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setType(v)}
                        className={`rounded-[10px] border p-2.5 text-left transition-colors ${type === v ? 'border-accent bg-accent/5' : 'border-border bg-fg/[0.03] hover:border-accent/60'}`}
                      >
                        <span className="block text-[13px] font-extrabold text-text-primary">{l}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-text-secondary">{d}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Début <span className="font-medium text-text-muted">(optionnel)</span></label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 w-full rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[13px] font-medium text-text-primary outline-none transition-colors focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Fin <span className="font-medium text-text-muted">(optionnel)</span></label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-full rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[13px] font-medium text-text-primary outline-none transition-colors focus:border-accent"
                    />
                  </div>
                </div>
                <p className="text-[11px] font-medium text-text-muted">Ajoute des dates pour faire apparaître la campagne dans le Planning.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
                <button type="button" onClick={() => setModalOpen(false)} disabled={creating} className="h-9 rounded-[9px] border border-border px-4 text-[12px] font-extrabold text-text-secondary transition-colors hover:bg-fg/[0.05] disabled:opacity-50">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={create}
                  disabled={creating || !name.trim()}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Création…</> : <>Créer la campagne</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
