'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { listOutputMeta, type OutputMeta } from '@/lib/actions/outputs'
import {
  Image as ImageIcon,
  UserRound,
  Clapperboard,
  ArrowUpRight,
  ChevronRight,
  Coins,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCampaign {
  id:            string
  name:          string
  status:        'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'
  campaign_type: 'generale' | 'speciale'
}

interface DbAvatar {
  id:     string
  name:   string
  status: 'draft' | 'active' | 'archived'
}

interface Props {
  userName:        string
  campaigns:       DbCampaign[]
  avatars:         DbAvatar[]
  activeCampaigns: number
}

// ─── Anneau de progression ──────────────────────────────────────────────────────

function Ring({ pct, size, stroke, children }: { pct: number; size: number; stroke: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'rgb(var(--fg) / 0.08)' }} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ stroke: 'rgb(var(--accent))', transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardView({ userName, campaigns, avatars }: Props) {
  const [meta, setMeta] = useState<OutputMeta[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); listOutputMeta().then(setMeta).catch(() => {}) }, [])
  const assets = mounted ? meta : []

  const hours = mounted ? new Date().getHours() : 12
  const greet = hours < 12 ? 'Bonjour' : hours < 18 ? 'Bon aprèm' : 'Bonsoir'

  // Complétion du profil — dérivée de l'état réel du studio
  const tasks = [
    { done: avatars.length > 0,   label: 'Créer un avatar' },
    { done: campaigns.length > 0, label: 'Lancer une campagne' },
    { done: assets.length > 0,    label: 'Générer du contenu' },
    { done: false,                label: 'Connecter un réseau' },
  ]
  const doneCount = tasks.filter((t) => t.done).length
  const pct = Math.round((doneCount / tasks.length) * 100)

  const quickActions = [
    { icon: ImageIcon,    label: 'Créer un visuel statique', href: '/creer/image' },
    { icon: UserRound,    label: 'Vidéo avatar réaliste',    href: '/creative-studio' },
    { icon: Clapperboard, label: 'Pub B-Roll avec voix off', href: '/creative-studio' },
  ]

  return (
    <div className="animate-fade-in max-w-[1200px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6 mb-9">
        <div>
          <h1 className="font-display font-extrabold text-[34px] leading-[1.1] tracking-tight text-text-primary">
            {greet}, <span className="text-accent">{userName}</span> 👋
          </h1>
          <p className="text-[15px] text-text-secondary mt-2">
            Construisons ta prochaine <span className="text-accent font-semibold">pub gagnante</span> !
          </p>
        </div>

        <div className="hidden md:flex flex-col gap-2.5 w-[330px] flex-shrink-0">
          <Link href="/parametres" className="flex items-center gap-3 bg-bg-card border border-border rounded-neo-lg p-3.5 shadow-neo-sm hover:shadow-neo transition-shadow">
            <Ring pct={pct} size={40} stroke={4}>
              <span className="text-[11px] font-bold text-text-primary">{pct}</span>
            </Ring>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary">Profil de marque</p>
              <p className="text-[11px] text-text-muted">{tasks.length - doneCount} sections à compléter</p>
            </div>
            <ChevronRight size={16} className="text-text-dim" />
          </Link>
          <Link href="/parametres" className="bg-bg-surface border border-border rounded-neo-lg p-3.5 hover:border-border-strong transition-colors">
            <p className="text-[13px] font-bold text-text-primary mb-0.5">Configure ta vraie marque</p>
            <p className="text-[11px] text-text-muted leading-relaxed">Le studio fonctionne mieux avec l&apos;URL de ton site et tes produits.</p>
          </Link>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <p className="nb-label mb-3">Actions rapides ({quickActions.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <Link key={a.label} href={a.href}
              className="group flex items-center gap-3 bg-bg-card border border-border rounded-neo-lg px-4 py-3.5 shadow-neo-sm hover:shadow-neo hover:-translate-y-0.5 transition-all">
              <span className="w-10 h-10 rounded-neo-md bg-accent/10 flex items-center justify-center text-accent flex-shrink-0"><Icon size={20} /></span>
              <span className="flex-1 text-[14px] font-semibold text-text-primary">{a.label}</span>
              <ChevronRight size={18} className="text-text-dim group-hover:text-accent transition-colors" />
            </Link>
          )
        })}
      </div>

      {/* ── 3 cartes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Profil */}
        <div className="bg-bg-card border border-border rounded-neo-xl p-5 shadow-neo-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-bold text-text-primary">Profil</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 rounded-full px-2.5 py-1">
              <Coins size={12} /> {assets.length} générés
            </span>
          </div>
          <p className="text-center text-[12px] text-text-muted mb-4">{doneCount} / {tasks.length} tâches complétées</p>
          <div className="flex justify-center mb-5">
            <Ring pct={pct} size={120} stroke={9}>
              <div className="text-center">
                <p className="font-display font-extrabold text-[26px] text-accent leading-none">{pct}%</p>
              </div>
            </Ring>
          </div>
          <p className="text-center font-display font-bold text-[16px] text-text-primary mb-4 truncate">{userName}</p>
          <Link href="/creative-studio" className="mt-auto">
            <span className="w-full py-2.5 rounded-neo-md border border-accent/40 text-accent text-[13px] font-bold hover:bg-accent/5 transition flex items-center justify-center gap-1.5">
              Crée ta première pub <ArrowUpRight size={15} />
            </span>
          </Link>
        </div>

        {/* Créer une image */}
        <Link href="/creer/image"
          className="group relative rounded-neo-xl overflow-hidden min-h-[300px] flex flex-col justify-end p-5 bg-gradient-accent shadow-neo hover:shadow-neo-lg transition-shadow">
          <ArrowUpRight size={22} className="absolute top-4 right-4 text-white/90 group-hover:scale-110 transition-transform" />
          <h3 className="font-display font-extrabold text-[24px] text-white leading-tight">Créer une image</h3>
          <p className="text-[12.5px] text-white/85 mt-1">Visuels statiques, shootings mode, carrousels.</p>
        </Link>

        {/* Créer une vidéo */}
        <Link href="/creative-studio"
          className="group relative rounded-neo-xl overflow-hidden min-h-[300px] flex flex-col justify-end p-5 shadow-neo hover:shadow-neo-lg transition-shadow"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ff5c28 100%)' }}>
          <ArrowUpRight size={22} className="absolute top-4 right-4 text-white/90 group-hover:scale-110 transition-transform" />
          <h3 className="font-display font-extrabold text-[24px] text-white leading-tight">Créer une vidéo</h3>
          <p className="text-[12.5px] text-white/85 mt-1">UGC réalistes, ASMR, VFX, mèmes et plus.</p>
        </Link>
      </div>

      {/* ── Réseaux connectés ── */}
      <div className="bg-bg-card border border-border rounded-neo-lg px-5 py-4 flex items-center justify-between shadow-neo-sm">
        <p className="text-[14px] font-bold text-text-primary">Réseaux connectés</p>
        <p className="text-[12px] text-text-muted">Aucun réseau connecté</p>
      </div>
    </div>
  )
}
