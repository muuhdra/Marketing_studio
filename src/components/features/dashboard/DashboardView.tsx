'use client'

import Link from 'next/link'
import Card, { CardLabel, CardTitle, CardDesc } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useMediaStore, typeIcon, engineLabel } from '@/lib/stores/mediaStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCampaign {
  id:            string
  name:          string
  status:        'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'
  campaign_type: 'generale' | 'speciale'
  start_date:    string | null
  end_date:      string | null
  created_at:    Date | string
}

interface DbAvatar {
  id:              string
  name:            string
  age:             number | null
  ethnicity:       string | null
  style_tags:      string[] | null
  continuity_mode: 'evolutif' | 'verrouille'
  status:          'draft' | 'active' | 'archived'
  created_at:      Date | string
}

interface Props {
  userName:        string
  campaigns:       DbCampaign[]
  avatars:         DbAvatar[]
  activeCampaigns: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<DbCampaign['status'], string> = {
  draft:         'Brouillon',
  pre_campaign:  'Pré-camp.',
  active:        'Active',
  post_campaign: 'Post-camp.',
  archived:      'Archivée',
}

const STATUS_COLOR: Record<DbCampaign['status'], string> = {
  draft:         'text-text-dim border-border',
  pre_campaign:  'text-amber border-amber/40',
  active:        'text-teal border-border-teal',
  post_campaign: 'text-purple border-purple/40',
  archived:      'text-text-dim border-border opacity-50',
}

const AVATAR_COLORS = [
  'border-purple   bg-purple/10   text-purple',
  'border-border-teal bg-teal/10  text-teal',
  'border-border-coral bg-coral/10 text-coral',
  'border-pink/40  bg-pink/10     text-pink',
  'border-accent   bg-accent/10   text-accent',
]

// Génère les jours du mois courant
function buildCalendar(campaignDates: { start: Date | null; end: Date | null }[]) {
  const today = new Date()
  const year  = today.getFullYear()
  const month = today.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Jour de semaine du 1er (lundi = 0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: { d: number; prev?: boolean; next?: boolean; today?: boolean; dot?: boolean }[] = []

  // Jours du mois précédent
  const prevMonth = new Date(year, month, 0)
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ d: prevMonth.getDate() - i, prev: true })
  }

  // Jours du mois courant
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const isToday = d === today.getDate()
    // Dot si une campagne commence ou se termine ce jour
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dot = campaignDates.some(({ start, end }) =>
      (start && start.toISOString().slice(0, 10) === dateStr) ||
      (end   && end.toISOString().slice(0, 10)   === dateStr)
    )
    days.push({ d, today: isToday, dot })
  }

  // Compléter jusqu'à 35 ou 42 cases
  const total = days.length <= 35 ? 35 : 42
  let nextD = 1
  while (days.length < total) {
    days.push({ d: nextD++, next: true })
  }

  return days
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardView({ userName, campaigns, avatars, activeCampaigns }: Props) {
  const assets       = useMediaStore((s) => s.assets)
  const recentAssets = assets.slice(0, 4)

  const hour     = new Date().getHours()
  const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir'

  const today    = new Date()
  const todayFmt = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const recentCampaigns = campaigns.slice(0, 4)

  // Dates de campagnes pour le calendrier
  const campaignDates = campaigns.map((c) => ({
    start: c.start_date ? new Date(c.start_date) : null,
    end:   c.end_date   ? new Date(c.end_date)   : null,
  }))
  const calDays = buildCalendar(campaignDates)

  const monthLabel = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-[13px] text-text-muted capitalize">
            {todayFmt}
          </p>
        </div>
        <Link href="/campagne/nouveau">
          <Button size="md">+ Créer une Campagne</Button>
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label:  'Campagnes',
            value:  campaigns.length,
            sub:    `${activeCampaigns} active${activeCampaigns > 1 ? 's' : ''}`,
            color:  'text-accent',
            border: 'border-accent',
            shadow: 'shadow-neo',
            link:   '/campagnes',
          },
          {
            label:  'En cours',
            value:  activeCampaigns,
            sub:    activeCampaigns > 0 ? 'pipeline actif' : 'aucune active',
            color:  'text-teal',
            border: 'border-border-teal',
            shadow: 'shadow-neo-teal',
            link:   '/campagnes',
          },
          {
            label:  'Avatars',
            value:  avatars.length,
            sub:    avatars.filter((a) => a.status === 'active').length + ' actif(s)',
            color:  'text-purple',
            border: 'border-border-purple',
            shadow: 'shadow-neo-purple',
            link:   '/galerie',
          },
          {
            label:  'Assets générés',
            value:  assets.length,
            sub:    assets.length > 0
              ? `${assets.filter((a) => a.type === 'image').length} img · ${assets.filter((a) => a.type === 'video').length} vid`
              : 'aucun encore',
            color:  'text-amber',
            border: 'border-amber/40',
            shadow: '',
            link:   '/galerie',
          },
        ].map((k) => (
          <Link key={k.label} href={k.link} className="block group">
            <div className={`bg-bg-card border-2 ${k.border} ${k.shadow} rounded-neo-lg p-4 transition-all duration-150 group-hover:-translate-x-px group-hover:-translate-y-px`}>
              <div className={`font-display font-bold text-[30px] leading-none mb-1 ${k.color}`}>
                {k.value}
              </div>
              <div className="font-mono text-[10px] font-bold text-text-dim mb-0.5">{k.label}</div>
              <div className="font-mono text-[9px] text-text-dim">{k.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Hero cards ── */}
      <div className="grid grid-cols-3 gap-3.5 mb-3.5">
        <Link href="/campagne/nouveau" className="block">
          <Card variant="accent" className="h-full cursor-pointer">
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
            <div className="w-9 h-9 rounded-neo-md border-2 border-border-coral flex items-center justify-center mb-4 font-bold text-coral text-base">✦</div>
            <CardLabel>Génération libre</CardLabel>
            <CardTitle>Creative Studio</CardTitle>
            <CardDesc>Générez n'importe quel format de contenu sans lien direct à une campagne.</CardDesc>
            <div className="mt-4 font-mono text-xs font-bold text-coral">→ Créer</div>
          </Card>
        </Link>
      </div>

      {/* ── Deuxième ligne ── */}
      <div className="grid grid-cols-3 gap-3.5">

        {/* ── Campagnes récentes ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardLabel>Pipeline</CardLabel>
              <CardTitle>Campagnes récentes</CardTitle>
            </div>
            <Link href="/campagnes" className="font-mono text-[10px] text-accent hover:underline">
              Tout voir →
            </Link>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="py-6 text-center">
              <p className="font-mono text-[11px] text-text-dim mb-3">Aucune campagne pour l'instant</p>
              <Link href="/campagne/nouveau">
                <button className="font-mono text-[10px] font-bold text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  + Créer la première
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentCampaigns.map((c, i) => (
                <Link key={c.id} href={`/campagne/${c.id}`} className="group block">
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-neo border-2 border-border bg-bg-surface
                    group-hover:border-accent/40 group-hover:bg-accent/5 transition-all duration-100`}>
                    {/* Numéro */}
                    <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-mono text-[9px] font-bold text-text-dim">
                      {i + 1}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] font-bold text-text-primary truncate">{c.name}</p>
                      <p className="font-mono text-[9px] text-text-dim">
                        {c.campaign_type === 'generale' ? 'Générale' : 'Spéciale'}
                        {c.start_date ? ` · ${new Date(c.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </div>
                    {/* Status */}
                    <span className={`font-mono text-[8px] font-bold border rounded px-1.5 py-0.5 flex-shrink-0 ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                </Link>
              ))}

              {campaigns.length > 4 && (
                <Link href="/campagnes" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors text-center py-1">
                  + {campaigns.length - 4} autres campagnes
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* ── Calendrier dynamique ── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <CardLabel>Planning</CardLabel>
              <CardTitle className="capitalize">{monthLabel}</CardTitle>
            </div>
            <Link href="/calendrier" className="font-mono text-[10px] text-accent hover:underline">
              Complet →
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <div key={i} className="text-center font-mono text-[9px] text-text-dim py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((day, i) => (
              <div key={i} className={`
                aspect-square rounded-neo flex items-center justify-center
                font-mono text-[10px] cursor-default relative select-none
                ${day.today
                  ? 'bg-accent/15 text-accent font-bold border border-accent'
                  : day.prev || day.next
                    ? 'text-text-dim/40'
                    : 'text-text-muted hover:bg-white/5'
                }
              `}>
                {day.d}
                {day.dot && !day.prev && !day.next && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal" />
                )}
              </div>
            ))}
          </div>

          {campaignDates.some((d) => d.start || d.end) && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />
              <span className="font-mono text-[9px] text-text-dim">Jalons campagnes</span>
            </div>
          )}
        </Card>

        {/* ── Médiathèque récente ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardLabel>Contenu généré</CardLabel>
              <CardTitle>Médiathèque</CardTitle>
            </div>
            <Link href="/galerie" className="font-mono text-[10px] text-accent hover:underline">
              Tout voir →
            </Link>
          </div>

          {recentAssets.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-3xl mb-2">◈</div>
              <p className="font-mono text-[11px] text-text-dim mb-1">Aucun asset généré</p>
              <p className="font-mono text-[10px] text-text-dim mb-3">
                Vos images, vidéos et voix apparaîtront ici.
              </p>
              <Link href="/creative-studio">
                <button className="font-mono text-[10px] font-bold text-accent border border-accent/40 rounded-neo px-3 py-1.5 hover:bg-accent/10 transition-colors">
                  → Creative Studio
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Preview grille */}
              <div className={`grid gap-1.5 mb-3 ${recentAssets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {recentAssets.map((asset) => (
                  <div key={asset.id} className="relative rounded-neo overflow-hidden border border-border bg-bg-elevated aspect-video flex items-center justify-center">
                    {asset.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">
                        {asset.type === 'video' ? '🎬' : '🎵'}
                      </span>
                    )}
                    {/* Engine badge */}
                    <span className="absolute top-1 left-1 font-mono text-[7px] font-bold bg-bg-base/90 border border-border text-text-dim rounded px-1 py-0.5">
                      {engineLabel(asset.engine)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stats rapides */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                {[
                  { type: 'image',  icon: '🖼', label: 'Images',  count: assets.filter((a) => a.type === 'image').length  },
                  { type: 'video',  icon: '🎬', label: 'Vidéos',  count: assets.filter((a) => a.type === 'video').length  },
                  { type: 'audio',  icon: '🎵', label: 'Voix',    count: assets.filter((a) => a.type === 'audio').length  },
                ].map((s) => (
                  <div key={s.type} className="flex items-center gap-1">
                    <span className="text-xs">{s.icon}</span>
                    <span className="font-mono text-[10px] font-bold text-text-primary">{s.count}</span>
                  </div>
                ))}
                <span className="font-mono text-[9px] text-text-dim ml-auto">total {assets.length}</span>
              </div>
            </>
          )}

          {/* Avatars miniatures */}
          {avatars.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[9px] text-text-dim">Avatars</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {avatars.slice(0, 5).map((av, i) => (
                  <div
                    key={av.id}
                    title={av.name}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-[8px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                  >
                    {av.name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {avatars.length > 5 && (
                  <span className="font-mono text-[9px] text-text-dim">+{avatars.length - 5}</span>
                )}
                <Link href="/galerie" className="ml-auto font-mono text-[9px] text-accent hover:underline">
                  Galerie →
                </Link>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
