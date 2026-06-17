'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const STORAGE_KEY = 'ms_last_email'

type Step = 'idle' | 'loading' | 'sent' | 'quick-loading'

export default function LoginView() {
  const [email, setEmail]         = useState('')
  const [step, setStep]           = useState<Step>('idle')
  const [error, setError]         = useState<string | null>(null)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)

  // Charge l'email mémorisé au montage (localStorage côté client uniquement)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSavedEmail(stored)
  }, [])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function sendMagicLink(target: string, quickStep: Step = 'loading') {
    setStep(quickStep)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: target.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStep('idle')
      setError(error.message)
    } else {
      // Mémorise l'email pour la prochaine fois
      localStorage.setItem(STORAGE_KEY, target.trim().toLowerCase())
      setSavedEmail(target.trim().toLowerCase())
      setStep('sent')
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    await sendMagicLink(email)
  }

  async function handleQuickConnect() {
    if (!savedEmail) return
    setEmail(savedEmail)
    await sendMagicLink(savedEmail, 'quick-loading')
  }

  function handleForgetEmail() {
    localStorage.removeItem(STORAGE_KEY)
    setSavedEmail(null)
    setShowForm(true)
    setEmail('')
  }

  // Détermine ce qu'on affiche dans la card
  const hasQuickConnect = !!savedEmail && !showForm
  const sentTo          = step === 'sent' ? (savedEmail ?? email) : email

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-5">

      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 bg-accent rounded-neo flex items-center justify-center shadow-neo">
            <div className="w-3 h-3 bg-bg-base rounded-neo" />
          </div>
          <span className="font-display font-bold text-[18px] text-text-primary tracking-tight">
            Marketing Studio
          </span>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border rounded-neo-lg p-8 shadow-neo">

          {/* ── Confirmation envoi ── */}
          {step === 'sent' ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-neo-lg border border-teal bg-teal/10 flex items-center justify-center text-2xl mx-auto mb-5 text-teal">
                ✓
              </div>
              <h1 className="font-display font-bold text-[20px] text-text-primary mb-2">
                Vérifie ta boîte mail
              </h1>
              <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                Un lien de connexion a été envoyé à<br />
                <span className="font-sans text-[12px] text-accent font-bold">{sentTo}</span>
              </p>
              <p className="font-sans text-[11px] text-text-dim">
                Le lien expire dans 1 heure.
              </p>
              <button
                onClick={() => { setStep('idle'); setEmail(''); setShowForm(!savedEmail) }}
                className="mt-6 font-sans text-[11px] text-text-muted hover:text-text-primary underline transition-colors"
              >
                Utiliser un autre email
              </button>
            </div>

          /* ── Connexion rapide (email mémorisé) ── */
          ) : hasQuickConnect ? (
            <>
              <div className="mb-7">
                <p className="nb-label mb-2">Accès privé</p>
                <h1 className="font-display font-bold text-[22px] text-text-primary mb-1">
                  Bon retour 
                </h1>
                <p className="text-[12.5px] text-text-muted">
                  Connexion en un clic avec ton compte habituel.
                </p>
              </div>

              {/* Bouton quick-connect */}
              <div className="flex items-center gap-3 bg-bg-surface border border-border rounded-neo-lg px-4 py-3 mb-4">
                <div className="w-9 h-9 rounded-neo border border-accent bg-accent/10 flex items-center justify-center font-sans text-[12px] font-bold text-accent flex-shrink-0">
                  {savedEmail!.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[12px] font-bold text-text-primary truncate">{savedEmail}</p>
                  <p className="font-sans text-[10px] text-text-dim">Compte mémorisé</p>
                </div>
              </div>

              {error && (
                <div className="bg-coral/5 border border-coral/30 rounded-neo px-3.5 py-2.5 mb-4">
                  <p className="font-sans text-[11px] text-coral">{error}</p>
                </div>
              )}

              <Button
                fullWidth
                size="lg"
                loading={step === 'quick-loading'}
                onClick={handleQuickConnect}
              >
                {step === 'quick-loading' ? 'Envoi du lien...' : 'Connexion rapide'}
              </Button>

              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-border" />
                <span className="font-sans text-[10px] text-text-dim">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={() => setShowForm(true)}
                className="w-full mt-4 font-sans text-[11px] text-text-muted hover:text-text-primary transition-colors text-center"
              >
                Utiliser un autre email →
              </button>

              <button
                onClick={handleForgetEmail}
                className="w-full mt-2 font-sans text-[10px] text-text-dim hover:text-text-muted transition-colors text-center"
              >
                Oublier ce compte
              </button>
            </>

          /* ── Formulaire standard ── */
          ) : (
            <>
              <div className="mb-7">
                <p className="nb-label mb-2">Accès privé</p>
                <h1 className="font-display font-bold text-[22px] text-text-primary mb-1">
                  Connexion
                </h1>
                <p className="text-[12.5px] text-text-muted">
                  Entre ton email — on t'envoie un lien magique.
                </p>
              </div>

              <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
                <Input
                  label="Adresse email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />

                {error && (
                  <div className="bg-coral/5 border border-coral/30 rounded-neo px-3.5 py-2.5">
                    <p className="font-sans text-[11px] text-coral">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={step === 'loading'}
                  disabled={!email.trim() || step === 'loading'}
                  fullWidth
                  size="lg"
                >
                  {step === 'loading' ? 'Envoi...' : 'Envoyer le lien magique'}
                </Button>
              </form>

              {savedEmail && (
                <button
                  onClick={() => setShowForm(false)}
                  className="w-full mt-4 font-sans text-[11px] text-text-muted hover:text-text-primary transition-colors text-center"
                >
                  ← Revenir à la connexion rapide
                </button>
              )}

              <p className="font-sans text-[10px] text-text-dim text-center mt-5 leading-relaxed">
                Accès réservé. Si tu n'as pas d'invitation,<br />contacte l'administrateur.
              </p>
            </>
          )}
        </div>

        <p className="font-sans text-[10px] text-text-dim text-center mt-5">
          Marketing Studio · Usage privé
        </p>
      </div>
    </div>
  )
}
