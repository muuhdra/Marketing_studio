import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

// ─── Badge générique ─────────────────────────────────────────

type BadgeVariant = 'default' | 'accent' | 'purple' | 'teal' | 'coral' | 'amber' | 'pink'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-border-strong text-text-secondary',
  accent:  'border-accent text-accent bg-accent/10',
  purple:  'border-border-purple text-purple bg-purple/10',
  teal:    'border-border-teal text-teal bg-teal/10',
  coral:   'border-border-coral text-coral bg-coral/10',
  amber:   'border-amber/40 text-amber bg-amber/10',
  pink:    'border-pink/40 text-pink bg-pink/10',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'default', dot = false, className }: BadgeProps) {
  return (
    <span className={cn(
      'nb-badge',
      badgeVariants[variant],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          variant === 'default' ? 'bg-text-secondary' :
          variant === 'accent'  ? 'bg-accent' :
          variant === 'purple'  ? 'bg-purple' :
          variant === 'teal'    ? 'bg-teal' :
          variant === 'coral'   ? 'bg-coral' :
          variant === 'amber'   ? 'bg-amber' : 'bg-pink'
        )} />
      )}
      {children}
    </span>
  )
}

// ─── StatusBadge — statuts des campagnes ─────────────────────

type CampaignStatus = 'active' | 'done' | 'pre' | 'draft' | 'post'

const statusConfig: Record<CampaignStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'En cours',       variant: 'accent'  },
  done:   { label: 'Terminée',       variant: 'teal'    },
  pre:    { label: 'Pré-campagne',   variant: 'purple'  },
  post:   { label: 'Post-campagne',  variant: 'amber'   },
  draft:  { label: 'Brouillon',      variant: 'default' },
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, variant } = statusConfig[status]
  return <Badge variant={variant} dot>{label}</Badge>
}

// ─── JobStatusBadge — statuts des jobs ─────────────────────

type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'expired'

const jobStatusConfig: Record<JobStatus, { label: string; variant: BadgeVariant }> = {
  queued:     { label: 'En attente',  variant: 'default' },
  processing: { label: 'En cours',   variant: 'amber'   },
  done:       { label: 'Terminé',    variant: 'teal'    },
  failed:     { label: 'Échoué',     variant: 'coral'   },
  expired:    { label: 'Expiré',     variant: 'default' },
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, variant } = jobStatusConfig[status]
  return <Badge variant={variant} dot>{label}</Badge>
}

// ─── Export default pour compatibilité ───────────────────────
export default StatusBadge
