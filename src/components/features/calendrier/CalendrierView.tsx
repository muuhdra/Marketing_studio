'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ─── Data ────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const EVENTS = [
  { id: 1, title: 'Sneakers Spring Drop',  day: 3,  duration: 4, type: 'active',  color: 'bg-accent/20 border-accent text-accent' },
  { id: 2, title: 'App Wellbeing — Pré',   day: 1,  duration: 2, type: 'pre',     color: 'bg-purple/20 border-border-purple text-purple' },
  { id: 3, title: 'Cosmetics Été 2026',    day: 8,  duration: 6, type: 'done',    color: 'bg-teal/20 border-border-teal text-teal' },
  { id: 4, title: 'Nouvelle Campagne',     day: 15, duration: 3, type: 'draft',   color: 'bg-bg-elevated border-border text-text-muted' },
]

const UPCOMING = [
  { date: '12 Jun',  title: 'Lancement UGC Batch #3',        badge: 'UGC',         color: 'text-accent'  },
  { date: '14 Jun',  title: 'Revue créas Sneakers',          badge: 'Revue',       color: 'text-purple'  },
  { date: '18 Jun',  title: 'Fin pré-campagne Wellbeing',    badge: 'Pré-camp.',   color: 'text-purple'  },
  { date: '22 Jun',  title: 'Shooting Cosmetics',            badge: 'Production',  color: 'text-teal'    },
  { date: '28 Jun',  title: 'Bilan mensuel',                 badge: 'Analytics',   color: 'text-amber'   },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendrierView() {
  const [currentMonth, setCurrentMonth] = useState(5) // Juin (index 0-based)
  const [currentYear]                   = useState(2026)
  const [view, setView]                 = useState<'month' | 'week'>('month')

  // Génère les 35 cases du calendrier (5 semaines)
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const offset   = firstDay === 0 ? 6 : firstDay - 1 // Lundi = 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const cells = Array.from({ length: 35 }, (_, i) => {
    const day = i - offset + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const today = new Date()
  const isToday = (d: number | null) =>
    d !== null &&
    today.getDate() === d &&
    today.getMonth() === currentMonth &&
    today.getFullYear() === currentYear

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="nb-label mb-2">Planning</p>
          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">
            Calendrier
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Vue toggle */}
          <div className="flex border-2 border-border rounded-neo-md overflow-hidden">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 font-mono text-[11px] font-bold transition-all ${
                  view === v
                    ? 'bg-accent text-bg-base'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                {v === 'month' ? 'Mois' : 'Semaine'}
              </button>
            ))}
          </div>
          <Button size="sm">+ Événement</Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">

        {/* ── Calendrier principal ── */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden">

          {/* Nav mois */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border">
            <button
              onClick={() => setCurrentMonth((m) => (m === 0 ? 11 : m - 1))}
              className="nb-btn-ghost w-8 h-8 p-0 flex items-center justify-center font-bold text-lg"
            >
              ←
            </button>
            <div className="font-display font-bold text-[16px] text-text-primary">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            <button
              onClick={() => setCurrentMonth((m) => (m === 11 ? 0 : m + 1))}
              className="nb-btn-ghost w-8 h-8 p-0 flex items-center justify-center font-bold text-lg"
            >
              →
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 border-b-2 border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center font-mono text-[10px] font-bold text-text-dim">
                {d}
              </div>
            ))}
          </div>

          {/* Cases */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const events = day ? EVENTS.filter((e) => day >= e.day && day < e.day + e.duration) : []
              return (
                <div
                  key={i}
                  className={`
                    min-h-[80px] p-2 border-r border-b border-border/50
                    ${!day ? 'bg-bg-base/50' : 'hover:bg-white/[0.02] cursor-pointer'}
                    ${isToday(day) ? 'bg-accent/5' : ''}
                    ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                  `}
                >
                  {day && (
                    <>
                      <div className={`
                        w-6 h-6 flex items-center justify-center rounded-neo mb-1.5
                        font-mono text-[11px] font-bold transition-colors
                        ${isToday(day) ? 'bg-accent text-bg-base' : 'text-text-secondary hover:text-text-primary'}
                      `}>
                        {day}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {events.map((e) => (
                          <div
                            key={e.id}
                            className={`
                              px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold
                              truncate ${e.color}
                            `}
                          >
                            {day === e.day ? e.title : '·'}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Panneau latéral ── */}
        <div className="flex flex-col gap-4">

          {/* Légende */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Légende</p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'En cours',     color: 'bg-accent'  },
                { label: 'Pré-campagne', color: 'bg-purple'  },
                { label: 'Terminée',     color: 'bg-teal'    },
                { label: 'Brouillon',    color: 'bg-border-strong' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-neo border border-border ${l.color}`} />
                  <span className="font-mono text-[11px] text-text-secondary">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prochains événements */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4 flex-1">
            <p className="nb-label mb-3">Prochains événements</p>
            <div className="flex flex-col gap-3">
              {UPCOMING.map((u, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="font-mono text-[10px] font-bold text-text-dim w-12 flex-shrink-0 pt-0.5">
                    {u.date}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium ${u.color} leading-tight mb-1`}>
                      {u.title}
                    </p>
                    <span className="font-mono text-[9px] font-bold text-text-dim border border-border px-1.5 py-0.5 rounded">
                      {u.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats rapides */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Ce mois</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Campagnes', value: '3', color: 'text-accent'  },
                { label: 'Événements', value: '12', color: 'text-purple' },
                { label: 'Créas dûes', value: '47', color: 'text-teal'  },
                { label: 'Revues',     value: '5',  color: 'text-amber'  },
              ].map((s) => (
                <div key={s.label} className="bg-bg-surface border border-border rounded-neo p-2 text-center">
                  <div className={`font-display font-bold text-[20px] ${s.color}`}>{s.value}</div>
                  <div className="font-mono text-[9px] text-text-dim">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
