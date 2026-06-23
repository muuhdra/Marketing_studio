'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { listOutputMeta, type OutputMeta } from '@/lib/actions/outputs'
import { actionListProducts } from '@/lib/actions/products'
import { useBrand } from '@/lib/stores/brandStore'
import {
  Image as ImageIcon,
  UserRound,
  Clapperboard,
  ArrowUpRight,
  ChevronRight,
  Coins,
  Check,
  Circle,
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
  const [productsCount, setProductsCount] = useState(0)
  useEffect(() => {
    setMounted(true)
    listOutputMeta().then(setMeta).catch(() => {})
    actionListProducts().then((p) => setProductsCount(p.length)).catch(() => {})
  }, [])
  const assets = mounted ? meta : []

  // Complétion réelle du profil de la marque active (champs renseignés par l'utilisateur).
  const brand = useBrand()
  const profileTasks = [
    { done: !!brand.logoDataUrl,                     label: 'Logo de marque' },
    { done: brand.keyFeatures.length > 0,            label: 'Caractéristiques clés' },
    { done: !!(brand.dnaFileName || brand.dnaText),  label: 'Document ADN' },
    { done: productsCount > 0,                        label: 'Produits' },
  ]
  const profileDone = profileTasks.filter((t) => t.done).length
  const profilePct = Math.round((profileDone / profileTasks.length) * 100)

  const hours = mounted ? new Date().getHours() : 12
  const greet = hours < 12 ? 'Bonjour' : hours < 18 ? 'Bon aprèm' : 'Bonsoir'

  // Mise en route du studio — étapes réelles et actionnables (chacune mène à sa page).
  const startupTasks = [
    { done: profilePct === 100,   label: 'Compléter le profil de marque', href: '/parametres?section=profile' },
    { done: productsCount > 0,    label: 'Ajouter un produit',            href: '/parametres?section=products' },
    { done: avatars.length > 0,   label: 'Créer un personnage',           href: '/avatar-studio' },
    { done: assets.length > 0,    label: 'Générer un contenu',            href: '/creer/image/creator' },
  ]
  const startupDone = startupTasks.filter((t) => t.done).length
  const startupPct = Math.round((startupDone / startupTasks.length) * 100)
  const nextStep = startupTasks.find((t) => !t.done)

  const quickActions = [
    { icon: ImageIcon,    label: 'Créer un visuel statique', href: '/creer/image/creator' },
    { icon: UserRound,    label: 'Vidéo avatar réaliste',    href: '/creer/video?mode=realistic-actor' },
    { icon: Clapperboard, label: 'Pub B-Roll avec voix off', href: '/creer/video?mode=broll-voiceover' },
  ]

  return (
    <>
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
          <Link
            href="/parametres?section=profile"
            className="flex items-center gap-3 bg-bg-card border border-border rounded-neo-lg p-3.5 text-left shadow-neo-sm transition-shadow hover:shadow-neo"
          >
            <Ring pct={profilePct} size={40} stroke={4}>
              <span className="text-[11px] font-bold text-text-primary">{profilePct}</span>
            </Ring>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary">Profil de marque</p>
              <p className="text-[11px] text-text-muted">
                {profileDone === profileTasks.length
                  ? 'Profil complété ✓'
                  : `${profileTasks.length - profileDone} section${profileTasks.length - profileDone > 1 ? 's' : ''} à compléter`}
              </p>
            </div>
            <ChevronRight size={16} className="text-text-dim" />
          </Link>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <p className="nb-label mb-2.5 mt-32">Actions rapides ({quickActions.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-6">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <Link key={a.label} href={a.href}
              className="group flex items-center gap-2.5 bg-bg-card border border-border rounded-neo-lg px-3 py-2.5 shadow-neo-sm hover:shadow-neo hover:-translate-y-0.5 transition-all">
              <span className="w-8 h-8 rounded-neo-md bg-accent/10 flex items-center justify-center text-accent flex-shrink-0"><Icon size={16} /></span>
              <span className="flex-1 text-[13px] font-semibold text-text-primary">{a.label}</span>
              <ChevronRight size={16} className="text-text-dim group-hover:text-accent transition-colors" />
            </Link>
          )
        })}
      </div>

      {/* ── 3 cartes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">

        {/* Mise en route */}
        <div className="bg-bg-card border border-border rounded-neo-xl p-4 shadow-neo-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-text-primary">Mise en route</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
              <Coins size={11} /> {assets.length} générés
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Ring pct={startupPct} size={52} stroke={5}>
              <p className="font-display font-extrabold text-[13px] text-accent leading-none">{startupPct}%</p>
            </Ring>
            <p className="text-[11px] text-text-muted">{startupDone} / {startupTasks.length} étapes complétées pour lancer ta marque.</p>
          </div>
          <div className="flex flex-col gap-0.5 mb-3">
            {startupTasks.map((t) => (
              <Link key={t.label} href={t.href} className="group flex items-center gap-2 rounded-neo-md px-1.5 py-1 hover:bg-fg/[0.04] transition-colors">
                <span className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full ${t.done ? 'bg-accent text-white' : 'text-text-dim'}`}>
                  {t.done ? <Check size={10} strokeWidth={3} /> : <Circle size={13} strokeWidth={1.8} />}
                </span>
                <span className={`flex-1 text-[12px] font-semibold ${t.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{t.label}</span>
                {!t.done && <ChevronRight size={14} className="text-text-dim group-hover:text-accent transition-colors" />}
              </Link>
            ))}
          </div>
          {nextStep && (
            <Link href={nextStep.href} className="mt-auto">
              <span className="w-full py-2 rounded-neo-md border border-accent/40 text-accent text-[12px] font-bold hover:bg-accent/5 transition flex items-center justify-center gap-1.5">
                {nextStep.label} <ArrowUpRight size={14} />
              </span>
            </Link>
          )}
        </div>

        {/* Créer une image */}
        <Link href="/creer/image"
          className="group relative rounded-neo-xl overflow-hidden min-h-[210px] flex flex-col justify-end p-4 bg-gradient-accent shadow-neo hover:shadow-neo-lg transition-shadow">
          <ArrowUpRight size={20} className="absolute top-3.5 right-3.5 text-white/90 group-hover:scale-110 transition-transform" />
          <h3 className="font-display font-extrabold text-[20px] text-white leading-tight">Créer une image</h3>
          <p className="text-[12px] text-white/85 mt-1">Visuels statiques, shootings mode, carrousels.</p>
        </Link>

        {/* Créer une vidéo */}
        <Link href="/creer/video"
          className="group relative rounded-neo-xl overflow-hidden min-h-[210px] flex flex-col justify-end p-4 shadow-neo hover:shadow-neo-lg transition-shadow"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ff5c28 100%)' }}>
          <ArrowUpRight size={20} className="absolute top-3.5 right-3.5 text-white/90 group-hover:scale-110 transition-transform" />
          <h3 className="font-display font-extrabold text-[20px] text-white leading-tight">Créer une vidéo</h3>
          <p className="text-[12px] text-white/85 mt-1">UGC réalistes, ASMR, VFX, mèmes et plus.</p>
        </Link>
      </div>

      {/* ── Réseaux connectés ── */}
      <div className="bg-bg-card border border-border rounded-neo-lg px-4 py-3 flex items-center justify-between shadow-neo-sm">
        <p className="text-[13px] font-bold text-text-primary">Réseaux connectés</p>
        <p className="text-[11px] text-text-muted">Aucun réseau connecté</p>
      </div>
    </div>
    </>
  )
}
