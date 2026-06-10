'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMediaStore, engineLabel, type MediaEngine } from '@/lib/stores/mediaStore'

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

// ─── Config budget (statique — pas encore branché sur usage réel) ─────────────

const AI_PROVIDERS = [
  { label: 'Kling v2.1 Pro',   sub: 'Vidéo UGC principal',  pct: 35, usd: '15.80', color: 'bg-accent',  text: 'text-accent',     icon: '🎬' },
  { label: 'ChatGPT + Claude', sub: 'Scripts & Stratégie',  pct: 24, usd: '10.80', color: 'bg-purple',  text: 'text-purple',     icon: '🧠' },
  { label: 'Nano Banana 🍌',   sub: 'Visuels principal',    pct: 13, usd: '5.80',  color: 'bg-teal',    text: 'text-teal',       icon: '🖼️'  },
  { label: 'Perplexity Sonar', sub: 'Veille & Tendances',   pct: 12, usd: '5.60',  color: 'bg-amber',   text: 'text-amber',      icon: '🔍' },
  { label: 'ElevenLabs',       sub: 'Voix émotionnelle',    pct: 9,  usd: '4.00',  color: 'bg-coral',   text: 'text-coral',      icon: '🎙️'  },
  { label: 'Seedance',          sub: 'B-roll cinématique',   pct: 7,  usd: '3.20',  color: 'bg-border',  text: 'text-text-muted', icon: '🎥' },
]

const TYPE_ICON: Record<string, string> = { image: '🖼', video: '🎬', audio: '🎵', avatar: '👤' }
const TYPE_COLOR: Record<string, string> = { image: 'text-teal bg-teal/10 border-border-teal', video: 'text-accent bg-accent/10 border-accent', audio: 'text-coral bg-coral/10 border-coral', avatar: 'text-purple bg-purple/10 border-purple' }
const ENGINE_COLOR: Record<string, string> = {
  'nano-banana':    'text-accent',
  'kling-v2.1-pro': 'text-teal',
  'elevenlabs':     'text-coral',
  'minimax':        'text-pink',
  'chatgpt':        'text-teal',
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsView({ campaigns, avatars }: Props) {
  const assets = useMediaStore((s) => s.assets)

  const totalBudget   = 50
  const totalConsumed = AI_PROVIDERS.reduce((s, p) => s + parseFloat(p.usd), 0)
  const pctConsumed   = Math.round((totalConsumed / totalBudget) * 100)

  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'pre_campaign').length
  const activeAvatars   = avatars.filter((a) => a.status === 'active').length

  // ── Contenus par type (mediaStore) ────────────────────────────────────────
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
      { label: 'Vidéos',  count: counts.video, max, color: 'bg-accent', text: 'text-accent' },
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
    const COLORS = ['bg-accent text-accent', 'bg-purple text-purple', 'bg-teal text-teal', 'bg-coral text-coral', 'bg-amber text-amber']
    return Object.entries(counts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([name, count], i) => ({ name, count, max, colorClass: COLORS[i % COLORS.length] }))
  }, [assets, campaigns])

  // ── Activité récente (mediaStore triée par date) ───────────────────────────
  const recentActivity = useMemo(() =>
    assets.slice(0, 8).map((a) => ({
      icon:   TYPE_ICON[a.type] ?? '◈',
      action: a.type === 'image' ? 'Image générée' : a.type === 'video' ? 'Vidéo générée' : 'Voix générée',
      detail: `${engineLabel(a.engine)} · ${a.title}`,
      time:   timeAgo(a.createdAt),
      color:  ENGINE_COLOR[a.engine] ?? 'text-text-muted',
    }))
  , [assets])

  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

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
          <Link href="/galerie" className="font-mono text-[10px] text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
            Voir la galerie →
          </Link>
        </div>
      </div>

      {/* ── KPIs réels ── */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {[
          {
            label: 'Assets générés',
            value: assets.length,
            sub:   assets.length > 0 ? `${assets.filter(a=>a.type==='image').length} img · ${assets.filter(a=>a.type==='video').length} vid · ${assets.filter(a=>a.type==='audio').length} voix` : 'Aucun encore',
            color: 'text-accent', border: 'border-accent', shadow: 'shadow-neo',
          },
          {
            label: 'Campagnes actives',
            value: activeCampaigns,
            sub:   `${campaigns.length} total · ${campaigns.filter(c=>c.status==='draft').length} brouillon${campaigns.filter(c=>c.status==='draft').length > 1 ? 's' : ''}`,
            color: 'text-purple', border: 'border-border-purple', shadow: 'shadow-neo-purple',
          },
          {
            label: 'Avatars',
            value: avatars.length,
            sub:   `${activeAvatars} actif${activeAvatars > 1 ? 's' : ''}`,
            color: 'text-teal', border: 'border-border-teal', shadow: 'shadow-neo-teal',
          },
          {
            label: 'Budget consommé',
            value: `$${totalConsumed.toFixed(0)}`,
            sub:   `sur $${totalBudget} · ${pctConsumed}%`,
            color: 'text-amber', border: 'border-amber/40', shadow: '',
          },
        ].map((s) => (
          <div key={s.label} className={`bg-bg-card border-2 ${s.border} ${s.shadow} rounded-neo-lg p-4 hover:-translate-x-px hover:-translate-y-px transition-all duration-150`}>
            <div className={`font-display font-bold text-[30px] ${s.color} mb-1 leading-none`}>{s.value}</div>
            <div className="text-[12.5px] font-medium text-text-primary mb-0.5">{s.label}</div>
            <div className="font-mono text-[10px] text-text-dim">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-[1fr_1fr_300px] gap-4 mb-4">

        {/* Par type */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">Contenus par type</h3>
          {assets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-1">Aucun asset généré</p>
              <Link href="/creative-studio" className="font-mono text-[10px] text-accent hover:underline">
                → Creative Studio
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {byType.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-sans text-[12px] text-text-secondary">{f.label}</span>
                    <span className={`font-mono text-[12px] font-bold ${f.text}`}>{f.count}</span>
                  </div>
                  <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                    <div className={`h-full ${f.color} rounded-neo transition-all duration-500`} style={{ width: `${Math.round((f.count / f.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-dim">Total</span>
                <span className="font-display font-bold text-[18px] text-accent">{assets.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Par campagne */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">Assets par campagne</h3>
          {byCampaign.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-1">Aucune campagne</p>
              <Link href="/campagne/nouveau" className="font-mono text-[10px] text-accent hover:underline">
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
                      <span className={`font-mono text-[12px] font-bold ${text}`}>{c.count}</span>
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
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[14px] text-text-primary">Activité récente</h3>
            {assets.length > 0 && (
              <Link href="/galerie" className="font-mono text-[9px] text-accent hover:underline">Tout →</Link>
            )}
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[11px] text-text-dim">Aucune activité encore</p>
              <p className="font-mono text-[10px] text-text-dim mt-1">Générez du contenu pour voir l'historique.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
                  <div className="w-6 h-6 rounded border border-border bg-bg-surface flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-mono text-[10px] font-bold ${a.color}`}>{a.action}</div>
                    <div className="font-mono text-[9px] text-text-dim truncate">{a.detail}</div>
                  </div>
                  <div className="font-mono text-[8px] text-text-dim flex-shrink-0 mt-0.5 whitespace-nowrap">{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Budget AIML ── */}
      <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary">
            Consommation AIML API · <span className="capitalize">{currentMonth}</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-dim">1 clé · 9 modèles</span>
            <div className="w-1.5 h-1.5 rounded-full bg-teal" />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 mb-5">
          {AI_PROVIDERS.map((p) => (
            <div key={p.label} className="bg-bg-surface border-2 border-border rounded-neo-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{p.icon}</span>
                <div className={`font-display font-bold text-[17px] ${p.text}`}>${p.usd}</div>
              </div>
              <div className="font-sans text-[10px] text-text-secondary mb-0.5 font-semibold leading-tight">{p.label}</div>
              <div className="font-mono text-[9px] text-text-dim mb-2">{p.sub}</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                <div className={`h-full ${p.color} rounded-neo`} style={{ width: `${p.pct}%` }} />
              </div>
              <div className="font-mono text-[9px] text-text-dim mt-1 text-right">{p.pct}%</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-bg-base border-2 border-border rounded-neo overflow-hidden">
            <div
              className={`h-full rounded-neo transition-all duration-700 ${pctConsumed > 80 ? 'bg-coral' : 'bg-accent'}`}
              style={{ width: `${Math.min(pctConsumed, 100)}%` }}
            />
          </div>
          <span className="font-display font-bold text-[13px] text-text-primary flex-shrink-0">
            ${totalConsumed.toFixed(2)} / ${totalBudget} USD
          </span>
        </div>
        <p className="font-mono text-[10px] text-text-dim mt-2">
          {pctConsumed}% du budget mensuel · ${(totalBudget - totalConsumed).toFixed(2)} restants
        </p>
      </div>

    </div>
  )
}
