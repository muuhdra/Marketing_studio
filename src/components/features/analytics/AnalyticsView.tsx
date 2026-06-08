'use client'

const STATS = [
  { label: 'Contenus générés', value: '127', sub: 'Tous formats',   color: 'text-accent',  border: 'border-accent',        shadow: 'shadow-neo'        },
  { label: 'Campagnes actives', value: '2',  sub: '1 pré-campagne', color: 'text-purple',  border: 'border-border-purple', shadow: 'shadow-neo-purple'  },
  { label: 'Avatars créés',    value: '5',  sub: 'Tous assignés',   color: 'text-teal',    border: 'border-border-teal',   shadow: 'shadow-neo-teal'    },
  { label: 'Budget consommé',  value: '38.2',sub: 'USD ce mois',    color: 'text-amber',   border: 'border-amber/40',      shadow: 'shadow-neo-amber'   },
]

const BY_FORMAT = [
  { label: 'UGC Vidéo',     count: 58, pct: 72, color: 'bg-accent',  text: 'text-accent'  },
  { label: 'Shooting Photo',count: 34, pct: 45, color: 'bg-purple',  text: 'text-purple'  },
  { label: 'Commercial',    count: 22, pct: 28, color: 'bg-teal',    text: 'text-teal'    },
  { label: 'Visuel App',    count: 13, pct: 16, color: 'bg-coral',   text: 'text-coral'   },
]

const BY_CAMPAIGN = [
  { name: 'Sneakers Spring Drop', count: 52, color: 'bg-accent',  text: 'text-accent'  },
  { name: 'App Wellbeing v2',     count: 34, color: 'bg-purple',  text: 'text-purple'  },
  { name: 'Cosmetics Été 2026',   count: 41, color: 'bg-teal',    text: 'text-teal'    },
]

const PROVIDERS = [
  { label: 'Claude',      sub: 'Orchestration', pct: 35, usd: '13.40', color: 'bg-purple',  text: 'text-purple'  },
  { label: 'OpenAI',      sub: 'Scripts',       pct: 20, usd: '7.64',  color: 'bg-teal',    text: 'text-teal'    },
  { label: 'Kling AI',    sub: 'Vidéo',         pct: 28, usd: '10.70', color: 'bg-accent',  text: 'text-accent'  },
  { label: 'ElevenLabs',  sub: 'Voix',          pct: 17, usd: '6.46',  color: 'bg-coral',   text: 'text-coral'   },
]

export default function AnalyticsView() {
  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="mb-7">
        <p className="nb-label mb-2">Vue d'ensemble</p>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary">Analytics</h1>
      </div>

      {/* ── Stats 4 colonnes ── */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className={`
            bg-bg-card border-2 ${s.border} ${s.shadow} rounded-neo-lg p-4
            transition-all duration-150
            hover:-translate-x-px hover:-translate-y-px
          `}>
            <div className={`font-display font-bold text-[30px] ${s.color} mb-1 leading-none`}>
              {s.value}
            </div>
            <div className="text-[12.5px] font-medium text-text-primary mb-0.5">{s.label}</div>
            <div className="font-mono text-[10px] text-text-dim">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grille analytics ── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Par format */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[15px] text-text-primary mb-5">
            Contenus par format
          </h3>
          <div className="flex flex-col gap-3.5">
            {BY_FORMAT.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-sans text-[12.5px] text-text-secondary">{f.label}</span>
                  <span className={`font-mono text-[12px] font-bold ${f.text}`}>{f.count}</span>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div className={`h-full ${f.color} rounded-neo transition-all duration-500`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Par campagne */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <h3 className="font-display font-bold text-[15px] text-text-primary mb-5">
            Contenus par campagne
          </h3>
          <div className="flex flex-col gap-3.5">
            {BY_CAMPAIGN.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-sans text-[12.5px] text-text-secondary">{c.name}</span>
                  <span className={`font-mono text-[12px] font-bold ${c.text}`}>{c.count}</span>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div className={`h-full ${c.color} rounded-neo`} style={{ width: `${Math.round((c.count / 127) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Budget IA ── */}
      <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
        <h3 className="font-display font-bold text-[15px] text-text-primary mb-5">
          Consommation Budget IA
        </h3>
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {PROVIDERS.map((p) => (
            <div key={p.label} className="bg-bg-surface border-2 border-border rounded-neo-lg p-3">
              <div className={`font-display font-bold text-[20px] ${p.text} mb-0.5`}>
                {p.usd}
                <span className="text-[11px] font-normal text-text-muted ml-1">USD</span>
              </div>
              <div className="font-sans text-[11px] text-text-secondary mb-0.5 font-medium">{p.label}</div>
              <div className="font-mono text-[10px] text-text-dim mb-2">{p.sub}</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                <div className={`h-full ${p.color} rounded-neo`} style={{ width: `${p.pct}%` }} />
              </div>
              <div className="font-mono text-[10px] text-text-dim mt-1 text-right">{p.pct}%</div>
            </div>
          ))}
        </div>

        {/* Barre globale */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-bg-base border-2 border-border rounded-neo overflow-hidden">
            <div className="h-full w-[76%] bg-accent rounded-neo" />
          </div>
          <span className="font-display font-bold text-[14px] text-text-primary flex-shrink-0">
            38.20 / 50 USD
          </span>
        </div>
        <p className="font-mono text-[11px] text-text-dim mt-2">
          76% du budget mensuel consommé — 11.80 USD restants
        </p>
      </div>

    </div>
  )
}
