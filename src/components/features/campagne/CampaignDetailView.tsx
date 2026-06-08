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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignDetailView({ campaign }: { campaign: Campaign }) {
  const router  = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCampaign(campaign.id)
      router.push('/campagnes')
    } catch (e: any) {
      console.error(e)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const PHASE_STEPS = [
    { label: 'Pré-campagne',  active: campaign.pre_campaign_enabled,  color: 'text-purple border-border-purple bg-purple/5'  },
    { label: 'Campagne',      active: true,                           color: 'text-accent  border-accent        bg-accent/5'  },
    { label: 'Post-campagne', active: campaign.post_campaign_enabled, color: 'text-teal    border-border-teal   bg-teal/5'    },
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
            Créée le {formatDate(campaign.created_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href={`/campagne/etape-1`}>
            <Button variant="secondary" size="sm">✏ Modifier</Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
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
              p.active ? p.color : 'text-text-dim border-border/50 bg-bg-surface/50 opacity-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.active ? 'bg-current' : 'bg-border'}`} />
            {p.label}
          </div>
        ))}
      </div>

      {/* ── Infos ── */}
      <div className="grid grid-cols-3 gap-5 mb-7">
        {/* Dates */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-4">Calendrier</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Début',          value: formatDate(campaign.start_date)     },
              { label: 'Fin',            value: formatDate(campaign.end_date)        },
              { label: 'Pré-campagne',   value: campaign.pre_campaign_enabled  ? (campaign.pre_campaign_start ? formatDate(campaign.pre_campaign_start) : 'Activée') : 'Désactivée' },
              { label: 'Post-campagne',  value: campaign.post_campaign_enabled ? 'Activée' : 'Désactivée' },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-baseline">
                <span className="font-mono text-[10px] text-text-dim">{r.label}</span>
                <span className="font-mono text-[11px] font-bold text-text-secondary">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenus */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-4">Contenus</p>
          <div className="flex flex-col gap-4">
            <div className="text-center py-4">
              <div className="font-display font-bold text-[36px] text-text-dim">—</div>
              <p className="font-mono text-[11px] text-text-dim mt-1">Aucun contenu sélectionné</p>
              <Link href="/campagne/etape-2">
                <button className="mt-3 font-mono text-[10px] font-bold text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  + Ajouter des contenus
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Avatars */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-4">Avatars assignés</p>
          <div className="flex flex-col gap-4">
            <div className="text-center py-4">
              <div className="font-display font-bold text-[36px] text-text-dim">—</div>
              <p className="font-mono text-[11px] text-text-dim mt-1">Aucun avatar assigné</p>
              <Link href="/campagne/etape-3">
                <button className="mt-3 font-mono text-[10px] font-bold text-teal border border-teal/40 rounded-neo px-3 py-1.5 hover:bg-teal/10 transition-colors">
                  + Assigner des avatars
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA Studio ── */}
      {campaign.status === 'draft' && (
        <div className="bg-bg-card border-2 border-accent rounded-neo-lg p-6 flex items-center justify-between shadow-neo">
          <div>
            <h3 className="font-display font-bold text-[16px] text-text-primary mb-1">
              Prêt à générer les créas ?
            </h3>
            <p className="font-mono text-[12px] text-text-dim">
              Complétez les étapes du wizard puis lancez le Creative Studio
            </p>
          </div>
          <Link href="/campagne/etape-1">
            <Button>Continuer le wizard →</Button>
          </Link>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
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
              La campagne <strong className="text-text-primary">"{campaign.name}"</strong> sera définitivement supprimée.
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={handleDelete}
                className="flex-1"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
