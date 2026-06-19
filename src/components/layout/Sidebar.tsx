'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Box,
  Images,
  PanelTop,
  Plus,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'

// Nav restructurée façon HeyOz (mappée sur nos routes existantes)
const NAV = [
  { href: '/dashboard',     icon: Clapperboard,   label: 'Content Studio' },
  { href: '/galerie',       icon: LayoutGrid,     label: 'Creations'      },
  { href: '/templates',     icon: LayoutTemplate, label: 'Templates'      },
  { href: '/avatar-studio', icon: Drama,          label: 'Characters'     },
  { href: '/parametres',    icon: Store,          label: 'Brand',   sub: true, expandable: true },
  { href: '/calendrier',    icon: Send,           label: 'Publish', sub: true },
]

const BRAND_NAV = [
  { href: '/parametres?section=profile', icon: BookOpen, label: 'Profile', section: 'profile' },
  { href: '/parametres?section=products', icon: Box, label: 'Products', section: 'products' },
  { href: '/parametres?section=assets', icon: Images, label: 'Assets', section: 'assets' },
  { href: '/parametres?section=templates', icon: PanelTop, label: 'Templates', section: 'templates' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const studioName = useSettings((s) => s.studioName)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [brandMenuOpen, setBrandMenuOpen] = useState(false)
  const [brandNavOpen, setBrandNavOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => {})
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const brand = mounted ? studioName : DEFAULT_STUDIO_NAME
  const brandSection = searchParams.get('section') ?? 'profile'

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-[212px] flex-shrink-0 flex-col border-r border-border bg-bg-surface">

      {/* ── Active brand ── */}
      <div className="relative px-3 pt-4 pb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-text-primary/75">Active brand</p>
        <button
          type="button"
          onClick={() => {
            setBrandMenuOpen((open) => !open)
            setMenuOpen(false)
          }}
          className="mt-3.5 flex w-full items-center gap-2 rounded-[10px] py-1 text-left transition-colors hover:bg-fg/[0.03]"
        >
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <LayoutGrid size={18} strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1 truncate font-display text-[16.5px] font-extrabold tracking-tight text-text-primary">{brand}</span>
          <ChevronDown size={18} strokeWidth={2.2} className={cn('flex-shrink-0 text-text-primary transition-transform', brandMenuOpen && 'rotate-180')} />
        </button>

        {brandMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBrandMenuOpen(false)} />
            <div className="absolute left-[calc(100%+10px)] top-5 z-50 h-[360px] w-[252px] animate-fade-in overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-neo">
              <div className="px-4 py-4">
                <h2 className="text-[17px] font-extrabold tracking-tight text-text-primary">Your Brands</h2>
                <button
                  type="button"
                  className="mt-5 flex w-full items-center gap-3 rounded-[12px] text-left text-text-primary transition hover:bg-fg/[0.04]"
                >
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] border border-border bg-bg-surface">
                    <Plus size={20} strokeWidth={2.2} />
                  </span>
                  <span className="text-[19px] font-extrabold tracking-tight">Add Brand</span>
                </button>
              </div>

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => setBrandMenuOpen(false)}
                  className="flex min-h-[58px] w-full items-center gap-3 rounded-[10px] bg-fg/[0.06] px-3 text-left text-text-primary"
                >
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <LayoutGrid size={20} strokeWidth={2.35} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-tight">My Brand</span>
                  <Check size={22} strokeWidth={2.2} className="flex-shrink-0 text-text-primary" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mx-3 h-px flex-shrink-0 bg-border" />

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3.5">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/') ||
            (item.href === '/dashboard' && pathname.startsWith('/creer')) ||
            (item.href === '/galerie' && pathname.startsWith('/galerie'))
          const Icon = item.icon

          if (item.expandable) {
            return (
              <div key={item.href} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setBrandNavOpen((open) => !open)}
                  className={cn(
                    'group flex min-h-[36px] items-center gap-2 rounded-[9px] px-2.5 text-left text-[14px] font-semibold tracking-tight transition-all',
                    isActive || brandNavOpen
                      ? 'bg-fg/[0.06] text-text-primary'
                      : 'text-text-primary hover:bg-fg/[0.035]',
                  )}
                >
                  <Icon size={18} strokeWidth={2.35} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2.2}
                    className={cn('text-text-primary transition-transform', brandNavOpen && 'rotate-180')}
                  />
                </button>

                {brandNavOpen && (
                  <div className="ml-[17px] mt-1 flex flex-col gap-1 border-l border-border/80 py-1 pl-5">
                    {BRAND_NAV.map((subItem) => {
                      const SubIcon = subItem.icon
                      const subActive = pathname === '/parametres' && brandSection === subItem.section

                      return (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          className={cn(
                            'flex min-h-[34px] items-center gap-2.5 rounded-[8px] px-2 text-[14px] font-semibold tracking-tight transition-colors',
                            subActive ? 'bg-fg/[0.045] text-text-primary' : 'text-text-primary hover:bg-fg/[0.035]',
                          )}
                        >
                          <SubIcon size={17} strokeWidth={2.35} className="flex-shrink-0" />
                          <span>{subItem.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex min-h-[36px] items-center gap-2 rounded-[9px] px-2.5 text-[14px] font-semibold tracking-tight transition-all',
                isActive
                  ? 'bg-fg/[0.06] text-text-primary'
                  : 'text-text-primary hover:bg-fg/[0.035]',
              )}
            >
              <Icon size={18} strokeWidth={2.35} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.sub && <ChevronRight size={18} strokeWidth={2.2} className="text-text-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Carte free plan ── */}
      <div className="px-2 pb-3">
        <div className="rounded-[12px] bg-[#0d0705] p-3 text-white shadow-neo-sm">
          <div className="mb-2 flex items-center gap-1.5">
            <Zap size={14} className="flex-shrink-0 fill-accent text-accent" />
            <span className="text-[12.5px] font-extrabold leading-tight">You&apos;re on the free plan</span>
          </div>
          <p className="mb-3 text-[11.5px] font-medium leading-relaxed text-white/55">
            Subscribe to unlock every AI model and start making ads in minutes.
          </p>
          <button className="h-8 w-full rounded-[8px] bg-accent text-[12.5px] font-extrabold text-white transition hover:brightness-105">
            Upgrade plan
          </button>
        </div>
      </div>

      {/* ── Profil utilisateur + menu ── */}
      <div className="relative mx-3 border-t border-border pb-3 pt-3">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-[10px] transition-colors hover:bg-fg/[0.03]"
        >
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#6f584e] text-[12px] font-extrabold text-white">
            0
          </span>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-[12.5px] font-extrabold leading-tight text-text-primary">{brand}</p>
            <p className="mt-0.5 truncate text-[10.5px] font-medium text-text-primary">{email || '—'}</p>
          </div>
          <Settings size={16} strokeWidth={2.2} className="flex-shrink-0 text-text-primary" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 animate-fade-in overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-neo">
              <div className="px-4 py-3 border-b border-border">
                <div className="font-sans text-[10px] text-text-dim mb-0.5">Connecté en tant que</div>
                <div className="text-[12px] font-medium text-text-primary truncate">{email || '—'}</div>
              </div>
              <div className="p-1.5">
                <Link
                  href="/parametres"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-neo text-[12.5px] text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  <Settings size={13} />
                  Paramètres
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-neo text-[12.5px] text-coral hover:bg-coral/5 transition-colors"
                >
                  <LogOut size={13} />
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
