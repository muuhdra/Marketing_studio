'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id:      string
  name:    string
  icon:    string
  env:     string
  masked:  string
  status:  'connected' | 'missing' | 'error'
  desc:    string
}

// ─── Data ────────────────────────────────────────────────────────────────────

const API_KEYS: ApiKey[] = [
  {
    id:     'aimlapi',
    name:   'AIML API',
    icon:   '⚡',
    env:    'AIMLAPI_KEY',
    masked: 'aiml-••••••••••••••••••••••••••••••••',
    status: 'connected',
    desc:   'Hub IA unifié — GPT-4o, Claude, Kling, ElevenLabs, Flux, Seedance via une seule clé',
  },
  {
    id:     'supabase',
    name:   'Supabase',
    icon:   '🗄️',
    env:    'NEXT_PUBLIC_SUPABASE_URL',
    masked: 'https://••••••••.supabase.co',
    status: 'connected',
    desc:   'Base de données, authentification, storage fichiers',
  },
  {
    id:     'resend',
    name:   'Resend',
    icon:   '📧',
    env:    'RESEND_API_KEY',
    masked: 're_••••••••••••••••••',
    status: 'missing',
    desc:   'Emails transactionnels (invitations équipe, notifications campagne)',
  },
]

// Modèles actifs dans Marketing Studio — tous via AIML API (une seule clé)
const AIML_MODELS = [
  {
    category: 'Texte & Scripts',
    icon:     '🧠',
    primary:  'Claude (Anthropic)',
    secondary: 'ChatGPT (OpenAI)',
    models:   ['claude-opus-4-5', 'claude-3-5-haiku', 'gpt-4o', 'gpt-4o-mini'],
    usage:    'Stratégie (Claude) · Scripts & Copy (ChatGPT)',
    color:    'text-accent border-accent/30 bg-accent/5',
  },
  {
    category: 'Génération Image',
    icon:     '🖼️',
    primary:  'Flux Pro (Black Forest Labs)',
    secondary: 'Nano Banana',
    models:   ['flux-pro/v1.1', 'flux/schnell', 'nanobanana'],
    usage:    'Visuels HD (Flux) · Moodboards & Thumbnails (Nano Banana)',
    color:    'text-teal border-border-teal bg-teal/5',
  },
  {
    category: 'Génération Vidéo',
    icon:     '🎬',
    primary:  'Kling AI (v2.1 Pro)',
    secondary: 'Seedance (ByteDance)',
    models:   ['kling-video/v2.1/pro', 'kling-video/v1.6/standard', 'seedance-1-pro', 'seedance-1-lite'],
    usage:    'UGC réaliste (Kling) · Cinématique (Seedance)',
    color:    'text-purple border-border-purple bg-purple/5',
  },
  {
    category: 'Voix & TTS',
    icon:     '🎙️',
    primary:  'ElevenLabs (Multilingual v2)',
    secondary: 'MiniMax Speech',
    models:   ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'minimax-speech-01', 'minimax-speech-01-hd'],
    usage:    'Clonage vocal (ElevenLabs) · TTS expressif (MiniMax)',
    color:    'text-coral border-border-coral bg-coral/5',
  },
  {
    category: 'Research Agent',
    icon:     '🔍',
    primary:  'Perplexity Sonar Pro',
    secondary: 'Sonar Reasoning',
    models:   ['perplexity/sonar', 'perplexity/sonar-pro', 'perplexity/sonar-reasoning'],
    usage:    'Veille web temps réel · Tendances · Formats viraux · Contexte avatar',
    color:    'text-amber border-amber/40 bg-amber/5',
  },
]

const STATUS_CONFIG = {
  connected: { label: 'Connecté',  dot: 'bg-teal',   text: 'text-teal',   border: 'border-border-teal'        },
  missing:   { label: 'Manquant',  dot: 'bg-amber',  text: 'text-amber',  border: 'border-amber/40'            },
  error:     { label: 'Erreur',    dot: 'bg-coral',  text: 'text-coral',  border: 'border-border-coral'        },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ParametresView() {
  const [activeSection, setActiveSection] = useState<'general' | 'api' | 'equipe' | 'systeme'>('general')
  const [showKey, setShowKey]             = useState<string | null>(null)

  // Champs "Général"
  const [studioName, setStudioName]   = useState('Marketing Studio')
  const [timezone, setTimezone]       = useState('Europe/Paris')
  const [locale, setLocale]           = useState('fr-FR')
  const [saved, setSaved]             = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const NAV = [
    { id: 'general',  label: 'Général',         icon: '⚙' },
    { id: 'api',      label: 'Clés API',         icon: '🔑' },
    { id: 'equipe',   label: 'Équipe',           icon: '👥' },
    { id: 'systeme',  label: 'Système',          icon: '🖥' },
  ] as const

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="nb-label mb-2">Configuration</p>
        <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">
          Paramètres
        </h1>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6">

        {/* ── Sidebar nav ── */}
        <div className="flex flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveSection(n.id)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-neo-md text-left
                font-mono text-[12px] font-bold transition-all duration-150
                ${activeSection === n.id
                  ? 'bg-accent text-bg-base shadow-neo-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }
              `}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ── */}
        <div className="min-w-0">

          {/* ── Général ── */}
          {activeSection === 'general' && (
            <div className="bg-bg-card border-2 border-border rounded-neo-lg p-6">
              <h2 className="font-display font-bold text-[16px] text-text-primary mb-6">
                Paramètres généraux
              </h2>
              <div className="flex flex-col gap-5 max-w-[500px]">
                <Input
                  label="Nom du studio"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                />
                <div>
                  <label className="nb-label block mb-1.5">Fuseau horaire</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="nb-input text-[13px] py-2.5 px-3.5"
                  >
                    <option value="Europe/Paris">Europe/Paris (UTC+2)</option>
                    <option value="America/New_York">America/New_York (UTC-4)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-7)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  </select>
                </div>
                <div>
                  <label className="nb-label block mb-1.5">Locale</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="nb-input text-[13px] py-2.5 px-3.5"
                  >
                    <option value="fr-FR">Français (FR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (GB)</option>
                  </select>
                </div>
                <div className="pt-2">
                  <Button onClick={handleSave} size="sm">
                    {saved ? '✓ Enregistré' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeSection === 'api' && (
            <div className="bg-bg-card border-2 border-border rounded-neo-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-[16px] text-text-primary">
                  Clés API
                </h2>
                <p className="font-mono text-[11px] text-text-dim">
                  Gérées via les variables d'environnement Vercel
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {API_KEYS.map((k) => {
                  const cfg = STATUS_CONFIG[k.status]
                  return (
                    <div
                      key={k.id}
                      className={`
                        flex items-center gap-4 p-4 rounded-neo-lg border-2 transition-all
                        ${k.status === 'connected' ? 'border-border hover:border-border-strong' : cfg.border}
                        ${k.status === 'missing' ? 'bg-amber/[0.03]' : ''}
                      `}
                    >
                      {/* Icon + name */}
                      <div className="text-2xl flex-shrink-0">{k.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[12px] font-bold text-text-primary">{k.name}</span>
                          <span className={`flex items-center gap-1 font-mono text-[9px] font-bold ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-text-dim">{k.desc}</p>
                        {k.status !== 'missing' && (
                          <p className="font-mono text-[10px] text-text-dim mt-1 truncate">
                            {showKey === k.id ? k.env + '=...' : k.masked}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {k.status === 'missing' ? (
                          <a
                            href="https://vercel.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] font-bold text-amber border border-amber/40 rounded-neo px-2.5 py-1.5 hover:bg-amber/10 transition-colors"
                          >
                            Configurer →
                          </a>
                        ) : (
                          <button
                            onClick={() => setShowKey(showKey === k.id ? null : k.id)}
                            className="font-mono text-[10px] text-text-dim border border-border rounded-neo px-2.5 py-1.5 hover:border-border-strong hover:text-text-secondary transition-colors"
                          >
                            {showKey === k.id ? 'Masquer' : '👁'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AIML Models — 4 catégories */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-display font-bold text-[14px] text-text-primary">
                    Modèles actifs via AIML API
                  </h3>
                  <span className="font-mono text-[9px] font-bold text-accent border border-accent/40 bg-accent/5 px-2 py-0.5 rounded-neo">
                    1 clé · 9 modèles
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {AIML_MODELS.map((cat) => (
                    <div key={cat.category} className={`rounded-neo-lg border-2 p-4 ${cat.color}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{cat.icon}</span>
                        <p className="font-mono text-[10px] font-bold opacity-90">{cat.category}</p>
                      </div>
                      <div className="mb-2.5">
                        <p className="font-display font-bold text-[12px]">{cat.primary}</p>
                        <p className="font-mono text-[10px] opacity-60">+ {cat.secondary}</p>
                      </div>
                      <p className="font-mono text-[9px] opacity-60 mb-2 leading-relaxed">{cat.usage}</p>
                      <div className="flex flex-wrap gap-1">
                        {cat.models.map((m) => (
                          <span key={m} className="font-mono text-[8px] px-1.5 py-0.5 rounded border border-current/20 bg-bg-base/20">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 bg-bg-surface border border-border rounded-neo p-4">
                <p className="font-mono text-[11px] text-text-dim">
                  💡 Les clés API sont lues depuis les variables d'environnement.
                  Elles ne sont jamais exposées côté client.
                  Pour les modifier : <strong className="text-text-secondary">Vercel → Settings → Environment Variables</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── Équipe ── */}
          {activeSection === 'equipe' && (
            <div className="bg-bg-card border-2 border-border rounded-neo-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-[16px] text-text-primary">Équipe</h2>
                <p className="font-mono text-[10px] text-text-dim">Accès géré via Supabase Auth</p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { email: 'zutgame@gmail.com', role: 'Admin',        joined: 'Juin 2026', active: true  },
                  { email: 'user2@example.com',  role: 'Collaborateur', joined: '—',        active: false },
                ].map((u) => (
                  <div key={u.email} className={`flex items-center gap-4 p-4 rounded-neo-lg border-2 ${u.active ? 'border-border' : 'border-border/50 opacity-60'}`}>
                    <div className="w-9 h-9 rounded-neo-md border-2 border-border bg-bg-elevated flex items-center justify-center font-mono text-[11px] font-bold text-accent">
                      {u.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px] font-bold text-text-primary truncate">{u.email}</p>
                      <p className="font-mono text-[10px] text-text-dim">Rejoint : {u.joined}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] font-bold px-2 py-1 rounded border ${
                        u.role === 'Admin'
                          ? 'text-accent border-accent bg-accent/10'
                          : 'text-text-muted border-border'
                      }`}>
                        {u.role}
                      </span>
                      {u.active && (
                        <span className="flex items-center gap-1 font-mono text-[9px] text-teal">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                          Actif
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 bg-bg-surface border border-border rounded-neo p-4">
                <p className="font-mono text-[11px] text-text-dim">
                  👥 Pour inviter un nouveau membre, créez l'utilisateur directement dans
                  <strong className="text-text-secondary"> Supabase → Authentication → Users</strong> et assignez-lui un mot de passe ou envoyez un magic link.
                </p>
              </div>
            </div>
          )}

          {/* ── Système ── */}
          {activeSection === 'systeme' && (
            <div className="flex flex-col gap-4">
              <div className="bg-bg-card border-2 border-border rounded-neo-lg p-6">
                <h2 className="font-display font-bold text-[16px] text-text-primary mb-5">Informations système</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Framework',    value: 'Next.js 16 (App Router)'   },
                    { label: 'Runtime',      value: 'Node.js 20 · Vercel Edge'  },
                    { label: 'Base de données', value: 'Supabase + Drizzle ORM' },
                    { label: 'Auth',         value: 'Supabase Auth (Magic Link)' },
                    { label: 'Storage',      value: 'Supabase Storage'          },
                    { label: 'Déploiement',  value: 'Vercel (Production)'       },
                    { label: 'Version app',  value: 'v0.1.0 — Alpha'            },
                    { label: 'Environnement', value: process.env.NODE_ENV ?? 'development' },
                  ].map((r) => (
                    <div key={r.label} className="flex flex-col gap-1 py-3 border-b border-border/50 last:border-0">
                      <span className="nb-label">{r.label}</span>
                      <span className="font-mono text-[12px] text-text-primary">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-card border-2 border-border-coral rounded-neo-lg p-6">
                <h2 className="font-display font-bold text-[14px] text-coral mb-4">Zone dangereuse</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-text-primary mb-1">Vider le cache du wizard</p>
                    <p className="font-mono text-[11px] text-text-dim">Supprime l'état temporaire des campagnes en cours de création</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { sessionStorage.removeItem('campaign-wizard'); window.location.reload() }}
                  >
                    🗑 Vider
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
