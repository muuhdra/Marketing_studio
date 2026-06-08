'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

// ─── Data ────────────────────────────────────────────────────────────────────

// Providers via AIML API (même provider, usages différents)
const PROVIDERS = [
  { name: 'Kling v2.1 Pro',        role: 'Vidéo UGC & Commerciaux', usd: 18.60, pct: 42, color: 'bg-accent',  text: 'text-accent',  border: 'border-accent',         icon: '🎬' },
  { name: 'GPT-4o / Claude Opus',  role: 'Scripts, Copy, Stratégie', usd: 11.40, pct: 26, color: 'bg-purple', text: 'text-purple',  border: 'border-border-purple',  icon: '🧠' },
  { name: 'Flux Pro v1.1',         role: 'Visuels & Moodboards',     usd: 7.20,  pct: 16, color: 'bg-teal',   text: 'text-teal',    border: 'border-border-teal',    icon: '🖼️' },
  { name: 'ElevenLabs v2',         role: 'Voix Off & Avatar Audio',  usd: 7.00,  pct: 16, color: 'bg-coral',  text: 'text-coral',   border: 'border-border-coral',   icon: '🎙️' },
]

const HISTORY = [
  { month: 'Mai 2026',  total: 38.10, breakdown: { video: 16.20, text: 10.80, image: 6.50, voice: 4.60 }, delta: +5.2 },
  { month: 'Avr 2026',  total: 36.24, breakdown: { video: 15.40, text:  9.80, image: 6.00, voice: 5.04 }, delta: -2.1 },
  { month: 'Mar 2026',  total: 37.08, breakdown: { video: 15.70, text: 10.20, image: 6.20, voice: 4.98 }, delta: +8.7 },
]

const BUDGET_LIMIT = 100 // USD/mois

// ─── Component ───────────────────────────────────────────────────────────────

export default function BudgetView() {
  const [limitEdit, setLimitEdit] = useState(false)
  const [limit, setLimit]         = useState(BUDGET_LIMIT)
  const [draftLimit, setDraftLimit] = useState(String(BUDGET_LIMIT))

  const totalThisMonth = PROVIDERS.reduce((s, p) => s + p.usd, 0) // 38.20
  const pctUsed        = Math.round((totalThisMonth / limit) * 100)

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="nb-label mb-2">Consommation</p>
          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">
            Budget IA
          </h1>
        </div>
        <Button variant="secondary" size="sm">📤 Exporter CSV</Button>
      </div>

      {/* ── Résumé du mois ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total ce mois */}
        <div className="bg-bg-card border-2 border-accent shadow-neo rounded-neo-lg p-5">
          <p className="nb-label mb-2">Ce mois (Juin)</p>
          <div className="font-display font-bold text-[36px] text-accent leading-none mb-1">
            ${totalThisMonth.toFixed(2)}
          </div>
          <p className="font-mono text-[11px] text-text-dim">USD consommés</p>
        </div>

        {/* Budget alloué */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-2">Budget mensuel</p>
          {limitEdit ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-text-muted text-sm">$</span>
              <input
                type="number"
                value={draftLimit}
                onChange={(e) => setDraftLimit(e.target.value)}
                className="nb-input w-24 text-[18px] font-display font-bold py-1 px-2"
                autoFocus
              />
              <button
                onClick={() => { setLimit(Number(draftLimit) || limit); setLimitEdit(false) }}
                className="text-accent font-bold text-sm"
              >✓</button>
              <button onClick={() => setLimitEdit(false)} className="text-text-dim text-sm">✕</button>
            </div>
          ) : (
            <div
              className="font-display font-bold text-[36px] text-text-primary leading-none mb-1 cursor-pointer hover:text-accent transition-colors"
              onClick={() => setLimitEdit(true)}
              title="Cliquez pour modifier"
            >
              ${limit}
            </div>
          )}
          <p className="font-mono text-[11px] text-text-dim">Cliquez pour modifier</p>
        </div>

        {/* Solde restant */}
        <div className={`bg-bg-card border-2 rounded-neo-lg p-5 ${pctUsed > 80 ? 'border-coral shadow-neo-coral' : pctUsed > 60 ? 'border-amber/40' : 'border-teal shadow-neo-teal'}`}>
          <p className="nb-label mb-2">Solde restant</p>
          <div className={`font-display font-bold text-[36px] leading-none mb-1 ${pctUsed > 80 ? 'text-coral' : pctUsed > 60 ? 'text-amber' : 'text-teal'}`}>
            ${(limit - totalThisMonth).toFixed(2)}
          </div>
          <p className="font-mono text-[11px] text-text-dim">{pctUsed}% consommé</p>
        </div>
      </div>

      {/* ── Barre de consommation globale ── */}
      <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-mono text-[11px] font-bold text-text-secondary">Consommation mensuelle</span>
          <span className={`font-mono text-[11px] font-bold ${pctUsed > 80 ? 'text-coral' : 'text-text-secondary'}`}>
            ${totalThisMonth.toFixed(2)} / ${limit}
          </span>
        </div>
        <div className="h-3 bg-bg-base border border-border rounded-neo overflow-hidden">
          <div
            className={`h-full rounded-neo transition-all duration-700 ${pctUsed > 80 ? 'bg-coral' : pctUsed > 60 ? 'bg-amber' : 'bg-accent'}`}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
        {pctUsed > 80 && (
          <p className="font-mono text-[11px] text-coral mt-2">⚠ Attention — plus de 80% du budget consommé</p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5">

        {/* ── Répartition par provider ── */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
          <p className="nb-label mb-5">Répartition par Provider</p>
          <div className="flex flex-col gap-4">
            {PROVIDERS.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{p.icon}</span>
                    <div>
                      <span className={`font-mono text-[12px] font-bold ${p.text}`}>{p.name}</span>
                      <span className="font-mono text-[10px] text-text-dim ml-2">{p.role}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-display font-bold text-[15px] ${p.text}`}>${p.usd.toFixed(2)}</span>
                    <span className="font-mono text-[10px] text-text-dim ml-1.5">{p.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div
                    className={`h-full rounded-neo transition-all duration-500 ${p.color}`}
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Historique ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
            <p className="nb-label mb-4">Historique mensuel</p>
            <div className="flex flex-col gap-3">
              {HISTORY.map((h) => (
                <div key={h.month} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div>
                    <p className="font-mono text-[12px] font-bold text-text-primary">{h.month}</p>
                    <p className="font-mono text-[10px] text-text-dim mt-0.5">
                      Vidéo ${h.breakdown.video} · Texte ${h.breakdown.text}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-[15px] text-text-primary">${h.total.toFixed(2)}</p>
                    <p className={`font-mono text-[10px] ${h.delta > 0 ? 'text-coral' : 'text-teal'}`}>
                      {h.delta > 0 ? '+' : ''}{h.delta}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes budgétaires */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
            <p className="nb-label mb-4">Alertes</p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Alerte à 80%',   active: true,  color: 'border-accent text-accent' },
                { label: 'Alerte à 100%',  active: true,  color: 'border-coral text-coral'   },
                { label: 'Rapport hebdo',  active: false, color: 'border-border text-text-muted' },
              ].map((a) => (
                <div key={a.label} className={`flex items-center justify-between border rounded-neo px-3 py-2.5 ${a.active ? a.color.split(' ')[0] + ' bg-accent/5' : 'border-border'}`}>
                  <span className={`font-mono text-[11px] font-bold ${a.active ? a.color.split(' ')[1] : 'text-text-muted'}`}>
                    {a.label}
                  </span>
                  <div className={`w-8 h-4 rounded-neo border-2 transition-all flex-shrink-0 relative ${a.active ? 'bg-accent border-accent' : 'bg-bg-base border-border'}`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-neo transition-all ${a.active ? 'left-[17px] bg-bg-base' : 'left-[1px] bg-text-dim'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
