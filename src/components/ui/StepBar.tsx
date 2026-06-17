'use client'

import Link from 'next/link'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'

const STEPS = [
  { num: 1, label: 'Campagne', href: '/campagne/etape-1' },
  { num: 2, label: 'Contenus', href: '/campagne/etape-2' },
  { num: 3, label: 'Avatars',  href: '/campagne/etape-3' },
  { num: 4, label: 'Studio',   href: '/campagne/etape-4' },
]

export default function StepBar({ current }: { current: number }) {
  const campaignId = useCampaignWizard((s) => s.campaignId)

  // Une étape est accessible si :
  // - elle est déjà passée (< current)
  // - c'est l'étape courante
  // - la campagne est créée (campaignId existe) → navigation libre entre étapes déjà atteintes
  const isAccessible = (stepNum: number) =>
    stepNum <= current || (!!campaignId && stepNum <= current + 1)

  return (
    <div className="flex items-center w-full px-5 py-2.5 border-b border-border bg-bg-surface mb-6">
      {STEPS.map((step, i) => {
        const done      = step.num < current
        const active    = step.num === current
        const pending   = step.num > current
        const accessible = isAccessible(step.num)

        const inner = (
          <div className={`
            flex items-center gap-2 px-3.5 py-2 rounded-neo text-[12px] font-semibold
            transition-all duration-100
            ${active   ? 'bg-accent text-bg-base shadow-neo'                           : ''}
            ${done     ? 'bg-accent/10 text-accent border border-accent/30 rounded-neo': ''}
            ${pending && accessible  ? 'text-text-dim hover:text-text-secondary cursor-pointer'  : ''}
            ${pending && !accessible ? 'text-text-dim/40 cursor-not-allowed'                     : ''}
          `}>
            <span className={`
              w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0
              ${active              ? 'bg-black/15 text-bg-base'       : ''}
              ${done                ? 'bg-accent/20 text-accent'       : ''}
              ${pending && accessible  ? 'bg-border text-text-dim'     : ''}
              ${pending && !accessible ? 'bg-fg/[0.08] text-text-dim/40' : ''}
            `}>
              {done ? '✓' : step.num}
            </span>
            {step.label}
          </div>
        )

        return (
          <div key={step.num} className="flex items-center">
            {accessible && !active
              ? <Link href={step.href} className="no-underline">{inner}</Link>
              : inner
            }
            {i < STEPS.length - 1 && (
              <div className={`w-5 h-px mx-1 ${done ? 'bg-accent/40' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
