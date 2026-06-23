'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import GenerationProgress from '@/components/ui/GenerationProgress'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import { actionGenerateStrategy } from '@/lib/actions/ai'
import type { StrategyResult } from '@/lib/ai/text'

// ─── Data statique ────────────────────────────────────────────────────────────

const STRATEGY_TEMPLATES = [
  { id: 'hook',        label: 'Hook Émotionnel UGC',    phase: 'launch',
    desc: "Capturer l'attention en 0-3 secondes avec une émotion forte. Structure hook → problème → solution → CTA.",
    dna: "Hook émotionnel fort · Problème identifiable · Solution claire · CTA urgent · Avatars authentiques" },
  { id: 'teasing',     label: 'Teasing Pré-lancement',  phase: 'pre',   
    desc: "Créer de l'anticipation avant le lancement. Mystère, révélation progressive, communauté.",
    dna: "Mystère · Teasers progressifs · Build communauté · Countdown · FOMO" },
  { id: 'scale',       label: 'Scale Winning Ads',      phase: 'scale', 
    desc: "Identifier les créas performantes et dupliquer les patterns gagnants à grande échelle.",
    dna: "Tests A/B systématiques · Patterns gagnants · Scale budget · Nouvelles variantes · ROAS optimisé" },
  { id: 'retargeting', label: 'Retargeting Post',        phase: 'post',  
    desc: "Reconquérir les visiteurs non convertis avec des messages personnalisés et preuves sociales.",
    dna: "Audiences chaudes · Social proof · Urgence · Objections levées · Offres exclusives" },
  { id: 'ugc-auth',    label: 'Authenticité UGC Pure',  phase: 'launch',
    desc: "Contenu 100% natif platform. Pas de surproduction, langage familier, prises de vue naturelles.",
    dna: "UGC natif · Pas de surproduction · Langage authentique · Formats natifs · Viralité organique" },
  { id: 'story',       label: 'Storytelling Produit',   phase: 'launch',
    desc: "Raconter l'histoire derrière le produit. Origine, valeurs, transformation client.",
    dna: "Histoire de marque · Valeurs · Transformation · Émotion · Connexion audience" },
]

type Phase = 'pre' | 'launch' | 'post' | 'scale'

const PHASES: Record<Phase, { label: string; variant: 'purple' | 'accent' | 'teal' | 'amber' }> = {
  pre:    { label: 'Pre-launch',  variant: 'purple' },
  launch: { label: 'Launch',      variant: 'accent'  },
  post:   { label: 'Post-launch', variant: 'teal'    },
  scale:  { label: 'Scale',       variant: 'amber'   },
}

// Classes complètes (littérales) — sinon Tailwind purge les classes construites dynamiquement
const PHASE_FILTER_ACTIVE: Record<Phase, string> = {
  pre:    'border-border-purple text-purple bg-purple/10',
  launch: 'border-accent text-accent bg-accent/10',
  post:   'border-border-teal text-teal bg-teal/10',
  scale:  'border-amber/50 text-amber bg-amber/10',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategieView() {
  const toast  = useToast()
  const router = useRouter()

  // Compose un ADN depuis la stratégie générée et lance la création de campagne pré-remplie
  function applyToCampaign() {
    if (!strat || !aiResult) return
    const adn = [
      `Approche stratégique : ${strat.label} (${PHASES[strat.phase as Phase].label})`,
      `Direction : ${strat.dna}`,
      '',
      aiResult.summary,
      aiResult.tips.length ? '\nConseils clés :\n' + aiResult.tips.map((t) => `- ${t}`).join('\n') : '',
    ].filter(Boolean).join('\n')
    // Récupéré par le sélecteur de type après reset() → injecté dans l'ADN de la campagne
    sessionStorage.setItem('pending-campaign-dna', adn)
    toast.success('Stratégie transférée — choisissez le type de campagne')
    router.push('/campaigns')
  }

  const [selected, setSelected]       = useState<string | null>(null)
  const [filterPhase, setFilterPhase] = useState<string | null>(null)

  // Formulaire génération IA
  const [campaignName, setCampaignName] = useState('')
  const [duration, setDuration]         = useState('4')
  const [avatarCount, setAvatarCount]   = useState('3')
  const [budget, setBudget]             = useState('')
  const [showForm, setShowForm]         = useState(false)

  // Résultat IA
  const [generating, setGenerating] = useState(false)
  const [aiResult, setAiResult]     = useState<StrategyResult | null>(null)
  const [activeTab, setActiveTab]   = useState<'phases' | 'kpis' | 'plan'>('phases')

  const strat    = STRATEGY_TEMPLATES.find((s) => s.id === selected)
  const filtered = filterPhase ? STRATEGY_TEMPLATES.filter((s) => s.phase === filterPhase) : STRATEGY_TEMPLATES

  async function generateStrategy() {
    if (!campaignName.trim() || !strat) return
    setGenerating(true)
    setAiResult(null)

    try {
      const result = await actionGenerateStrategy({
        campaignName:  campaignName.trim(),
        campaignDna:   strat.dna,
        contentTypes:  ['ugc', 'shooting', 'commercial'],
        avatarCount:   parseInt(avatarCount) || 3,
        duration:      parseInt(duration) || 4,
        budget:        budget ? parseInt(budget) : undefined,
        model:         'claude',
      })
      setAiResult(result)
      toast.success('Stratégie générée par Claude Opus')
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="nb-label mb-2">Bibliothèque</p>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary">
            Stratégie Marketing
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setShowForm(!showForm); setAiResult(null) }}
        >
          {showForm ? '← Retour bibliothèque' : 'Générer avec Claude'}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════ GÉNÉRATION IA ═══ */}
      {showForm && (
        <div className="animate-fade-in mb-7">

          {/* Banner IA */}
          <div className="flex items-center gap-3 p-4 bg-purple/5 border border-border-purple rounded-neo-lg mb-5">
            <div>
              <div className="font-display font-bold text-[13px] text-purple mb-0.5">Claude Opus 4 · Stratège IA</div>
              <div className="font-sans text-[10px] text-text-dim">
                Analyse votre campagne · Génère un plan complet avec phases, KPIs et calendrier de contenu
              </div>
            </div>
          </div>

          {/* Sélection template */}
          {!selected && (
            <div className="mb-5">
              <p className="nb-label mb-3">1. Choisissez un template stratégique</p>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGY_TEMPLATES.map((s) => {
                  const phase = PHASES[s.phase as Phase]
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s.id)}
                      className="flex items-start gap-3 p-3.5 rounded-neo border border-border text-left hover:border-purple hover:bg-purple/5 transition-all"
                    >
                      <div>
                        <div className="font-sans text-[11px] font-bold text-text-primary mb-0.5">{s.label}</div>
                        <div><Badge variant={phase.variant}>{phase.label}</Badge></div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selected && !aiResult && (
            <div className="grid grid-cols-2 gap-5">
              {/* Formulaire */}
              <div className="bg-bg-card border border-border rounded-neo-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="nb-label">2. Paramètres campagne</p>
                  <button onClick={() => setSelected(null)} className="font-sans text-[10px] text-text-dim hover:text-accent">
                    ← Changer de template
                  </button>
                </div>

                <div className="flex items-center gap-2.5 mb-5 p-3 bg-purple/5 border border-border-purple rounded-neo">
                  <div>
                    <div className="font-sans text-[11px] font-bold text-purple">{strat?.label}</div>
                    <div className="font-sans text-[9px] text-text-dim">{strat?.phase} · template sélectionné</div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Input
                    label="* Nom de la campagne"
                    placeholder="Ex: Sneakers Spring Drop 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Durée (semaines)"
                      type="number"
                      placeholder="4"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                    <Input
                      label="Nombre d'avatars"
                      type="number"
                      placeholder="3"
                      value={avatarCount}
                      onChange={(e) => setAvatarCount(e.target.value)}
                    />
                  </div>
                  <Input
                    label="Budget total (€ — optionnel)"
                    type="number"
                    placeholder="Ex: 5000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>

                <Button
                  className="mt-5"
                  fullWidth
                  onClick={generateStrategy}
                  loading={generating}
                  disabled={!campaignName.trim() || generating}
                >
                  {generating ? 'Claude analyse...' : 'Générer la stratégie'}
                </Button>
              </div>

              {/* Loading state */}
              {generating && (
                <GenerationProgress
                  steps={[{ key: 'analyse', label: 'Claude Opus — analyse stratégique' }]}
                  current={0}
                  active={generating}
                  accent="purple"
                  subLabel="Objectifs · Phases · KPIs · Plan de contenu"
                />
              )}

              {!generating && (
                <div className="bg-bg-card border border-border rounded-neo-lg p-5 opacity-50">
                  <p className="nb-label mb-3">Aperçu de la stratégie</p>
                  <div className="flex flex-col gap-2">
                    {['Phases & Timeline', 'KPIs & Objectifs', 'Plan de contenu hebdo', 'Conseils Claude'].map((item) => (
                      <div key={item} className="h-8 bg-bg-surface border border-border rounded-neo flex items-center px-3">
                        <span className="font-sans text-[11px] text-text-dim">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Résultat IA ── */}
          {aiResult && (
            <div className="animate-reveal flex flex-col gap-5">

              {/* Résumé */}
              <div className="bg-bg-card border border-border-purple rounded-neo-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-neo-md border border-border-purple bg-purple/15 flex items-center justify-center text-lg text-purple">
                    ●
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-purple">{campaignName}</h3>
                    <p className="font-sans text-[10px] text-text-dim">{strat?.label} · Généré par Claude Opus 4</p>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="purple">IA</Badge>
                  </div>
                </div>
                <p className="text-[12.5px] text-text-muted leading-relaxed">{aiResult.summary}</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {([['phases', 'Phases'], ['kpis', 'KPIs'], ['plan', 'Plan Contenu']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`font-sans text-[11px] font-bold px-4 py-2 rounded-neo border transition-all
                      ${activeTab === tab ? 'border-purple text-purple bg-purple/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Phases */}
              {activeTab === 'phases' && (
                <div className="grid grid-cols-3 gap-3">
                  {aiResult.phases.map((phase, i) => (
                    <div key={i} className="bg-bg-card border border-border rounded-neo-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-neo bg-purple/20 border border-border-purple flex items-center justify-center">
                          <span className="font-sans text-[10px] font-bold text-purple">{i + 1}</span>
                        </div>
                        <div>
                          <div className="font-display font-bold text-[12.5px] text-text-primary">{phase.name}</div>
                          <div className="font-sans text-[9px] text-text-dim">{phase.duration}</div>
                        </div>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {phase.actions.map((action, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                            <span className="text-[11px] text-text-muted leading-relaxed">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* KPIs */}
              {activeTab === 'kpis' && (
                <div className="grid grid-cols-2 gap-3">
                  {aiResult.kpis.map((kpi, i) => (
                    <div key={i} className="bg-bg-card border border-border rounded-neo-lg p-4 flex items-center justify-between">
                      <span className="text-[12px] text-text-secondary">{kpi.metric}</span>
                      <span className="font-display font-bold text-[14px] text-accent">{kpi.target}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Plan contenu */}
              {activeTab === 'plan' && (
                <div className="bg-bg-card border border-border rounded-neo-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-sans text-[10px] font-bold text-text-dim">SEMAINE</th>
                        <th className="px-4 py-3 text-left font-sans text-[10px] font-bold text-text-dim">TYPE</th>
                        <th className="px-4 py-3 text-left font-sans text-[10px] font-bold text-text-dim">QTÉ</th>
                        <th className="px-4 py-3 text-left font-sans text-[10px] font-bold text-text-dim">PLATEFORME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiResult.contentPlan.map((row, i) => (
                        <tr key={i} className="border-b border-fg/50 last:border-0 hover:bg-bg-surface transition-colors">
                          <td className="px-4 py-3 font-sans text-[11px] text-text-muted">S{row.week}</td>
                          <td className="px-4 py-3 text-[12px] text-text-primary">{row.type}</td>
                          <td className="px-4 py-3 font-display font-bold text-[13px] text-accent">{row.quantity}</td>
                          <td className="px-4 py-3">
                            <span className="font-sans text-[10px] text-text-dim border border-border px-2 py-0.5 rounded-neo capitalize">
                              {row.platform}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tips Claude */}
              {aiResult.tips.length > 0 && (
                <div className="bg-teal/5 border border-border-teal rounded-neo-lg p-5">
                  <p className="nb-label mb-3">Conseils Claude</p>
                  <ul className="flex flex-col gap-2">
                    {aiResult.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="text-teal font-bold flex-shrink-0">→</span>
                        <span className="text-[12px] text-teal/90 leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button fullWidth onClick={applyToCampaign}>Créer une campagne avec cet ADN</Button>
                <Button variant="secondary" fullWidth size="sm" onClick={() => { setAiResult(null); setSelected(null) }}>
                  Nouvelle stratégie
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ BIBLIOTHÈQUE ═══ */}
      {!showForm && (
        <>
          {/* Filtres phases */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilterPhase(null)}
              className={`font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border transition-all duration-100
                ${filterPhase === null ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
            >
              Toutes
            </button>
            {Object.entries(PHASES).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setFilterPhase(key === filterPhase ? null : key)}
                className={`font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border transition-all duration-100
                  ${filterPhase === key ? PHASE_FILTER_ACTIVE[key as Phase] : 'border-border text-text-muted hover:border-border-strong'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={`grid gap-5 ${selected ? 'grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>

            {/* Grille stratégies */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 content-start">
              {filtered.map((s) => {
                const phase = PHASES[s.phase as Phase]
                const isSel = selected === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelected(isSel ? null : s.id)}
                    className={`border rounded-neo-lg p-4 cursor-pointer transition-all duration-150
                      ${isSel
                        ? 'border-accent bg-accent/5 shadow-neo'
                        : 'border-border bg-bg-card hover:border-border-strong hover:shadow-neo-white'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-neo-md border border-border flex items-center justify-center text-lg text-text-dim">
                        ●
                      </div>
                      <Badge variant={phase.variant}>{phase.label}</Badge>
                    </div>
                    <h3 className={`font-display font-bold text-[13.5px] mb-1.5 ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                      {s.label}
                    </h3>
                    <p className="text-[11.5px] text-text-muted leading-relaxed">{s.desc}</p>
                    {isSel && <div className="mt-2 font-sans text-[10px] font-bold text-accent">✓ Sélectionnée</div>}
                  </div>
                )
              })}
            </div>

            {/* Panneau détail */}
            {strat && (
              <div className="sticky top-0 flex flex-col gap-3.5 animate-slide-in">
                <div className="border border-accent bg-bg-card rounded-neo-lg p-5 shadow-neo">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-neo-md border border-border flex items-center justify-center text-2xl flex-shrink-0 text-accent">
                      ●
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-[15px] text-accent mb-1">{strat.label}</h3>
                      <Badge variant={PHASES[strat.phase as Phase].variant}>
                        {PHASES[strat.phase as Phase].label}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-[12.5px] text-text-muted leading-relaxed mb-5">{strat.desc}</p>

                  <div className="bg-teal/5 border border-border-teal rounded-neo-lg p-3.5 mb-5">
                    <p className="nb-label mb-2">ADN Stratégique</p>
                    <p className="text-[11.5px] text-teal/80 leading-relaxed">{strat.dna}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      fullWidth
                      onClick={() => { setShowForm(true); }}
                    >
                      Générer avec Claude
                    </Button>
                    <Button variant="secondary" fullWidth size="sm" onClick={() => setSelected(null)}>
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
