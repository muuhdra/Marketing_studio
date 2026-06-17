'use client'

import { useEffect, useRef, useState } from 'react'
import { useElapsed } from '@/lib/hooks/useElapsed'

// ─── Thème couleur par flux ────────────────────────────────────────────────
type Accent = 'accent' | 'purple' | 'teal' | 'coral' | 'pink' | 'amber'

const C: Record<Accent, { text: string; border: string; bg: string; soft: string }> = {
  accent: { text: 'text-accent', border: 'border-accent',        bg: 'bg-accent', soft: 'bg-accent/5' },
  purple: { text: 'text-purple', border: 'border-border-purple', bg: 'bg-purple', soft: 'bg-purple/5' },
  teal:   { text: 'text-teal',   border: 'border-border-teal',   bg: 'bg-teal',   soft: 'bg-teal/5'   },
  coral:  { text: 'text-coral',  border: 'border-border-coral',  bg: 'bg-coral',  soft: 'bg-coral/5'  },
  pink:   { text: 'text-pink',   border: 'border-pink/40',       bg: 'bg-pink',   soft: 'bg-pink/5'   },
  amber:  { text: 'text-amber',  border: 'border-amber/40',      bg: 'bg-amber',  soft: 'bg-amber/5'  },
}

export interface GenStep { key: string; label: string }

interface Props {
  steps:     GenStep[]
  /** Index de l'étape active. ≥ steps.length ⇒ tout est terminé. */
  current:   number
  /** 0-100 ⇒ barre pleine + compteur. null/undefined ⇒ rayures (indéterminé). */
  progress?: number | null
  /** Pilote le chrono écoulé (défaut: true). */
  active?:   boolean
  accent?:   Accent
  /** Petite ligne d'info (ex. job id). */
  subLabel?: string
}

// Compteur animé (count-up) vers la valeur cible.
function useCountUp(target: number | null | undefined): number {
  const [val, setVal] = useState(0)
  const valRef = useRef(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (target == null) return
    const start = valRef.current
    const t0 = performance.now()
    const dur = 400
    const tick = (t: number) => {
      const k = Math.min((t - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - k, 3)
      const next = start + (target - start) * eased
      valRef.current = next
      setVal(next)
      if (k < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target])
  return Math.round(val)
}

export default function GenerationProgress({
  steps, current, progress = null, active = true, accent = 'accent', subLabel,
}: Props) {
  const c       = C[accent]
  const isPct   = typeof progress === 'number'
  const pct     = useCountUp(isPct ? progress : null)
  const elapsed = useElapsed(active)

  return (
    <div className={`rounded-neo-lg border ${c.border} ${c.soft} p-4 animate-fade-in`}>

      {/* ── Stepper de phases ── */}
      <div className="flex flex-col">
        {steps.map((s, i) => {
          const done   = i < current
          const isCurr = i === current
          return (
            <div key={s.key} className="flex gap-3">
              {/* Rail : nœud + ligne de liaison */}
              <div className="flex flex-col items-center">
                {done ? (
                  <div className={`w-5 h-5 rounded-neo border ${c.border} ${c.bg} flex items-center justify-center`}>
                    <span className="text-bg-base text-[10px] font-bold animate-pop-in">✓</span>
                  </div>
                ) : isCurr ? (
                  <div className={`w-5 h-5 rounded-neo border ${c.border} flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-neo ${c.bg} animate-pulse-dot`} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-neo border border-border" />
                )}
                {i < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 my-1 transition-colors duration-300 ${done ? c.bg : 'bg-border'}`} />
                )}
              </div>
              {/* Label */}
              <div className="pb-3 last:pb-0">
                <p className={`font-sans text-[11px] font-bold leading-5 ${
                  isCurr ? c.text : done ? 'text-text-secondary' : 'text-text-dim'
                }`}>
                  {s.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Barre de progression ── */}
      <div className="mt-2">
        <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
          {isPct ? (
            <div
              className={`h-full ${c.bg} rounded-neo transition-all duration-500`}
              style={{ width: `${Math.max(0, Math.min(100, progress as number))}%` }}
            />
          ) : (
            <div className={`h-full gen-stripes ${c.text}`} />
          )}
        </div>

        {/* Méta : sous-label · % · chrono */}
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <span className="font-sans text-[9px] text-text-dim truncate">
            {subLabel ?? (active ? 'Traitement en cours…' : '')}
          </span>
          <span className="font-sans text-[9px] text-text-dim flex items-center gap-2.5 flex-shrink-0 tabular-nums">
            {isPct && <span className={`${c.text} font-bold`}>{pct}%</span>}
            <span>{elapsed}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
