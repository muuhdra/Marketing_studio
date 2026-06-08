'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ─── Types (mirror du schema Drizzle) ────────────────────────────────────────

type CampaignStatus = 'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  campaign_type: 'generale' | 'speciale'
  start_date: string | null
  end_date: string | null
  pre_campaign_enabled: boolean
  post_campaign_enabled: boolean
  created_at: Date | string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusToDisplay(s: CampaignStatus): 'active' | 'pre' | 'done' | 'draft' | 'post' {
  if (s === 'active')        return 'active'
  if (s === 'pre_campaign')  return 'pre'
  if (s === 'post_campaign') return 'post'
  if (s === 'archived')      return 'done'
  return 'draft'
}

function subtitleFor(c: Campaign) {
  const type = c.campaign_type === 'generale' ? 'Générale' : 'Spéciale'
  const parts: string[] = [type]
  if (c.pre_campaign_enabled)  parts.push('Pré-campagne')
  if (c.post_campaign_enabled) parts.push('Post-campagne')
  return parts.join(' · ')
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  campaigns: Campaign[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampagnesListView({ campaigns }: Props) {
  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="nb-label mb-3">Projets actifs</p>
          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">
            Campagnes
          </h1>
        </div>
        <Link href="/campagne/nouveau">
          <Button variant="accent-outline" size="sm">+ Nouvelle</Button>
        </Link>
      </div>

      {/* ── Empty state ── */}
      {campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-neo-md border-2 border-border flex items-center justify-center text-2xl text-text-dim mb-5">
            📭
          </div>
          <p className="font-display font-bold text-[16px] text-text-primary mb-2">
            Aucune campagne pour l'instant
          </p>
          <p className="font-mono text-[12px] text-text-dim mb-6">
            Créez votre première campagne pour commencer.
          </p>
          <Link href="/campagne/nouveau">
            <Button size="sm">+ Créer une campagne</Button>
          </Link>
        </div>
      )}

      {/* ── Grille ── */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campagne/${c.id}`} className="block group">
              <div className="
                relative flex flex-col justify-between
                bg-bg-card border-2 border-border rounded-neo-lg
                p-7 min-h-[190px] overflow-hidden
                transition-all duration-150
                group-hover:border-border-strong group-hover:shadow-neo-white
                group-hover:-translate-x-px group-hover:-translate-y-px
              ">

                {/* Top row */}
                <div className="flex items-center justify-between mb-5">
                  <StatusBadge status={statusToDisplay(c.status)} />
                  <span className="font-mono text-[10px] text-text-dim">
                    {c.campaign_type === 'generale' ? 'Générale' : 'Spéciale'}
                  </span>
                </div>

                {/* Titre */}
                <div>
                  <h3 className="font-display font-bold text-[20px] text-text-primary tracking-tight mb-2 leading-tight">
                    {c.name}
                  </h3>
                  <p className="text-[13px] text-text-muted font-medium">{subtitleFor(c)}</p>
                </div>

                {/* Footer dates */}
                <div className="mt-5 pt-4 border-t-2 border-border">
                  <div className="flex justify-between font-mono text-[10px] text-text-dim">
                    <span>
                      {c.start_date
                        ? new Date(c.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Dates non définies'}
                    </span>
                    {c.end_date && (
                      <span className="font-bold text-text-secondary">
                        → {new Date(c.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="
                  absolute bottom-4 right-5
                  font-mono text-[11px] font-bold text-text-dim
                  transition-all duration-150
                  group-hover:text-accent group-hover:translate-x-0.5
                ">
                  →
                </div>
              </div>
            </Link>
          ))}

          {/* New campaign card */}
          <Link href="/campagne/nouveau" className="block group">
            <div className="
              flex flex-col items-center justify-center
              bg-bg-surface border-2 border-dashed border-border rounded-neo-lg
              p-7 min-h-[190px]
              transition-all duration-150
              group-hover:border-accent group-hover:bg-accent/5
              group-hover:-translate-x-px group-hover:-translate-y-px
            ">
              <div className="
                w-10 h-10 rounded-neo-md border-2 border-border
                flex items-center justify-center mb-3
                font-display text-xl text-text-dim
                group-hover:border-accent group-hover:text-accent
                transition-colors duration-150
              ">+</div>
              <span className="font-mono text-xs font-bold text-text-dim group-hover:text-accent transition-colors">
                Nouvelle campagne
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
