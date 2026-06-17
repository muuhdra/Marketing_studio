/**
 * Objectif de volume de contenus — helpers partagés (campagne Générale & Spéciale).
 * Base de répartition : 1 mois = 4 semaines = 28 jours.
 */

export type TargetUnit = 'month' | 'week' | 'day'

export const TARGET_MULT: Record<TargetUnit, number> = { month: 1, week: 4, day: 28 }

export const TARGET_UNITS = [
  { key: 'month' as const, label: 'Mois' },
  { key: 'week'  as const, label: 'Semaine' },
  { key: 'day'   as const, label: 'Jour' },
]

/** Normalise (valeur, unité) → contenus par mois (entier), ou null si vide/≤0. */
export function toMonthlyTarget(value: number | null, unit: TargetUnit): number | null {
  if (value == null || value <= 0) return null
  return Math.round(value * TARGET_MULT[unit])
}

/** Affichage propre d'un nombre : entier sans décimale, sinon 2 décimales, virgule FR. */
export function fmtTargetNum(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
}
