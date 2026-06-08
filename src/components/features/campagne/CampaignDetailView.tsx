'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { deleteCampaign } from '@/lib/actions/campaigns'

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  campaign_type: 'generale' | 'speciale'
  start_date: string | null
  end_date: string | null
  pre_campaign_enabled: boolean
  pre_campaign_start: string | null
  post_campaign_enabled: boolean
  created_at: Date | string
  updated_at: Date | string
}

interface ContentType {
  id: string
  content_type: 'ugc' | 'commercial' | 'shooting' | 'visuel'
  product_category: 'produit' | 'app'
  quantity: number
}

interface Assignment {
  id: string
  role: 'primary' | 'secondary' | null
  config: unknown
  avatarId: string | null
  avatarName: string | null
  avatarAge: number | null
  styleTags: string[] | null
}

interface Props {
  data: {
    campaign:     Campaign
    contentTypes: ContentType[]
    assignments:  Assignment[]
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusToDisplay(s: CampaignStatus): 'active' | 'pre' | 'done' | 'draft' | 'post' {
  if (s === 'active')        return 'active'
  if (s === 'pre_campaign')  return 'pre'
  if (s === 'post_campaign') return 'post'
  if (s === 'archived')      return 'done'
  return 'draft'
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const CONTENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  ugc:        { label: 'UGC Vidéo',      color: 'text-accent border-accent bg-accent/10',        icon: '🎬' },
  commercial: { label: 'Commercial',     color: 'text-purple border-border-purple bg-purple/10',  icon: '📺' },
  shooting:   { label: 'Shooting Photo', color: 'text-teal border-border-teal bg-teal/10',        icon: '📸' },
  visuel:     { label: 'Visuels',        color: 'text-amber border-amber/40 bg-amber/10',         icon: '🎨' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignDetailView({ data }: Props) {
  const { campaign, contentTypes, assignments } = data
  const router  = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCampaign(campaign.id)
      router.push('/campagnes')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const isDraft   = campaign.status === 'draft'
  const wizardComplete = contentTypes.length > 0 && assignments.length > 0

  const PHASE_STEPS = [
    { label: 'Pré-campagne',  active: campaign.pre_campaign_enabled,  color: 'text-purple border-border-purple bg-purple/5' },
    { label: 'Campagne',      active: true,                           color: 'text-accent  border-accent        bg-accent/5' },
    { label: 'Post-campagne', active: campaign.post_campaign_enabled, color: 'text-teal    border-border-teal   bg-teal/5'   },
  ]

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Link href="/campagnes" className="font-mono text-[11px] text-text-dim hover:text-text-secondary transition-colors">
              ← Campagnes
            </Link>
            <span className="text-border">·</span>
            <StatusBadge status={statusToDisplay(campaign.status)} />
            <span className="font-mono text-[10px] text-text-dim">
              {campaign.campaign_type === 'generale' ? 'Campagne Générale' : 'Campagne Spéciale'}
            </span>
          </div>
          <h1 className="font-display font-bold text-[30px] tracking-tight text-text-primary">
            {campaign.name}
          </h1>
          <p className="font-mono text-[11px] text-text-dim mt-1">
            Créée le {formatDate(campaign.created_at)} · Modifiée le {formatDate(campaign.updated_at)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDraft && (
            <Link href="/campagne/etape-1">
              <Button variant="secondary" size="sm">✏ Continuer le wizard</Button>
            </Link>
          )}
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            🗑 Supprimer
          </Button>
        </div>
      </div>

      {/* ── Phases ── */}
      <div className="flex gap-3 mb-7">
        {PHASE_STEPS.map((p) => (
          <div
            key={p.label}
            className={`flex items-center gap-2 px-4 py-2 rounded-neo border-2 text-[12px] font-mono font-bold transition-all ${
              p.active ? p.color : 'text-text-dim border-border/50 opacity-40'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.active ? 'bg-current' : 'bg-border'}`} />
            {p.label}
          </div>
        ))}
      </div>

      {/* ── Banner wizard incomplet ── */}
      {isDraft && !wizardComplete && (
        <div className="mb-6 bg-amber/5 border-2 border-amber/40 rounded-neo-lg px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[12px] font-bold text-amber mb-0.5">⚠ Configuration incomplète</p>
            <p className="font-mono text-[11px] text-text-dim">
              {contentTypes.length === 0 && '• Aucun contenu sélectionné. '}
              {assignments.length === 0 && '• Aucun avatar assigné.'}
            </p>
          </div>
          <Link href="/campagne/etape-2">
            <Button size="sm" variant="secondary">Compléter →</Button>
          </Link>
        </div>
      )}

      {/* ── 3 cards ── */}
      <div className="grid grid-cols-3 gap-5 mb-7">

        {/* Calendrier */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-4">Calendrier</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Début',         value: formatDate(campaign.start_date)   },
              { label: 'Fin',           value: formatDate(campaign.end_date)      },
              { label: 'Pré-campagne',  value: campaign.pre_campaign_enabled
                  ? (campaign.pre_campaign_start ? formatDate(campaign.pre_campaign_start) : 'Activée')
                  : 'Désactivée' },
              { label: 'Post-campagne', value: campaign.post_campaign_enabled ? 'Activée' : 'Désactivée' },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-baseline border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-mono text-[10px] text-text-dim">{r.label}</span>
                <span className="font-mono text-[11px] font-bold text-text-secondary">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenus */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="nb-label">Contenus</p>
            {contentTypes.length > 0 && (
              <span className="font-mono text-[10px] font-bold text-accent">
                {contentTypes.length} type{contentTypes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {contentTypes.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-3">Aucun contenu sélectionné</p>
              <Link href="/campagne/etape-2">
                <button className="font-mono text-[10px] font-bold text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  + Choisir les contenus
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {contentTypes.map((ct) => {
                const cfg = CONTENT_LABELS[ct.content_type] ?? { label: ct.content_type, color: 'text-text-muted border-border', icon: '📄' }
                return (
                  <div key={ct.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-neo border text-[11px] font-mono font-bold ${cfg.color}`}>
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    <span className="ml-auto text-[10px] opacity-60">{ct.product_category}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Avatars */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="nb-label">Avatars assignés</p>
            {assignments.length > 0 && (
              <span className="font-mono text-[10px] font-bold text-teal">
                {assignments.length} avatar{assignments.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-3">Aucun avatar assigné</p>
              <Link href="/campagne/etape-3">
                <button className="font-mono text-[10px] font-bold text-teal border border-teal/40 rounded-neo px-3 py-1.5 hover:bg-teal/10 transition-colors">
                  + Assigner des avatars
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-neo border border-border-teal bg-teal/5">
                  <div className="w-7 h-7 rounded-neo border border-border-teal bg-teal/10 flex items-center justify-center font-mono text-[10px] font-bold text-teal flex-shrink-0">
                    {(a.avatarName ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] font-bold text-text-primary">{a.avatarName ?? 'Avatar'}</p>
                    {a.avatarAge && (
                      <p className="font-mono text-[9px] text-text-dim">{a.avatarAge} ans</p>
                    )}
                  </div>
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    a.role === 'primary'
                      ? 'text-accent border-accent/40 bg-accent/10'
                      : 'text-text-muted border-border'
                  }`}>
                    {a.role === 'primary' ? 'Principal' : 'Secondaire'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CTA selon statut ── */}
      {isDraft && wizardComplete && (
        <div className="bg-bg-card border-2 border-accent rounded-neo-lg p-6 flex items-center justify-between shadow-neo">
          <div>
            <h3 className="font-display font-bold text-[16px] text-text-primary mb-1">
              Prêt à lancer la production ?
            </h3>
            <p className="font-mono text-[12px] text-text-dim">
              {contentTypes.length} type{contentTypes.length > 1 ? 's' : ''} de contenu · {assignments.length} avatar{assignments.length > 1 ? 's' : ''} assigné{assignments.length > 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/campagne/etape-4">
            <Button>✦ Ouvrir le Creative Studio →</Button>
          </Link>
        </div>
      )}

      {campaign.status === 'active' && (
        <div className="bg-bg-card border-2 border-teal rounded-neo-lg p-6 flex items-center justify-between shadow-neo-teal">
          <div>
            <h3 className="font-display font-bold text-[16px] text-text-primary mb-1">
              Campagne en cours
            </h3>
            <p className="font-mono text-[12px] text-text-dim">
              Les agents IA génèrent vos contenus selon le planning défini.
            </p>
          </div>
          <Link href="/analytics">
            <Button variant="secondary">Voir l'Analytics →</Button>
          </Link>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-[400px] bg-bg-card border-2 border-coral rounded-neo-lg p-6 shadow-neo-coral animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl mb-3">🗑</div>
            <h3 className="font-display font-bold text-[16px] text-text-primary mb-2">
              Supprimer cette campagne ?
            </h3>
            <p className="font-mono text-[12px] text-text-dim mb-6 leading-relaxed">
              La campagne <strong className="text-text-primary">"{campaign.name}"</strong> et toutes ses données associées seront supprimées définitivement.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">Annuler</Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
