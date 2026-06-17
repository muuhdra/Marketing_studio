'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useToast } from '@/lib/stores/toastStore'
import { deleteCampaign, updateCampaign } from '@/lib/actions/campaigns'

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'

interface Campaign {
  id:                   string
  name:                 string
  status:               CampaignStatus
  campaign_type:        'generale' | 'speciale'
  start_date:           string | null
  end_date:             string | null
  pre_campaign_enabled: boolean
  post_campaign_enabled: boolean
  dna_version:          number
  created_at:           Date | string
  updated_at:           Date | string
}

type StatusFilter = 'all' | CampaignStatus
type ViewMode     = 'grid' | 'list'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<CampaignStatus, { label: string; color: string; dot: string }> = {
  draft:         { label: 'Brouillon',   color: 'text-text-dim border-border',          dot: 'bg-border'          },
  pre_campaign:  { label: 'Pré-camp.',   color: 'text-amber border-amber/50',           dot: 'bg-amber'           },
  active:        { label: 'Active',      color: 'text-teal border-border-teal',         dot: 'bg-teal'            },
  post_campaign: { label: 'Post-camp.',  color: 'text-purple border-purple/50',         dot: 'bg-purple'          },
  archived:      { label: 'Archivée',    color: 'text-text-dim/50 border-fg/40',    dot: 'bg-fg/[0.08]'       },
}

const STATUS_NEXT: Partial<Record<CampaignStatus, CampaignStatus>> = {
  draft:        'active',
  pre_campaign: 'active',
  active:       'post_campaign',
  post_campaign: 'archived',
}

const STATUS_NEXT_LABEL: Partial<Record<CampaignStatus, string>> = {
  draft:        'Activer',
  pre_campaign: 'Lancer',
  active:       'Terminer',
  post_campaign: 'Archiver',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

function timelineProgress(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate).getTime()
  const now   = Date.now()
  if (now <= start) return 0
  if (now >= end)   return 100
  return Math.round(((now - start) / (end - start)) * 100)
}

// ─── Card ────────────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onDelete,
  onStatusChange,
  working,
}: {
  campaign:       Campaign
  onDelete:       (id: string) => void
  onStatusChange: (id: string, status: CampaignStatus) => void
  working:        boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const meta     = STATUS_META[campaign.status]
  const nextS    = STATUS_NEXT[campaign.status]
  const nextL    = STATUS_NEXT_LABEL[campaign.status]
  const progress = timelineProgress(campaign.start_date, campaign.end_date)
  const left     = daysLeft(campaign.end_date)

  return (
    <div
      className={`relative flex flex-col bg-bg-card border border-border rounded-neo-lg overflow-hidden
        transition-all duration-150 hover:border-border-strong
        ${working ? 'opacity-60 pointer-events-none' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions flottantes au survol */}
      <div className={`absolute top-3 right-3 flex gap-1.5 transition-all duration-150 z-10
        ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
        {nextS && nextL && (
          <button
            onClick={(e) => { e.preventDefault(); onStatusChange(campaign.id, nextS) }}
            className="font-sans text-[9px] font-bold bg-teal/90 text-bg-base border border-border-teal rounded-neo px-2 py-1 hover:bg-teal transition-colors"
          >
            {nextL}
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); onDelete(campaign.id) }}
          className="font-sans text-[9px] font-bold bg-bg-card border border-border text-coral rounded-neo px-2 py-1 hover:bg-coral/10 transition-colors"
        >
          Suppr.
        </button>
      </div>

      <Link href={`/campagne/${campaign.id}`} className="flex flex-col flex-1 p-5">
        {/* Top */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`flex items-center gap-1.5 font-sans text-[9px] font-bold border rounded-neo px-2 py-0.5 ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${campaign.status === 'active' ? 'animate-pulse' : ''}`} />
            {meta.label}
          </span>
          <span className="font-sans text-[9px] text-text-dim border border-border rounded px-1.5 py-0.5">
            {campaign.campaign_type === 'generale' ? 'Générale' : 'Spéciale'}
          </span>
          {campaign.pre_campaign_enabled && (
            <span className="font-sans text-[8px] text-amber border border-amber/30 rounded px-1 py-0.5">pré</span>
          )}
          {campaign.post_campaign_enabled && (
            <span className="font-sans text-[8px] text-purple border border-purple/30 rounded px-1 py-0.5">post</span>
          )}
        </div>

        {/* Titre */}
        <h3 className="font-display font-bold text-[17px] tracking-tight text-text-primary leading-snug mb-1 pr-10">
          {campaign.name}
        </h3>

        {/* Dates */}
        <p className="font-sans text-[10px] text-text-dim mb-3">
          {campaign.start_date ? formatDateShort(campaign.start_date) : 'Sans date'}
          {campaign.end_date   ? ` → ${formatDateShort(campaign.end_date)}` : ''}
          {left !== null && left >= 0 && campaign.status === 'active' && (
            <span className="text-teal ml-1.5">· J-{left}</span>
          )}
        </p>

        {/* Barre de progression (si dates définies) */}
        {campaign.start_date && campaign.end_date && (
          <div className="mt-auto pt-3 border-t border-fg/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-sans text-[9px] text-text-dim">Progression</span>
              <span className="font-sans text-[9px] font-bold text-text-muted">{progress}%</span>
            </div>
            <div className="h-1 bg-bg-base rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  campaign.status === 'active' ? 'bg-teal' :
                  campaign.status === 'archived' ? 'bg-text-dim' : 'bg-accent/50'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!campaign.start_date && (
          <div className="mt-auto pt-3 border-t border-fg/50 flex items-center justify-between">
            <span className="font-sans text-[9px] text-text-dim">
              Créé le {formatDate(campaign.created_at as string)}
            </span>
            <span className="font-sans text-[10px] font-bold text-accent group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        )}
      </Link>
    </div>
  )
}

// ─── Row (list mode) ─────────────────────────────────────────────────────────

function CampaignRow({
  campaign,
  onDelete,
  onStatusChange,
  working,
}: {
  campaign:       Campaign
  onDelete:       (id: string) => void
  onStatusChange: (id: string, status: CampaignStatus) => void
  working:        boolean
}) {
  const meta  = STATUS_META[campaign.status]
  const nextS = STATUS_NEXT[campaign.status]
  const nextL = STATUS_NEXT_LABEL[campaign.status]

  return (
    <div className={`group flex items-center gap-4 px-4 py-3 border-b border-border last:border-0
      hover:bg-bg-elevated transition-colors ${working ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot} ${campaign.status === 'active' ? 'animate-pulse' : ''}`} />

      {/* Name */}
      <Link href={`/campagne/${campaign.id}`} className="flex-1 min-w-0">
        <p className="font-sans text-[12px] font-bold text-text-primary truncate group-hover:text-accent transition-colors">
          {campaign.name}
        </p>
        <p className="font-sans text-[10px] text-text-dim">
          {campaign.campaign_type === 'generale' ? 'Générale' : 'Spéciale'}
          {campaign.start_date ? ` · ${formatDateShort(campaign.start_date)}` : ''}
          {campaign.end_date ? ` → ${formatDateShort(campaign.end_date)}` : ''}
        </p>
      </Link>

      {/* Status badge */}
      <span className={`font-sans text-[9px] font-bold border rounded-neo px-2 py-0.5 flex-shrink-0 ${meta.color}`}>
        {meta.label}
      </span>

      {/* Date créée */}
      <span className="font-sans text-[10px] text-text-dim flex-shrink-0 hidden md:block w-28 text-right">
        {formatDate(campaign.created_at as string)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {nextS && nextL && (
          <button
            onClick={() => onStatusChange(campaign.id, nextS)}
            className="font-sans text-[9px] font-bold text-teal border border-border-teal rounded px-2 py-0.5 hover:bg-teal/10 transition-colors"
          >
            {nextL}
          </button>
        )}
        <button
          onClick={() => onDelete(campaign.id)}
          className="font-sans text-[10px] text-coral hover:text-coral border border-transparent hover:border-coral/30 rounded px-1.5 py-1 transition-colors"
        >
          Suppr.
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CampagnesListView({ campaigns: initial }: { campaigns: Campaign[] }) {
  const toast  = useToast()
  const router = useRouter()

  const [campaigns,    setCampaigns]    = useState<Campaign[]>(initial)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter,   setTypeFilter]   = useState<'all' | 'generale' | 'speciale'>('all')
  const [searchQ,      setSearchQ]      = useState('')
  const [viewMode,     setViewMode]     = useState<ViewMode>('grid')
  const [workingId,    setWorkingId]    = useState<string | null>(null)

  // ── Counts ──
  const counts = useMemo(() => {
    const all = campaigns
    return {
      all:           all.length,
      draft:         all.filter((c) => c.status === 'draft').length,
      pre_campaign:  all.filter((c) => c.status === 'pre_campaign').length,
      active:        all.filter((c) => c.status === 'active').length,
      post_campaign: all.filter((c) => c.status === 'post_campaign').length,
      archived:      all.filter((c) => c.status === 'archived').length,
    }
  }, [campaigns])

  // ── Filtered ──
  const filtered = useMemo(() => {
    let list = campaigns
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)
    if (typeFilter   !== 'all') list = list.filter((c) => c.campaign_type === typeFilter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }
    return list
  }, [campaigns, statusFilter, typeFilter, searchQ])

  // ── Actions ──
  async function handleDelete(id: string) {
    const camp = campaigns.find((c) => c.id === id)
    if (!confirm(`Supprimer "${camp?.name}" ? Cette action est irréversible.`)) return
    setWorkingId(id)
    try {
      await deleteCampaign(id)
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
      toast.success(`"${camp?.name}" supprimée ✓`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur suppression')
    } finally {
      setWorkingId(null)
    }
  }

  async function handleStatusChange(id: string, newStatus: CampaignStatus) {
    const camp = campaigns.find((c) => c.id === id)
    setWorkingId(id)
    try {
      await updateCampaign(id, { status: newStatus })
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c))
      toast.success(`"${camp?.name}" → ${STATUS_META[newStatus].label} ✓`)
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur mise à jour')
    } finally {
      setWorkingId(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="nb-label mb-2">Projets</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">
            Campagnes
          </h1>
          <p className="text-[13px] text-text-muted mt-1">
            {campaigns.length > 0
              ? `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} · ${counts.active} active${counts.active > 1 ? 's' : ''}`
              : 'Aucune campagne — créez la première'}
          </p>
        </div>
        <Link href="/campagne/nouveau">
          <Button>+ Nouvelle campagne</Button>
        </Link>
      </div>

      {/* ── Stats bar ── */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {([
            { id: 'all',           label: 'Toutes',    count: counts.all           },
            { id: 'active',        label: 'Actives',   count: counts.active        },
            { id: 'pre_campaign',  label: 'Pré',       count: counts.pre_campaign  },
            { id: 'draft',         label: 'Brouillon', count: counts.draft         },
            { id: 'post_campaign', label: 'Post',      count: counts.post_campaign },
            { id: 'archived',      label: 'Archivées', count: counts.archived      },
          ] as { id: StatusFilter; label: string; count: number }[]).filter((f) => f.id === 'all' || f.count > 0).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-1.5 font-sans text-[10px] font-bold border rounded-neo px-3 py-1.5 transition-all
                ${statusFilter === f.id
                  ? 'bg-accent text-bg-base border-accent'
                  : 'text-text-dim border-border hover:border-accent hover:text-accent'
                }`}
            >
              {f.id !== 'all' && (
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[f.id as CampaignStatus]?.dot ?? 'bg-border'}`} />
              )}
              {f.label}
              <span className={`text-[9px] ${statusFilter === f.id ? 'opacity-70' : 'text-text-dim'}`}>{f.count}</span>
            </button>
          ))}

          {/* Séparateur */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Type filter */}
          {(['all', 'generale', 'speciale'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`font-sans text-[10px] font-bold border rounded-neo px-2.5 py-1.5 transition-all
                ${typeFilter === t
                  ? 'bg-purple/20 text-purple border-purple/50'
                  : 'text-text-dim border-border hover:border-purple/40'
                }`}
            >
              {t === 'all' ? 'Tous types' : t === 'generale' ? 'Générale' : 'Spéciale'}
            </button>
          ))}

          {/* Spacer + search + view toggle */}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              placeholder="Rechercher..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="nb-input text-[12px] py-1.5 px-3 w-44"
            />
            <div className="flex gap-0.5 bg-bg-surface border border-border rounded-neo p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors
                  ${viewMode === 'grid' ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary'}`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors
                  ${viewMode === 'list' ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary'}`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state (no campaigns) ── */}
      {campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-neo-lg border border-dashed border-border flex items-center justify-center text-2xl mb-5 text-text-dim">
            ●
          </div>
          <p className="font-display font-bold text-[16px] text-text-primary mb-2">
            Aucune campagne pour l'instant
          </p>
          <p className="font-sans text-[12px] text-text-dim mb-6">
            Créez votre première campagne pour démarrer le pipeline IA.
          </p>
          <Link href="/campagne/nouveau">
            <Button>+ Créer une campagne</Button>
          </Link>
        </div>
      )}

      {/* ── Empty search result ── */}
      {campaigns.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-display font-bold text-[15px] text-text-primary mb-2">
            Aucune campagne pour ce filtre
          </p>
          <button
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchQ('') }}
            className="font-sans text-[11px] text-accent hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ── Grid view ── */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              working={workingId === c.id}
            />
          ))}

          {/* Nouvelle campagne */}
          <Link href="/campagne/nouveau" className="block group">
            <div className="flex flex-col items-center justify-center bg-bg-surface border border-dashed border-border rounded-neo-lg min-h-[180px] transition-all group-hover:border-accent group-hover:bg-accent/5 group-hover:border-border-strong">
              <div className="w-10 h-10 rounded-neo border border-border flex items-center justify-center text-xl text-text-dim group-hover:border-accent group-hover:text-accent transition-colors mb-2">+</div>
              <span className="font-sans text-[10px] font-bold text-text-dim group-hover:text-accent transition-colors">Nouvelle campagne</span>
            </div>
          </Link>
        </div>
      )}

      {/* ── List view ── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-bg-card border border-border rounded-neo-lg overflow-hidden">
          {/* Header list */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-bg-surface">
            <div className="w-2" />
            <div className="flex-1 font-sans text-[9px] font-bold text-text-dim uppercase tracking-wider">Campagne</div>
            <div className="font-sans text-[9px] font-bold text-text-dim uppercase tracking-wider w-20 text-center">Statut</div>
            <div className="font-sans text-[9px] font-bold text-text-dim uppercase tracking-wider w-28 text-right hidden md:block">Créée le</div>
            <div className="w-20" />
          </div>
          {filtered.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              working={workingId === c.id}
            />
          ))}
        </div>
      )}

    </div>
  )
}
