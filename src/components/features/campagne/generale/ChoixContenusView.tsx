'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { saveContentTypes } from '@/lib/actions/wizard'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { useToast } from '@/lib/stores/toastStore'
import { PRODUIT_FORMATS, APP_FORMATS } from '@/lib/content/taxonomy'

type MarketingGroup = 'produit' | 'app' | null

interface ContentType {
  id: string
  label: string
  desc: string
  kind?: 'video' | 'image'   // template DB
  url?: string               // preview (template DB)
  prompt?: string            // prompt source (template DB)
}

const GROUPS = [
  { key: 'produit' as const, label: 'Product', desc: 'E-commerce, physique, DTC',    border: 'border-accent',        activeBg: 'bg-accent/5', color: 'text-accent',  badge: 'bg-accent/10 text-accent border-accent/30'     },
  { key: 'app'     as const, label: 'App',     desc: 'Applications mobiles & SaaS', border: 'border-border-purple', activeBg: 'bg-purple/5', color: 'text-purple', badge: 'bg-purple/10 text-purple border-border-purple' },
]

export default function ChoixContenusView() {
  const router = useRouter()
  const toast  = useToast()
  const { campaignId, step2, setStep2 } = useCampaignWizard()
  const [saving, setSaving] = useState(false)

  const [group, setGroup]               = useState<MarketingGroup>(step2.marketingGroup)
  const [activeFormat, setActiveFormat] = useState<string>('all')
  const [selected, setSelected]         = useState<Set<string>>(new Set(step2.selectedContentIds))
  const [modalOpen, setModalOpen]       = useState(false)
  const [templates, setTemplates]       = useState<TemplateDTO[]>([])

  // Fix #1 — Guard : redirect si pas de campagne créée
  useEffect(() => {
    if (!campaignId) {
      toast.error('Créez d\'abord votre campagne à l\'étape 1')
      router.replace('/campagne/etape-1')
    }
  }, [campaignId, router, toast])

  // Templates DB (remplacent les previews ; repli sur la taxonomie codée si catégorie vide)
  useEffect(() => { listTemplates().then(setTemplates).catch(() => {}) }, [])

  const formats = useMemo(() => {
    const base = group === 'produit' ? PRODUIT_FORMATS : group === 'app' ? APP_FORMATS : {}
    const out: Record<string, { label: string; types: ContentType[] }> = {}
    for (const [key, fmt] of Object.entries(base)) {
      const tpl = templates.filter((t) => t.category === key)
      out[key] = {
        label: fmt.label,
        types: tpl.length > 0
          ? tpl.map((t) => ({ id: t.id, label: t.label, desc: t.description ?? '', kind: t.kind as 'video' | 'image', url: t.url, prompt: t.prompt ?? undefined }))
          : fmt.types,
      }
    }
    return out
  }, [group, templates])

  // Prompt source par id de template (pour pré-remplir la génération)
  const promptById = useMemo(() => new Map(templates.map((t) => [t.id, t.prompt])), [templates])

  // Catégorie (ugc/commercial/shooting/visuel) par id de carte — y compris UUID de template.
  const categoryById = useMemo(() => {
    const m = new Map<string, string>()
    for (const [key, fmt] of Object.entries(formats)) for (const t of fmt.types) m.set(t.id, key)
    return m
  }, [formats])

  // Les IDs de templates sont des UUID → on les ramène à un ID canonique que
  // `mapContentId` (côté serveur) sait classer, sinon tout serait enregistré en UGC.
  function canonicalId(id: string): string {
    const cat = categoryById.get(id)
    if (!cat) return id   // déjà un ID sémantique (repli taxonomie)
    const app = group === 'app'
    switch (cat) {
      case 'commercial': return app ? 'app-com-x' : 'com-x'
      case 'shooting':   return 'shoot-x'
      case 'visuel':     return 'app-vis-x'
      case 'ugc':        return app ? 'app-ugc-x' : 'ugc-x'
      default:           return id
    }
  }

  function toggleType(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Fix #3 — Vider la sélection si on change de groupe
  function handleGroupSelect(key: 'produit' | 'app') {
    if (group !== key) {
      setSelected(new Set())
    }
    setGroup(key)
    setActiveFormat('all')
    setModalOpen(true)
  }

  const displayedTypes = activeFormat === 'all'
    ? Object.values(formats).flatMap((f) => f.types)
    : formats[activeFormat]?.types ?? []

  const canAdvance = !!group && selected.size > 0

  return (
    <div>
      <StepBar current={2} />

      <div className="max-w-[900px] mx-auto pb-16">

        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
            Choix du type de Contenus
          </h1>
          <p className="text-[12.5px] text-text-muted">
            Sélectionnez le groupe marketing pour configurer les formats et types de contenus à produire
          </p>
        </div>

        {/* Groupe marketing */}
        <div className="grid grid-cols-2 gap-3.5 mb-8">
          {GROUPS.map((g) => (
            <div
              key={g.key}
              onClick={() => handleGroupSelect(g.key)}
              className={`
                relative p-6 rounded-neo-lg border cursor-pointer transition-all duration-100
                ${group === g.key
                  ? `${g.border} ${g.activeBg} shadow-neo`
                  : 'border-border bg-bg-card hover:border-border-strong'
                }
              `}
            >
              <div className={`font-display font-bold text-[16px] mb-1 ${group === g.key ? g.color : 'text-text-primary'}`}>
                {g.label}
              </div>
              <div className="text-[12px] text-text-muted">{g.desc}</div>
              {selected.size > 0 && group === g.key && (
                <div className={`mt-3 inline-block font-sans text-[10px] font-bold border rounded-neo px-2 py-0.5 ${g.badge}`}>
                  {selected.size} type{selected.size > 1 ? 's' : ''} configuré{selected.size > 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal sélection des types ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-[1050px] max-h-[88vh] bg-bg-card border border-border rounded-neo-lg flex flex-col overflow-hidden shadow-neo-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-[14px] text-text-primary capitalize">
                  Configuration — {group}
                </h2>
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => setActiveFormat('all')}
                    className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border transition-all
                      ${activeFormat === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                  >
                    All
                  </button>
                  {Object.entries(formats).map(([key, fmt]) => (
                    <button
                      key={key}
                      onClick={() => setActiveFormat(key)}
                      className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border transition-all
                        ${activeFormat === key ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {displayedTypes.map((type) => {
                  const isSel = selected.has(type.id)
                  return (
                    <div
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      className="flex flex-col gap-2.5 cursor-pointer group"
                    >
                      <div className={`
                        relative h-[240px] bg-bg-elevated rounded-neo-lg overflow-hidden border
                        transition-all duration-150
                        ${isSel ? 'border-accent shadow-neo' : 'border-border group-hover:border-border-strong'}
                      `}>
                        {type.url && type.kind === 'video' ? (
                          <video
                            autoPlay muted loop playsInline src={type.url}
                            className="w-full h-full object-cover"
                          />
                        ) : type.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={type.url} alt={type.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-bg-surface">
                            <div className="w-10 h-10 rounded-neo border border-border" />
                          </div>
                        )}
                        <div className={`
                          absolute top-3 right-3 w-8 h-8 rounded-neo border flex items-center justify-center
                          text-[11px] font-bold transition-all
                          ${isSel ? 'bg-accent border-accent text-bg-base' : 'bg-black/40 border-border text-text-dim'}
                        `}>
                          {isSel ? '✓' : ''}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                      <div className="px-1">
                        <div className={`text-[13px] font-bold ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                          {type.label}
                        </div>
                        <div className="text-[11.5px] text-text-muted mt-0.5 leading-snug">{type.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-surface">
              <div className="font-sans text-[12px] text-text-muted">
                {selected.size} élément{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
              </div>
              <Button size="sm" onClick={() => setModalOpen(false)}>
                Confirmer la sélection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
        <Button variant="ghost" onClick={() => router.push('/campagne/etape-1')}>
          ← Étape 1
        </Button>
        <div className="flex items-center gap-3">
          {selected.size === 0 && group && (
            <span className="font-sans text-[11px] text-amber">⚠ Sélectionnez au moins un type</span>
          )}
          <Button
            disabled={!canAdvance || saving}
            loading={saving}
            onClick={async () => {
              if (!canAdvance || !campaignId) return
              const ids = Array.from(selected)
              // Prompts des templates sélectionnés → pré-remplissage de la génération
              const seedPrompt = ids
                .map((id) => promptById.get(id))
                .filter((p): p is string => !!p && p.trim().length > 0)
                .join('\n\n')
              setStep2({ marketingGroup: group, selectedContentIds: ids, seedPrompt })
              setSaving(true)
              try {
                // Fix #4 — Erreur DB remontée avec toast, pas de redirect si échec
                // Canonicalise les UUID de templates → catégorie réelle (sinon tout en UGC)
                await saveContentTypes(campaignId, ids.map(canonicalId))
                router.push('/campagne/etape-3')
              } catch (e: any) {
                toast.error(e.message ?? 'Erreur lors de la sauvegarde des contenus')
              } finally {
                setSaving(false)
              }
            }}
          >
            Suivant — Assigner les Avatars →
          </Button>
        </div>
      </div>
    </div>
  )
}
