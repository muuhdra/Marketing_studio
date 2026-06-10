'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { deleteCampaign, updateCampaign } from '@/lib/actions/campaigns'
import { useToast } from '@/lib/stores/toastStore'
import { useMediaStore, engineLabel, typeIcon } from '@/lib/stores/mediaStore'

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
  pre_campaign_start:   string | null
  post_campaign_enabled: boolean
  created_at:           Date | string
  updated_at:           Date | string
}

interface ContentType {
  id:               string
  content_type:     'ugc' | 'commercial' | 'shooting' | 'visuel'
  product_category: 'produit' | 'app'
  quantity:         number
}

interface Assignment {
  id:         string
  role:       'primary' | 'secondary' | null
  config:     unknown
  avatarId:   string | null
  avatarName: string | null
  avatarAge:  number | null
  styleTags:  string[] | null
}

interface Props {
  data: {
    campaign:     Campaign
    contentTypes: ContentType[]
    assignments:  Assignment[]
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<CampaignStatus, { label: string; badge: 'active'|'pre'|'done'|'draft'|'post' }> = {
  draft:         { label: 'Brouillon',   badge: 'draft'  },
  pre_campaign:  { label: 'Pré-camp.',   badge: 'pre'    },
  active:        { label: 'Active',      badge: 'active' },
  post_campaign: { label: 'Post-camp.',  badge: 'post'   },
  archived:      { label: 'Archivée',    badge: 'done'   },
}

const STATUS_NEXT: Partial<Record<CampaignStatus, { to: CampaignStatus; label: string; color: string }>> = {
  draft:        { to: 'active',        label: 'Activer la campagne',  color: 'bg-teal/10 border-border-teal text-teal hover:bg-teal/20'       },
  pre_campaign: { to: 'active',        label: 'Lancer la campagne',   color: 'bg-accent/10 border-accent text-accent hover:bg-accent/20'       },
  active:       { to: 'post_campaign', label: 'Terminer',             color: 'bg-purple/10 border-purple/50 text-purple hover:bg-purple/20'    },
  post_campaign:{ to: 'archived',      label: 'Archiver',             color: 'bg-bg-surface border-border text-text-muted hover:border-accent' },
}

const CONTENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  ugc:        { label: 'UGC Vidéo',      color: 'text-accent border-accent bg-accent/10',        icon: '🎬' },
  commercial: { label: 'Commercial',     color: 'text-purple border-border-purple bg-purple/10',  icon: '📺' },
  shooting:   { label: 'Shooting Photo', color: 'text-teal border-border-teal bg-teal/10',        icon: '📸' },
  visuel:     { label: 'Visuels',        color: 'text-amber border-amber/40 bg-amber/10',         icon: '🎨' },
}

function formatDate(d: string | Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function timelineProgress(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const n = Date.now()
  if (n <= s) return 0
  if (n >= e) return 100
  return Math.round(((n - s) / (e - s)) * 100)
}

function daysLeft(end: string | null): number | null {
  if (!end) return null
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignDetailView({ data }: Props) {
  const { campaign: initial, contentTypes, assignments } = data
  const router   = useRouter()
  const toast    = useToast()
  const allAssets = useMediaStore((s) => s.assets)

  const [campaign,       setCampaign]       = useState(initial)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  // Assets de cette campagne depuis le mediaStore
  const campaignAssets = allAssets.filter(
    (a) => a.campaignId === campaign.id || a.campaignName === campaign.name
  )

  const progress       = timelineProgress(campaign.start_date, campaign.end_date)
  const left           = daysLeft(campaign.end_date)
  const wizardComplete = contentTypes.length > 0 && assignments.length > 0
  const next           = STATUS_NEXT[campaign.status]
  const meta           = STATUS_META[campaign.status]

  async function handleStatusChange() {
    if (!next) return
    setChangingStatus(true)
    try {
      await updateCampaign(campaign.id, { status: next.to })
      setCampaign((c) => ({ ...c, status: next.to }))
      toast.success(`Campagne → ${STATUS_META[next.to].label} ✓`)
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur')
    } finally {
      setChangingStatus(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCampaign(campaign.id)
      toast.success(`Campagne "${campaign.name}" supprimée`)
      router.push('/campagnes')
    } catch {
      toast.error('Erreur lors de la suppression')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Link href="/campagnes" className="font-mono text-[11px] text-text-dim hover:text-text-secondary transition-colors">
              ← Campagnes
            </Link>
            <span className="text-border">·</span>
            <StatusBadge status={meta.badge} />
            <span className="font-mono text-[10px] text-text-dim">
              {campaign.campaign_type === 'generale' ? 'Campagne Générale' : 'Campagne Spéciale'}
            </span>
          </div>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary leading-tight mb-1">
            {campaign.name}
          </h1>
          <p className="font-mono text-[11px] text-text-dim">
            Créée le {formatDate(campaign.created_at)} · Modifiée le {formatDate(campaign.updated_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Changement de statut */}
          {next && (
            <button
              onClick={handleStatusChange}
              disabled={changingStatus}
              className={`font-mono text-[11px] font-bold px-4 py-2 rounded-neo border-2 transition-all
                ${changingStatus ? 'opacity-50 cursor-not-allowed' : ''} ${next.color}`}
            >
              {changingStatus ? '...' : next.label}
            </button>
          )}
          {campaign.status === 'draft' && (
            <Link href="/campagne/etape-1">
              <Button variant="secondary" size="sm">✏ Wizard</Button>
            </Link>
          )}
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>🗑</Button>
        </div>
      </div>

      {/* ── Timeline progress ── */}
      {campaign.start_date && campaign.end_date && (
        <div className="bg-bg-card border-2 border-border rounded-neo-lg px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-text-dim">{formatDateShort(campaign.start_date)}</span>
              <div className="flex-1 min-w-[300px]">
                <div className="h-2 bg-bg-base border border-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      campaign.status === 'active' ? 'bg-teal' :
                      campaign.status === 'archived' ? 'bg-text-dim' : 'bg-accent/50'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-[10px] text-text-dim">{formatDateShort(campaign.end_date)}</span>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="font-mono text-[11px] font-bold text-text-primary">{progress}%</span>
              {left !== null && campaign.status === 'active' && (
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-neo border
                  ${left <= 7 ? 'text-coral border-coral/40 bg-coral/5' : 'text-teal border-border-teal bg-teal/5'}`}>
                  J-{left}
                </span>
              )}
              {left !== null && left < 0 && (
                <span className="font-mono text-[10px] text-text-dim border border-border rounded-neo px-2 py-0.5">
                  Terminée
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Phases ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { label: 'Pré-campagne',  active: campaign.pre_campaign_enabled,   color: 'text-purple border-border-purple bg-purple/5'  },
          { label: 'Campagne',      active: true,                            color: 'text-accent  border-accent        bg-accent/5'  },
          { label: 'Post-campagne', active: campaign.post_campaign_enabled,  color: 'text-teal    border-border-teal   bg-teal/5'    },
        ].map((p) => (
          <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 font-mono text-[11px] font-bold transition-all
            ${p.active ? p.color : 'text-text-dim border-border/40 opacity-40'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-current' : 'bg-border'}`} />
            {p.label}
          </div>
        ))}
      </div>

      {/* ── Bannière wizard incomplet ── */}
      {campaign.status === 'draft' && !wizardComplete && (
        <div className="mb-5 bg-amber/5 border-2 border-amber/40 rounded-neo-lg px-5 py-4 flex items-center justify-between">
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

      {/* ── 3 cards infos ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">

        {/* Calendrier */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-4">Calendrier</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Début',        value: formatDate(campaign.start_date) },
              { label: 'Fin',          value: formatDate(campaign.end_date)   },
              { label: 'Pré-camp.',    value: campaign.pre_campaign_enabled
                  ? (campaign.pre_campaign_start ? formatDate(campaign.pre_campaign_start) : 'Activée')
                  : 'Désactivée' },
              { label: 'Post-camp.',   value: campaign.post_campaign_enabled ? 'Activée' : 'Désactivée' },
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
                    {a.avatarAge && <p className="font-mono text-[9px] text-text-dim">{a.avatarAge} ans</p>}
                  </div>
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border
                    ${a.role === 'primary' ? 'text-accent border-accent/40 bg-accent/10' : 'text-text-muted border-border'}`}>
                    {a.role === 'primary' ? 'Principal' : 'Secondaire'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Assets générés pour cette campagne ── */}
      <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="nb-label mb-1">Médiathèque</p>
            <p className="font-mono text-[11px] text-text-dim">
              {campaignAssets.length > 0
                ? `${campaignAssets.length} asset${campaignAssets.length > 1 ? 's' : ''} générés pour cette campagne`
                : 'Aucun asset généré pour cette campagne'}
            </p>
          </div>
          {campaignAssets.length > 0 && (
            <Link href="/galerie">
              <button className="font-mono text-[10px] text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                Voir dans la galerie →
              </button>
            </Link>
          )}
        </div>

        {campaignAssets.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-neo-lg py-10 text-center">
            <div className="text-3xl mb-2">◈</div>
            <p className="font-mono text-[11px] text-text-dim mb-1">Aucun contenu généré</p>
            <p className="font-mono text-[10px] text-text-dim mb-4">
              Générez des images, vidéos ou voix associées à cette campagne.
            </p>
            {wizardComplete && (
              <Link href="/campagne/etape-4">
                <Button size="sm">✦ Générer du contenu</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {campaignAssets.slice(0, 8).map((asset) => (
              <div key={asset.id} className="relative border border-border rounded-neo overflow-hidden bg-bg-elevated group">
                <div className="aspect-video flex items-center justify-center bg-bg-elevated">
                  {asset.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{typeIcon(asset.type)}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="font-mono text-[9px] text-text-dim truncate">{asset.title}</p>
                  <p className="font-mono text-[8px] text-text-dim/60">{engineLabel(asset.engine)}</p>
                </div>
              </div>
            ))}
            {campaignAssets.length > 8 && (
              <Link href="/galerie" className="aspect-video flex flex-col items-center justify-center border border-dashed border-border rounded-neo hover:border-accent hover:bg-accent/5 transition-all">
                <span className="font-mono text-[10px] font-bold text-text-dim">+{campaignAssets.length - 8}</span>
                <span className="font-mono text-[9px] text-text-dim">autres</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── CTA selon statut ── */}
      {campaign.status === 'draft' && wizardComplete && (
        <div className="bg-bg-card border-2 border-accent rounded-neo-lg p-5 flex items-center justify-between shadow-neo">
          <div>
            <h3 className="font-display font-bold text-[15px] text-text-primary mb-1">Prêt à lancer la production ?</h3>
            <p className="font-mono text-[11px] text-text-dim">
              {contentTypes.length} type{contentTypes.length > 1 ? 's' : ''} · {assignments.length} avatar{assignments.length > 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/campagne/etape-4">
            <Button>✦ Ouvrir le Creative Studio →</Button>
          </Link>
        </div>
      )}

      {(campaign.status === 'active' || campaign.status === 'pre_campaign') && (
        <div className="bg-bg-card border-2 border-teal rounded-neo-lg p-5 flex items-center justify-between shadow-neo-teal">
          <div>
            <h3 className="font-display font-bold text-[15px] text-text-primary mb-1">
              {campaign.status === 'active' ? 'Campagne en cours' : 'Phase de pré-campagne'}
            </h3>
            <p className="font-mono text-[11px] text-text-dim">
              {left !== null && left > 0 ? `J-${left} avant la fin` : 'Générez vos contenus maintenant'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/campagne/etape-4">
              <Button>✦ Générer du contenu</Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary">Analytics →</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-5 animate-fade-in" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-[400px] bg-bg-card border-2 border-coral rounded-neo-lg p-6 shadow-neo-coral animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl mb-3">🗑</div>
            <h3 className="font-display font-bold text-[16px] text-text-primary mb-2">Supprimer cette campagne ?</h3>
            <p className="font-mono text-[12px] text-text-dim mb-6 leading-relaxed">
              <strong className="text-text-primary">"{campaign.name}"</strong> et toutes ses données seront supprimées définitivement.
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
