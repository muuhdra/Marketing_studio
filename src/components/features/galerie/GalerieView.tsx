'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { deleteAvatar } from '@/lib/actions/avatars'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbAvatar {
  id:               string
  name:             string
  age:              number | null
  ethnicity:        string | null
  style_tags:       string[] | null
  continuity_mode:  'evolutif' | 'verrouille'
  status:           'draft' | 'active' | 'archived'
  created_at:       Date | string
}

// Couleurs cycliques par index
const CARD_COLORS = [
  'border-purple shadow-neo-purple',
  'border-border-teal shadow-neo-teal',
  'border-border-coral shadow-neo-coral',
  'border-pink/40',
  'border-accent shadow-neo',
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function GalerieView({ avatars }: { avatars: DbAvatar[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const av = avatars.find((a) => a.id === selectedId)

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await deleteAvatar(id)
      setSelectedId(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="nb-label mb-2">Personnages IA</p>
          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary">
            Galerie Avatars
          </h1>
          <p className="text-[13px] text-text-muted mt-1">
            {avatars.length > 0
              ? `${avatars.length} personnage${avatars.length > 1 ? 's' : ''} · Cliquez pour voir les détails`
              : 'Aucun avatar — créez votre premier personnage IA'}
          </p>
        </div>
        <Link href="/avatar-studio">
          <Button>+ Créer un Avatar</Button>
        </Link>
      </div>

      {/* ── Empty state ── */}
      {avatars.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-neo-lg border-2 border-border flex items-center justify-center font-mono text-text-dim font-bold text-xl mb-5">
            IA
          </div>
          <p className="font-display font-bold text-[16px] text-text-primary mb-2">
            Aucun avatar pour l'instant
          </p>
          <p className="font-mono text-[12px] text-text-dim mb-6">
            Créez votre premier personnage IA dans le studio.
          </p>
          <Link href="/avatar-studio">
            <Button size="sm">Ouvrir l'Avatar Studio</Button>
          </Link>
        </div>
      )}

      {/* ── Grille ── */}
      {avatars.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {avatars.map((a, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length]
            const initials = a.name.slice(0, 2).toUpperCase()
            const tags = a.style_tags ?? []
            return (
              <div
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`
                  border-2 ${color} bg-bg-card rounded-neo-lg overflow-hidden cursor-pointer
                  transition-all duration-150
                  hover:-translate-x-px hover:-translate-y-px
                `}
              >
                {/* Avatar image placeholder */}
                <div className="h-[160px] bg-bg-elevated flex items-center justify-center relative border-b-2 border-inherit">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center font-mono text-text-dim font-bold text-sm">
                    {initials}
                  </div>
                  {a.status === 'active' && (
                    <div className="absolute top-3 right-3 font-mono text-[9px] font-bold text-teal border border-border-teal bg-teal/10 px-2 py-0.5 rounded">
                      Actif
                    </div>
                  )}
                  {a.status === 'draft' && (
                    <div className="absolute top-3 right-3 font-mono text-[9px] font-bold text-text-dim border border-border bg-bg-card px-2 py-0.5 rounded">
                      Brouillon
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-display font-bold text-[18px] text-text-primary mb-1">{a.name}</h3>
                  <p className="text-[12px] text-text-muted mb-4">
                    {a.age ? `${a.age} ans` : '—'}{a.ethnicity ? ` · ${a.ethnicity}` : ''}
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.slice(0, 3).map((t) => (
                        <span key={t} className="font-mono text-[9px] font-bold text-text-dim border border-border rounded px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[10px] font-bold ${a.continuity_mode === 'evolutif' ? 'text-teal' : 'text-purple'}`}>
                      {a.continuity_mode === 'evolutif' ? '◎ Évolutif' : '⊕ Verrouillé'}
                    </span>
                    <span className="font-mono text-[9px] text-text-dim">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Card "Créer un avatar" */}
          <Link href="/avatar-studio" className="block group">
            <div className="
              flex flex-col items-center justify-center
              bg-bg-surface border-2 border-dashed border-border rounded-neo-lg
              min-h-[280px] p-7
              transition-all duration-150
              group-hover:border-accent group-hover:bg-accent/5
              group-hover:-translate-x-px group-hover:-translate-y-px
            ">
              <div className="
                w-12 h-12 rounded-neo-md border-2 border-border
                flex items-center justify-center mb-3 text-xl
                group-hover:border-accent group-hover:text-accent text-text-dim
                transition-colors duration-150
              ">+</div>
              <span className="font-mono text-xs font-bold text-text-dim group-hover:text-accent transition-colors">
                Nouvel avatar
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Modal détail ── */}
      {av && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setSelectedId(null)}
        >
          <div
            className={`
              w-full max-w-[380px] bg-bg-card
              border-2 ${CARD_COLORS[avatars.findIndex((a) => a.id === av.id) % CARD_COLORS.length]}
              rounded-neo-lg overflow-hidden
              animate-slide-up
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo */}
            <div className="h-[200px] bg-bg-elevated flex items-center justify-center relative border-b-2 border-inherit">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center font-mono text-text-dim font-bold text-lg">
                {av.name.slice(0, 2).toUpperCase()}
              </div>
              {av.status === 'active' && (
                <Badge variant="teal" className="absolute top-5 right-5">Actif</Badge>
              )}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-5 left-5 w-8 h-8 rounded-neo border-2 border-border bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <h2 className="font-display font-bold text-[22px] text-accent mb-1">{av.name}</h2>
              <p className="text-[13px] text-text-muted mb-5">
                {av.age ? `${av.age} ans` : '—'}
                {av.ethnicity ? ` · ${av.ethnicity}` : ''}
                {av.continuity_mode === 'evolutif' ? ' · Évolutif' : ' · Verrouillé'}
              </p>

              {/* Tags */}
              {(av.style_tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {(av.style_tags ?? []).map((t) => (
                    <Badge key={t} variant="accent">{t}</Badge>
                  ))}
                </div>
              )}

              {/* Date */}
              <div className="bg-bg-surface border border-border rounded-neo p-3 mb-6">
                <p className="font-mono text-[10px] text-text-dim">
                  Créé le {new Date(av.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <Link href="/avatar-studio">
                  <Button fullWidth>✏ Modifier le profil</Button>
                </Link>
                <Button
                  variant="danger"
                  fullWidth
                  loading={deleting}
                  onClick={() => handleDelete(av.id)}
                >
                  🗑 Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
