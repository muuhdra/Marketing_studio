type Status = 'active' | 'done' | 'pre' | 'draft'

const config: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  active:  { label: 'En cours',      color: '#c8f55a', bg: '#c8f55a14', border: '#c8f55a30' },
  done:    { label: 'Terminée',      color: '#5dcaa5', bg: '#5dcaa514', border: '#5dcaa530' },
  pre:     { label: 'Pré-campagne',  color: '#a09ae0', bg: '#7f77dd14', border: '#7f77dd30' },
  draft:   { label: 'Brouillon',     color: '#8888a4', bg: '#1e1e2e',   border: '#2a2a40'   },
}

export default function StatusBadge({ status }: { status: Status }) {
  const c = config[status]
  return (
    <span style={{
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 20,
      fontWeight: 500,
      color: c.color,
      background: c.bg,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}