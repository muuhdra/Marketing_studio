'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/lib/stores/toastStore'
import { useSettings, DEFAULT_STUDIO_NAME, DEFAULT_THEME, type Theme } from '@/lib/stores/settingsStore'
import { useMediaStore } from '@/lib/stores/mediaStore'

interface Props {
  currentUser: { email: string; createdAt: string | null } | null
}

export default function ParametresView({ currentUser }: Props) {
  const toast  = useToast()
  const router = useRouter()

  // ── Réglages persistés ──
  const setSettings = useSettings((s) => s.setSettings)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ studioName: DEFAULT_STUDIO_NAME, locale: 'fr-FR' })
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Compteurs données locales (gatés mounted) ──
  const assetCount = useMediaStore((s) => s.assets.length)

  useEffect(() => {
    setMounted(true)
    useMediaStore.getState().loadFromServer()
    const s = useSettings.getState()
    setForm({ studioName: s.studioName, locale: s.locale })
    setTheme(s.theme)
    document.documentElement.lang = s.locale.split('-')[0]
  }, [])

  // Bascule de thème : persiste + applique immédiatement sur <html>.
  function applyTheme(next: Theme) {
    setTheme(next)
    setSettings({ theme: next })
    document.documentElement.dataset.theme = next
  }

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  function handleSave() {
    const studioName = form.studioName.trim() || DEFAULT_STUDIO_NAME
    setSettings({ studioName, locale: form.locale })
    document.documentElement.lang = form.locale.split('-')[0]
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  // ── Actions de nettoyage local ──
  function clearWizard() {
    if (!confirm('Vider le cache du wizard de campagne en cours ?')) return
    sessionStorage.removeItem('campaign-wizard')
    toast.success('Cache du wizard vidé')
  }
  async function clearMedia() {
    if (!confirm(`Supprimer définitivement les ${assetCount} contenu(s) généré(s) ? (fichiers + métadonnées Supabase)`)) return
    await useMediaStore.getState().clearAll()
    toast.success('Contenus générés supprimés')
  }

  const joinedFmt = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="animate-fade-in max-w-[680px]">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="nb-label mb-2">Configuration</p>
        <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">Paramètres</h1>
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Identité du studio ── */}
        <section className="bg-bg-card border border-border rounded-neo-lg p-6">
          <h2 className="font-display font-bold text-[15px] text-text-primary mb-1">Identité du studio</h2>
          <p className="font-sans text-[10px] text-text-dim mb-5">Le nom apparaît dans la barre latérale et l'en-tête.</p>
          <div className="flex flex-col gap-5">
            <Input
              label="Nom du studio"
              value={form.studioName}
              onChange={(e) => setForm((f) => ({ ...f, studioName: e.target.value }))}
            />
            <div>
              <label className="nb-label block mb-1.5">Langue</label>
              <select
                value={form.locale}
                onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
                className="nb-input text-[13px] py-2.5 px-3.5 max-w-[260px]"
              >
                <option value="fr-FR">Français (FR)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (GB)</option>
              </select>
              <p className="font-sans text-[10px] text-text-dim mt-1.5">Définit l'attribut de langue du document.</p>
            </div>
            <div>
              <Button onClick={handleSave} size="sm" disabled={!mounted}>
                {saved ? '✓ Enregistré' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Apparence ── */}
        <section className="bg-bg-card border border-border rounded-neo-lg p-6">
          <h2 className="font-display font-bold text-[15px] text-text-primary mb-1">Apparence</h2>
          <p className="font-sans text-[10px] text-text-dim mb-5">Thème de l'interface — appliqué immédiatement et mémorisé sur cet appareil.</p>
          <div className="grid grid-cols-2 gap-3 max-w-[420px]">
            {([
              { id: 'dark'  as Theme, label: 'Sombre',  sub: 'Bleu nuit',  sw: ['#080c18', '#0e1428', '#2dd4bf'] },
              { id: 'light' as Theme, label: 'Clair',   sub: 'Blanc',      sw: ['#ffffff', '#f4f6fb', '#0f9e86'] },
            ]).map((opt) => {
              const active = mounted && theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyTheme(opt.id)}
                  disabled={!mounted}
                  className={`text-left rounded-neo-lg border p-3.5 transition-all
                    ${active ? 'border-accent shadow-neo-sm' : 'border-border hover:border-border-strong'}`}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    {opt.sw.map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-neo border border-border" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                    {opt.label}
                    {active && <span className="font-sans text-[9px] text-accent">● actif</span>}
                  </p>
                  <p className="font-sans text-[10px] text-text-dim">{opt.sub}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Compte ── */}
        <section className="bg-bg-card border border-border rounded-neo-lg p-6">
          <h2 className="font-display font-bold text-[15px] text-text-primary mb-1">Compte</h2>
          <p className="font-sans text-[10px] text-text-dim mb-5">Accès géré via Supabase Auth — pas d'inscription publique.</p>
          {currentUser ? (
            <div className="flex items-center gap-4 p-4 rounded-neo-lg border border-border">
              <div className="w-10 h-10 rounded-neo-md border border-border bg-bg-elevated flex items-center justify-center font-sans text-[12px] font-bold text-accent flex-shrink-0">
                {currentUser.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[12px] font-bold text-text-primary truncate">{currentUser.email}</p>
                <p className="font-sans text-[10px] text-text-dim">Membre depuis : {joinedFmt}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>Déconnexion</Button>
            </div>
          ) : (
            <p className="font-sans text-[11px] text-text-dim">Non authentifié.</p>
          )}
          <p className="font-sans text-[10px] text-text-dim mt-4 bg-bg-surface border border-border rounded-neo p-3">
            Pour ajouter un membre : <strong className="text-text-secondary">Supabase → Authentication → Users</strong> (mot de passe ou magic link).
          </p>
        </section>

        {/* ── Données locales ── */}
        <section className="bg-bg-card border border-border-coral rounded-neo-lg p-6">
          <h2 className="font-display font-bold text-[15px] text-coral mb-1">Données & contenus</h2>
          <p className="font-sans text-[10px] text-text-dim mb-5">Cache local du wizard (navigateur) et contenus générés (Supabase, supprimés auto après 48h).</p>

          <div className="flex flex-col divide-y divide-border/50">
            {[
              { title: 'Cache du wizard de campagne', sub: 'État temporaire de la campagne en cours de création', action: clearWizard, count: null as number | null },
              { title: 'Contenus générés (Supabase)', sub: 'Images, vidéos et voix — supprimés automatiquement après 48h', action: clearMedia, count: assetCount },
            ].map((row) => (
              <div key={row.title} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-primary mb-0.5 flex items-center gap-2">
                    {row.title}
                    {mounted && row.count !== null && (
                      <span className="font-sans text-[9px] text-text-dim border border-border rounded-neo px-1.5 py-0.5">{row.count}</span>
                    )}
                  </p>
                  <p className="font-sans text-[10px] text-text-dim">{row.sub}</p>
                </div>
                <Button variant="danger" size="sm" onClick={row.action}>Vider</Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
