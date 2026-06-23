'use client'

import { Sparkles } from 'lucide-react'

/**
 * Interrupteur « Utiliser ma marque » — injecte (ou non) le contexte de la marque
 * active dans la génération. OFF = création libre, sans lien avec la campagne.
 */
export function BrandContextToggle({ on, onChange, className = '' }: { on: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title={on ? 'Le profil de ta marque oriente la génération' : 'Création libre — sans contexte de marque'}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-extrabold transition-colors ${on ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-fg/[0.03] text-text-muted'} ${className}`}
    >
      <Sparkles size={13} strokeWidth={2.5} />
      Utiliser ma marque
      <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${on ? 'bg-accent' : 'bg-fg/[0.2]'}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}
