'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
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

interface UpcomingItem {
  date:         Date
  label:        string
  campaignId:   string
  campaignName: string
  status:       CampaignStatus
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const STATUS_STYLE: Record<CampaignStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  draft:         { bg: 'bg-bg-elevated',  border: 'border-border',        text: 'text-text-dim',  dot: 'bg-border',   label: 'Brouillon'   },
  pre_campaign:  { bg: 'bg-amber/10',     border: 'border-amber/50',      text: 'text-amber',     dot: 'bg-amber',    label: 'Pré-camp.'   },
  active:        { bg: 'bg-accent/15',    border: 'border-accent',        text: 'text-accent',    dot: 'bg-accent',   label: 'Active'      },
  post_campaign: { bg: 'bg-teal/10',      border: 'border-border-teal',   text: 'text-teal',      dot: 'bg-teal',     label: 'Post-camp.'  },
  archived:      { bg: 'bg-bg-base',      border: 'border-fg/40',     text: 'text-text-dim',  dot: 'bg-fg/[0.08]',label: 'Archivée'    },
}

const FILTERABLE: CampaignStatus[] = ['draft', 'pre_campaign', 'active', 'post_campaign', 'archived']

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
function phaseDotClass(phase: PhaseKind, status: CampaignStatus): string {
  if (phase === 'pre')  return 'bg-amber'
  if (phase === 'post') return 'bg-purple'
  return STATUS_STYLE[status].dot
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

// Prochains jalons (30 prochains jours) — début/fin de campagne
function buildUpcoming(campaigns: DbCampaign[], nowMs: number): UpcomingItem[] {
  const future = nowMs + 30 * 86_400_000
  const items: UpcomingItem[] = []
  for (const c of campaigns) {
    if (c.status === 'archived') continue
    const start = parseDate(c.start_date)
    const end   = parseDate(c.end_date)
    if (start && start.getTime() >= nowMs && start.getTime() <= future) {
      items.push({ date: start, label: 'Lancement', campaignId: c.id, campaignName: c.name, status: c.status })
    }
    if (end && end.getTime() >= nowMs && end.getTime() <= future) {
      items.push({ date: end, label: 'Fin', campaignId: c.id, campaignName: c.name, status: c.status })
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CalendrierView({ campaigns, serverNow }: { campaigns: DbCampaign[]; serverNow: number }) {
  const [nowMs, setNowMs] = useState(serverNow)
  const today = useMemo(() => atMidnight(new Date(nowMs)), [nowMs])

  const [month, setMonth] = useState(new Date(serverNow).getMonth())
  const [year,  setYear]  = useState(new Date(serverNow).getFullYear())
  const [view,  setView]  = useState<'month' | 'week' | 'list'>('month')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(serverNow)))
  // Archivées masquées par défaut (chip dispo pour les réafficher) → planning plus propre
  const [visible, setVisible]     = useState<Set<CampaignStatus>>(() => new Set(FILTERABLE.filter((s) => s !== 'archived')))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Resync sur l'heure locale après le mount (corrige le fuseau, pas de mismatch d'hydratation)
  useEffect(() => {
    const n = Date.now()
    setNowMs(n)
    const d = new Date(n)
    setMonth(d.getMonth()); setYear(d.getFullYear())
    setWeekStart(startOfWeek(d))
  }, [])

  // Phases visibles (filtrées par statut)
  const phases = useMemo(
    () => buildPhases(campaigns).filter((p) => visible.has(p.status)),
    [campaigns, visible],
  )
  const phasesOnDay = (date: Date): PhaseEvent[] =>
    phases.filter((p) => p.start.getTime() <= date.getTime() && date.getTime() <= p.end.getTime())

  // Jalons à venir (filtrés par statut visible)
  const upcoming = useMemo(
    () => buildUpcoming(campaigns, nowMs).filter((u) => visible.has(u.status)),
    [campaigns, nowMs, visible],
  )

  // Stats du mois
  const stats = useMemo(() => {
    const monthEvts = phases.filter((p) =>
      (p.start.getFullYear() < year || (p.start.getFullYear() === year && p.start.getMonth() <= month)) &&
      (p.end.getFullYear()   > year || (p.end.getFullYear()   === year && p.end.getMonth()   >= month))
    ).length
    const active  = campaigns.filter((c) => c.status === 'active' && visible.has('active')).length
    const hasDate = campaigns.filter((c) => c.start_date || c.end_date).length
    const withEnd = campaigns.filter((c) => {
      const e = parseDate(c.end_date)
      return e && e.getMonth() === month && e.getFullYear() === year
    }).length
    return { monthEvts, active, hasDate, withEnd }
  }, [phases, campaigns, month, year, visible])

  // ── Grille du mois ──
  const dim      = daysInMonth(year, month)
  const firstDow = (() => { let d = new Date(year, month, 1).getDay() - 1; return d < 0 ? 6 : d })()
  const totalCells = Math.ceil((firstDow + dim) / 7) * 7
  const monthCells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDow + 1
    return day >= 1 && day <= dim ? new Date(year, month, day) : null
  })

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
  function changeView(v: 'month' | 'week' | 'list') {
    if (v === 'week') {
      const ref = (month === today.getMonth() && year === today.getFullYear())
        ? today                       // mois courant → semaine d'aujourd'hui
        : new Date(year, month, 1)    // autre mois → première semaine du mois
      setWeekStart(startOfWeek(ref))
    }
    setView(v)
  }

  function toggleStatus(s: CampaignStatus) {
    setVisible((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  const headerLabel = view === 'week'
    ? `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} — ${addDays(weekStart, 6).getDate()} ${MONTHS[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getFullYear()}`
    : `${MONTHS[month]} ${year}`

  // Liste : phases du mois courant triées
  const monthPhases = useMemo(
    () => phases
      .filter((p) => p.end.getFullYear() > year || (p.end.getFullYear() === year && p.end.getMonth() >= month))
      .filter((p) => p.start.getFullYear() < year || (p.start.getFullYear() === year && p.start.getMonth() <= month))
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [phases, month, year],
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  function EventBar({ ev, cellDate }: { ev: PhaseEvent; cellDate: Date }) {
    const isFirst = sameDay(cellDate, ev.start)
    const isLast  = sameDay(cellDate, ev.end)
    return (
      <Link href={`/campagne/${ev.campaignId}`} onClick={(e) => e.stopPropagation()}>
        <div className={`px-1 py-0.5 text-[8px] font-sans font-bold truncate border ${phaseClasses(ev.phase, ev.status)}
          ${isFirst ? 'rounded-l-neo' : ''} ${isLast ? 'rounded-r-neo' : 'rounded-r-none border-r-0'} transition-opacity hover:opacity-80`}>
          {isFirst ? `${phasePrefix(ev.phase)}${ev.title}` : '·'}
        </div>
      </Link>
    )
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <p className="nb-label mb-2">Planning</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">Calendrier</h1>
          <p className="text-[13px] text-text-muted mt-1">
            {campaigns.length > 0
              ? `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} · ${upcoming.length} jalon${upcoming.length > 1 ? 's' : ''} à venir`
              : 'Aucune campagne — créez votre première pour voir les jalons'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="font-sans text-[11px] font-bold text-text-dim border border-border rounded-neo px-3 py-1.5 hover:border-accent hover:text-accent transition-colors">
            Aujourd'hui
          </button>
          <div className="flex border border-border rounded-neo overflow-hidden">
            {(['month', 'week', 'list'] as const).map((v) => (
              <button key={v} onClick={() => changeView(v)}
                className={`px-3 py-1.5 font-sans text-[11px] font-bold transition-all ${view === v ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary hover:bg-fg/5'}`}>
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Liste'}
              </button>
            ))}
          </div>
          <Link href="/campagne/nouveau"><Button size="sm">+ Campagne</Button></Link>
        </div>
      </div>

      {/* ── Filtres statut ── */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <span className="font-sans text-[9px] text-text-dim uppercase tracking-wider mr-1">Filtres</span>
        {FILTERABLE.map((s) => {
          const on = visible.has(s)
          const st = STATUS_STYLE[s]
          return (
            <button key={s} onClick={() => toggleStatus(s)}
              className={`flex items-center gap-1.5 font-sans text-[9px] font-bold border rounded-neo px-2 py-1 transition-all
                ${on ? `${st.border} ${st.text}` : 'border-border text-text-dim/50 opacity-60'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${on ? st.dot : 'bg-border'}`} />
              {st.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5">

        {/* ── Calendrier principal ── */}
        <div className="bg-bg-card border border-border rounded-neo-lg overflow-hidden">

          {/* Navigation */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <button onClick={navPrev} className="w-8 h-8 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-accent transition-colors font-bold">←</button>
            <div className="font-display font-bold text-[15px] text-text-primary capitalize">{headerLabel}</div>
            <button onClick={navNext} className="w-8 h-8 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-accent transition-colors font-bold">→</button>
          </div>

          {/* Vue Mois */}
          {view === 'month' && (
            <>
              <div className="grid grid-cols-7 border-b border-fg/50">
                {DAYS.map((d) => (
                  <div key={d} className="py-2 text-center font-sans text-[9px] font-bold text-text-dim uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells.map((date, i) => {
                  const dayEvents = date ? phasesOnDay(date) : []
                  const isLastCol = (i + 1) % 7 === 0
                  const todayCell = date ? sameDay(date, today) : false
                  return (
                    <div key={i}
                      onClick={() => date && setSelectedDay(date)}
                      className={`min-h-[88px] border-b border-r border-fg/30 p-1.5
                        ${isLastCol ? 'border-r-0' : ''}
                        ${!date ? 'bg-bg-base/30' : todayCell ? 'bg-accent/5 cursor-pointer' : 'hover:bg-fg/[0.015] cursor-pointer'}`}>
                      {date && (
                        <>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-neo mb-1 font-sans text-[10px] font-bold ${todayCell ? 'bg-accent text-bg-base' : 'text-text-dim'}`}>
                            {date.getDate()}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {dayEvents.slice(0, 3).map((ev) => <EventBar key={ev.key} ev={ev} cellDate={date} />)}
                            {dayEvents.length > 3 && (
                              <div className="font-sans text-[8px] text-text-dim px-1">+{dayEvents.length - 3}</div>
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

          {/* Vue Semaine */}
          {view === 'week' && (
            <div className="grid grid-cols-7 min-h-[420px]">
              {weekDays.map((date, i) => {
                const dayEvents = phasesOnDay(date)
                const todayCell = sameDay(date, today)
                return (
                  <div key={i}
                    onClick={() => setSelectedDay(date)}
                    className={`border-r border-fg/30 last:border-r-0 p-2 cursor-pointer transition-colors ${todayCell ? 'bg-accent/5' : 'hover:bg-fg/[0.015]'}`}>
                    <div className="text-center mb-2">
                      <div className="font-sans text-[9px] text-text-dim uppercase">{DAYS[i]}</div>
                      <div className={`font-display font-bold text-[15px] ${todayCell ? 'text-accent' : 'text-text-secondary'}`}>{date.getDate()}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayEvents.map((ev) => {
                        const isFirst = sameDay(date, ev.start)
                        return (
                          <Link key={ev.key} href={`/campagne/${ev.campaignId}`} onClick={(e) => e.stopPropagation()}>
                            <div className={`px-1.5 py-1 text-[9px] font-sans font-bold border rounded-neo ${phaseClasses(ev.phase, ev.status)} transition-opacity hover:opacity-80`}>
                              <div className="truncate">{phasePrefix(ev.phase)}{ev.title}</div>
                              {isFirst && <div className="text-[7px] opacity-70 mt-0.5">{ev.phase === 'pre' ? 'Pré-campagne' : ev.phase === 'post' ? 'Post-campagne' : STATUS_STYLE[ev.status].label}</div>}
                            </div>
                          </Link>
                        )
                      })}
                      {dayEvents.length === 0 && <div className="font-sans text-[8px] text-text-dim/40 text-center py-2">—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Vue Liste */}
          {view === 'list' && (
            <div className="divide-y divide-border/40">
              {monthPhases.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-sans text-[12px] text-text-dim mb-1">Aucune campagne planifiée ce mois</p>
                  <p className="font-sans text-[10px] text-text-dim">Ajoutez des dates à vos campagnes, ou ajustez les filtres.</p>
                </div>
              ) : (
                monthPhases.map((ev) => {
                  const days = Math.round((ev.end.getTime() - ev.start.getTime()) / 86_400_000) + 1
                  return (
                    <Link key={ev.key} href={`/campagne/${ev.campaignId}`} className="group block">
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-elevated transition-colors">
                        <div className="w-24 flex-shrink-0">
                          <p className="font-sans text-[10px] font-bold text-text-muted">{ev.start.getDate()} {MONTHS[ev.start.getMonth()].slice(0, 3)}</p>
                          {!sameDay(ev.start, ev.end) && <p className="font-sans text-[9px] text-text-dim">→ {ev.end.getDate()} {MONTHS[ev.end.getMonth()].slice(0, 3)}</p>}
                        </div>
                        <div className={`w-1 self-stretch rounded-full ${phaseDotClass(ev.phase, ev.status)} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-[12px] font-bold text-text-primary truncate group-hover:text-accent transition-colors">{phasePrefix(ev.phase)}{ev.title}</p>
                          <p className="font-sans text-[10px] text-text-dim">{ev.phase === 'pre' ? 'Pré-campagne' : ev.phase === 'post' ? 'Post-campagne' : `${days} jour${days > 1 ? 's' : ''}`}</p>
                        </div>
                        <span className={`font-sans text-[9px] font-bold border rounded px-2 py-0.5 flex-shrink-0 ${STATUS_STYLE[ev.status].border} ${STATUS_STYLE[ev.status].text}`}>
                          {STATUS_STYLE[ev.status].label}
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

          {/* Stats */}
          <div className="bg-bg-card border border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Ce mois · {MONTHS[month]}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Sur le cal.',  value: stats.monthEvts, color: 'text-accent' },
                { label: 'Actives',      value: stats.active,    color: 'text-teal'   },
                { label: 'Se terminent', value: stats.withEnd,   color: 'text-coral'  },
                { label: 'Avec dates',   value: stats.hasDate,   color: 'text-purple' },
              ].map((s) => (
                <div key={s.label} className="bg-bg-surface border border-border rounded-neo p-2 text-center">
                  <div className={`font-display font-bold text-[22px] leading-none mb-0.5 ${s.color}`}>{s.value}</div>
                  <div className="font-sans text-[8px] text-text-dim">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prochains jalons */}
          <div className="bg-bg-card border border-border rounded-neo-lg p-4 flex-1">
            <p className="nb-label mb-3">Prochains jalons · 30j</p>
            {upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <p className="font-sans text-[11px] text-text-dim mb-1">Aucun jalon à venir</p>
                <p className="font-sans text-[9px] text-text-dim">Ajoutez des dates de début/fin à vos campagnes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {upcoming.slice(0, 8).map((u, i) => {
                  const s = STATUS_STYLE[u.status]
                  const dateStr = u.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  const daysFromNow = Math.ceil((u.date.getTime() - nowMs) / 86_400_000)
                  return (
                    <Link key={i} href={`/campagne/${u.campaignId}`} className="group block">
                      <div className={`flex items-start gap-3 py-2.5 ${i < Math.min(upcoming.length, 8) - 1 ? 'border-b border-fg/30' : ''}`}>
                        <div className="flex-shrink-0 w-10 text-right">
                          <p className="font-sans text-[9px] font-bold text-text-muted">{dateStr}</p>
                          <p className="font-sans text-[8px] text-text-dim">J-{daysFromNow}</p>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-[10px] font-bold text-text-primary truncate group-hover:text-accent transition-colors leading-tight">{u.campaignName}</p>
                          <p className={`font-sans text-[8px] font-bold ${s.text}`}>{u.label}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {upcoming.length > 8 && (
                  <p className="font-sans text-[9px] text-text-dim pt-2 text-center">+ {upcoming.length - 8} autres jalons</p>
                )}
              </div>
            )}
          </div>

          {/* Légende */}
          <div className="bg-bg-card border border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Légende</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-amber/10 border-amber/50 border-dashed flex-shrink-0" />
                <span className="font-sans text-[10px] text-text-muted">⏮ Pré-campagne</span>
              </div>
              {(['active', 'pre_campaign', 'post_campaign', 'draft'] as CampaignStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded flex-shrink-0 border ${STATUS_STYLE[s].bg} ${STATUS_STYLE[s].border}`} />
                  <span className="font-sans text-[10px] text-text-muted">{STATUS_STYLE[s].label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border bg-purple/10 border-border-purple border-dashed flex-shrink-0" />
                <span className="font-sans text-[10px] text-text-muted">Post-campagne</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panneau du jour ── */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={() => setSelectedDay(null)}>
          <div className="w-full max-w-[420px] bg-bg-card border border-border rounded-neo-lg overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-display font-bold text-[15px] text-text-primary capitalize">
                {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <button onClick={() => setSelectedDay(null)} className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary">×</button>
            </div>
            <div className="p-5 flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {phasesOnDay(selectedDay).length === 0 ? (
                <p className="font-sans text-[11px] text-text-dim text-center py-4">Aucune campagne ce jour.</p>
              ) : (
                phasesOnDay(selectedDay).map((ev) => (
                  <Link key={ev.key} href={`/campagne/${ev.campaignId}`} className="group block">
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
            <div className="px-5 py-4 border-t border-border bg-bg-surface">
              <Link href={`/campagne/nouveau?start=${dayKey(selectedDay)}`}>
                <Button fullWidth size="sm">+ Créer une campagne ce jour</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
