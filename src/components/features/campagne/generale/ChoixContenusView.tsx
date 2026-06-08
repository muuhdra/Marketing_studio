'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { saveContentTypes } from '@/lib/actions/wizard'

type MarketingGroup = 'produit' | 'app' | null

interface ContentType {
  id: string
  label: string
  desc: string
  videoUrl?: string
}

const VIDEOS = {
  ugc:         'https://static.higgsfield.ai/marketing-studio-presets/ugc.mp4',
  tutorial:    'https://static.higgsfield.ai/marketing-studio-presets/ugc_how_to.mp4',
  unboxing:    'https://static.higgsfield.ai/marketing-studio-presets/ugc_unboxing.mp4',
  review:      'https://static.higgsfield.ai/marketing-studio-presets/product_review.mp4',
  hypermotion: 'https://static.higgsfield.ai/marketing-studio-presets/hyper-motion-mini.mp4',
  tvspot:      'https://static.higgsfield.ai/marketing-studio-presets/tv-spot-mini.mp4',
  tryon:       'https://static.higgsfield.ai/marketing-studio-presets/ugc_virtual_try_on.mp4',
  protryon:    'https://static.higgsfield.ai/marketing-studio-presets/virtual_try_on.mp4',
}

const PRODUIT_FORMATS: Record<string, { label: string; types: ContentType[] }> = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'ugc-social',   label: 'UGC',                desc: 'Realistic social media videos', videoUrl: VIDEOS.ugc         },
      { id: 'ugc-tutorial', label: 'Tutorials',          desc: 'Step-by-step tutorials',        videoUrl: VIDEOS.tutorial    },
      { id: 'ugc-unboxing', label: 'Unboxing',           desc: 'High-quality unboxing',         videoUrl: VIDEOS.unboxing    },
      { id: 'ugc-review',   label: 'Product Review',     desc: 'Authentic product reviews',     videoUrl: VIDEOS.review      },
      { id: 'ugc-tryon',    label: 'UGC Virtual Try on', desc: 'Try before you buy',            videoUrl: VIDEOS.tryon       },
    ],
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'com-hypermotion', label: 'Hyper motion',       desc: 'Highlight your product',      videoUrl: VIDEOS.hypermotion },
      { id: 'com-tvspot',      label: 'Tv spot',            desc: 'Authentic stories amplified', videoUrl: VIDEOS.tvspot      },
      { id: 'com-protryon',   label: 'Pro Virtual Try on', desc: 'Advanced virtual try-on',     videoUrl: VIDEOS.protryon    },
    ],
  },
  shooting: {
    label: 'Shooting photo',
    types: [
      { id: 'shoot-packshot',    label: 'Packshot / Fond blanc',      desc: 'Le standard e-commerce (Amazon, Etsy)' },
      { id: 'shoot-lifestyle',   label: 'Shooting Lifestyle',         desc: 'Le produit en utilisation réelle' },
      { id: 'shoot-mode',        label: 'Shooting Mode / Mannequin',  desc: 'Mise en valeur de la coupe et matière' },
      { id: 'shoot-flatlat',     label: 'Flat Lay / Vue de dessus',   desc: 'Produits disposés à plat avec props' },
      { id: 'shoot-macro',       label: 'Photo de Détails / Macro',   desc: 'Focalisé sur la texture et fonctionnalités' },
      { id: 'shoot-ghost',       label: 'Ghost Mannequin',            desc: 'Vêtement qui tient tout seul' },
      { id: 'shoot-avantapres',  label: 'Avant/Après Démonstration',  desc: 'Personnage montrant l\'efficacité' },
    ],
  },
}

const APP_FORMATS: Record<string, { label: string; types: ContentType[] }> = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'app-ugc-social',   label: 'UGC',           desc: 'Realistic social media videos', videoUrl: VIDEOS.ugc      },
      { id: 'app-ugc-tutorial', label: 'Tutorials',     desc: 'Step-by-step tutorials',        videoUrl: VIDEOS.tutorial },
      { id: 'app-ugc-review',   label: 'Product Review', desc: 'Authentic product reviews',    videoUrl: VIDEOS.review   },
    ],
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'app-com-hypermotion', label: 'Hyper motion', desc: 'Highlight your product',      videoUrl: VIDEOS.hypermotion },
      { id: 'app-com-tvspot',      label: 'Tv spot',      desc: 'Authentic stories amplified', videoUrl: VIDEOS.tvspot      },
    ],
  },
  visuel: {
    label: 'Visuel',
    types: [
      { id: 'app-vis-screenshots', label: 'Captures fonctionnelles',   desc: 'Interface épurée avec fonctionnalités clés' },
      { id: 'app-vis-storytelling', label: 'Captures Storytelling',    desc: 'Plusieurs images montrant un flux continu' },
      { id: 'app-vis-lifestyle',    label: 'Visuels en contexte',      desc: 'Vraies personnes utilisant l\'application' },
      { id: 'app-vis-mockup',       label: 'Visuels avec appareils',   desc: 'Interface intégrée dans un cadre smartphone' },
    ],
  },
}

const GROUPS = [
  { key: 'produit' as const, label: 'Product',  desc: 'E-commerce, physique, DTC',    border: 'border-accent',        activeBg: 'bg-accent/5',  color: 'text-accent',  badge: 'bg-accent/10 text-accent border-accent/30'  },
  { key: 'app'     as const, label: 'App',       desc: 'Applications mobiles & SaaS', border: 'border-border-purple', activeBg: 'bg-purple/5',  color: 'text-purple', badge: 'bg-purple/10 text-purple border-border-purple' },
]

export default function ChoixContenusView() {
  const router = useRouter()
  const { campaignId, step2, setStep2 } = useCampaignWizard()
  const [saving, setSaving] = useState(false)

  const [group, setGroup]               = useState<MarketingGroup>(step2.marketingGroup)
  const [activeFormat, setActiveFormat] = useState<string>('all')
  const [selected, setSelected]         = useState<Set<string>>(new Set(step2.selectedContentIds))
  const [modalOpen, setModalOpen]       = useState(false)

  const formats = group === 'produit' ? PRODUIT_FORMATS : group === 'app' ? APP_FORMATS : {}

  function toggleType(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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
              onClick={() => { setGroup(g.key); setActiveFormat('all'); setModalOpen(true) }}
              className={`
                relative p-6 rounded-neo-lg border-2 cursor-pointer transition-all duration-100
                ${group === g.key
                  ? `${g.border} ${g.activeBg} shadow-neo -translate-x-px -translate-y-px`
                  : 'border-border bg-bg-card hover:border-border-strong'
                }
              `}
            >
              <div className={`font-display font-bold text-[16px] mb-1 ${group === g.key ? g.color : 'text-text-primary'}`}>
                {g.label}
              </div>
              <div className="text-[12px] text-text-muted">{g.desc}</div>
              {selected.size > 0 && group === g.key && (
                <div className={`
                  mt-3 inline-block font-mono text-[10px] font-bold border rounded-neo px-2 py-0.5
                  ${g.badge}
                `}>
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
            className="w-full max-w-[1050px] max-h-[88vh] bg-bg-card border-2 border-border rounded-neo-lg flex flex-col overflow-hidden shadow-[6px_6px_0px_rgba(200,245,90,0.15)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-border">
              <div>
                <h2 className="font-display font-bold text-[14px] text-text-primary capitalize">
                  Configuration — {group}
                </h2>
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => setActiveFormat('all')}
                    className={`font-mono text-[10px] font-bold px-3 py-1 rounded-neo border-2 transition-all
                      ${activeFormat === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                  >
                    All
                  </button>
                  {Object.entries(formats).map(([key, fmt]) => (
                    <button
                      key={key}
                      onClick={() => setActiveFormat(key)}
                      className={`font-mono text-[10px] font-bold px-3 py-1 rounded-neo border-2 transition-all
                        ${activeFormat === key ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-neo border-2 border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
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
                      {/* Card */}
                      <div className={`
                        relative h-[240px] bg-bg-elevated rounded-neo-lg overflow-hidden border-2
                        transition-all duration-150
                        ${isSel ? 'border-accent shadow-neo' : 'border-border group-hover:border-border-strong'}
                      `}>
                        {type.videoUrl ? (
                          <video
                            autoPlay muted loop playsInline src={type.videoUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-bg-surface">
                            <div className="w-10 h-10 rounded-neo border-2 border-border" />
                          </div>
                        )}

                        {/* Checkmark */}
                        <div className={`
                          absolute top-3 right-3 w-8 h-8 rounded-neo border-2 flex items-center justify-center
                          text-[11px] font-bold transition-all
                          ${isSel ? 'bg-accent border-accent text-bg-base' : 'bg-black/40 border-border text-text-dim'}
                        `}>
                          {isSel ? '✓' : ''}
                        </div>

                        {/* Bottom gradient */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>

                      {/* Labels */}
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
            <div className="flex items-center justify-between px-6 py-4 border-t-2 border-border bg-bg-surface">
              <div className="font-mono text-[12px] text-text-muted">
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
      <div className="flex items-center justify-between mt-8 pt-5 border-t-2 border-border">
        <Button variant="ghost" onClick={() => router.push('/campagne/etape-1')}>
          ← Étape 1
        </Button>
        <div className="flex items-center gap-3">
          {selected.size === 0 && group && (
            <span className="font-mono text-[11px] text-amber">
              ⚠ Sélectionnez au moins un type
            </span>
          )}
          <Button
            disabled={!canAdvance || saving}
            loading={saving}
            onClick={async () => {
              if (!canAdvance) return
              const ids = Array.from(selected)
              setStep2({ marketingGroup: group, selectedContentIds: ids })
              // Persist en DB si campagne créée
              if (campaignId) {
                setSaving(true)
                try { await saveContentTypes(campaignId, ids) } catch { /* continue */ }
                setSaving(false)
              }
              router.push('/campagne/etape-3')
            }}
          >
            Suivant — Assigner les Avatars →
          </Button>
        </div>
      </div>
    </div>
  )
}
