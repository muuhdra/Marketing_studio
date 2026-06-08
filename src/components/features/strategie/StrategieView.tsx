'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const STRATEGIES = [
  { id: 'hook',        label: 'Hook Émotionnel UGC',    phase: 'launch', desc: "Capturer l'attention en 0-3 secondes avec une émotion forte. Structure hook → problème → solution → CTA." },
  { id: 'teasing',     label: 'Teasing Pré-lancement',  phase: 'pre',    desc: "Créer de l'anticipation avant le lancement. Mystère, révélation progressive, communauté." },
  { id: 'scale',       label: 'Scale Winning Ads',      phase: 'scale',  desc: "Identifier les créas performantes et dupliquer les patterns gagnants à grande échelle." },
  { id: 'retargeting', label: 'Retargeting Post',        phase: 'post',   desc: "Reconquérir les visiteurs non convertis avec des messages personnalisés et preuves sociales." },
  { id: 'ugc-auth',    label: 'Authenticité UGC Pure',  phase: 'launch', desc: "Contenu 100% natif platform. Pas de surproduction, langage familier, prises de vue naturelles." },
  { id: 'story',       label: 'Storytelling Produit',   phase: 'launch', desc: "Raconter l'histoire derrière le produit. Origine, valeurs, transformation client." },
]

type Phase = 'pre' | 'launch' | 'post' | 'scale'

const PHASES: Record<Phase, { label: string; variant: 'purple' | 'accent' | 'teal' | 'amber' }> = {
  pre:    { label: 'Pre-launch',  variant: 'purple' },
  launch: { label: 'Launch',      variant: 'accent'  },
  post:   { label: 'Post-launch', variant: 'teal'    },
  scale:  { label: 'Scale',       variant: 'amber'   },
}

export default function StrategieView() {
  const [selected, setSelected]       = useState<string | null>(null)
  const [filterPhase, setFilterPhase] = useState<string | null>(null)

  const strat    = STRATEGIES.find((s) => s.id === selected)
  const filtered = filterPhase ? STRATEGIES.filter((s) => s.phase === filterPhase) : STRATEGIES

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="nb-label mb-2">Bibliothèque</p>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary">
            Stratégie Marketing
          </h1>
        </div>
        <Button variant="secondary" size="sm">+ Nouvelle stratégie</Button>
      </div>

      {/* ── Filtres phases ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterPhase(null)}
          className={`
            font-mono text-[11px] font-bold px-3 py-1.5 rounded-neo border-2
            transition-all duration-100
            ${filterPhase === null
              ? 'border-accent text-accent bg-accent/10 shadow-neo-sm'
              : 'border-border text-text-muted hover:border-border-strong'
            }
          `}
        >
          Toutes
        </button>
        {Object.entries(PHASES).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setFilterPhase(key === filterPhase ? null : key)}
            className={`
              font-mono text-[11px] font-bold px-3 py-1.5 rounded-neo border-2
              transition-all duration-100
              ${filterPhase === key
                ? `border-current text-${p.variant === 'accent' ? 'accent' : p.variant} bg-${p.variant === 'accent' ? 'accent' : p.variant}/10`
                : 'border-border text-text-muted hover:border-border-strong'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${strat ? 'grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>

        {/* ── Grille stratégies ── */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 content-start">
          {filtered.map((s) => {
            const phase = PHASES[s.phase as Phase]
            const isSel = selected === s.id
            return (
              <div
                key={s.id}
                onClick={() => setSelected(isSel ? null : s.id)}
                className={`
                  border-2 rounded-neo-lg p-4 cursor-pointer
                  transition-all duration-150
                  ${isSel
                    ? 'border-accent bg-accent/5 shadow-neo -translate-x-px -translate-y-px'
                    : 'border-border bg-bg-card hover:border-border-strong hover:shadow-neo-white hover:-translate-x-px hover:-translate-y-px'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-neo-md border-2 border-border flex items-center justify-center">
                    <div className={`w-2.5 h-2.5 rounded-neo ${
                      phase.variant === 'accent' ? 'bg-accent' :
                      phase.variant === 'purple' ? 'bg-purple' :
                      phase.variant === 'teal'   ? 'bg-teal'   : 'bg-amber'
                    }`} />
                  </div>
                  <Badge variant={phase.variant}>{phase.label}</Badge>
                </div>
                <h3 className={`font-display font-bold text-[13.5px] mb-1.5 ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                  {s.label}
                </h3>
                <p className="text-[11.5px] text-text-muted leading-relaxed">{s.desc}</p>
                {isSel && (
                  <div className="mt-2 font-mono text-[10px] font-bold text-accent">✓ Sélectionnée</div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Panneau détail ── */}
        {strat && (
          <div className="sticky top-0 flex flex-col gap-3.5 animate-slide-in">
            <div className="border-2 border-accent bg-bg-card rounded-neo-lg p-5 shadow-neo">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-neo-md border-2 border-border flex items-center justify-center flex-shrink-0">
                  <div className={`w-3 h-3 rounded-neo ${
                    PHASES[strat.phase as Phase].variant === 'accent' ? 'bg-accent' :
                    PHASES[strat.phase as Phase].variant === 'purple' ? 'bg-purple' :
                    PHASES[strat.phase as Phase].variant === 'teal'   ? 'bg-teal'   : 'bg-amber'
                  }`} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-[15px] text-accent mb-1">{strat.label}</h3>
                  <Badge variant={PHASES[strat.phase as Phase].variant}>
                    {PHASES[strat.phase as Phase].label}
                  </Badge>
                </div>
              </div>

              <p className="text-[12.5px] text-text-muted leading-relaxed mb-5">{strat.desc}</p>

              {/* IA overview */}
              <div className="bg-teal/5 border-2 border-border-teal rounded-neo-lg p-3.5 mb-5">
                <p className="nb-label mb-2">Overview générée par IA</p>
                <p className="text-[11.5px] text-teal/80 leading-relaxed">
                  Appliquée à la campagne active, cette stratégie guidera les agents pour structurer
                  les scripts avec un hook fort, aligner le ton avec l'ADN de campagne et prioriser
                  les interruptions de motif toutes les 2.5s.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button fullWidth>Appliquer à la campagne</Button>
                <Button variant="secondary" fullWidth size="sm">Modifier la stratégie</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
