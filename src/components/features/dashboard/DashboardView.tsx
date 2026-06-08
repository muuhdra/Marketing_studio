'use client'

import Link from 'next/link'
import Card, { CardLabel, CardTitle, CardDesc } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─── Données statiques (pas encore en DB) ────────────────────────────────────

const analytics = [
  { label: 'UGC Vidéo',     count: 58, pct: 72, color: 'bg-accent'  },
  { label: 'Shooting',      count: 34, pct: 45, color: 'bg-purple'  },
  { label: 'Commercial',    count: 22, pct: 28, color: 'bg-teal'    },
  { label: 'Assets Visuels',count: 13, pct: 16, color: 'bg-coral'   },
]

const calDays = [
  { d: 28, prev: true }, { d: 29, prev: true }, { d: 30, prev: true },
  { d: 1 }, { d: 2, dot: true }, { d: 3 }, { d: 4 },
  { d: 5, dot: true }, { d: 6 }, { d: 7, dot: true }, { d: 8 }, { d: 9, dot: true }, { d: 10 }, { d: 11 },
  { d: 12, today: true }, { d: 13 }, { d: 14, dot: true }, { d: 15 }, { d: 16, dot: true }, { d: 17 }, { d: 18 },
  { d: 19 }, { d: 20, dot: true }, { d: 21 }, { d: 22 }, { d: 23 }, { d: 24 }, { d: 25 },
  { d: 26 }, { d: 27 }, { d: 28 }, { d: 29, next: true }, { d: 30, next: true }, { d: 31, next: true },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userName:        string
  totalCampaigns:  number
  activeCampaigns: number
  totalAvatars:    number
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardView({ userName, totalCampaigns, activeCampaigns, totalAvatars }: Props) {
  // Salutation dynamique selon l'heure
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir'

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const todayFmt = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-[13px] text-text-muted">
            Studio de production IA — {todayFmt}
          </p>
        </div>
        <Link href="/campagne/nouveau">
          <Button size="md">+ Créer une Campagne</Button>
        </Link>
      </div>

      {/* ── KPIs réels ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Campagnes total',  value: totalCampaigns,  color: 'text-accent',  border: 'border-accent',        shadow: 'shadow-neo',        link: '/campagnes'    },
          { label: 'Actives',          value: activeCampaigns, color: 'text-teal',    border: 'border-border-teal',   shadow: 'shadow-neo-teal',   link: '/campagnes'    },
          { label: 'Avatars créés',    value: totalAvatars,    color: 'text-purple',  border: 'border-border-purple', shadow: 'shadow-neo-purple', link: '/galerie'      },
          { label: 'Budget ce mois',   value: '$38.2',         color: 'text-amber',   border: 'border-amber/40',      shadow: '',                  link: '/budget'       },
        ].map((k) => (
          <Link key={k.label} href={k.link} className="block group">
            <div className={`bg-bg-card border-2 ${k.border} ${k.shadow} rounded-neo-lg p-4 transition-all duration-150 group-hover:-translate-x-px group-hover:-translate-y-px`}>
              <div className={`font-display font-bold text-[28px] leading-none mb-1 ${k.color}`}>
                {k.value}
              </div>
              <div className="font-mono text-[10px] text-text-dim">{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Hero cards — 3 colonnes ── */}
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">

        <Link href="/campagne/nouveau" className="block">
          <Card variant="accent" className="h-full group cursor-pointer">
            <div className="w-9 h-9 rounded-neo-md border-2 border-accent flex items-center justify-center mb-4 shadow-neo-sm">
              <div className="w-3 h-3 rounded-neo border-2 border-accent" />
            </div>
            <CardLabel>Workflow principal</CardLabel>
            <CardTitle>Créer une Campagne</CardTitle>
            <CardDesc>Lancez un nouveau pipeline — ADN, avatars, contenus structurés.</CardDesc>
            <div className="mt-4 font-mono text-xs font-bold text-accent">→ Démarrer</div>
          </Card>
        </Link>

        <Link href="/avatar-studio" className="block">
          <Card variant="purple" className="h-full cursor-pointer">
            <div className="w-9 h-9 rounded-neo-md border-2 border-border-purple flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full border-2 border-purple" />
            </div>
            <CardLabel>Personnages</CardLabel>
            <CardTitle>Avatar Studio</CardTitle>
            <CardDesc>Créez vos personas IA avec prompts JSON, garde-robe et environnements.</CardDesc>
            <div className="mt-4 font-mono text-xs font-bold text-purple">→ Ouvrir</div>
          </Card>
        </Link>

        <Link href="/creative-studio" className="block">
          <Card variant="coral" className="h-full cursor-pointer">
            <div className="w-9 h-9 rounded-neo-md border-2 border-border-coral flex items-center justify-center mb-4 font-bold text-coral text-base">
              ✦
            </div>
            <CardLabel>Génération libre</CardLabel>
            <CardTitle>Creative Studio</CardTitle>
            <CardDesc>Générez n'importe quel format de contenu sans lien direct à une campagne.</CardDesc>
            <div className="mt-4 font-mono text-xs font-bold text-coral">→ Créer</div>
          </Card>
        </Link>

      </div>

      {/* ── Deuxième ligne ── */}
      <div className="grid grid-cols-3 gap-3.5">

        {/* Avatars */}
        <Card>
          <CardLabel>Personnages</CardLabel>
          <CardTitle>Avatars & Continuité</CardTitle>
          {totalAvatars === 0 ? (
            <div className="mt-3 py-4 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-3">Aucun avatar créé</p>
              <Link href="/avatar-studio">
                <button className="font-mono text-[10px] font-bold text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  + Créer le premier
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-2.5 mt-3 flex-wrap">
              <Link href="/avatar-studio" className="w-[68px]">
                <div className="w-[68px] h-[68px] rounded-neo-md border-2 border-dashed border-border flex items-center justify-center mb-1.5 text-text-dim text-xl font-display hover:border-accent hover:text-accent transition-colors">
                  +
                </div>
                <div className="text-[10px] text-center text-text-dim">Ajouter</div>
              </Link>
            </div>
          )}
          <Link href="/galerie" className="block mt-3 font-mono text-xs font-bold text-accent hover:underline">
            → Voir la galerie ({totalAvatars})
          </Link>
        </Card>

        {/* Calendrier */}
        <Card>
          <CardLabel>Planning</CardLabel>
          <CardTitle>Calendrier Général</CardTitle>
          <div className="mt-2.5">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['L','M','M','J','V','S','D'].map((d, i) => (
                <div key={i} className="text-center font-mono text-[10px] text-text-dim py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, i) => (
                <div key={i} className={`
                  aspect-square rounded-neo flex items-center justify-center
                  font-mono text-[11px] cursor-pointer relative
                  ${day.today
                    ? 'bg-accent/15 text-accent font-bold border border-accent'
                    : day.prev || day.next
                      ? 'text-text-dim'
                      : 'text-text-muted hover:bg-white/5'
                  }
                `}>
                  {day.d}
                  {day.dot && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-purple" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <Link href="/calendrier" className="block mt-2 font-mono text-xs font-bold text-accent hover:underline">
            → Voir le calendrier complet
          </Link>
        </Card>

        {/* Analytics */}
        <Card>
          <CardLabel>Performance</CardLabel>
          <CardTitle>Optimisation Campagne</CardTitle>
          <div className="mb-4">
            <div className="font-display font-bold text-[26px] text-text-primary">127</div>
            <div className="font-mono text-[11px] text-text-dim">Contenus générés au total</div>
          </div>
          <div className="flex flex-col gap-2.5">
            {analytics.map((a) => (
              <div key={a.label} className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-text-muted w-[72px] flex-shrink-0">{a.label}</span>
                <div className="flex-1 h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div className={`h-full ${a.color} rounded-neo`} style={{ width: `${a.pct}%` }} />
                </div>
                <span className="font-mono text-[11px] font-bold text-text-secondary w-6 text-right">{a.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t-2 border-border">
            <div className="flex justify-between font-mono text-[11px] text-text-dim mb-1.5">
              <span>Budget IA ce mois</span>
              <span className="text-text-primary font-bold">38.20 / 50 USD</span>
            </div>
            <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
              <div className="h-full w-[76%] bg-accent rounded-neo" />
            </div>
          </div>
          <Link href="/analytics" className="block mt-3 font-mono text-xs font-bold text-accent hover:underline">
            → Voir l'analytics complet
          </Link>
        </Card>

      </div>
    </div>
  )
}
