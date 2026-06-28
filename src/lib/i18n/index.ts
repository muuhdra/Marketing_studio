'use client'

/**
 * i18n léger, sans dépendance — adapté à l'archi (locale = préférence client persistée
 * dans `useSettings`, composants majoritairement 'use client').
 *
 * Usage : const t = useT(); t('settings.title')  ·  t('greet.hello', { name })
 * Les clés manquantes retombent sur le français, puis sur la clé brute.
 */

import { useSettings } from '@/lib/stores/settingsStore'
import { fr } from './locales/fr'
import { en } from './locales/en'

export type Lang = 'fr' | 'en'
export type Dict = { [k: string]: string | Dict }

const DICTS: Record<Lang, Dict> = { fr, en }

/** 'fr-FR' → 'fr' ; valeur inconnue → 'fr'. */
export function toLang(locale: string | undefined): Lang {
  const short = (locale ?? '').split('-')[0].toLowerCase()
  return short === 'en' ? 'en' : 'fr'
}

function lookup(dict: Dict, path: string): string | undefined {
  const val = path.split('.').reduce<string | Dict | undefined>(
    (acc, k) => (acc && typeof acc !== 'string' ? acc[k] : undefined),
    dict,
  )
  return typeof val === 'string' ? val : undefined
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string

/** Hook de traduction réactif au locale courant. */
export function useT(): TFunc {
  const locale = useSettings((s) => s.locale)
  const lang = toLang(locale)
  return (key, vars) => {
    const s = lookup(DICTS[lang], key) ?? lookup(DICTS.fr, key) ?? key
    return interpolate(s, vars)
  }
}

/** Langue courante (hook) — utile pour `<html lang>` ou des formats. */
export function useLang(): Lang {
  return toLang(useSettings((s) => s.locale))
}
