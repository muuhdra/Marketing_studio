'use client'

import { useEffect } from 'react'
import { useLang } from '@/lib/i18n'

/** Reflète la langue choisie sur <html lang> (a11y + cohérence navigateur). */
export default function HtmlLangSync() {
  const lang = useLang()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return null
}
