'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSettings, DEFAULT_STUDIO_NAME } from '@/lib/stores/settingsStore'
import { useBrands } from '@/lib/stores/brandsStore'
import { listBrands, createBrand } from '@/lib/actions/brands'
import { BRAND_CATEGORIES } from '@/lib/stores/brandStore'
import { createBrowserClient } from '@supabase/ssr'
import {
  Clapperboard,
  LayoutGrid,
  LayoutTemplate,
  Drama,
  Send,
  Check,
  ChevronRight,
  BookOpen,
  Box,
  Images,
  PanelTop,
  Plus,
  Settings,
  LogOut,
  Megaphone,
  Swords,
  Video,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

// Navigation principale (mappée sur nos routes existantes)
type NavItem = { href: string; icon: typeof Clapperboard; label: string; expandable?: boolean; badge?: string }
const NAV: NavItem[] = [
  { href: '/dashboard', icon: Clapperboard, label: 'Content Studio' },
  { href: '/galerie', icon: LayoutGrid, label: 'Creations' },
  { href: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { href: '/avatar-studio', icon: Drama, label: 'Characters' },
  { href: '/parametres', icon: Megaphone, label: 'Campaigns', expandable: true, badge: 'NEW' },
  { href: '/calendrier', icon: Send, label: 'Planning' },
]

// Palette de couleurs proposées à la création d'une marque
const BRAND_COLORS = ['#ea580c', '#dc2626', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#0f172a']

type BrandNavItem = { href: string; icon: typeof BookOpen; label: string; section: string; badge?: string }
const BRAND_NAV: BrandNavItem[] = [
  { href: '/parametres?section=profile', icon: BookOpen, label: 'Profile', section: 'profile' },
  { href: '/parametres?section=products', icon: Box, label: 'Products', section: 'products' },
  { href: '/parametres?section=assets', icon: Images, label: 'Assets', section: 'assets' },
  { href: '/parametres?section=templates', icon: PanelTop, label: 'Templates', section: 'templates' },
  { href: '/parametres?section=production', icon: Video, label: 'Production', section: 'production' },
  { href: '/parametres?section=competitors', icon: Swords, label: 'Competitors', section: 'competitors', badge: 'NEW' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const studioName = useSettings((s) => s.studioName)
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [brandMenuOpen, setBrandMenuOpen] = useState(false)
  const [brandNavOpen, setBrandNavOpen] = useState(false)
  const [addingBrand, setAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandColor, setNewBrandColor] = useState(BRAND_COLORS[0])
  const [newBrandCategory, setNewBrandCategory] = useState(BRAND_CATEGORIES[0])
  const [savingBrand, setSavingBrand] = useState(false)

  const { brands, activeBrandId, setBrands, setActiveBrand } = useBrands()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    setMounted(true)
    setCollapsed(localStorage.getItem('sidebar-collapsed') === '1')
    listBrands().then(setBrands).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      return next
    })
    setBrandMenuOpen(false)
    setBrandNavOpen(false)
    setMenuOpen(false)
  }
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => { })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeBrand = mounted ? (brands.find((b) => b.id === activeBrandId) ?? brands[0]) : { name: DEFAULT_STUDIO_NAME, color: '#ea580c', id: '' }
  const brandSection = searchParams.get('section') ?? 'profile'
  const userInitial = (email.trim()[0] ?? studioName.trim()[0] ?? '?').toUpperCase()

  async function handleAddBrand() {
    const name = newBrandName.trim()
    if (!name || savingBrand) return
    setSavingBrand(true)
    try {
      const b = await createBrand({ name, color: newBrandColor, category: newBrandCategory })
      setBrands(await listBrands())
      setActiveBrand(b.id)
      setNewBrandName('')
      setNewBrandColor(BRAND_COLORS[0])
      setNewBrandCategory(BRAND_CATEGORIES[0])
      setAddingBrand(false)
      setBrandMenuOpen(false)
      setBrandNavOpen(true)
      router.push('/parametres?section=profile')
    } catch { /* ignore */ }
    finally { setSavingBrand(false) }
  }

  return (
    <aside className={cn(
      'sticky top-0 z-20 m-1.5 flex h-[calc(100vh-12px)] flex-shrink-0 flex-col rounded-[18px] border border-border bg-bg-card shadow-neo-sm transition-[width] duration-200',
      collapsed ? 'w-[64px]' : 'w-[196px]',
    )}>

      {/* ── Active brand ── */}
      <div className={cn('relative pt-3 pb-2.5', collapsed ? 'px-2' : 'px-2.5')}>
        <div className="flex items-center justify-between">
          {!collapsed && <p className="text-[10px] font-extrabold uppercase tracking-wide text-text-primary/70">Active brand</p>}
          <div className={cn('flex items-center gap-0.5', collapsed && 'mx-auto flex-col')}>
            {!collapsed && (
              <button
                type="button"
                onClick={() => { setBrandMenuOpen(true); setAddingBrand(true); setMenuOpen(false) }}
                title="Nouvelle marque"
                className="grid h-6 w-6 place-items-center rounded-[7px] text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <Plus size={15} strokeWidth={2.6} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
              className="grid h-6 w-6 place-items-center rounded-[7px] text-text-secondary transition-colors hover:bg-fg/[0.06] hover:text-text-primary"
            >
              {collapsed ? <PanelLeftOpen size={15} strokeWidth={2.2} /> : <PanelLeftClose size={15} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setBrandMenuOpen((open) => !open)
            setMenuOpen(false)
            setAddingBrand(false)
            setNewBrandName('')
          }}
          title={collapsed ? (activeBrand?.name ?? DEFAULT_STUDIO_NAME) : undefined}
          className={cn('mt-2.5 flex w-full items-center gap-2 rounded-[10px] py-1 text-left transition-colors hover:bg-fg/[0.03]', collapsed && 'justify-center')}
        >
          <span
            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: activeBrand?.color ?? '#ea580c' }}
          >
            <LayoutGrid size={15} strokeWidth={2.4} />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold tracking-tight text-text-primary">{activeBrand?.name ?? DEFAULT_STUDIO_NAME}</span>}
          {!collapsed && <ChevronRight size={16} strokeWidth={2.2} className={cn('flex-shrink-0 text-text-primary transition-transform', brandMenuOpen && 'rotate-90')} />}
        </button>

        {brandMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setBrandMenuOpen(false); setAddingBrand(false); setNewBrandName('') }} />
            <div className="absolute left-[calc(100%+10px)] top-5 z-50 w-[272px] animate-fade-in overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-neo">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h2 className="text-[15px] font-extrabold tracking-tight text-text-primary">Mes marques</h2>
                <span className="rounded-full bg-fg/[0.07] px-2 py-0.5 text-[11px] font-extrabold text-text-primary">{brands.length}</span>
              </div>

              {/* Brand list */}
              <div className="max-h-[260px] overflow-y-auto border-t border-border p-2">
                {brands.map((b) => {
                  const isActive = b.id === activeBrandId
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setActiveBrand(b.id)
                        setBrandMenuOpen(false)
                        setAddingBrand(false)
                        setBrandNavOpen(true)
                        router.push('/parametres?section=profile')
                      }}
                      className={cn(
                        'flex min-h-[50px] w-full items-center gap-3 rounded-[10px] px-2.5 text-left transition-colors',
                        isActive ? 'bg-fg/[0.06]' : 'hover:bg-fg/[0.04]',
                      )}
                    >
                      <span
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] text-white"
                        style={{ backgroundColor: b.color }}
                      >
                        <LayoutGrid size={18} strokeWidth={2.35} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-text-primary">{b.name}</span>
                      {isActive && <Check size={17} strokeWidth={2.5} className="flex-shrink-0 text-text-primary" />}
                    </button>
                  )
                })}
              </div>

              {/* Add brand */}
              <div className="border-t border-border p-3">
                {addingBrand ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-extrabold text-text-primary">Nom de la marque</label>
                      <input
                        autoFocus
                        type="text"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddBrand()
                          if (e.key === 'Escape') { setAddingBrand(false); setNewBrandName('') }
                        }}
                        placeholder="ex. Nova Skincare"
                        className="h-9 w-full rounded-[8px] border border-border bg-bg-surface px-3 text-[13px] font-semibold text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-extrabold text-text-primary">Couleur</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BRAND_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewBrandColor(c)}
                            className={cn('grid h-6 w-6 place-items-center rounded-full transition', newBrandColor === c && 'ring-2 ring-offset-1 ring-offset-bg-card ring-text-primary')}
                            style={{ backgroundColor: c }}
                          >
                            {newBrandColor === c && <Check size={13} strokeWidth={3} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-extrabold text-text-primary">Catégorie</label>
                      <select
                        value={newBrandCategory}
                        onChange={(e) => setNewBrandCategory(e.target.value)}
                        className="h-9 w-full rounded-[8px] border border-border bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-accent"
                      >
                        {BRAND_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAddingBrand(false); setNewBrandName('') }}
                        className="h-9 flex-1 rounded-[8px] border border-border text-[12px] font-extrabold text-text-secondary transition hover:bg-fg/[0.05]"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBrand}
                        disabled={!newBrandName.trim() || savingBrand}
                        className="h-9 flex-1 rounded-[8px] bg-accent text-[12px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-40"
                      >
                        {savingBrand ? 'Création…' : 'Créer la marque'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingBrand(true)}
                    className="flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left text-text-primary transition hover:bg-fg/[0.04]"
                  >
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-border bg-bg-surface">
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
                    <span className="text-[14px] font-extrabold tracking-tight">Nouvelle marque</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mx-2.5 h-px flex-shrink-0 bg-border" />

      {/* ── Navigation ── */}
      <nav className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto py-2.5', collapsed ? 'px-2' : 'px-2')}>
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
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex min-h-[32px] items-center gap-2 rounded-[9px] text-left text-[13px] font-semibold tracking-tight transition-all',
                    collapsed ? 'justify-center px-0' : 'px-2.5',
                    isActive || brandNavOpen
                      ? 'bg-fg/[0.06] text-text-primary'
                      : 'text-text-primary hover:bg-fg/[0.035]',
                  )}
                >
                  <Icon size={16} strokeWidth={2.35} className="flex-shrink-0" />
                  {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-accent">{item.badge}</span>
                  )}
                  {!collapsed && (
                    <ChevronRight
                      size={15}
                      strokeWidth={2.2}
                      className={cn('flex-shrink-0 text-text-primary transition-transform', brandNavOpen && 'rotate-90')}
                    />
                  )}
                </button>

                {brandNavOpen && (
                  <div className={cn(
                    'mt-0.5 flex flex-col gap-0.5 py-1',
                    collapsed ? 'items-center' : 'ml-[15px] border-l border-border/80 pl-4',
                  )}>
                    {BRAND_NAV.map((subItem) => {
                      const SubIcon = subItem.icon
                      const subActive = pathname === '/parametres' && brandSection === subItem.section

                      return (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          title={collapsed ? subItem.label : undefined}
                          className={cn(
                            'flex min-h-[30px] items-center rounded-[8px] text-[13px] font-semibold tracking-tight transition-colors',
                            collapsed ? 'w-9 justify-center px-0' : 'gap-2 px-2',
                            subActive ? 'bg-fg/[0.045] text-text-primary' : 'text-text-primary hover:bg-fg/[0.035]',
                          )}
                        >
                          <SubIcon size={15} strokeWidth={2.35} className="flex-shrink-0" />
                          {!collapsed && <span className="flex-1">{subItem.label}</span>}
                          {!collapsed && subItem.badge && (
                            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-accent">
                              {subItem.badge}
                            </span>
                          )}
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
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex min-h-[32px] items-center gap-2 rounded-[9px] text-[13px] font-semibold tracking-tight transition-all',
                collapsed ? 'justify-center px-0' : 'px-2.5',
                isActive
                  ? 'bg-fg/[0.06] text-text-primary'
                  : 'text-text-primary hover:bg-fg/[0.035]',
              )}
            >
              <Icon size={16} strokeWidth={2.35} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-accent">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Profil utilisateur + menu ── */}
      <div className="relative mx-2.5 border-t border-border pb-2.5 pt-2.5">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          title={collapsed ? (email || studioName) : undefined}
          className={cn('flex w-full items-center gap-2 rounded-[10px] p-1 transition-colors hover:bg-fg/[0.03]', collapsed && 'justify-center')}
        >
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-extrabold text-white">
            {userInitial}
          </span>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-[12px] font-extrabold leading-tight text-text-primary">{studioName || DEFAULT_STUDIO_NAME}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-text-secondary">{email || '—'}</p>
            </div>
          )}
          {!collapsed && <Settings size={15} strokeWidth={2.2} className="flex-shrink-0 text-text-secondary" />}
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className={cn('absolute bottom-[calc(100%+8px)] z-50 w-[220px] animate-fade-in overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-neo', collapsed ? 'left-0' : 'left-0 right-0')}>
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
