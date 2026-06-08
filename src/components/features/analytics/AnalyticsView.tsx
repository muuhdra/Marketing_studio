'use client'

// ─── Data statique ────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Contenus générés', value: '127',  sub: 'Tous formats',    color: 'text-accent',  border: 'border-accent',        shadow: 'shadow-neo'        },
  { label: 'Campagnes actives', value: '3',   sub: '1 pré-campagne',  color: 'text-purple',  border: 'border-border-purple', shadow: 'shadow-neo-purple'  },
  { label: 'Avatars créés',     value: '5',   sub: 'Tous assignés',   color: 'text-teal',    border: 'border-border-teal',   shadow: 'shadow-neo-teal'    },
  { label: 'Budget consommé',   value: '$38', sub: 'USD ce mois',     color: 'text-amber',   border: 'border-amber/40',      shadow: 'shadow-neo-amber'   },
]

const BY_FORMAT = [
  { label: 'UGC Vidéo',      count: 58,  max: 58, color: 'bg-accent',  text: 'text-accent'  },
  { label: 'Shooting Photo', count: 34,  max: 58, color: 'bg-purple',  text: 'text-purple'  },
  { label: 'Commercial',     count: 22,  max: 58, color: 'bg-teal',    text: 'text-teal'    },
  { label: 'Visuel App',     count: 13,  max: 58, color: 'bg-coral',   text: 'text-coral'   },
]

const BY_CAMPAIGN = [
  { name: 'Sneakers Spring Drop', count: 52, color: 'bg-accent',  text: 'text-accent'  },
  { name: 'App Wellbeing v2',     count: 34, color: 'bg-purple',  text: 'text-purple'  },
  { name: 'Cosmetics Été 2026',   count: 41, color: 'bg-teal',    text: 'text-teal'    },
]

// Providers alignés avec AIML API
const AI_PROVIDERS = [
  { label: 'Kling + Seedance', sub: 'Vidéo UGC',        pct: 38, usd: '17.40', color: 'bg-accent',  text: 'text-accent',  icon: '🎬' },
  { label: 'Claude + ChatGPT', sub: 'Scripts & Strat.', pct: 24, usd: '10.80', color: 'bg-purple',  text: 'text-purple',  icon: '🧠' },
  { label: 'Perplexity Sonar', sub: 'Veille & Search',  pct: 14, usd: '6.20',  color: 'bg-amber',   text: 'text-amber',   icon: '🔍' },
  { label: 'Flux + Nano 🍌',   sub: 'Visuels & Moods',  pct: 14, usd: '6.60',  color: 'bg-teal',    text: 'text-teal',    icon: '🖼️'  },
  { label: 'ElevenLabs + MM',  sub: 'Voix & Clonage',   pct: 10, usd: '4.40',  color: 'bg-coral',   text: 'text-coral',   icon: '🎙️'  },
]

const RECENT_ACTIVITY = [
  { action: 'Script généré',    detail: 'Sneakers Drop · Claude Opus 4',     time: 'il y a 12 min',  icon: '📝', color: 'text-purple' },
  { action: 'Vidéo soumise',   detail: 'Kling v2.1 Pro · en cours',          time: 'il y a 28 min',  icon: '🎬', color: 'text-accent' },
  { action: 'Recherche web',   detail: 'Perplexity Sonar · Tendances 2026',  time: 'il y a 45 min',  icon: '🔍', color: 'text-amber'  },
  { action: 'Photo générée',   detail: 'Flux Pro · Elena portrait',           time: 'il y a 1h',      icon: '🖼️', color: 'text-teal'   },
  { action: 'Voix synthétisée',detail: 'ElevenLabs Rachel · 30s',            time: 'il y a 2h',      icon: '🎙️', color: 'text-coral'  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const totalBudget    = 45
  const totalConsumed  = 38.20
  const pctConsumed    = Math.round((totalConsumed / totalBudget) * 100)

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="nb-label mb-2">Vue d'ensemble</p>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-dim border border-border px-3 py-1.5 rounded-neo">
            Juin 2026
          </span>
        </div>
      </div>

      {/* ── Stats 4 colonnes ── */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className={`
            bg-bg-card border-2 ${s.border} ${s.shadow} rounded-neo-lg p-4
            transition-all duration-150 hover:-translate-x-px hover:-translate-y-px
          `}>
            <div className={`font-display font-bold text-[30px] ${s.color} mb-1 leading-none`}>
              {s.value}
            </div>
            <div className="text-[12.5px] font-medium text-text-primary mb-0.5">{s.label}</div>
            <div className="font-mono text-[10px] text-text-dim">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-[1fr_1fr_320px] gap-4 mb-4">

        {/* Par format */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">
            Contenus par format
          </h3>
          <div className="flex flex-col gap-3.5">
            {BY_FORMAT.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-sans text-[12px] text-text-secondary">{f.label}</span>
                  <span className={`font-mono text-[12px] font-bold ${f.text}`}>{f.count}</span>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div
                    className={`h-full ${f.color} rounded-neo transition-all duration-500`}
                    style={{ width: `${Math.round((f.count / f.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Par campagne */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-5">
            Contenus par campagne
          </h3>
          <div className="flex flex-col gap-3.5">
            {BY_CAMPAIGN.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-sans text-[12px] text-text-secondary">{c.name}</span>
                  <span className={`font-mono text-[12px] font-bold ${c.text}`}>{c.count}</span>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div className={`h-full ${c.color} rounded-neo transition-all duration-500`} style={{ width: `${Math.round((c.count / 58) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="mt-5 pt-4 border-t-2 border-border flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-dim">Total généré</span>
            <span className="font-display font-bold text-[18px] text-accent">127</span>
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary mb-4">
            Activité récente
          </h3>
          <div className="flex flex-col gap-0">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                <div className="w-7 h-7 rounded-neo border border-border bg-bg-surface flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-mono text-[11px] font-bold ${a.color}`}>{a.action}</div>
                  <div className="font-mono text-[10px] text-text-dim truncate">{a.detail}</div>
                </div>
                <div className="font-mono text-[9px] text-text-dim flex-shrink-0 mt-0.5">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Budget IA AIML ── */}
      <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[14px] text-text-primary">
            Consommation AIML API · Juin 2026
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-dim">1 clé · 9 modèles</span>
            <div className="w-1.5 h-1.5 rounded-full bg-teal" />
          </div>
        </div>

        {/* Grid providers */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {AI_PROVIDERS.map((p) => (
            <div key={p.label} className="bg-bg-surface border-2 border-border rounded-neo-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{p.icon}</span>
                <div className={`font-display font-bold text-[17px] ${p.text}`}>
                  ${p.usd}
                </div>
              </div>
              <div className="font-sans text-[10.5px] text-text-secondary mb-0.5 font-semibold leading-tight">{p.label}</div>
              <div className="font-mono text-[9px] text-text-dim mb-2">{p.sub}</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                <div className={`h-full ${p.color} rounded-neo`} style={{ width: `${p.pct}%` }} />
              </div>
              <div className="font-mono text-[9px] text-text-dim mt-1 text-right">{p.pct}%</div>
            </div>
          ))}
        </div>

        {/* Barre globale */}
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
