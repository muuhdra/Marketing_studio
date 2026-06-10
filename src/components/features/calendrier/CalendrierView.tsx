'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'

interface DbCampaign {
  id:                   string
  name:                 string
  status:               CampaignStatus
  campaign_type:        'generale' | 'speciale'
  start_date:           string | null
  end_date:             string | null
  pre_campaign_enabled: boolean
  post_campaign_enabled: boolean
  created_at:           Date | string
}

interface CalEvent {
  id:         string
  title:      string
  startDay:   number   // jour du mois (1-31) dans la vue courante
  endDay:     number   // jour du mois (inclus)
  status:     CampaignStatus
  campaignId: string
  isStart:    boolean  // vrai si le vrai début est ce mois
  isEnd:      boolean  // vrai si la vraie fin est ce mois
}

interface UpcomingItem {
  date:        Date
  label:       string
  kind:        'start' | 'end' | 'created'
  campaignId:  string
  campaignName: string
  status:      CampaignStatus
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const STATUS_STYLE: Record<CampaignStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  draft:         { bg: 'bg-bg-elevated',  border: 'border-border',        text: 'text-text-dim',  dot: 'bg-border',   label: 'Brouillon'   },
  pre_campaign:  { bg: 'bg-amber/10',     border: 'border-amber/50',      text: 'text-amber',     dot: 'bg-amber',    label: 'Pré-camp.'   },
  active:        { bg: 'bg-accent/15',    border: 'border-accent',        text: 'text-accent',    dot: 'bg-accent',   label: 'Active'      },
  post_campaign: { bg: 'bg-teal/10',      border: 'border-border-teal',   text: 'text-teal',      dot: 'bg-teal',     label: 'Post-camp.'  },
  archived:      { bg: 'bg-bg-base',      border: 'border-border/40',     text: 'text-text-dim',  dot: 'bg-border/50',label: 'Archivée'    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(d: string | null): Date | null {
  if (!d) return null
  return new Date(d + 'T00:00:00')
}

function sameYearMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Construit les événements visibles pour un mois donné
function buildEvents(campaigns: DbCampaign[], year: number, month: number): CalEvent[] {
  const dim     = daysInMonth(year, month)
  const events: CalEvent[] = []

  for (const c of campaigns) {
    const start = parseDate(c.start_date)
    const end   = parseDate(c.end_date)

    // Un événement est visible si :
    // - il a une start_date dans ce mois ou avant (et end_date >= début du mois ou null)
    // - ou il est créé ce mois et n'a pas de dates (on l'affiche sur sa date de création)

    if (!start && !end) continue  // pas de dates → pas sur le calendrier

    const monthStart = new Date(year, month, 1)
    const monthEnd   = new Date(year, month, dim)

    // Vérifie overlap avec le mois courant
    const evStart = start ?? end!
    const evEnd   = end   ?? start!

    if (evEnd < monthStart || evStart > monthEnd) continue

    // Clip au mois
    const clippedStart = evStart < monthStart ? 1   : evStart.getDate()
    const clippedEnd   = evEnd   > monthEnd   ? dim : evEnd.getDate()

    events.push({
      id:         c.id,
      title:      c.name,
      startDay:   clippedStart,
      endDay:     clippedEnd,
      status:     c.status,
      campaignId: c.id,
      isStart:    start ? sameYearMonth(start, year, month) : false,
      isEnd:      end   ? sameYearMonth(end,   year, month) : false,
    })
  }

  return events
}

// Prochains jalons (30 prochains jours)
function buildUpcoming(campaigns: DbCampaign[]): UpcomingItem[] {
  const now    = Date.now()
  const future = now + 30 * 86_400_000
  const items: UpcomingItem[] = []

  for (const c of campaigns) {
    if (c.status === 'archived') continue

    const start = parseDate(c.start_date)
    const end   = parseDate(c.end_date)

    if (start && start.getTime() >= now && start.getTime() <= future) {
      items.push({ date: start, label: 'Lancement', kind: 'start', campaignId: c.id, campaignName: c.name, status: c.status })
    }
    if (end && end.getTime() >= now && end.getTime() <= future) {
      items.push({ date: end, label: 'Fin', kind: 'end', campaignId: c.id, campaignName: c.name, status: c.status })
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendrierView({ campaigns }: { campaigns: DbCampaign[] }) {
  const now           = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())
  const [view,  setView]  = useState<'month' | 'list'>('month')

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else             { setMonth((m) => m - 1) }
  }
  function nextMonth() {
    if (month === 11) { setMonth(0);  setYear((y) => y + 1) }
    else              { setMonth((m) => m + 1) }
  }
  function goToday()  { setMonth(now.getMonth()); setYear(now.getFullYear()) }

  // Grille du mois
  const dim     = daysInMonth(year, month)
  const firstDow = (() => { let d = new Date(year, month, 1).getDay() - 1; return d < 0 ? 6 : d })()
  const totalCells = Math.ceil((firstDow + dim) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDow + 1
    return (day >= 1 && day <= dim) ? day : null
  })

  const isToday = (d: number | null) =>
    d !== null && now.getDate() === d && now.getMonth() === month && now.getFullYear() === year

  // Événements pour ce mois
  const events = useMemo(() => buildEvents(campaigns, year, month), [campaigns, year, month])

  // Prochains jalons
  const upcoming = useMemo(() => buildUpcoming(campaigns), [campaigns])

  // Stats ce mois
  const statsThisMonth = useMemo(() => {
    const active    = campaigns.filter((c) => c.status === 'active').length
    const hasDate   = campaigns.filter((c) => c.start_date || c.end_date).length
    const monthEvts = events.length
    const withEnd   = campaigns.filter((c) => {
      const e = parseDate(c.end_date)
      return e && e.getMonth() === month && e.getFullYear() === year
    }).length
    return { active, hasDate, monthEvts, withEnd }
  }, [campaigns, events, month, year])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="nb-label mb-2">Planning</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">
            Calendrier
          </h1>
          <p className="text-[13px] text-text-muted mt-1">
            {campaigns.length > 0
              ? `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} · ${upcoming.length} jalons à venir`
              : 'Aucune campagne — créez votre première pour voir les jalons'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="font-mono text-[11px] font-bold text-text-dim border border-border rounded-neo px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
          >
            Aujourd'hui
          </button>
          <div className="flex border-2 border-border rounded-neo overflow-hidden">
            {(['month', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold transition-all
                  ${view === v ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary hover:bg-white/5'}`}
              >
                {v === 'month' ? 'Mois' : 'Liste'}
              </button>
            ))}
          </div>
          <Link href="/campagne/nouveau">
            <Button size="sm">+ Campagne</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5">

        {/* ── Calendrier principal ── */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden">

          {/* Navigation mois */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-border">
            <button onClick={prevMonth} className="w-8 h-8 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-accent transition-colors font-bold">←</button>
            <div className="font-display font-bold text-[15px] text-text-primary">
              {MONTHS[month]} {year}
            </div>
            <button onClick={nextMonth} className="w-8 h-8 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-accent transition-colors font-bold">→</button>
          </div>

          {/* Vue mois */}
          {view === 'month' && (
            <>
              {/* En-têtes jours */}
              <div className="grid grid-cols-7 border-b border-border/50">
                {DAYS.map((d) => (
                  <div key={d} className="py-2 text-center font-mono text-[9px] font-bold text-text-dim uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grille */}
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dayEvents = day
                    ? events.filter((e) => day >= e.startDay && day <= e.endDay)
                    : []
                  const isLastCol = (i + 1) % 7 === 0

                  return (
                    <div
                      key={i}
                      className={`min-h-[88px] border-b border-r border-border/30 p-1.5
                        ${isLastCol ? 'border-r-0' : ''}
                        ${!day ? 'bg-bg-base/30' : isToday(day) ? 'bg-accent/5' : 'hover:bg-white/[0.015]'}
                      `}
                    >
                      {day && (
                        <>
                          {/* Numéro du jour */}
                          <div className={`w-6 h-6 flex items-center justify-center rounded-neo mb-1
                            font-mono text-[10px] font-bold transition-colors
                            ${isToday(day) ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary'}`}>
                            {day}
                          </div>

                          {/* Événements */}
                          <div className="flex flex-col gap-0.5">
                            {dayEvents.slice(0, 2).map((ev) => {
                              const s       = STATUS_STYLE[ev.status]
                              const isFirst = day === ev.startDay
                              const isLast  = day === ev.endDay
                              return (
                                <Link key={ev.id} href={`/campagne/${ev.campaignId}`}>
                                  <div className={`
                                    px-1 py-0.5 text-[8px] font-mono font-bold truncate border
                                    ${s.bg} ${s.border} ${s.text}
                                    ${isFirst ? 'rounded-l-neo' : ''}
                                    ${isLast  ? 'rounded-r-neo' : 'rounded-r-none border-r-0'}
                                    transition-opacity hover:opacity-80
                                  `}>
                                    {isFirst ? ev.title : '·'}
                                  </div>
                                </Link>
                              )
                            })}
                            {dayEvents.length > 2 && (
                              <div className="font-mono text-[8px] text-text-dim px-1">
                                +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Vue liste */}
          {view === 'list' && (
            <div className="divide-y divide-border/40">
              {events.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-mono text-[12px] text-text-dim mb-1">Aucune campagne planifiée ce mois</p>
                  <p className="font-mono text-[10px] text-text-dim">Ajoutez des dates à vos campagnes pour les voir apparaître.</p>
                </div>
              ) : (
                events
                  .sort((a, b) => a.startDay - b.startDay)
                  .map((ev) => {
                    const s = STATUS_STYLE[ev.status]
                    return (
                      <Link key={ev.id} href={`/campagne/${ev.campaignId}`} className="group block">
                        <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-elevated transition-colors">
                          {/* Dates */}
                          <div className="w-20 flex-shrink-0">
                            <p className="font-mono text-[10px] font-bold text-text-muted">
                              {MONTHS[month].slice(0, 3)} {ev.startDay}
                            </p>
                            {ev.endDay > ev.startDay && (
                              <p className="font-mono text-[9px] text-text-dim">
                                → {ev.endDay}
                              </p>
                            )}
                          </div>
                          {/* Barre couleur */}
                          <div className={`w-1 self-stretch rounded-full ${s.dot} flex-shrink-0`} />
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-[12px] font-bold text-text-primary truncate group-hover:text-accent transition-colors">
                              {ev.title}
                            </p>
                            <p className="font-mono text-[10px] text-text-dim">
                              {ev.endDay - ev.startDay + 1} jour{ev.endDay - ev.startDay > 0 ? 's' : ''}
                            </p>
                          </div>
                          {/* Status */}
                          <span className={`font-mono text-[9px] font-bold border rounded px-2 py-0.5 flex-shrink-0 ${s.border} ${s.text}`}>
                            {s.label}
                          </span>
                        </div>
                      </Link>
                    )
                  })
              )}
            </div>
          )}
        </div>

        {/* ── Panneau latéral ── */}
        <div className="flex flex-col gap-4">

          {/* Stats ce mois */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Ce mois · {MONTHS[month]}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Sur le cal.',  value: statsThisMonth.monthEvts,  color: 'text-accent'  },
                { label: 'Actives',      value: statsThisMonth.active,      color: 'text-teal'    },
                { label: 'Se terminent', value: statsThisMonth.withEnd,     color: 'text-coral'   },
                { label: 'Avec dates',   value: statsThisMonth.hasDate,     color: 'text-purple'  },
              ].map((s) => (
                <div key={s.label} className="bg-bg-surface border border-border rounded-neo p-2 text-center">
                  <div className={`font-display font-bold text-[22px] leading-none mb-0.5 ${s.color}`}>{s.value}</div>
                  <div className="font-mono text-[8px] text-text-dim">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prochains jalons */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4 flex-1">
            <p className="nb-label mb-3">Prochains jalons · 30j</p>

            {upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <p className="font-mono text-[11px] text-text-dim mb-1">Aucun jalon à venir</p>
                <p className="font-mono text-[9px] text-text-dim">Ajoutez des dates de début/fin à vos campagnes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {upcoming.slice(0, 8).map((u, i) => {
                  const s = STATUS_STYLE[u.status]
                  const dateStr = u.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  const daysFromNow = Math.ceil((u.date.getTime() - Date.now()) / 86_400_000)

                  return (
                    <Link key={i} href={`/campagne/${u.campaignId}`} className="group block">
                      <div className={`flex items-start gap-3 py-2.5 ${i < upcoming.length - 1 ? 'border-b border-border/30' : ''}`}>
                        {/* Date */}
                        <div className="flex-shrink-0 w-10 text-right">
                          <p className="font-mono text-[9px] font-bold text-text-muted">{dateStr}</p>
                          <p className="font-mono text-[8px] text-text-dim">J-{daysFromNow}</p>
                        </div>
                        {/* Dot */}
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[10px] font-bold text-text-primary truncate group-hover:text-accent transition-colors leading-tight">
                            {u.campaignName}
                          </p>
                          <p className={`font-mono text-[8px] font-bold ${s.text}`}>{u.label}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {upcoming.length > 8 && (
                  <p className="font-mono text-[9px] text-text-dim pt-2 text-center">
                    + {upcoming.length - 8} autre{upcoming.length - 8 > 1 ? 's' : ''} jalons
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Légende */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Légende</p>
            <div className="flex flex-col gap-1.5">
              {(Object.entries(STATUS_STYLE) as [CampaignStatus, typeof STATUS_STYLE[CampaignStatus]][])
                .filter(([s]) => s !== 'archived')
                .map(([, meta]) => (
                  <div key={meta.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded flex-shrink-0 border ${meta.bg} ${meta.border}`} />
                    <span className="font-mono text-[10px] text-text-muted">{meta.label}</span>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
