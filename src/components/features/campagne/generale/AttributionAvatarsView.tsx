'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useCampaignWizard, type WardrobePick } from '@/lib/stores/campaignWizardStore'
import { saveAvatarAssignments } from '@/lib/actions/wizard'
import { actionGetAvatarLibrary } from '@/lib/actions/avatar-assets'
import { useToast } from '@/lib/stores/toastStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbAvatar {
  id:         string
  name:       string
  age:        number | null
  ethnicity:  string | null
  style_tags: string[] | null
  status:     'draft' | 'active' | 'archived'
}

interface LibItem { id: string; name: string; description: string | null }
interface AvatarLibrary { outfits: LibItem[]; environments: LibItem[] }

interface AvatarRow {
  id:             string
  name:           string
  label:          string
  tags:           string[]
  assignedRole:   string | null
  assignedFormat: string | null
  wardrobeMode:   'auto' | 'manual'
  outfitIds:      string[]   // sélection en mode manuel
  envIds:         string[]
}

const ROLES   = ['Visage principal', 'Mannequin produit', 'Personnage lifestyle', 'Soutien visuel', 'Narrateur', 'Démonstrateur']
const FORMATS = ['UGC Social Media', 'Hyper/Motion', 'Unboxing', 'UGC Virtual Try On', 'TV Spot', 'Tutorial', 'Pro Virtual Try On', 'Shooting Lifestyle', 'Posters & Illustrations']

function dbToRow(a: DbAvatar): AvatarRow {
  const parts = [a.age ? `${a.age} ans` : null, a.ethnicity].filter(Boolean)
  return {
    id: a.id, name: a.name, label: parts.join(' · ') || 'Avatar IA', tags: a.style_tags ?? [],
    assignedRole: null, assignedFormat: null,
    wardrobeMode: 'auto', outfitIds: [], envIds: [],
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttributionAvatarsView({ dbAvatars }: { dbAvatars: DbAvatar[] }) {
  const router = useRouter()
  const toast  = useToast()
  const { campaignId, step3, setStep3 } = useCampaignWizard()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!campaignId) {
      toast.error('Créez d\'abord votre campagne à l\'étape 1')
      router.replace('/campagne/etape-1')
    }
  }, [campaignId, router, toast])

  const [avatars, setAvatars] = useState<AvatarRow[]>(() => dbAvatars.map((a) => dbToRow(a)))

  // Ré-applique les assignations persistées après le mount (évite mismatch d'hydratation)
  useEffect(() => {
    if (step3.assignments.length === 0) return
    setAvatars((prev) =>
      prev.map((row) => {
        const saved = step3.assignments.find((x) => x.avatarId === row.id)
        return saved ? {
          ...row,
          assignedRole:   saved.role,
          assignedFormat: saved.format,
          wardrobeMode:   saved.wardrobeMode ?? 'auto',
          outfitIds:      (saved.outfits ?? []).map((o) => o.id),
          envIds:         (saved.environments ?? []).map((e) => e.id),
        } : row
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Bibliothèques (tenues/décors) chargées à la demande, par avatar
  const [libraries, setLibraries] = useState<Record<string, AvatarLibrary>>({})
  const [libLoading, setLibLoading] = useState(false)

  // Précharge les bibliothèques des avatars DÉJÀ assignés (retour sur l'étape) :
  // garantit que resolvePool dispose de la biblio fraîche au moment de sauvegarder.
  useEffect(() => {
    const ids = step3.assignments.map((a) => a.avatarId)
    if (ids.length === 0) return
    let alive = true
    ;(async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try { return [id, await actionGetAvatarLibrary(id)] as const } catch { return null }
        })
      )
      if (!alive) return
      setLibraries((p) => {
        const next = { ...p }
        for (const r of results) if (r) next[r[0]] = r[1] as AvatarLibrary
        return next
      })
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Charge la bibliothèque de l'avatar sélectionné
  useEffect(() => {
    if (!selectedId || libraries[selectedId]) return
    let alive = true
    setLibLoading(true)
    ;(async () => {
      try {
        const lib = await actionGetAvatarLibrary(selectedId)
        if (alive) setLibraries((p) => ({ ...p, [selectedId]: lib as AvatarLibrary }))
      } catch { /* avatar sans bibliothèque accessible */ }
      finally { if (alive) setLibLoading(false) }
    })()
    return () => { alive = false }
  }, [selectedId, libraries])

  function patchRow(id: string, patch: Partial<AvatarRow>) {
    setAvatars((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a))
  }

  function assign(id: string, field: 'assignedRole' | 'assignedFormat', value: string) {
    setAvatars((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value === a[field] ? null : value } : a))
  }

  function toggleLibSel(id: string, field: 'outfitIds' | 'envIds', itemId: string) {
    setAvatars((prev) => prev.map((a) => {
      if (a.id !== id) return a
      const has = a[field].includes(itemId)
      return { ...a, [field]: has ? a[field].filter((x) => x !== itemId) : [...a[field], itemId] }
    }))
  }

  const selectedAvatar = avatars.find((a) => a.id === selectedId)
  const selectedLib    = selectedId ? libraries[selectedId] : undefined
  const assignedCount  = avatars.filter((a) => a.assignedRole || a.assignedFormat).length
  const hasAvatars     = dbAvatars.length > 0

  // Calcule le pool effectif (auto = toute la biblio, manual = sélection).
  // Si la bibliothèque n'est pas (encore) chargée, on PRÉSERVE le pool déjà sauvegardé
  // au lieu de calculer un pool vide — sinon un retour sur l'étape écraserait la garde-robe.
  function resolvePool(a: AvatarRow): { outfits: WardrobePick[]; environments: WardrobePick[] } {
    const lib = libraries[a.id]
    if (!lib) {
      const saved = step3.assignments.find((x) => x.avatarId === a.id)
      return { outfits: saved?.outfits ?? [], environments: saved?.environments ?? [] }
    }
    const pick = (items: LibItem[], ids: string[]) =>
      (a.wardrobeMode === 'manual' ? items.filter((i) => ids.includes(i.id)) : items)
        .map((i) => ({ id: i.id, name: i.name, description: i.description }))
    return { outfits: pick(lib.outfits, a.outfitIds), environments: pick(lib.environments, a.envIds) }
  }

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
              Définissez la mission, la garde-robe et les décors de chaque personnage pour votre production.
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
                className={`relative border rounded-neo-lg p-4 cursor-pointer transition-all duration-150
                  ${hasAssign ? 'border-border-teal bg-teal/[0.03]' : 'border-border bg-bg-card hover:border-border-strong'}`}
              >
                {hasAssign && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-neo bg-teal flex items-center justify-center text-[10px] font-bold text-bg-base">✓</div>
                )}
                <div className="w-full aspect-square rounded-neo-md bg-bg-elevated border border-border flex items-center justify-center mb-4">
                  <div className="w-14 h-14 rounded-full border border-dashed border-border flex items-center justify-center font-sans text-text-dim text-xs">IA</div>
                </div>
                <div className="font-display font-bold text-[14px] text-text-primary mb-0.5">{av.name}</div>
                <div className="text-[11px] text-text-muted mb-3">{av.label}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {av.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="font-sans text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">{tag}</span>
                  ))}
                </div>
                <div className="pt-3 border-t border-border">
                  {hasAssign ? (
                    <>
                      {av.assignedRole && (
                        <div className="flex items-center gap-1.5 text-[10px] text-teal font-semibold mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal" />{av.assignedRole}
                        </div>
                      )}
                      {av.assignedFormat && (
                        <div className="flex items-center gap-1.5 text-[10px] text-accent font-semibold mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />{av.assignedFormat}
                        </div>
                      )}
                      <div className="font-sans text-[9px] text-text-dim">
                        {av.wardrobeMode === 'auto' ? 'Garde-robe auto' : `${av.outfitIds.length} tenue(s) · ${av.envIds.length} décor(s)`}
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-text-dim italic">Aucune attribution</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add card → Avatar Studio */}
          <div
            onClick={() => router.push('/avatar-studio')}
            className="border border-dashed border-border bg-bg-surface rounded-neo-lg p-4 flex flex-col items-center justify-center cursor-pointer min-h-[240px] gap-3 hover:border-border-strong hover:bg-bg-elevated transition-all duration-150"
          >
            <div className="w-11 h-11 rounded-neo-md border border-border flex items-center justify-center text-text-dim text-xl">+</div>
            <div className="text-[12px] text-text-dim font-medium text-center">Nouveau Personnage</div>
            <div className="font-sans text-[9px] text-text-dim opacity-60">Avatar Studio →</div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => router.push('/campagne/etape-2')}>← Étape 2</Button>
          <div className="flex items-center gap-3">
            {!hasAvatars && <span className="font-sans text-[11px] text-amber">⚠ Créez d'abord des avatars dans le Studio</span>}
            {hasAvatars && assignedCount === 0 && <span className="font-sans text-[11px] text-amber">⚠ Veuillez assigner au moins un personnage</span>}
            <Button
              disabled={assignedCount === 0 || saving}
              loading={saving}
              onClick={async () => {
                if (assignedCount === 0 || !campaignId) return
                const assigned = avatars.filter((a) => a.assignedRole || a.assignedFormat)
                const payload = assigned.map((a) => {
                  const pool = resolvePool(a)
                  return {
                    avatarId: a.id, avatarName: a.name, role: a.assignedRole, format: a.assignedFormat,
                    wardrobeMode: a.wardrobeMode, outfits: pool.outfits, environments: pool.environments,
                  }
                })
                setStep3({ assignments: payload })
                setSaving(true)
                try {
                  await saveAvatarAssignments(
                    campaignId,
                    payload.map((a) => ({
                      avatarId: a.avatarId, role: a.role, format: a.format,
                      wardrobeMode: a.wardrobeMode, outfits: a.outfits, environments: a.environments,
                    }))
                  )
                  router.push('/campagne/etape-4')
                } catch (e: any) {
                  toast.error(e.message ?? 'Erreur lors de la sauvegarde des attributions')
                } finally {
                  setSaving(false)
                }
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
            className="w-full max-w-[680px] bg-bg-card border border-border rounded-neo-lg overflow-hidden shadow-neo grid grid-cols-[240px_1fr] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left preview */}
            <div className="bg-bg-elevated flex flex-col p-7 relative border-r border-border">
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 left-4 w-8 h-8 rounded-neo border border-border bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >×</button>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border border-dashed border-border flex items-center justify-center font-sans text-text-dim text-lg">IA</div>
              </div>
              <div>
                <div className="font-display font-bold text-[20px] text-text-primary mb-1">{selectedAvatar.name}</div>
                <div className="text-[12px] text-text-muted mb-3">{selectedAvatar.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAvatar.tags.map((t) => <Badge key={t} variant="accent">{t}</Badge>)}
                </div>
              </div>
            </div>

            {/* Right config */}
            <div className="p-7 max-h-[80vh] overflow-y-auto flex flex-col gap-6">
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-neo border cursor-pointer transition-all duration-100
                          ${isSel ? 'border-border-teal bg-teal/5' : 'border-border bg-bg-surface hover:border-border-strong'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${isSel ? 'border-teal bg-teal' : 'border-border'}`}>
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-bg-base" />}
                        </div>
                        <span className={`text-[12.5px] font-medium ${isSel ? 'text-teal' : 'text-text-secondary'}`}>{role}</span>
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
                        className={`font-sans text-[10px] font-bold px-3 py-1.5 rounded-neo border cursor-pointer transition-all duration-100
                          ${isSel ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                      >
                        {fmt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Garde-robe & Décors ── */}
              <div className="border-t border-border pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="nb-label">Garde-robe & Décors</p>
                  <div className="flex bg-bg-surface border border-border rounded-neo p-0.5 gap-0.5">
                    {([['auto', 'Automatique'], ['manual', 'Manuel']] as const).map(([m, lbl]) => (
                      <button
                        key={m}
                        onClick={() => patchRow(selectedAvatar.id, { wardrobeMode: m })}
                        className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border transition-all
                          ${selectedAvatar.wardrobeMode === m ? 'border-accent text-accent bg-accent/10' : 'border-transparent text-text-muted'}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {libLoading && !selectedLib ? (
                  <p className="font-sans text-[11px] text-text-dim">Chargement de la bibliothèque…</p>
                ) : selectedLib && (selectedLib.outfits.length > 0 || selectedLib.environments.length > 0) ? (
                  <>
                    {selectedAvatar.wardrobeMode === 'auto' ? (
                      <p className="font-sans text-[11px] text-text-secondary bg-bg-surface border border-border rounded-neo px-3 py-2.5 leading-relaxed">
                        Le système variera automatiquement l'avatar parmi ses{' '}
                        <span className="text-accent font-bold">{selectedLib.outfits.length}</span> tenue(s) et{' '}
                        <span className="text-accent font-bold">{selectedLib.environments.length}</span> décor(s).
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Tenues */}
                        <div>
                          <div className="font-sans text-[10px] text-text-dim mb-1.5">Tenues autorisées</div>
                          {selectedLib.outfits.length === 0 ? (
                            <p className="font-sans text-[10px] text-text-dim italic">Aucune tenue dans la garde-robe.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedLib.outfits.map((o) => {
                                const sel = selectedAvatar.outfitIds.includes(o.id)
                                return (
                                  <button key={o.id} onClick={() => toggleLibSel(selectedAvatar.id, 'outfitIds', o.id)}
                                    className={`font-sans text-[10px] font-bold px-2.5 py-1.5 rounded-neo border transition-all
                                      ${sel ? 'border-teal text-teal bg-teal/10' : 'border-border text-text-muted hover:border-border-strong'}`}>
                                    {sel ? '✓ ' : ''}{o.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        {/* Décors */}
                        <div>
                          <div className="font-sans text-[10px] text-text-dim mb-1.5">Décors autorisés</div>
                          {selectedLib.environments.length === 0 ? (
                            <p className="font-sans text-[10px] text-text-dim italic">Aucun décor enregistré.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedLib.environments.map((e) => {
                                const sel = selectedAvatar.envIds.includes(e.id)
                                return (
                                  <button key={e.id} onClick={() => toggleLibSel(selectedAvatar.id, 'envIds', e.id)}
                                    className={`font-sans text-[10px] font-bold px-2.5 py-1.5 rounded-neo border transition-all
                                      ${sel ? 'border-purple text-purple bg-purple/10' : 'border-border text-text-muted hover:border-border-strong'}`}>
                                    {sel ? '✓ ' : ''}{e.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {selectedAvatar.outfitIds.length === 0 && selectedAvatar.envIds.length === 0 && (
                          <p className="font-sans text-[10px] text-amber leading-relaxed">
                            ⚠ Aucune tenue ni décor sélectionné — l'avatar restera statique. Cochez-en, ou repassez en « Automatique ».
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-bg-surface border border-border rounded-neo px-3 py-2.5">
                    <p className="font-sans text-[10px] text-text-dim leading-relaxed">
                      Cet avatar n'a pas encore de garde-robe ni de décors.{' '}
                      <button onClick={() => router.push('/avatar-studio')} className="text-accent hover:underline">Configurer dans Avatar Studio →</button>
                    </p>
                  </div>
                )}
              </div>

              <Button fullWidth onClick={() => setSelectedId(null)}>Confirmer l'Attribution</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
