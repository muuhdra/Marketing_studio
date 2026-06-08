'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { saveAvatarAssignments } from '@/lib/actions/wizard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbAvatar {
  id:         string
  name:       string
  age:        number | null
  ethnicity:  string | null
  style_tags: string[] | null
  status:     'draft' | 'active' | 'archived'
}

interface AvatarRow {
  id:             string
  name:           string
  label:          string   // affichage age/ethnicity
  tags:           string[]
  assignedRole:   string | null
  assignedFormat: string | null
}

const ROLES   = ['Visage principal', 'Mannequin produit', 'Personnage lifestyle', 'Soutien visuel', 'Narrateur', 'Démonstrateur']
const FORMATS = ['UGC Social Media', 'Hyper/Motion', 'Unboxing', 'UGC Virtual Try On', 'TV Spot', 'Tutorial', 'Pro Virtual Try On', 'Shooting Lifestyle', 'Posters & Illustrations']

function dbToRow(a: DbAvatar, saved?: { role: string | null; format: string | null }): AvatarRow {
  const parts = [a.age ? `${a.age} ans` : null, a.ethnicity].filter(Boolean)
  return {
    id:             a.id,
    name:           a.name,
    label:          parts.join(' · ') || 'Avatar IA',
    tags:           a.style_tags ?? [],
    assignedRole:   saved?.role   ?? null,
    assignedFormat: saved?.format ?? null,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttributionAvatarsView({ dbAvatars }: { dbAvatars: DbAvatar[] }) {
  const router = useRouter()
  const { campaignId, step3, setStep3 } = useCampaignWizard()
  const [saving, setSaving] = useState(false)

  // Initialise depuis les avatars DB + les assignements déjà en store
  const [avatars, setAvatars] = useState<AvatarRow[]>(() =>
    dbAvatars.map((a) => {
      const saved = step3.assignments.find((x) => x.avatarId === a.id)
      return dbToRow(a, saved ? { role: saved.role, format: saved.format } : undefined)
    })
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function assign(id: string, field: 'assignedRole' | 'assignedFormat', value: string) {
    setAvatars((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value === a[field] ? null : value } : a))
  }

  const selectedAvatar = avatars.find((a) => a.id === selectedId)
  const assignedCount  = avatars.filter((a) => a.assignedRole || a.assignedFormat).length
  const hasAvatars     = dbAvatars.length > 0

  return (
    <div>
      <StepBar current={3} />

      <div className="max-w-[1100px] mx-auto pb-20">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="nb-label mb-2">Étape 3</p>
            <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
              Attribution des Rôles
            </h1>
            <p className="text-[12.5px] text-text-muted max-w-[480px]">
              Définissez la mission de chaque personnage pour garantir la cohérence de votre production UGC.
            </p>
          </div>
          <div className="text-right">
            <div className="nb-label mb-1">Progression</div>
            <div className={`font-display font-bold text-[20px] ${assignedCount > 0 ? 'text-teal' : 'text-text-dim'}`}>
              {assignedCount} / {avatars.length}
              <span className="text-[12px] font-normal text-text-muted ml-1.5">assignés</span>
            </div>
          </div>
        </div>

        {/* Avatar grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-12">
          {avatars.map((av) => {
            const hasAssign = !!(av.assignedRole || av.assignedFormat)
            return (
              <div
                key={av.id}
                onClick={() => setSelectedId(av.id)}
                className={`
                  relative border-2 rounded-neo-lg p-4 cursor-pointer
                  transition-all duration-150
                  ${hasAssign
                    ? 'border-border-teal bg-teal/[0.03] shadow-neo-teal'
                    : 'border-border bg-bg-card hover:border-border-strong hover:-translate-x-px hover:-translate-y-px'
                  }
                `}
              >
                {hasAssign && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-neo bg-teal flex items-center justify-center text-[10px] font-bold text-bg-base">
                    ✓
                  </div>
                )}

                {/* Avatar placeholder */}
                <div className="w-full aspect-square rounded-neo-md bg-bg-elevated border-2 border-border flex items-center justify-center mb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center font-mono text-text-dim text-xs">
                    IA
                  </div>
                </div>

                <div className="font-display font-bold text-[14px] text-text-primary mb-0.5">{av.name}</div>
                <div className="text-[11px] text-text-muted mb-3">{av.label}</div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {av.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="font-mono text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-border">
                  {hasAssign ? (
                    <>
                      {av.assignedRole && (
                        <div className="flex items-center gap-1.5 text-[10px] text-teal font-semibold mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal" />
                          {av.assignedRole}
                        </div>
                      )}
                      {av.assignedFormat && (
                        <div className="flex items-center gap-1.5 text-[10px] text-accent font-semibold">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                          {av.assignedFormat}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[10px] text-text-dim italic">Aucune attribution</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add card */}
          <div className="border-2 border-dashed border-border bg-bg-surface rounded-neo-lg p-4 flex flex-col items-center justify-center cursor-pointer min-h-[240px] gap-3 hover:border-border-strong hover:bg-bg-elevated transition-all duration-150">
            <div className="w-11 h-11 rounded-neo-md border-2 border-border flex items-center justify-center text-text-dim text-xl">+</div>
            <div className="text-[12px] text-text-dim font-medium text-center">Nouveau Personnage</div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-6 border-t-2 border-border">
          <Button variant="ghost" onClick={() => router.push('/campagne/etape-2')}>
            ← Étape 2
          </Button>
          <div className="flex items-center gap-3">
            {!hasAvatars && (
              <span className="font-mono text-[11px] text-amber">
                ⚠ Créez d'abord des avatars dans le Studio
              </span>
            )}
            {hasAvatars && assignedCount === 0 && (
              <span className="font-mono text-[11px] text-amber">⚠ Veuillez assigner au moins un personnage</span>
            )}
            <Button
              disabled={assignedCount === 0 || saving}
              loading={saving}
              onClick={async () => {
                if (assignedCount === 0) return
                const assigned = avatars.filter((a) => a.assignedRole || a.assignedFormat)
                // Persiste dans le store Zustand
                setStep3({
                  assignments: assigned.map((a) => ({
                    avatarId:   a.id,
                    avatarName: a.name,
                    role:       a.assignedRole,
                    format:     a.assignedFormat,
                  })),
                })
                // Persiste en DB si une campagne est en cours
                if (campaignId) {
                  setSaving(true)
                  try {
                    await saveAvatarAssignments(
                      campaignId,
                      assigned.map((a) => ({ avatarId: a.id, role: a.assignedRole, format: a.assignedFormat }))
                    )
                  } catch { /* continue even if DB fails */ }
                  setSaving(false)
                }
                router.push('/campagne/etape-4')
              }}
            >
              Étape Suivante →
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal avatar ── */}
      {selectedAvatar && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-[660px] bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden shadow-neo grid grid-cols-[240px_1fr] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left preview */}
            <div className="bg-bg-elevated flex flex-col p-7 relative border-r-2 border-border">
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 left-4 w-8 h-8 rounded-neo border-2 border-border bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-border flex items-center justify-center font-mono text-text-dim text-lg">
                  IA
                </div>
              </div>
              <div>
                <div className="font-display font-bold text-[20px] text-text-primary mb-1">{selectedAvatar.name}</div>
                <div className="text-[12px] text-text-muted mb-3">{selectedAvatar.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAvatar.tags.map((t) => (
                    <Badge key={t} variant="accent">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Right config */}
            <div className="p-7 max-h-[78vh] overflow-y-auto flex flex-col gap-6">
              {/* Role */}
              <div>
                <p className="nb-label mb-3">Mission du Personnage</p>
                <div className="flex flex-col gap-2">
                  {ROLES.map((role) => {
                    const isSel = selectedAvatar.assignedRole === role
                    return (
                      <div
                        key={role}
                        onClick={() => assign(selectedAvatar.id, 'assignedRole', role)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-neo border-2 cursor-pointer
                          transition-all duration-100
                          ${isSel ? 'border-border-teal bg-teal/5' : 'border-border bg-bg-surface hover:border-border-strong'}
                        `}
                      >
                        <div className={`
                          w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                          ${isSel ? 'border-teal bg-teal' : 'border-border'}
                        `}>
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-bg-base" />}
                        </div>
                        <span className={`text-[12.5px] font-medium ${isSel ? 'text-teal' : 'text-text-secondary'}`}>
                          {role}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Format */}
              <div>
                <p className="nb-label mb-3">Format de Sortie</p>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((fmt) => {
                    const isSel = selectedAvatar.assignedFormat === fmt
                    return (
                      <button
                        key={fmt}
                        onClick={() => assign(selectedAvatar.id, 'assignedFormat', fmt)}
                        className={`
                          font-mono text-[10px] font-bold px-3 py-1.5 rounded-neo border-2 cursor-pointer
                          transition-all duration-100
                          ${isSel ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}
                        `}
                      >
                        {fmt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button fullWidth onClick={() => setSelectedId(null)}>
                Confirmer l'Attribution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
