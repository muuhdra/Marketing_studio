'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, CalendarDays, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'
type PhaseKind = 'pre' | 'main' | 'post'

interface DbCampaign {
  id:                     string
  name:                   string
  status:                 CampaignStatus
  campaign_type:          'generale' | 'speciale'
  start_date:             string | null
  end_date:               string | null
  pre_campaign_enabled:   boolean
  pre_campaign_start:     string | null
  pre_campaign_end:       string | null
  post_campaign_enabled:  boolean
  post_campaign_delay_weeks: number | null
  created_at:             Date | string
}

interface PhaseEvent {
  key:        string
  campaignId: string
  title:      string
  status:     CampaignStatus
  phase:      PhaseKind
  start:      Date   // minuit, inclus
  end:        Date   // minuit, inclus
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const STATUS_STYLE: Record<CampaignStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  draft:         { bg: 'bg-fg/[0.04]',  border: 'border-border',        text: 'text-text-muted',  dot: 'bg-border',   label: 'Brouillon'   },
  pre_campaign:  { bg: 'bg-amber/10',     border: 'border-amber/50',      text: 'text-amber',     dot: 'bg-amber',    label: 'Pré-camp.'   },
  active:        { bg: 'bg-accent/15',    border: 'border-accent',        text: 'text-accent',    dot: 'bg-accent',   label: 'Active'      },
  post_campaign: { bg: 'bg-teal/10',      border: 'border-border-teal',   text: 'text-teal',      dot: 'bg-teal',     label: 'Post-camp.'  },
  archived:      { bg: 'bg-fg/[0.03]',      border: 'border-border-strong', text: 'text-text-muted',  dot: 'bg-fg/[0.18]',label: 'Archivée'    },
}

// Style des barres selon la phase (pré/main/post)
function phaseClasses(phase: PhaseKind, status: CampaignStatus): string {
  if (phase === 'pre')  return 'bg-amber/10 border-amber/50 text-amber border-dashed'
  if (phase === 'post') return 'bg-purple/10 border-border-purple text-purple border-dashed'
  const s = STATUS_STYLE[status]
  return `${s.bg} ${s.border} ${s.text}`
}
function phasePrefix(phase: PhaseKind): string {
  return phase === 'pre' ? '⏮ ' : phase === 'post' ? '⏭ ' : ''
}
// ─── Helpers dates ──────────────────────────────────────────────────────────────

function parseDate(d: string | null): Date | null {
  if (!d) return null
  return new Date(d + 'T00:00:00')
}
function atMidnight(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysInMonth(year: number, month: number): number { return new Date(year, month + 1, 0).getDate() }
function startOfWeek(d: Date): Date { let dow = d.getDay() - 1; if (dow < 0) dow = 6; return addDays(atMidnight(d), -dow) }

// Construit toutes les phases datées de toutes les campagnes
function buildPhases(campaigns: DbCampaign[]): PhaseEvent[] {
  const out: PhaseEvent[] = []
  for (const c of campaigns) {
    const start = parseDate(c.start_date)
    const end   = parseDate(c.end_date)

    // Pré-campagne (span)
    if (c.pre_campaign_enabled) {
      const ps = parseDate(c.pre_campaign_start)
      const pe = parseDate(c.pre_campaign_end) ?? start
      if (ps) out.push({ key: `${c.id}-pre`, campaignId: c.id, title: c.name, status: c.status, phase: 'pre', start: ps, end: pe ?? ps })
    }

    // Campagne principale (span)
    if (start || end) {
      const s = start ?? end!
      const e = end ?? start!
      out.push({ key: `${c.id}-main`, campaignId: c.id, title: c.name, status: c.status, phase: 'main', start: s, end: e })
    }

    // Post-campagne (jalon : fin + N semaines)
    if (c.post_campaign_enabled && c.post_campaign_delay_weeks && end) {
      const trigger = addDays(end, c.post_campaign_delay_weeks * 7)
      out.push({ key: `${c.id}-post`, campaignId: c.id, title: c.name, status: c.status, phase: 'post', start: trigger, end: trigger })
    }
  }
  return out
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendrierView({ campaigns, serverNow }: { campaigns: DbCampaign[]; serverNow: number }) {
  const [nowMs, setNowMs] = useState(serverNow)
  const today = useMemo(() => atMidnight(new Date(nowMs)), [nowMs])

  const [month, setMonth] = useState(new Date(serverNow).getMonth())
  const [year,  setYear]  = useState(new Date(serverNow).getFullYear())
  const [view,  setView]  = useState<'month' | 'week'>('month')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(serverNow)))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Resync sur l'heure locale après le mount (corrige le fuseau, pas de mismatch d'hydratation)
  useEffect(() => {
    const n = Date.now()
    setNowMs(n)
    const d = new Date(n)
    setMonth(d.getMonth()); setYear(d.getFullYear())
    setWeekStart(startOfWeek(d))
  }, [])

  // Toutes les phases datées (le planning épuré n'a plus de filtre de statut)
  const phases = useMemo(() => buildPhases(campaigns), [campaigns])
  const phasesOnDay = (date: Date): PhaseEvent[] =>
    phases.filter((p) => p.start.getTime() <= date.getTime() && date.getTime() <= p.end.getTime())

  // ── Grille du mois ──
  const dim      = daysInMonth(year, month)
  const firstDow = (() => { let d = new Date(year, month, 1).getDay() - 1; return d < 0 ? 6 : d })()
  const totalCells = Math.ceil((firstDow + dim) / 7) * 7
  // Toutes les cellules sont des dates réelles (les jours hors-mois sont affichés grisés).
  // JS normalise les jours <1 ou >dim vers le mois précédent / suivant.
  const monthCells: Date[] = Array.from({ length: totalCells }, (_, i) => new Date(year, month, i - firstDow + 1))

  // ── Jours de la semaine ──
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // La semaine "appartient" au mois de son jeudi (milieu) → cohérent ISO
  function syncMonthToWeek(ws: Date) {
    const mid = addDays(ws, 3)
    setMonth(mid.getMonth()); setYear(mid.getFullYear())
  }
  function navPrev() {
    if (view === 'week') { const nw = addDays(weekStart, -7); setWeekStart(nw); syncMonthToWeek(nw) }
    else if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else { setMonth((m) => m - 1) }
  }
  function navNext() {
    if (view === 'week') { const nw = addDays(weekStart, 7); setWeekStart(nw); syncMonthToWeek(nw) }
    else if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else { setMonth((m) => m + 1) }
  }
  function goToday() {
    const n = new Date()
    setMonth(n.getMonth()); setYear(n.getFullYear()); setWeekStart(startOfWeek(n))
  }

  // Bascule de vue : en passant en Semaine, on aligne weekStart sur le mois consulté
  function changeView(v: 'month' | 'week') {
    if (v === 'week') {
      const ref = (month === today.getMonth() && year === today.getFullYear())
        ? today                       // mois courant → semaine d'aujourd'hui
        : new Date(year, month, 1)    // autre mois → première semaine du mois
      setWeekStart(startOfWeek(ref))
    }
    setView(v)
  }

  const headerLabel = view === 'week'
    ? `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} — ${addDays(weekStart, 6).getDate()} ${MONTHS[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getFullYear()}`
    : `${MONTHS[month]} ${year}`

  // ─── Render ───────────────────────────────────────────────────────────────

  function EventBar({ ev, cellDate }: { ev: PhaseEvent; cellDate: Date }) {
    const isFirst = sameDay(cellDate, ev.start)
    const isLast  = sameDay(cellDate, ev.end)
    return (
      <Link href={`/campaigns`} onClick={(e) => e.stopPropagation()}>
        <div className={`px-1.5 py-[3px] text-[10px] leading-tight font-sans font-bold truncate border ${phaseClasses(ev.phase, ev.status)}
          ${isFirst ? 'rounded-l-neo' : ''} ${isLast ? 'rounded-r-neo' : 'rounded-r-none border-r-0'} transition-opacity hover:opacity-80`}>
          {isFirst ? `${phasePrefix(ev.phase)}${ev.title}` : '·'}
        </div>
      </Link>
    )
  }

  return (
    <div className="-mx-8 -mb-8 -mt-6 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">

        {/* ── Header ── */}
        <header className="flex h-[56px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
          <h1 className="text-[17px] font-extrabold tracking-tight text-text-primary">Planning</h1>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="hidden font-sans text-[12px] font-bold text-text-muted rounded-[10px] px-3 py-1.5 hover:bg-fg/[0.06] hover:text-text-primary transition-colors sm:block">
              Aujourd'hui
            </button>
            <div className="flex items-center gap-1 rounded-[12px] bg-fg/[0.06] p-1">
              {([['week', 'Semaine', Calendar], ['month', 'Mois', CalendarDays]] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => changeView(v)}
                  className={`flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition-all ${view === v ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>
                  <Icon size={14} strokeWidth={2.5} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Corps scrollable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[980px] rounded-[18px] border border-border bg-fg/[0.02] p-3.5 sm:p-4 shadow-neo-sm">

            {/* Navigation */}
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <button onClick={navPrev} className="rounded-[10px] bg-accent px-3 py-1.5 font-sans text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105">
                Précédent
              </button>
              <div className="font-extrabold tracking-tight text-[16px] text-text-primary capitalize">{headerLabel}</div>
              <button onClick={navNext} className="rounded-[10px] bg-accent px-3 py-1.5 font-sans text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105">
                Suivant
              </button>
            </div>

            {/* En-têtes jours */}
            <div className="mb-2 grid grid-cols-7 gap-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center font-sans text-[12px] font-bold text-text-muted">{d}</div>
              ))}
            </div>

            {/* Vue Mois */}
            {view === 'month' && (
              <div className="grid grid-cols-7 gap-2">
                {monthCells.map((date, i) => {
                  const dayEvents = phasesOnDay(date)
                  const inMonth   = date.getMonth() === month
                  const todayCell = sameDay(date, today)
                  return (
                    <div key={i}
                      onClick={() => setSelectedDay(date)}
                      className={`group relative flex min-h-[82px] cursor-pointer flex-col rounded-[11px] border p-1.5 transition-all
                        ${todayCell
                          ? 'border-accent bg-accent/[0.06] shadow-neo-sm'
                          : inMonth
                            ? 'border-border bg-bg-card hover:border-border-strong hover:shadow-neo-sm'
                            : 'border-border/60 bg-fg/[0.02]'}`}>
                      <div className={`font-sans text-[13px] font-extrabold leading-none ${todayCell ? 'text-accent' : inMonth ? 'text-text-primary' : 'text-text-faint'}`}>
                        {date.getDate()}
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {dayEvents.slice(0, 3).map((ev) => <EventBar key={ev.key} ev={ev} cellDate={date} />)}
                        {dayEvents.length > 3 && (
                          <div className="font-sans text-[9px] font-bold text-text-muted px-1">+{dayEvents.length - 3} autres</div>
                        )}
                      </div>
                      {/* + Ajouter au survol */}
                      <Link
                        href={`/campaigns`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-center gap-1 rounded-[10px] border border-border bg-bg-card py-1.5 text-[11px] font-extrabold text-text-primary opacity-0 shadow-sm transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100">
                        <Plus size={12} strokeWidth={3} />
                        Ajouter
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Vue Semaine */}
            {view === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, i) => {
                  const dayEvents = phasesOnDay(date)
                  const todayCell = sameDay(date, today)
                  return (
                    <div key={i}
                      onClick={() => setSelectedDay(date)}
                      className={`group relative flex min-h-[280px] cursor-pointer flex-col rounded-[11px] border p-1.5 transition-all
                        ${todayCell ? 'border-accent bg-accent/[0.06] shadow-neo-sm' : 'border-border bg-bg-card hover:border-border-strong hover:shadow-neo-sm'}`}>
                      <div className={`font-sans text-[13px] font-extrabold leading-none ${todayCell ? 'text-accent' : 'text-text-primary'}`}>{date.getDate()}</div>
                      <div className="mt-2 flex flex-col gap-1">
                        {dayEvents.map((ev) => {
                          const isFirst = sameDay(date, ev.start)
                          return (
                            <Link key={ev.key} href={`/campaigns`} onClick={(e) => e.stopPropagation()}>
                              <div className={`px-1.5 py-1 text-[10px] font-sans font-bold border rounded-neo ${phaseClasses(ev.phase, ev.status)} transition-opacity hover:opacity-80`}>
                                <div className="truncate">{phasePrefix(ev.phase)}{ev.title}</div>
                                {isFirst && <div className="text-[9px] opacity-70 mt-0.5">{ev.phase === 'pre' ? 'Pré-campagne' : ev.phase === 'post' ? 'Post-campagne' : STATUS_STYLE[ev.status].label}</div>}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                      <Link
                        href={`/campaigns`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-center gap-1 rounded-[10px] border border-border bg-bg-card py-1.5 text-[11px] font-extrabold text-text-primary opacity-0 shadow-sm transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100">
                        <Plus size={12} strokeWidth={3} />
                        Ajouter
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      {/* ── Panneau du jour ── */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={() => setSelectedDay(null)}>
          <div className="w-full max-w-[420px] bg-bg-card border border-border rounded-neo-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-extrabold tracking-tight text-[15px] text-text-primary capitalize">
                {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <button onClick={() => setSelectedDay(null)} className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary">×</button>
            </div>
            <div className="p-5 flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {phasesOnDay(selectedDay).length === 0 ? (
                <p className="font-sans text-[11px] text-text-muted text-center py-4">Aucune campagne ce jour.</p>
              ) : (
                phasesOnDay(selectedDay).map((ev) => (
                  <Link key={ev.key} href={`/campaigns`} className="group block">
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-neo border ${phaseClasses(ev.phase, ev.status)} hover:opacity-80 transition-opacity`}>
                      <span className="text-sm">{ev.phase === 'pre' ? '⏮' : ev.phase === 'post' ? '⏭' : '●'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-[12px] font-bold truncate">{ev.title}</p>
                        <p className="font-sans text-[9px] opacity-70">{ev.phase === 'pre' ? 'Pré-campagne' : ev.phase === 'post' ? 'Post-campagne' : STATUS_STYLE[ev.status].label}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-border bg-fg/[0.03]">
              <Link href={`/campaigns`}>
                <Button fullWidth size="sm">+ Créer une campagne ce jour</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      </section>
    </div>
  )
}
