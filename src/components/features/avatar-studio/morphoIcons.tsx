/* Illustrations SVG du moteur de création d'avatar (Avatar Studio).
   Icônes couleur (peau, cheveux, yeux, origine) + icônes silhouette (genre, longueur,
   texture, physique, style). viewBox 48×48, style ligne arrondie cohérent. */
import React from 'react'

const wrap = (children: React.ReactNode, fill = false) => (
  <svg viewBox="0 0 48 48" className="w-8 h-8" fill={fill ? undefined : 'none'}
       stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// ── Couleur : visage teinté (peau / origine) ──────────────────────────────────
export function FaceColor({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <circle cx="24" cy="24" r="16" fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <ellipse cx="18" cy="21" rx="1.8" ry="2.4" fill="rgba(0,0,0,.45)" />
      <ellipse cx="30" cy="21" rx="1.8" ry="2.4" fill="rgba(0,0,0,.45)" />
      <path d="M17 30 Q24 35 31 30" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Couleur : mèche de cheveux (3 mèches ; multicolore si « Coloré ») ──────────
export function HairColor({ color }: { color: string }) {
  // Un gradient CSS n'est pas un stroke SVG valide → pour « Coloré » on rend 3 mèches vives.
  const multi = !color.startsWith('#')
  const cols = multi ? ['#ff5d8f', '#ffd23f', '#4d96ff'] : [color, color, color]
  const stroke = (d: string, c: string) => <path d={d} fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      {stroke('M14 8 C 10 16, 18 20, 13 28 C 10 34, 16 36, 13 42', cols[0])}
      {stroke('M24 7 C 20 16, 28 20, 23 28 C 20 34, 26 36, 23 42', cols[1])}
      {stroke('M34 8 C 30 16, 38 20, 33 28 C 30 34, 36 36, 33 42', cols[2])}
    </svg>
  )
}

// ── Couleur : œil ─────────────────────────────────────────────────────────────
export function EyeColor({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <path d="M5 24 Q24 9 43 24 Q24 39 5 24 Z" fill="#fff" stroke="rgba(0,0,0,.3)" strokeWidth="1.6" />
      <circle cx="24" cy="24" r="8" fill={color} />
      <circle cx="24" cy="24" r="3.4" fill="#141414" />
      <circle cx="21.5" cy="21.5" r="1.3" fill="#ffffffcc" />
    </svg>
  )
}

// ── Silhouette : genre ────────────────────────────────────────────────────────
export function GenderIcon({ kind }: { kind: string }) {
  if (kind === 'Femme') return wrap(<>
    <circle cx="24" cy="12" r="6" />
    <path d="M16 22 H32 L38 42 H10 Z" />
  </>)
  if (kind === 'Homme') return wrap(<>
    <circle cx="24" cy="12" r="6" />
    <path d="M13 22 H35 L33 42 H15 Z" />
    <path d="M13 22 L11 30 M35 22 L37 30" />
  </>)
  // Androgyne
  return wrap(<>
    <circle cx="24" cy="12" r="6" />
    <rect x="15" y="22" width="18" height="20" rx="4" />
  </>)
}

// ── Silhouette : longueur de cheveux (tête + chevelure latérale qui s'allonge) ──
export function HairLenIcon({ kind }: { kind: string }) {
  const head = <circle cx="24" cy="19" r="9" />
  const hairFill = { fill: 'currentColor', fillOpacity: 0.3, stroke: 'none' } as const
  const cap = <path d="M14 19 Q14 6 24 6 Q34 6 34 19 Q29 12 24 12 Q19 12 14 19 Z" {...hairFill} />
  const sides = (y: number) => (
    <>
      <rect x="11" y="13" width="3.4" height={y - 13} rx="1.7" {...hairFill} />
      <rect x="33.6" y="13" width="3.4" height={y - 13} rx="1.7" {...hairFill} />
    </>
  )
  if (kind === 'Rasé') return wrap(
    <>{head}<g stroke="none" fill="currentColor" fillOpacity="0.4">
      <circle cx="20" cy="12" r="0.8" /><circle cx="24" cy="11" r="0.8" /><circle cx="28" cy="12" r="0.8" />
      <circle cx="22" cy="14" r="0.8" /><circle cx="26" cy="14" r="0.8" />
    </g></>)
  if (kind === 'Court')    return wrap(<>{cap}{head}</>)
  if (kind === 'Mi-long')  return wrap(<>{cap}{sides(30)}{head}</>)
  if (kind === 'Long')     return wrap(<>{cap}{sides(40)}{head}</>)
  return wrap(<>{cap}{sides(46)}{head}</>)   // Très long
}

// ── Silhouette : texture de cheveux (cuir chevelu + 3 mèches au motif distinct) ──
export function HairTexIcon({ kind }: { kind: string }) {
  const scalp = <path d="M9 13 Q24 7 39 13" fill="none" />
  const line = (d: string) => <path d={d} fill="none" />
  const strands = (mk: (x: number) => string) => [14, 24, 34].map((x) => <React.Fragment key={x}>{line(mk(x))}</React.Fragment>)
  let body: React.ReactNode
  if (kind === 'Raides')       body = strands((x) => `M${x} 13 V41`)
  else if (kind === 'Ondulés') body = strands((x) => `M${x} 13 Q${x + 5} 18 ${x} 23 Q${x - 5} 28 ${x} 33 Q${x + 5} 38 ${x} 41`)
  else if (kind === 'Bouclés') body = strands((x) => `M${x} 13 a3 3 0 1 1 0 6 a3 3 0 1 1 0 6 a3 3 0 1 1 0 6 a3 3 0 1 1 0 6 a3 3 0 1 1 0 6`)
  else                          body = strands((x) => `M${x} 13 l4 4 l-4 4 l4 4 l-4 4 l4 4 l-4 4 l4 4`)   // Crépus
  return wrap(<>{scalp}{body}</>)
}

// ── Silhouette : physique ─────────────────────────────────────────────────────
export function BuildIcon({ kind }: { kind: string }) {
  // Tête + cou + torse façonné (épaules → taille → hanches) pour une vraie silhouette
  const head = <><circle cx="24" cy="9" r="5" /><path d="M24 14 V18" /></>
  const bodies: Record<string, string> = {
    'Mince':      'M18 19 L30 19 L28 30 L29 39 L28 44 L20 44 L19 39 L20 30 Z',
    'Athlétique': 'M15 19 L33 19 L29 30 L30 39 L29 44 L19 44 L18 39 L19 30 Z',
    'Moyen':      'M17 19 L31 19 L30 30 L31 39 L30 44 L18 44 L17 39 L18 30 Z',
    'Pulpeux':    'M18 19 L30 19 L29 30 L33 39 L31 44 L17 44 L15 39 L19 30 Z',
    'Costaud':    'M15 19 L33 19 L33 30 L33 39 L32 44 L16 44 L15 39 L15 30 Z',
  }
  return wrap(<>{head}<path d={bodies[kind] ?? bodies['Moyen']} /></>)
}

// ── Style : t-shirt teinté ────────────────────────────────────────────────────
export function StyleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <path d="M18 9 L24 13 L30 9 L40 16 L35 22 L32 19 L32 40 H16 V19 L13 22 L8 16 Z"
            fill={color} stroke="rgba(0,0,0,.2)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
