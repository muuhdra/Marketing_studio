'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Coins, LogOut } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

const HIDDEN_PATHS = ['/campagne/etape-', '/campagne/speciale/']

function getInitials(user: User | null): string {
  if (!user) return '?'
  const email = user.email ?? ''
  const meta  = user.user_metadata
  if (meta?.full_name) {
    return (meta.full_name as string)
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export default function Topbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const isHidden = HIDDEN_PATHS.some((p) => pathname.includes(p))

  const [user, setUser]               = useState<User | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isHidden) return null

  const initials = getInitials(user)

  return (
    <header className="sticky top-0 z-50 flex items-center justify-end px-7 py-5 gap-3 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">

        {/* Budget chip */}
        <Link href="/budget" className="
          flex items-center gap-1.5 px-3 py-1.5
          border-2 border-accent rounded-neo-md bg-bg-card shadow-neo-sm
          font-mono text-xs font-bold text-accent
          transition-all duration-100
          hover:shadow-neo hover:-translate-x-px hover:-translate-y-px
        ">
          <Coins size={12} />
          38.20 / 50 USD
        </Link>

        {/* Notifications */}
        <button className="
          relative flex items-center justify-center w-9 h-9 rounded-neo-md
          border-2 border-border bg-bg-card text-text-muted
          transition-all duration-100
          hover:border-border-strong hover:text-text-primary hover:shadow-neo-white-sm
          hover:-translate-x-px hover:-translate-y-px
        ">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-neo bg-accent border border-bg-card" />
        </button>

        {/* Avatar utilisateur + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            title={user?.email ?? 'Utilisateur'}
            className="
              flex items-center justify-center w-9 h-9 rounded-neo-md
              border-2 border-border-purple bg-bg-card shadow-neo-purple
              font-display font-bold text-xs text-purple
              transition-all duration-100
              hover:-translate-x-px hover:-translate-y-px
              hover:shadow-[3px_3px_0px_rgba(160,154,224,0.6)]
            "
          >
            {initials}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden shadow-neo animate-fade-in">

                {/* User info */}
                <div className="px-4 py-3 border-b-2 border-border">
                  <div className="font-mono text-[10px] text-text-dim mb-0.5">Connecté en tant que</div>
                  <div className="text-[12px] font-medium text-text-primary truncate">
                    {user?.email ?? '—'}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <Link
                    href="/parametres"
                    onClick={() => setMenuOpen(false)}
                    className="
                      flex items-center gap-2.5 px-3 py-2 rounded-neo text-[12.5px] text-text-secondary
                      hover:bg-bg-elevated hover:text-text-primary transition-colors
                    "
                  >
                    <span className="text-[14px]">⚙</span>
                    Paramètres
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-neo text-[12.5px] text-coral
                      hover:bg-coral/5 transition-colors
                    "
                  >
                    <LogOut size={13} />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
