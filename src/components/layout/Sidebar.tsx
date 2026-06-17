'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSettings, DEFAULT_STUDIO_NAME } from '@/lib/stores/settingsStore'
import { createBrowserClient } from '@supabase/ssr'
import {
  Clapperboard,
  LayoutGrid,
  LayoutTemplate,
  Drama,
  Store,
  Send,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
} from 'lucide-react'

// Nav restructurée façon HeyOz (mappée sur nos routes existantes)
const NAV = [
  { href: '/dashboard',     icon: Clapperboard,   label: 'Content Studio' },
  { href: '/galerie',       icon: LayoutGrid,     label: 'Creations'      },
  { href: '/templates',     icon: LayoutTemplate, label: 'Templates'      },
  { href: '/avatar-studio', icon: Drama,          label: 'Characters'     },
  { href: '/parametres',    icon: Store,          label: 'Brand',   sub: true },
  { href: '/calendrier',    icon: Send,           label: 'Publish', sub: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const studioName = useSettings((s) => s.studioName)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => {})
  }, [])

  const brand = mounted ? studioName : DEFAULT_STUDIO_NAME

  return (
    <aside className="flex flex-col h-screen sticky top-0 flex-shrink-0 w-[232px] bg-bg-surface border-r border-border">

      {/* ── Active brand ── */}
      <div className="px-4 pt-4 pb-2">
        <p className="nb-label mb-2">Active brand</p>
        <button className="w-full flex items-center gap-2.5 p-2 rounded-neo-md border border-border bg-bg-card hover:border-border-strong transition-colors">
          <span className="w-8 h-8 rounded-neo bg-gradient-accent flex items-center justify-center text-white flex-shrink-0">
            <LayoutGrid size={16} />
          </span>
          <span className="flex-1 text-left text-[14px] font-bold text-text-primary truncate">{brand}</span>
          <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto flex flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/') ||
            (item.href === '/galerie' && pathname.startsWith('/galerie'))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-neo-md text-[14px] font-medium transition-all',
                isActive
                  ? 'bg-bg-elevated text-accent font-semibold'
                  : 'text-text-secondary hover:bg-fg/[0.03] hover:text-text-primary',
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.sub && <ChevronRight size={15} className="text-text-dim" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Carte free plan ── */}
      <div className="px-3 pb-3">
        <div className="rounded-neo-lg bg-[#1b1b1f] text-white p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={15} className="text-accent fill-accent" />
            <span className="text-[13px] font-bold">You&apos;re on the free plan</span>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed mb-3">
            Subscribe to unlock every AI model and start making ads in minutes.
          </p>
          <button className="w-full py-2 rounded-neo-md bg-gradient-accent text-white text-[13px] font-bold hover:brightness-105 transition">
            Upgrade plan
          </button>
        </div>
      </div>

      {/* ── Profil utilisateur ── */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-[12px] font-bold text-accent flex-shrink-0">
          {(brand[0] ?? '?').toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-text-primary truncate">{brand}</p>
          <p className="text-[10px] text-text-muted truncate">{email || '—'}</p>
        </div>
        <Link href="/parametres" className="text-text-muted hover:text-text-primary transition-colors" aria-label="Paramètres">
          <Settings size={16} />
        </Link>
      </div>
    </aside>
  )
}
