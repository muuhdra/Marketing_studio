'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useSettings } from '@/lib/stores/settingsStore'
import { useToast } from '@/lib/stores/toastStore'
import { User, Building2, LogOut, Check } from 'lucide-react'

const LOCALES = [
  { id: 'fr-FR', label: '🇫🇷 Français' },
  { id: 'en-US', label: '🇺🇸 English' },
  { id: 'es-ES', label: '🇪🇸 Español' },
]

export default function SettingsView() {
  const router = useRouter()
  const toast = useToast()
  const studioName = useSettings((s) => s.studioName)
  const locale = useSettings((s) => s.locale)
  const setSettings = useSettings((s) => s.setSettings)

  const [email, setEmail] = useState('')
  const [name, setName] = useState(studioName)
  const [saved, setSaved] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function saveStudio() {
    setSettings({ studioName: name.trim() || 'Studio UGC IA' })
    setSaved(true)
    toast.success('Paramètres enregistrés')
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="-mx-8 -mb-8 -mt-6 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        <header className="flex h-[56px] shrink-0 items-center border-b border-border px-5">
          <h1 className="text-[17px] font-extrabold tracking-tight text-text-primary">Paramètres</h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-[640px] flex-col gap-5">

            {/* Studio */}
            <div className="rounded-[14px] border border-border bg-fg/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-accent" />
                <h2 className="text-[14px] font-extrabold text-text-primary">Studio</h2>
              </div>

              <label className="mb-4 block">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Nom du studio</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Studio UGC IA"
                  className="h-9 w-full rounded-[8px] border border-border bg-bg-card px-3 text-[13px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
                <span className="mt-1.5 block text-[11px] font-medium text-text-muted">Affiché dans la barre latérale et le compte.</span>
              </label>

              <label className="block max-w-[280px]">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Langue</span>
                <select
                  value={locale}
                  onChange={(e) => setSettings({ locale: e.target.value })}
                  className="h-9 w-full rounded-[8px] border border-border bg-bg-card px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-accent"
                >
                  {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </label>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={saveStudio}
                  className="flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  {saved ? <><Check size={15} strokeWidth={2.8} /> Enregistré</> : 'Enregistrer'}
                </button>
              </div>
            </div>

            {/* Compte */}
            <div className="rounded-[14px] border border-border bg-fg/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2">
                <User size={16} className="text-accent" />
                <h2 className="text-[14px] font-extrabold text-text-primary">Compte</h2>
              </div>

              <div className="mb-4">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">Email</span>
                <div className="flex h-9 items-center rounded-[8px] border border-border bg-fg/[0.04] px-3 text-[13px] font-semibold text-text-secondary">
                  {email || '—'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 items-center gap-2 rounded-[9px] border border-coral/40 px-4 text-[13px] font-extrabold text-coral transition hover:bg-coral/10"
              >
                <LogOut size={15} strokeWidth={2.4} />
                Se déconnecter
              </button>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
