'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

import {
  LayoutDashboard,
  Megaphone,
  UserCircle,
  Image as ImageIcon,
  Sparkles,
  Lightbulb,
  Calendar,
  BarChart3,
  Settings,
  Coins,
} from 'lucide-react'

const navSections = [
  {
    label: 'Production',
    items: [
      { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'            },
      { href: '/campagnes',       icon: Megaphone,        label: 'Campagnes'            },
      { href: '/avatar-studio',   icon: UserCircle,       label: 'Avatar Studio'        },
      { href: '/galerie',         icon: ImageIcon,        label: 'Avatars & Continuité' },
      { href: '/creative-studio', icon: Sparkles,         label: 'Creative Studio'      },
    ],
  },
  {
    label: 'Stratégie',
    items: [
      { href: '/strategie',  icon: Lightbulb, label: 'Stratégie'    },
      { href: '/calendrier', icon: Calendar,  label: 'Calendrier'   },
      { href: '/analytics',  icon: BarChart3, label: 'Optimisation' },
    ],
  },
  {
    label: 'Système',
    items: [
      { href: '/parametres', icon: Settings, label: 'Paramètres' },
      { href: '/budget',     icon: Coins,    label: 'Budget IA'  },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="
      flex flex-col h-screen sticky top-0 flex-shrink-0 w-[172px]
      bg-bg-surface
      border-r-2 border-border
    ">
      {/* ── Logo ── */}
      <div className="
        flex items-center gap-2.5 px-4 py-[18px]
        border-b-2 border-border
        font-display font-extrabold text-[15px] text-text-primary
        tracking-tight
      ">
        {/* Dot accent Neo-Brutalism — carré pas rond */}
        <span className="
          w-2.5 h-2.5 rounded-neo flex-shrink-0
          bg-accent shadow-neo-sm
        " />
        Studio UGC
        <span className="text-accent">IA</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {/* Section label */}
            <div className="nb-label px-4 pt-3 pb-1.5">
              {section.label}
            </div>

            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + '/') ||
                (item.href === '/campagnes' && pathname.startsWith('/campagne/'))

              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-4 py-[7px]',
                    'text-[12.5px] font-medium transition-all duration-100',
                    'hover:text-text-primary',
                    isActive
                      ? 'text-text-primary bg-white/[0.05]'
                      : 'text-text-muted',
                  )}
                >
                  {/* Indicateur actif — barre gauche épaisse Neo-Brutalism */}
                  {isActive && (
                    <span className="
                      absolute left-0 top-1 bottom-1 w-[3px]
                      bg-accent rounded-r-neo
                    " />
                  )}

                  <Icon
                    size={16}
                    className={cn(
                      'flex-shrink-0 transition-colors duration-100',
                      isActive
                        ? 'text-accent'
                        : 'text-text-dim group-hover:text-text-muted',
                    )}
                  />

                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Widget Budget ── */}
      <div className="p-3 border-t-2 border-border">
        <Link href="/budget" className="block group">
          <div className="
            bg-bg-card border-2 border-border rounded-neo-lg p-3
            transition-all duration-150
            group-hover:border-accent group-hover:shadow-neo-sm
            group-hover:-translate-x-px group-hover:-translate-y-px
          ">
            <div className="flex items-center gap-1.5 mb-2">
              <Coins size={11} className="text-text-dim" />
              <span className="nb-label">Budget mensuel</span>
            </div>
            <div className="font-display font-bold text-[13px] text-accent mb-2">
              38.20
              <span className="text-text-faint font-normal text-xs ml-1">/ 50 USD</span>
            </div>
            {/* Barre de progression Neo-Brutalism — hard border */}
            <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
              <div
                className="h-full bg-accent rounded-neo transition-all duration-300"
                style={{ width: '76%' }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="font-mono text-[10px] text-text-dim">76%</span>
              <span className="font-mono text-[10px] text-text-dim">11.80 restants</span>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  )
}
