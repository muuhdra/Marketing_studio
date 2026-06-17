'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { engineLabel, type MediaEngine } from '@/lib/stores/mediaStore'
import { listOutputMeta, type OutputMeta } from '@/lib/actions/outputs'
import { estimateCost } from '@/lib/ai/costs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCampaign {
  id:            string
  name:          string
  status:        'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'
  campaign_type: 'generale' | 'speciale'
  created_at:    Date | string
}

interface DbAvatar {
  id:     string
  name:   string
  status: 'draft' | 'active' | 'archived'
}

interface Props {
  campaigns: DbCampaign[]
  avatars:   DbAvatar[]
}


const ENGINE_META: Partial<Record<MediaEngine, { icon: string; bar: string; text: string }>> = {
  'kling-v2.1-pro': { icon: '●', bar: 'bg-blue',   text: 'text-blue'   },
  'seedance-pro':   { icon: '●', bar: 'bg-amber',  text: 'text-amber'  },
  'nano-banana':    { icon: '●', bar: 'bg-teal',   text: 'text-teal'   },
  'elevenlabs':     { icon: '●', bar: 'bg-coral',  text: 'text-coral'  },
  'minimax':        { icon: '●', bar: 'bg-pink',   text: 'text-pink'   },
  'claude':         { icon: '●', bar: 'bg-purple', text: 'text-purple' },
  'chatgpt':        { icon: '●', bar: 'bg-green',  text: 'text-green'  },
}

const TYPE_ICON: Record<string, string> = { image: '●', video: '●', audio: '●', avatar: '●' }
const TYPE_COLOR: Record<string, string> = { image: 'text-teal bg-teal/10 border-border-teal', video: 'text-blue bg-blue/10 border-border-blue', audio: 'text-coral bg-coral/10 border-border-coral', avatar: 'text-purple bg-purple/10 border-border-purple' }
const ENGINE_COLOR: Record<string, string> = {
  'nano-banana':    'text-teal',
  'kling-v2.1-pro': 'text-blue',
  'elevenlabs':     'text-coral',
  'minimax':        'text-pink',
  'chatgpt':        'text-green',
  'claude':         'text-purple',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `il y a ${d}j`
  if (h > 0)  return `il y a ${h}h`
  if (m > 0)  return `il y a ${m} min`
  return 'à l\'instant'
}

// Placeholder pulsé pendant la réhydratation du mediaStore (évite le flash d'état vide)
function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 py-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 rounded-neo bg-bg-elevated animate-pulse" style={{ width: `${90 - i * 14}%` }} />
      ))}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsView({ campaigns, avatars }: Props) {
  // Historique COMPLET des générations (pas limité à 48h) — métadonnées seules.
  const [meta, setMeta] = useState<OutputMeta[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); listOutputMeta().then(setMeta).catch(() => {}) }, [])
  const assets = mounted ? meta : []

  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'pre_campaign').length
  const activeAvatars   = avatars.filter((a) => a.status === 'active').length

  // ── Budget : estimation à partir des médias réellement générés CE MOIS ──────
  const budget = useMemo(() => {
    const now = new Date()
    const map = new Map<MediaEngine, { count: number; cost: number }>()
    assets.forEach((a) => {
      const d = new Date(a.createdAt)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return
      const eng = (a.engine ?? 'nano-banana') as MediaEngine
      const e = map.get(eng) ?? { count: 0, cost: 0 }
      e.count++; e.cost += estimateCost(a.engine, a.durationSeconds)
      map.set(eng, e)
    })
    const rows = Array.from(map.entries())
      .map(([engine, v]) => ({ engine, ...v }))
      .sort((x, y) => y.cost - x.cost)
    const total = rows.reduce((s, r) => s + r.cost, 0)
    return { rows, total }
  }, [assets])

  const totalConsumed = budget.total
  const totalGenerations = budget.rows.reduce((s, r) => s + r.count, 0)

  // ── Contenus par type (historique complet, listOutputMeta) ─────────────────
  const byType = useMemo(() => {
    const counts = { image: 0, video: 0, audio: 0 }
    assets.forEach((a) => {
      if (a.type === 'image') counts.image++
      else if (a.type === 'video') counts.video++
      else if (a.type === 'audio') counts.audio++
    })
    const max = Math.max(...Object.values(counts), 1)
    return [
      { label: 'Images',  count: counts.image, max, color: 'bg-teal',   text: 'text-teal'   },
      { label: 'Vidéos',  count: counts.video, max, color: 'bg-blue',   text: 'text-blue'   },
      { label: 'Voix',    count: counts.audio, max, color: 'bg-coral',  text: 'text-coral'  },
    ]
  }, [assets])

  // ── Contenus par campagne (mediaStore) ────────────────────────────────────
  const byCampaign = useMemo(() => {
    const counts: Record<string, number> = {}
    assets.forEach((a) => {
      if (a.campaignName) counts[a.campaignName] = (counts[a.campaignName] ?? 0) + 1
    })
    // Compléter avec les campagnes DB qui n'ont pas encore d'assets
    campaigns.filter((c) => c.status !== 'archived').forEach((c) => {
      if (!(c.name in counts)) counts[c.name] = 0
    })
    const max = Math.max(...Object.values(counts), 1)
    const COLORS = ['bg-blue text-blue', 'bg-purple text-purple', 'bg-teal text-teal', 'bg-coral text-coral', 'bg-amber text-amber', 'bg-pink text-pink', 'bg-green text-green']
    return Object.entries(counts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([name, count], i) => ({ name, count, max, colorClass: COLORS[i % COLORS.length] }))
  }, [assets, campaigns])

  // ── Activité récente (mediaStore triée par date) ───────────────────────────
  const recentActivity = useMemo(() =>
    assets.slice(0, 8).map((a) => ({
      icon:   TYPE_ICON[a.type] ?? '●',
      action: a.type === 'image' ? 'Image générée' : a.type === 'video' ? 'Vidéo générée' : 'Voix générée',
      detail: `${engineLabel((a.engine ?? 'nano-banana') as MediaEngine)} · ${a.title ?? ''}`,
      time:   timeAgo(a.createdAt),
      color:  ENGINE_COLOR[a.engine ?? ''] ?? 'text-text-muted',
    }))
  , [assets])

  // Gaté sur mounted : new Date() diffère SSR↔client (fuseau/seconde) → calculé après mount
  const currentMonth = mounted ? new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="nb-label mb-2">Vue d'ensemble</p>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary">Analytics</h1>
          <p className="text-[13px] text-text-muted mt-1 capitalize">{currentMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/galerie" className="font-sans text-[10px] text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
            Voir la galerie →
          </Link>
        </div>
      </div>

      {/* ── KPIs réels ── */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {[
          {
            label: 'Assets générés',
            value: mounted ? assets.length : '—',
            sub:   !mounted ? 'Chargement…' : assets.length > 0 ? `${assets.filter(a=>a.type==='image').length} img · ${assets.filter(a=>a.type==='video').length} vid · ${assets.filter(a=>a.type==='audio').length} voix` : 'Aucun encore',
            color: 'text-accent', border: 'border-accent', shadow: 'shadow-neo',
          },
          {
            label: 'Campagnes actives',
            value: activeCampaigns,
            sub:   `${campaigns.length} total · ${campaigns.filter(c=>c.status==='draft').length} brouillon${campaigns.filter(c=>c.status==='draft').length > 1 ? 's' : ''}`,
            color: 'text-purple', border: 'border-border-purple', shadow: '',
          },
          {
            label: 'Avatars',
            value: avatars.length,
            sub:   `${activeAvatars} actif${activeAvatars > 1 ? 's' : ''}`,
            color: 'text-blue', border: 'border-border-blue', shadow: '',
          },
          {
            label: 'Coût estimé',
            value: `~$${totalConsumed.toFixed(2)}`,
            sub:   `contenus générés · ce mois`,
            color: 'text-amber', border: 'border-amber/40', shadow: '',
          },
        ].map((s) => (
          <div key={s.label} className={`bg-bg-card border ${s.border} ${s.shadow} rounded-neo-lg p-4 transition-all duration-150`}>
            <div className={`font-display font-bold text-[30px] ${s.color} mb-1 leading-none`}>{s.value}</div>
            <div className="text-[12.5px] font-medium text-text-primary mb-0.5">{s.label}</div>
            <div className="font-sans text-[10px] text-text-dim">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-[1fr_1fr_300px] gap-4 mb-4">

        {/* Par type */}
        <div className="bg-bg-card border border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">Contenus par type</h3>
          {!mounted ? (
            <PanelSkeleton />
          ) : assets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-sans text-[11px] text-text-dim mb-1">Aucun asset généré</p>
              <Link href="/creative-studio" className="font-sans text-[10px] text-accent hover:underline">
                → Creative Studio
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {byType.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-sans text-[12px] text-text-secondary">{f.label}</span>
                    <span className={`font-sans text-[12px] font-bold ${f.text}`}>{f.count}</span>
                  </div>
                  <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                    <div className={`h-full ${f.color} rounded-neo transition-all duration-500`} style={{ width: `${Math.round((f.count / f.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-fg/40 flex items-center justify-between">
                <span className="font-sans text-[10px] text-text-dim">Total</span>
                <span className="font-display font-bold text-[18px] text-accent">{assets.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Par campagne */}
        <div className="bg-bg-card border border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">Assets par campagne</h3>
          {!mounted ? (
            <PanelSkeleton />
          ) : byCampaign.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-sans text-[11px] text-text-dim mb-1">Aucune campagne</p>
              <Link href="/campagne/nouveau" className="font-sans text-[10px] text-accent hover:underline">
                → Créer une campagne
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {byCampaign.map((c) => {
                const [bg, text] = c.colorClass.split(' ')
                return (
                  <div key={c.name}>
                    <div className="flex justify-between mb-1.5">
                      <span className="font-sans text-[11px] text-text-secondary truncate max-w-[160px]">{c.name}</span>
                      <span className={`font-sans text-[12px] font-bold ${text}`}>{c.count}</span>
                    </div>
                    <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                      <div className={`h-full ${bg} rounded-neo transition-all duration-500`} style={{ width: `${Math.round((c.count / c.max) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="bg-bg-card border border-border rounded-neo-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[14px] text-text-primary">Activité récente</h3>
            {assets.length > 0 && (
              <Link href="/galerie" className="font-sans text-[9px] text-accent hover:underline">Tout →</Link>
            )}
          </div>

          {!mounted ? (
            <PanelSkeleton rows={4} />
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-sans text-[11px] text-text-dim">Aucune activité encore</p>
              <p className="font-sans text-[10px] text-text-dim mt-1">Générez du contenu pour voir l'historique.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-fg/30 last:border-0">
                  <div className="w-6 h-6 rounded border border-border bg-bg-surface flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-sans text-[10px] font-bold ${a.color}`}>{a.action}</div>
                    <div className="font-sans text-[9px] text-text-dim truncate">{a.detail}</div>
                  </div>
                  <div className="font-sans text-[8px] text-text-dim flex-shrink-0 mt-0.5 whitespace-nowrap">{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Budget AIML (estimation) ── */}
      <div className="bg-bg-card border border-border rounded-neo-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary">
            Coût estimé du contenu généré · <span className="capitalize">{currentMonth}</span>
          </h3>
          <span className="font-sans text-[9px] text-text-dim border border-border rounded-neo px-2 py-0.5">
            estimation · basée sur vos générations
          </span>
        </div>

        {!mounted ? (
          <PanelSkeleton rows={2} />
        ) : budget.rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-sans text-[11px] text-text-dim mb-1">Aucune génération ce mois-ci</p>
            <Link href="/creative-studio" className="font-sans text-[10px] text-accent hover:underline">→ Générer du contenu</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 mb-5">
              {budget.rows.map((r) => {
                const meta = ENGINE_META[r.engine] ?? { icon: '●', bar: 'bg-border', text: 'text-text-muted' }
                const pct  = totalConsumed > 0 ? Math.round((r.cost / totalConsumed) * 100) : 0
                return (
                  <div key={r.engine} className="bg-bg-surface border border-border rounded-neo-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">{meta.icon}</span>
                      <div className={`font-display font-bold text-[17px] ${meta.text}`}>~${r.cost.toFixed(2)}</div>
                    </div>
                    <div className="font-sans text-[10px] text-text-secondary mb-0.5 font-semibold leading-tight">{engineLabel(r.engine)}</div>
                    <div className="font-sans text-[9px] text-text-dim mb-2">{r.count} génération{r.count > 1 ? 's' : ''}</div>
                    <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                      <div className={`h-full ${meta.bar} rounded-neo`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="font-sans text-[9px] text-text-dim mt-1 text-right">{pct}%</div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-end justify-between pt-3 border-t border-border">
              <div>
                <p className="font-sans text-[10px] text-text-dim mb-0.5">Coût total estimé · {totalGenerations} génération{totalGenerations > 1 ? 's' : ''}</p>
                <p className="font-sans text-[9px] text-text-dim">Coûts unitaires estimés par génération — pas une facturation réelle.</p>
              </div>
              <span className="font-display font-bold text-[26px] text-amber leading-none flex-shrink-0">
                ~${totalConsumed.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
