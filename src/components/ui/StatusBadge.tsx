type Status = 'active' | 'done' | 'pre' | 'draft'

// Couleurs via vars CSS (canaux RGB) → s'adaptent au thème (clair/sombre).
const config: Record<Status, { label: string; cssVar: string }> = {
  active:  { label: 'En cours',     cssVar: '--accent' },
  done:    { label: 'Terminée',     cssVar: '--teal' },
  pre:     { label: 'Pré-campagne', cssVar: '--purple' },
  draft:   { label: 'Brouillon',    cssVar: '--text-secondary' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const c = config[status]
  return (
    <span style={{
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 20,
      fontWeight: 500,
      color: `rgb(var(${c.cssVar}))`,
      background: `rgb(var(${c.cssVar}) / 0.10)`,
      border: `1px solid rgb(var(${c.cssVar}) / 0.22)`,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}