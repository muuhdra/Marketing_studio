import { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── Variantes ───────────────────────────────────────────────
type CardVariant = 'default' | 'accent' | 'purple' | 'teal' | 'coral' | 'flat'

const variantStyles: Record<CardVariant, string> = {
  default: 'border-border bg-bg-card hover:border-border-strong hover:-translate-x-px hover:-translate-y-px hover:shadow-neo-white',
  accent:  'border-accent bg-bg-card shadow-neo hover:-translate-x-px hover:-translate-y-px hover:shadow-neo-lg',
  purple:  'border-border-purple bg-bg-card shadow-neo-purple hover:-translate-x-px hover:-translate-y-px',
  teal:    'border-border-teal bg-bg-card shadow-neo-teal hover:-translate-x-px hover:-translate-y-px',
  coral:   'border-border-coral bg-bg-card shadow-neo-coral hover:-translate-x-px hover:-translate-y-px',
  flat:    'border-border bg-bg-surface',
}

interface CardProps {
  children: ReactNode
  variant?: CardVariant
  /** @deprecated — utiliser variant="accent" | "purple" | "teal" | "coral" */
  accent?: string
  onClick?: () => void
  style?: CSSProperties
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

export default function Card({
  children,
  variant = 'default',
  accent,
  onClick,
  style,
  className,
  padding = 'md',
}: CardProps) {
  // Résolution legacy : si `accent` est passé, on injecte la border-color via style
  const legacyStyle = accent ? { borderColor: accent, ...style } : style
  return (
    <div
      onClick={onClick}
      style={legacyStyle}
      className={cn(
        'relative border-2 rounded-neo-lg overflow-hidden transition-all duration-150',
        variantStyles[variant],
        paddingStyles[padding],
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Sous-composants ─────────────────────────────────────────

export function CardLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('nb-label mb-1.5', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('font-display font-bold text-[15px] text-text-primary mb-1.5', className)}>
      {children}
    </h3>
  )
}

export function CardDesc({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[12.5px] text-text-muted leading-relaxed', className)}>
      {children}
    </p>
  )
}

export function CardDivider() {
  return <div className="nb-divider my-4" />
}
