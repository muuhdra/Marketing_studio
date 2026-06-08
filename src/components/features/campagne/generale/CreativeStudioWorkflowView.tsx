'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { finalizeCampaign } from '@/lib/actions/wizard'
import { useToast } from '@/lib/stores/toastStore'
import { actionGenerateScript, actionGetVideoStatus, actionSubmitVideo } from '@/lib/actions/ai'
import type { ScriptResult } from '@/lib/ai/text'
import type { VideoJob } from '@/lib/ai/video'

type AgentStatus = 'idle' | 'running' | 'done' | 'waiting' | 'error'

const AGENTS = [
  { id: 'orchestrator', name: 'Claude Orchestrator',  role: 'Analyse ADN & Stratégie',       status: 'done'    as AgentStatus },
  { id: 'script',       name: 'GPT-4o Copywriter',    role: 'Scénariste & Copywriter Hook',  status: 'waiting' as AgentStatus },
  { id: 'casting',      name: 'Directeur Casting',    role: 'Matching Avatar & Campagne',     status: 'waiting' as AgentStatus },
  { id: 'montage',      name: 'Kling v2.1 Pro',       role: 'Monteur Rythmique & Dynamique', status: 'waiting' as AgentStatus },
]

const AGENT_COLORS: Record<AgentStatus, string> = {
  done: 'bg-teal', running: 'bg-accent', waiting: 'bg-border', idle: 'bg-border', error: 'bg-coral'
} as any

const ALL_FORMATS = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'ugc-social',   label: 'UGC Social Media', desc: 'Realistic social media videos', videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/ugc.mp4'          },
      { id: 'ugc-tutorial', label: 'Tutorials',         desc: 'Step-by-step tutorials',        videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/ugc_how_to.mp4'  },
      { id: 'ugc-unboxing', label: 'Unboxing',          desc: 'High-quality unboxing',         videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/ugc_unboxing.mp4'},
      { id: 'ugc-review',   label: 'Product Review',    desc: 'Authentic product reviews',     videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/product_review.mp4'},
    ]
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'com-hypermotion', label: 'Hyper motion', desc: 'Highlight your product',      videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/hyper-motion-mini.mp4' },
      { id: 'com-tvspot',      label: 'Tv spot',      desc: 'Authentic stories amplified', videoUrl: 'https://static.higgsfield.ai/marketing-studio-presets/tv-spot-mini.mp4'      },
    ]
  }
}

const ASPECT_RATIOS = [
  { id: 'auto', label: 'Auto'  },
  { id: '16-9', label: '16:9'  },
  { id: '9-16', label: '9:16'  },
  { id: '4-3',  label: '4:3'   },
  { id: '1-1',  label: '1:1'   },
  { id: '21-9', label: '21:9'  },
]

const QUALITIES = ['480p', '720p', '1080p']

type SettingsTab = 'main' | 'aspect' | 'quality' | 'duration'
type FormatTab   = 'all' | 'ugc' | 'commercial'

export default function CreativeStudioWorkflowView() {
  const router = useRouter()
  const toast  = useToast()
  const { campaignId, step1, reset } = useCampaignWizard()

  const [prompt, setPrompt]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab]   = useState<SettingsTab>('main')
  const [finalizing, setFinalizing]     = useState(false)

  const [activeTab, setActiveTab]           = useState<FormatTab>('all')
  const [selectedFormat, setSelectedFormat] = useState(ALL_FORMATS.ugc.types[0])
  const [aspect, setAspect]                 = useState('9:16')
  const [quality, setQuality]               = useState('720p')

  // ── IA State ──────────────────────────────────────────────────────────────
  const [generating, setGenerating]   = useState(false)
  const [script, setScript]           = useState<ScriptResult | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(['done', 'waiting', 'waiting', 'waiting'])

  // Vidéo async
  const [videoJob, setVideoJob]       = useState<VideoJob | null>(null)
  const [videoPolling, setVideoPolling] = useState(false)
  const pollRef                        = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleGenerate() {
    if (!prompt.trim()) { toast.warning('Écris un prompt pour générer un contenu'); return }
    setGenerating(true)
    setScript(null)
    setVideoJob(null)

    // Activer les agents visuellement
    setAgentStatuses(['done', 'running', 'waiting', 'waiting'])

    try {
      const contentType = selectedFormat.id.startsWith('ugc') ? 'ugc'
        : selectedFormat.id.startsWith('com') ? 'commercial'
        : 'ugc'

      const result = await actionGenerateScript({
        campaignName: step1.name || 'Ma Campagne',
        campaignDna:  prompt,
        contentType,
        format:       'social',
        duration,
        platform:     'tiktok',
        language:     'fr',
      })

      setScript(result)
      setAgentStatuses(['done', 'done', 'running', 'waiting'])
      toast.success('Script généré par GPT-4o ✓')

      // Après 1s, marquer casting done
      setTimeout(() => setAgentStatuses(['done', 'done', 'done', 'waiting']), 1000)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la génération')
      setAgentStatuses(['done', 'error', 'waiting', 'waiting'])
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateVideo() {
    if (!script) return
    toast.info('Soumission du job vidéo (Kling v2.1)...')
    setAgentStatuses(['done', 'done', 'done', 'running'])

    try {
      const job = await actionSubmitVideo({
        prompt:       `${script.hook} ${script.voiceover}`,
        engine:       'kling',
        klingVersion: 'v1.6-standard',
        duration:     duration <= 10 ? 5 : 10,
        aspectRatio:  aspect === '9:16' ? '9:16' : aspect === '16:9' ? '16:9' : '1:1',
      })
      setVideoJob(job)
      toast.info(`Job soumis (ID: ${job.generationId.slice(0, 8)}...) — polling toutes les 10s`)

      // Polling toutes les 10s
      pollRef.current = setInterval(async () => {
        try {
          const status = await actionGetVideoStatus(job.generationId)
          setVideoJob(status)
          if (status.status === 'completed') {
            clearInterval(pollRef.current!)
            setVideoPolling(false)
            setAgentStatuses(['done', 'done', 'done', 'done'])
            toast.success('Vidéo générée ! ✦')
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current!)
            setVideoPolling(false)
            setAgentStatuses(['done', 'done', 'done', 'error'])
            toast.error('Échec de génération vidéo')
          }
        } catch { /* silently retry */ }
      }, 10_000)
      setVideoPolling(true)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur soumission vidéo')
      setAgentStatuses(['done', 'done', 'done', 'error'])
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      if (campaignId) {
        const updated = await finalizeCampaign(campaignId)
        toast.success('Campagne finalisée — production lancée ✦')
        reset()
        router.push(`/campagne/${updated.id}`)
      } else {
        reset()
        router.push('/campagnes')
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la finalisation')
      setFinalizing(false)
    }
  }
  const [duration, setDuration]           = useState(15)

  const filteredTypes = activeTab === 'all'
    ? [...ALL_FORMATS.ugc.types, ...ALL_FORMATS.commercial.types]
    : ALL_FORMATS[activeTab].types

  return (
    <div className="min-h-screen flex flex-col">
      <StepBar current={4} />

      {/* Workspace */}
      <div className="flex-1 flex relative">

        {/* Left toolbar */}
        <div className="w-[66px] border-r-2 border-border bg-bg-surface flex flex-col items-center pt-5 gap-4">
          <div className="w-11 h-11 rounded-neo-lg border-2 border-border bg-bg-card flex items-center justify-center cursor-pointer hover:border-border-strong transition-colors">
            📦
          </div>
          <div className="w-11 h-11 rounded-neo-lg border-2 border-border bg-bg-card flex items-center justify-center cursor-pointer opacity-40 hover:opacity-70 transition-opacity">
            📱
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex-1 flex flex-col bg-bg-base relative">

          {/* Top bar */}
          <div className="px-9 py-5 flex items-center justify-between border-b-2 border-border">
            <h1 className="font-display font-bold text-[20px] text-text-primary">
              Creative Studio <span className="text-accent font-normal opacity-80">— Production</span>
            </h1>
            <div className="flex gap-2">
              {AGENTS.slice(0, 4).map((ag, i) => (
                <div key={ag.id} className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border-2 border-border rounded-neo-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${AGENT_COLORS[agentStatuses[i]] || 'bg-border'} ${agentStatuses[i] === 'running' ? 'animate-pulse-dot' : ''}`} />
                  <span className="text-[11px] text-text-secondary">{ag.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
            {/* État vide */}
            {!generating && !script && !videoJob && (
              <div className="w-full max-w-[880px] h-[380px] bg-bg-card border-2 border-border border-dashed rounded-neo-lg flex items-center justify-center">
                <div className="text-center opacity-30">
                  <div className="text-5xl mb-4">🎬</div>
                  <div className="font-mono text-[13px] uppercase text-text-dim tracking-widest">
                    Écris un prompt → GENERATE
                  </div>
                </div>
              </div>
            )}

            {/* Génération en cours */}
            {generating && (
              <div className="w-full max-w-[880px] h-[380px] bg-bg-card border-2 border-accent/40 rounded-neo-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4 animate-pulse">✦</div>
                  <div className="font-display font-bold text-[15px] text-accent mb-2">
                    GPT-4o génère votre script...
                  </div>
                  <div className="font-mono text-[11px] text-text-dim">Analyse ADN · Rédaction · Optimisation hook</div>
                </div>
              </div>
            )}

            {/* Résultat script */}
            {script && !videoJob && (
              <div className="w-full max-w-[920px] animate-fade-in">
                <div className="grid grid-cols-[1fr_340px] gap-5">
                  {/* Script principal */}
                  <div className="bg-bg-card border-2 border-accent/30 rounded-neo-lg p-6">
                    {/* Hook */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">🎯 Hook (0-3s)</span>
                        <span className="font-mono text-[9px] text-text-dim border border-border rounded px-1.5 py-0.5">Accroche</span>
                      </div>
                      <p className="font-display font-bold text-[18px] text-accent leading-snug">{script.hook}</p>
                    </div>

                    {/* Script */}
                    <div className="mb-5">
                      <span className="font-mono text-[9px] font-bold text-text-dim uppercase tracking-widest block mb-2">📝 Script complet</span>
                      <div className="bg-bg-surface border border-border rounded-neo p-4 font-mono text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                        {script.script}
                      </div>
                    </div>

                    {/* Voiceover */}
                    <div className="mb-5">
                      <span className="font-mono text-[9px] font-bold text-text-dim uppercase tracking-widest block mb-2">🎙️ Voix off</span>
                      <p className="text-[13px] text-text-muted italic leading-relaxed">{script.voiceover}</p>
                    </div>

                    {/* CTA + Hashtags */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-teal uppercase tracking-widest block mb-1.5">✦ CTA</span>
                        <p className="font-display font-bold text-[14px] text-teal">{script.cta}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end max-w-[220px]">
                        {script.hashtags.map((h) => (
                          <span key={h} className="font-mono text-[9px] text-accent/70 border border-accent/20 rounded px-1.5 py-0.5">#{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Panel droite */}
                  <div className="flex flex-col gap-4">
                    {/* Métadonnées */}
                    <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
                      <p className="nb-label mb-3">Paramètres</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Format',   value: selectedFormat.label },
                          { label: 'Durée',    value: `~${script.duration}s` },
                          { label: 'Aspect',   value: aspect },
                          { label: 'Qualité',  value: quality },
                          { label: 'Modèle',   value: 'GPT-4o via AIML API' },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-mono text-[10px] text-text-dim">{r.label}</span>
                            <span className="font-mono text-[10px] font-bold text-text-secondary">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleGenerateVideo}
                        disabled={videoPolling}
                        className="w-full h-12 rounded-neo-lg border-2 border-accent bg-accent text-bg-base font-bold text-[13px] flex items-center justify-center gap-2 hover:-translate-y-px hover:-translate-x-px transition-all shadow-neo disabled:opacity-50"
                      >
                        🎬 Générer la vidéo (Kling)
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="w-full h-10 rounded-neo-lg border-2 border-border text-text-muted font-mono text-[11px] hover:border-border-strong transition-colors"
                      >
                        ↺ Regénérer le script
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Video job en cours / terminé */}
            {videoJob && (
              <div className="w-full max-w-[880px] animate-fade-in">
                {videoJob.status !== 'completed' ? (
                  <div className="bg-bg-card border-2 border-accent/40 rounded-neo-lg p-8 flex flex-col items-center gap-5">
                    <div className="w-16 h-16 rounded-neo-lg border-2 border-accent bg-accent/10 flex items-center justify-center text-3xl animate-pulse">
                      🎬
                    </div>
                    <div className="text-center">
                      <p className="font-display font-bold text-[16px] text-text-primary mb-1">
                        Kling v2.1 génère votre vidéo...
                      </p>
                      <p className="font-mono text-[11px] text-text-dim">
                        Job ID: {videoJob.generationId.slice(0, 16)}... · Statut: {videoJob.status}
                      </p>
                    </div>
                    <div className="w-full max-w-[400px] h-1.5 bg-bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
                    </div>
                    <p className="font-mono text-[10px] text-text-dim">Polling toutes les 10s — peut prendre 2-5 min</p>
                    <button
                      onClick={() => { setVideoJob(null); setVideoPolling(false); if(pollRef.current) clearInterval(pollRef.current) }}
                      className="font-mono text-[10px] text-text-dim border border-border rounded-neo px-3 py-1.5 hover:border-border-strong"
                    >
                      ← Retour au script
                    </button>
                  </div>
                ) : (
                  <div className="bg-bg-card border-2 border-teal rounded-neo-lg overflow-hidden shadow-neo-teal">
                    {videoJob.videoUrl ? (
                      <video
                        src={videoJob.videoUrl}
                        controls
                        className="w-full max-h-[420px] object-contain bg-black"
                        poster={videoJob.thumbnailUrl}
                      />
                    ) : (
                      <div className="h-[280px] flex items-center justify-center">
                        <p className="font-mono text-text-dim">Vidéo disponible mais URL manquante</p>
                      </div>
                    )}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-teal">✓ Vidéo générée par Kling v2.1</p>
                        <p className="font-mono text-[10px] text-text-dim mt-0.5">ID: {videoJob.generationId.slice(0, 16)}...</p>
                      </div>
                      {videoJob.videoUrl && (
                        <a
                          href={videoJob.videoUrl}
                          download
                          className="font-mono text-[11px] font-bold text-teal border border-border-teal rounded-neo px-3 py-1.5 hover:bg-teal/10 transition-colors"
                        >
                          ↓ Télécharger
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Command bar */}
          <div className="relative px-9 pb-9">

            {/* Settings popover */}
            {settingsOpen && (
              <div className="absolute bottom-[130px] left-[260px] w-[260px] bg-bg-card border-2 border-border rounded-neo-lg p-3 shadow-neo z-50 animate-slide-up">
                {settingsTab === 'main' && (
                  <div className="flex flex-col gap-1">
                    {[
                      { label: 'Aspect ratio', value: aspect,       next: 'aspect'   as SettingsTab },
                      { label: 'Quality',      value: quality,      next: 'quality'  as SettingsTab },
                      { label: 'Duration',     value: `${duration}s`, next: 'duration' as SettingsTab },
                    ].map((item) => (
                      <div
                        key={item.label}
                        onClick={() => setSettingsTab(item.next)}
                        className="flex items-center justify-between px-3 py-3 rounded-neo-md bg-bg-surface border border-border cursor-pointer hover:bg-bg-elevated hover:border-border-strong transition-all"
                      >
                        <span className="text-[13px] text-text-secondary">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-text-primary">{item.value}</span>
                          <span className="text-text-dim text-[10px]">›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {settingsTab === 'aspect' && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <button onClick={() => setSettingsTab('main')} className="text-text-dim text-sm">←</button>
                      <span className="nb-label">Aspect Ratio</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <div
                          key={ar.id}
                          onClick={() => { setAspect(ar.label); setSettingsTab('main') }}
                          className={`px-3 py-2.5 rounded-neo border-2 cursor-pointer transition-all text-[13px] font-semibold text-center
                            ${aspect === ar.label ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                        >
                          {ar.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === 'quality' && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <button onClick={() => setSettingsTab('main')} className="text-text-dim text-sm">←</button>
                      <span className="nb-label">Quality</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {QUALITIES.map((q) => (
                        <div
                          key={q}
                          onClick={() => { setQuality(q); setSettingsTab('main') }}
                          className={`flex items-center justify-between px-3 py-3 rounded-neo border-2 cursor-pointer transition-all
                            ${quality === q ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong'}`}
                        >
                          <span className={`text-[14px] font-bold ${quality === q ? 'text-accent' : 'text-text-primary'}`}>{q}</span>
                          {quality === q && <span className="text-accent text-[12px]">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === 'duration' && (
                  <div className="animate-fade-in px-1">
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => setSettingsTab('main')} className="text-text-dim text-sm">←</button>
                      <span className="nb-label">Duration</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="font-display font-bold text-[28px] text-text-primary">{duration}<span className="text-[14px] font-normal text-text-muted">s</span></span>
                      <div className="flex gap-1.5">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">MIN 7s</span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">MAX 60s</span>
                      </div>
                    </div>
                    <input
                      type="range" min="7" max="60" value={duration}
                      onChange={(e) => setDuration(+e.target.value)}
                      className="w-full accent-accent"
                    />
                    <Button className="mt-4 w-full" size="sm" onClick={() => setSettingsTab('main')}>
                      Valider
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Main command bar */}
            <div className="bg-bg-card border-2 border-border rounded-neo-lg px-5 py-4 flex items-center gap-5 shadow-neo">
              {/* Input area */}
              <div className="flex-1 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Describe what happens in the ad..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-transparent border-none text-text-primary text-[14px] outline-none placeholder:text-text-dim"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border-2 border-border rounded-neo text-[11px] font-semibold text-text-muted hover:border-border-strong transition-colors"
                  >
                    👤 {selectedFormat.label} ▾
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border-2 border-border rounded-neo text-[11px] font-semibold text-text-muted hover:border-border-strong transition-colors">
                    🎯 Hook ▾
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border-2 border-border rounded-neo text-[11px] font-semibold text-text-muted hover:border-border-strong transition-colors">
                    🌐 Setting ▾
                  </button>
                  <button
                    onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab('main') }}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${settingsOpen ? 'border-coral bg-coral/20 text-coral' : 'border-border bg-bg-surface text-text-muted hover:border-border-strong'}`}
                  >
                    ⚙
                  </button>
                </div>
              </div>

              {/* Asset pickers */}
              <div className="flex gap-3">
                {[{ label: 'Product', icon: '📦' }, { label: 'Avatar', icon: '👤' }].map((item) => (
                  <div key={item.label} className="w-[76px] h-[76px] rounded-neo-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-border-strong transition-colors">
                    <span className="text-text-dim">{item.icon}</span>
                    <span className="font-mono text-[8px] text-text-dim font-bold uppercase">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="h-[76px] px-6 rounded-neo-lg border-2 border-accent bg-accent flex flex-col items-center justify-center gap-1 cursor-pointer shadow-neo hover:-translate-x-px hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
              >
                <div className="flex items-center gap-1.5 text-bg-base text-[13px] font-bold">
                  {generating ? '...' : 'GENERATE'} <span>{generating ? '⏳' : '✨'}</span>
                </div>
                <div className="text-bg-base/70 font-mono text-[11px] font-bold">
                  {generating ? 'GPT-4o...' : '🧠 AIML API'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-[66px] right-0 z-10 flex items-center justify-between px-6 py-3 bg-bg-surface/90 backdrop-blur-sm border-t-2 border-border">
        <button
          onClick={() => router.push('/campagne/etape-3')}
          className="font-mono text-[11px] text-text-dim hover:text-text-muted transition-colors"
        >
          ← Étape 3 — Avatars
        </button>
        <div className="flex items-center gap-3">
          {campaignId && (
            <span className="font-mono text-[10px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              Campagne sauvegardée
            </span>
          )}
          <Button
            size="sm"
            loading={finalizing}
            onClick={handleFinalize}
          >
            ✦ Finaliser la Campagne →
          </Button>
        </div>
      </div>

      {/* ── Format selector modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-10 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-[820px] max-h-[72vh] bg-bg-card border-2 border-border rounded-neo-lg flex flex-col overflow-hidden shadow-neo animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border">
              <div>
                <h2 className="font-display font-bold text-[15px] text-text-primary mb-2.5">Formats de Production</h2>
                <div className="flex gap-2">
                  {(['all', 'ugc', 'commercial'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-mono text-[10px] font-bold px-3 py-1 rounded-neo border-2 uppercase transition-all
                        ${activeTab === tab ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-neo border-2 border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >×</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4">
                {filteredTypes.map((type) => {
                  const isSel = selectedFormat.id === type.id
                  return (
                    <div
                      key={type.id}
                      onClick={() => { setSelectedFormat(type); setModalOpen(false) }}
                      className="flex flex-col gap-3 cursor-pointer group"
                    >
                      <div className={`relative h-[170px] bg-bg-elevated rounded-neo-lg overflow-hidden border-2 transition-all
                        ${isSel ? 'border-accent shadow-neo' : 'border-border group-hover:border-border-strong'}`}
                      >
                        {type.videoUrl && (
                          <video autoPlay muted loop playsInline src={type.videoUrl}
                            className="w-full h-full object-cover opacity-80" />
                        )}
                        <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-neo border-2 flex items-center justify-center text-[10px] font-bold
                          ${isSel ? 'bg-accent border-accent text-bg-base' : 'bg-black/40 border-border text-text-dim'}`}>
                          {isSel ? '✓' : ''}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="px-1">
                        <div className={`text-[12.5px] font-bold ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                          {type.label}
                        </div>
                        <div className="font-mono text-[10px] text-text-dim mt-0.5">{type.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
