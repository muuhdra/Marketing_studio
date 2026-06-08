'use client'

import Link from 'next/link'

const STEPS = [
  { num: 1, label: 'Campagne', href: '/campagne/etape-1' },
  { num: 2, label: 'Contenus', href: '/campagne/etape-2' },
  { num: 3, label: 'Avatars',  href: '/campagne/etape-3' },
  { num: 4, label: 'Studio',   href: '/campagne/etape-4' },
]

export default function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full px-5 py-2.5 border-b-2 border-border bg-bg-surface mb-6">
      {STEPS.map((step, i) => {
        const done    = step.num < current
        const active  = step.num === current
        const pending = step.num > current
        return (
          <div key={step.num} className="flex items-center">
            <Link
              href={step.href}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-neo no-underline text-[12px] font-semibold
                transition-all duration-100
                ${active  ? 'bg-accent text-bg-base shadow-neo'                          : ''}
                ${done    ? 'bg-accent/10 text-accent border border-accent/30 rounded-neo' : ''}
                ${pending ? 'text-text-dim'                                               : ''}
              `}
            >
              <span className={`
                w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0
                ${active  ? 'bg-black/15 text-bg-base'  : ''}
                ${done    ? 'bg-accent/20 text-accent'  : ''}
                ${pending ? 'bg-border text-text-dim'   : ''}
              `}>
                {done ? '✓' : step.num}
              </span>
              {step.label}
            </Link>
            {i < STEPS.length - 1 && (
              <div className={`w-5 h-px mx-1 ${done ? 'bg-accent/40' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
