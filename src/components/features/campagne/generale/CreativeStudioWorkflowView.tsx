'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { useElapsed } from '@/lib/hooks/useElapsed'
import { useCampaignWizard, type AvatarAssignment, type WardrobePick } from '@/lib/stores/campaignWizardStore'
import { persistOutput, deleteOutput } from '@/lib/actions/outputs'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { finalizeCampaign } from '@/lib/actions/wizard'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionResearchThenScript,
  actionGetVideoStatus,
  actionSubmitVideo,
  actionGenerateSpeech,
} from '@/lib/actions/ai'
import { actionGetAvatarLibrary, actionGetAvatarRefImage } from '@/lib/actions/avatar-assets'
import { listAvatarVoices } from '@/lib/actions/avatars'
import { getVoiceProfile } from '@/lib/ai/voice-catalog'
import type { ScriptResult } from '@/lib/ai/text'
import type { ResearchContext } from '@/lib/ai/research'
import type { VideoJob } from '@/lib/ai/video'

type AgentStatus = 'idle' | 'running' | 'done' | 'waiting' | 'error'

const AGENTS = [
  { id: 'research',  name: 'Perplexity Sonar',    role: 'Veille Web & Tendances',       status: 'waiting' as AgentStatus },
  { id: 'script',    name: 'ChatGPT GPT-4o',      role: 'Scénariste & Copywriter',      status: 'waiting' as AgentStatus },
  { id: 'casting',   name: 'Claude Orchestrator', role: 'Stratégie & Cohérence Avatar', status: 'waiting' as AgentStatus },
  { id: 'montage',   name: 'Kling v2.1 Pro',      role: 'Génération Vidéo',             status: 'waiting' as AgentStatus },
]

const AGENT_COLORS: Record<AgentStatus, string> = {
  done: 'bg-teal', running: 'bg-accent', waiting: 'bg-border', idle: 'bg-border', error: 'bg-coral'
}

const ALL_FORMATS = {
  ugc: {
    label: 'UGC',
    types: [
      { id: 'ugc-social',   label: 'UGC Social Media', desc: 'Realistic social media videos', category: 'ugc' },
      { id: 'ugc-tutorial', label: 'Tutorials',         desc: 'Step-by-step tutorials',        category: 'ugc' },
      { id: 'ugc-unboxing', label: 'Unboxing',          desc: 'High-quality unboxing',         category: 'ugc' },
      { id: 'ugc-review',   label: 'Product Review',    desc: 'Authentic product reviews',     category: 'ugc' },
    ]
  },
  commercial: {
    label: 'Commercial',
    types: [
      { id: 'com-hypermotion', label: 'Hyper motion', desc: 'Highlight your product',      category: 'commercial' },
      { id: 'com-tvspot',      label: 'Tv spot',      desc: 'Authentic stories amplified', category: 'commercial' },
    ]
  }
}

// Uniquement les ratios réellement supportés par Kling — pas de dégradation silencieuse
const ASPECT_RATIOS = [
  { id: '9-16', label: '9:16' },
  { id: '16-9', label: '16:9' },
  { id: '4-3',  label: '4:3'  },
  { id: '1-1',  label: '1:1'  },
]
const SUPPORTED_ASPECTS = ['9:16', '16:9', '4:3', '1:1'] as const

type SettingsTab = 'main' | 'aspect' | 'duration'
type FormatTab   = 'all' | 'ugc' | 'commercial'

interface Look { outfit?: WardrobePick; environment?: WardrobePick }

// Pioche une tenue + un décor dans le pool de l'avatar (auto/manuel déjà résolu en étape 3).
// Aléatoire → l'avatar varie d'une génération à l'autre (le pool reflète le mode choisi).
function pickLook(av?: AvatarAssignment): Look | null {
  if (!av) return null
  const rand = <T,>(arr: T[]) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined)
  const outfit      = rand(av.outfits ?? [])
  const environment = rand(av.environments ?? [])
  if (!outfit && !environment) return null
  return { outfit, environment }
}

function lookToText(look: Look | null): string {
  if (!look) return ''
  const parts: string[] = []
  if (look.outfit)      parts.push(`Tenue: ${look.outfit.name}${look.outfit.description ? ` (${look.outfit.description})` : ''}`)
  if (look.environment) parts.push(`Décor: ${look.environment.name}${look.environment.description ? ` (${look.environment.description})` : ''}`)
  return parts.join('. ')
}

// Résout le look : en mode 'auto' on relit la bibliothèque LIVE de l'avatar
// (inclut les tenues ajoutées après l'assignation) ; en 'manual' on garde le pool figé choisi.
async function resolveLook(av?: AvatarAssignment): Promise<Look | null> {
  if (!av) return null
  let outfits      = av.outfits ?? []
  let environments = av.environments ?? []
  if (av.wardrobeMode === 'auto') {
    try {
      const lib = await actionGetAvatarLibrary(av.avatarId)
      outfits      = lib.outfits.map((o) => ({ id: o.id, name: o.name, description: o.description }))
      environments = lib.environments.map((e) => ({ id: e.id, name: e.name, description: e.description }))
    } catch { /* échec → on retombe sur le snapshot */ }
  }
  return pickLook({ ...av, outfits, environments })
}

export default function CreativeStudioWorkflowView() {
  const router = useRouter()
  const toast  = useToast()
  const { campaignId, step1, step2, step3, reset } = useCampaignWizard()

  // ADN réel : le texte saisi en étape 1, ou le nom comme fallback
  const campaignDna = step1.dnaText.trim() || step1.name || 'Marketing campaign'
  // Formats sélectionnés en étape 2
  const selectedContentIds = step2.selectedContentIds
  // Avatars assignés en étape 3
  const avatarAssignments  = step3.assignments

  const [prompt, setPrompt]             = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab]   = useState<SettingsTab>('main')
  const [finalizing, setFinalizing]     = useState(false)

  const [activeTab, setActiveTab]           = useState<FormatTab>('all')
  const [selectedFormat, setSelectedFormat] = useState(ALL_FORMATS.ugc.types[0])
  const [aspect, setAspect]                 = useState('9:16')

  // Évite le mismatch d'hydratation : les valeurs du store persisté (sessionStorage)
  // ne sont rendues qu'après le mount client (le SSR n'y a pas accès).
  const [mounted, setMounted] = useState(false)

  // Templates DB → previews des cartes format (remplacent Higgsfield)
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  useEffect(() => { listTemplates().then(setTemplates).catch(() => {}) }, [])
  const previewByCat = useMemo(() => {
    const m = new Map<string, { kind: string; url: string }>()
    for (const t of templates) if (!m.has(t.category)) m.set(t.category, { kind: t.kind, url: t.url })
    return m
  }, [templates])

  // Pré-remplit le prompt avec celui des templates choisis à l'étape 2 (une fois)
  useEffect(() => {
    if (step2.seedPrompt && step2.seedPrompt.trim()) setPrompt((p) => p || step2.seedPrompt!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── IA State ──────────────────────────────────────────────────────────────
  const [generating, setGenerating]     = useState(false)
  const [genPhase, setGenPhase]         = useState<'idle' | 'research' | 'script' | 'done'>('idle')
  const [script, setScript]             = useState<ScriptResult | null>(null)
  const [researchCtx, setResearchCtx]   = useState<ResearchContext | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(['done', 'waiting', 'waiting', 'waiting'])

  // Vidéo async
  const [videoJob, setVideoJob]           = useState<VideoJob | null>(null)
  const [videoPolling, setVideoPolling]   = useState(false)
  const [submittingVideo, setSubmittingVideo] = useState(false)
  const [currentLook, setCurrentLook]     = useState<Look | null>(null)   // tenue+décor de la génération en cours

  // ── Voix off : verrouillée sur la voix de l'avatar assigné ──
  interface AvatarVoiceLite { id: string; name: string; voice_id: string | null; voice_settings: { emotion?: string; speed?: number; pitch?: number } | null; voice_label: string | null }
  const [avatarVoices, setAvatarVoices]   = useState<AvatarVoiceLite[]>([])
  const [voiceB64, setVoiceB64]           = useState<string | null>(null)
  const [generatingVoice, setGeneratingVoice] = useState(false)
  const voiceAssetIdRef = useRef<string | null>(null)   // dédup galerie : on remplace au lieu de dupliquer
  // Premier avatar assigné qui possède une voix configurée
  const voiceAvatar = avatarVoices.find((a) => avatarAssignments.some((x) => x.avatarId === a.id)) ?? null

  useEffect(() => {
    listAvatarVoices().then((l) => setAvatarVoices(l as AvatarVoiceLite[])).catch(() => {})
  }, [])

  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoElapsed   = useElapsed(!!videoJob && videoJob.status !== 'completed')
  const agentTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  // true pendant la sortie volontaire (finalisation) — le reset() met campaignId à null,
  // sans ce flag le guard ci-dessous écraserait la navigation vers la page campagne.
  const leavingRef     = useRef(false)
  const formatAlignedRef = useRef(false)   // alignement format étape 2 : une seule fois

  function stopPolling() {
    if (pollRef.current)        { clearInterval(pollRef.current);       pollRef.current = null }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null }
    setVideoPolling(false)
  }

  // Guard : pas de campagne créée → retour à l'étape 1 (cohérent avec étapes 2-3)
  useEffect(() => {
    if (!campaignId && !leavingRef.current) {
      toast.error('Créez d\'abord votre campagne à l\'étape 1')
      router.replace('/campagne/etape-1')
    }
  }, [campaignId, router, toast])

  // Mount : marque l'hydratation
  useEffect(() => { setMounted(true) }, [])

  // Aligne le format sur les choix de l'étape 2 — une seule fois, une fois les
  // templates chargés (gère les IDs sémantiques ET les UUID de templates via leur catégorie).
  useEffect(() => {
    if (formatAlignedRef.current) return
    const ids = useCampaignWizard.getState().step2.selectedContentIds
    if (ids.length === 0) return
    const allTypes = [...ALL_FORMATS.ugc.types, ...ALL_FORMATS.commercial.types]
    // 1) match direct par ID sémantique (repli taxonomie)
    const norm = ids.map((id) => id.replace(/^app-/, ''))
    let match = allTypes.find((t) => norm.includes(t.id))
    // 2) sinon, par catégorie du template (UUID → ugc/commercial)
    if (!match) {
      const catById = new Map(templates.map((t) => [t.id, t.category]))
      for (const id of ids) {
        const byCat = allTypes.find((t) => t.category === catById.get(id))
        if (byCat) { match = byCat; break }
      }
    }
    // rien à faire tant que les templates ne sont pas chargés (UUID non résolus)
    if (!match && templates.length === 0) return
    formatAlignedRef.current = true
    if (match && match.id !== ALL_FORMATS.ugc.types[0].id) setSelectedFormat(match)
  }, [templates])

  // Cleanup : aucun timer zombie après démontage (navigation pendant génération)
  useEffect(() => () => {
    if (pollRef.current)        clearInterval(pollRef.current)
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    if (agentTimerRef.current)  clearTimeout(agentTimerRef.current)
  }, [])

  async function handleGenerate() {
    if (!prompt.trim()) { toast.warning('Écris un prompt pour générer un contenu'); return }
    setGenerating(true)
    setGenPhase('research')
    setScript(null)
    setResearchCtx(null)
    setVideoJob(null)

    // Phase 1 : Research Agent (Perplexity)
    setAgentStatuses(['running', 'waiting', 'waiting', 'waiting'])
    toast.info('Perplexity recherche les tendances actuelles...')

    try {
      const contentType = selectedFormat.id.startsWith('ugc') ? 'ugc'
        : selectedFormat.id.startsWith('com') ? 'commercial'
        : 'ugc'

      const platform = aspect === '9:16' ? 'tiktok' : 'instagram'

      // Pipeline Research → Script en une seule action sécurisée
      setAgentStatuses(['done', 'running', 'waiting', 'waiting'])
      setGenPhase('script')

      // Avatar principal (premier assigné, ou vide)
      const mainAvatar = avatarAssignments[0]

      // Pioche une tenue + un décor (auto = biblio live, manuel = pool figé) — cohérent script ↔ vidéo
      const look     = await resolveLook(mainAvatar)
      const lookText = lookToText(look)
      setCurrentLook(look)

      const { researchContext, script: result } = await actionResearchThenScript(
        // Params Research Agent (Perplexity)
        {
          campaignTopic:  `${step1.name} — ${prompt}`,
          // Secteur réel depuis l'ADN (le nom de campagne n'est pas un secteur)
          industry:       step1.dnaText.trim() ? campaignDna.slice(0, 120) : 'marketing',
          platform,
          locale:         'fr',
          avatarProfile:  mainAvatar ? {
            style: mainAvatar.role    ?? 'authentic creator',
            niche: mainAvatar.format  ?? 'lifestyle',
          } : undefined,
        },
        // Params Script (ChatGPT)
        {
          campaignName: step1.name || 'Ma Campagne',
          campaignDna:  campaignDna,           // ← ADN réel depuis étape 1
          contentType,
          format:       'social',
          duration,
          platform,
          language:     'fr',
          model:        'chatgpt',
          // Avatar principal si assigné — rôle + look (tenue/décor) piochés
          avatarName:   mainAvatar?.avatarName  ?? undefined,
          avatarStyle:  [mainAvatar?.role, lookText].filter(Boolean).join(' · ') || undefined,
        },
      )

      setResearchCtx(researchContext)
      setScript(result)
      setGenPhase('done')
      setAgentStatuses(['done', 'done', 'running', 'waiting'])
      toast.success(`Script généré ✓ — ${researchContext.trends.length} tendances intégrées`)
      agentTimerRef.current = setTimeout(() => setAgentStatuses(['done', 'done', 'done', 'waiting']), 1200)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la génération')
      setAgentStatuses(['error', 'waiting', 'waiting', 'waiting'])
      setGenPhase('idle')
    } finally {
      setGenerating(false)
    }
  }

  // Voix off synthétisée avec la voix verrouillée de l'avatar assigné
  async function generateVoiceOff() {
    if (!script || !voiceAvatar || generatingVoice) return
    const profile = getVoiceProfile(voiceAvatar.voice_id)
    if (!profile) { toast.error('Voix de l\'avatar indisponible'); return }
    setGeneratingVoice(true)
    try {
      const s = voiceAvatar.voice_settings ?? {}
      const res = await actionGenerateSpeech({
        text:    (script.voiceover || script.script).slice(0, 500),
        engine:  profile.engine,
        voice:   profile.voice as never,
        speed:   s.speed,
        pitch:   s.pitch,
        emotion: s.emotion as never,
      })
      if (!res.audioBase64) { toast.error('Voix off indisponible'); return }
      setVoiceB64(res.audioBase64)
      // Dédup : on retire la voix off précédente avant d'ajouter la nouvelle
      if (voiceAssetIdRef.current) await deleteOutput(voiceAssetIdRef.current).catch(() => {})
      const out = await persistOutput({
        type:       'audio',
        dataUrl:    `data:audio/mpeg;base64,${res.audioBase64}`,
        title:      `Voix off · ${voiceAvatar.name}`,
        engine:     profile.engine === 'minimax' ? 'minimax' : 'elevenlabs',
        campaignId: campaignId ?? null,
        avatarName: voiceAvatar.name,
      }).catch(() => null)
      voiceAssetIdRef.current = out?.id ?? null
      toast.success('Voix off générée')
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la synthèse de la voix off')
    } finally {
      setGeneratingVoice(false)
    }
  }

  async function handleGenerateVideo() {
    if (!script || submittingVideo || videoPolling) return
    setSubmittingVideo(true)   // anti double-clic pendant l'attente de soumission
    toast.info('Soumission du job vidéo (Kling v2.1)...')
    setAgentStatuses(['done', 'done', 'done', 'running'])

    // Capture les valeurs au moment de la soumission (pas de stale closure)
    const videoDuration = duration <= 10 ? 5 : 10
    const videoAspect   = (SUPPORTED_ASPECTS as readonly string[]).includes(aspect) ? aspect : '9:16'
    const videoTitle    = (script.hook || prompt || 'Vidéo campagne').slice(0, 60)
    const videoPrompt   = prompt
    // Injecte la tenue + le décor piochés → l'avatar n'est pas statique d'une vidéo à l'autre
    const lookText      = lookToText(currentLook)
    const fullPrompt    = [`${script.hook}. ${script.voiceover}`, lookText].filter(Boolean).join('. ').slice(0, 500)

    try {
      // Cohérence : on part du portrait de l'avatar assigné (img2vid) si dispo
      let avatarRef: string | null = null
      if (avatarAssignments[0]?.avatarId) {
        avatarRef = await actionGetAvatarRefImage(avatarAssignments[0].avatarId).catch(() => null)
      }
      const job = await actionSubmitVideo({
        prompt:         fullPrompt,
        engine:         'kling',
        klingVersion:   'v2.1-pro',   // modèle principal confirmé
        duration:       videoDuration as 5 | 10,
        aspectRatio:    videoAspect as '9:16' | '16:9' | '1:1' | '4:3',
        negativePrompt: 'blur, low quality, watermark, text overlay',
        ...(avatarRef ? { imageUrl: avatarRef } : {}),
      })
      setVideoJob(job)
      toast.info(`Job soumis (ID: ${job.generationId.slice(0, 8)}...) — polling toutes les 10s`)

      // Polling toutes les 10s
      pollRef.current = setInterval(async () => {
        try {
          const status = await actionGetVideoStatus(job.generationId)
          setVideoJob(status)
          if (status.status === 'completed') {
            stopPolling()
            setAgentStatuses(['done', 'done', 'done', 'done'])
            toast.success('Vidéo générée !')
            // Persiste dans la galerie — sinon l'URL éphémère est perdue en quittant la page
            if (status.videoUrl) {
              persistOutput({
                type:       'video',
                sourceUrl:  status.videoUrl,
                title:      videoTitle,
                prompt:     videoPrompt,
                engine:     'kling-v2.1-pro',
                campaignId: campaignId ?? null,
                format:     videoAspect,
                durationSeconds: videoDuration,
                avatarName: avatarAssignments[0]?.avatarName,
              }).catch(() => {})
            }
          } else if (status.status === 'failed') {
            stopPolling()
            setAgentStatuses(['done', 'done', 'done', 'error'])
            toast.error('Échec de génération vidéo')
          }
        } catch { /* silently retry */ }
      }, 10_000)
      setVideoPolling(true)

      // Timeout de sécurité : jamais de polling éternel si Kling reste bloqué
      pollTimeoutRef.current = setTimeout(() => {
        stopPolling()
        setAgentStatuses(['done', 'done', 'done', 'error'])
        toast.error('Génération vidéo trop longue (>10 min) — réessayez')
      }, 10 * 60 * 1000)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur soumission vidéo')
      setAgentStatuses(['done', 'done', 'done', 'error'])
    } finally {
      setSubmittingVideo(false)
    }
  }

  async function handleFinalize() {
    if (!campaignId) return   // le guard redirige déjà — pas de finalisation fantôme
    setFinalizing(true)
    try {
      const updated = await finalizeCampaign(campaignId)
      toast.success('Campagne finalisée — production lancée')
      stopPolling()
      leavingRef.current = true   // désarme le guard avant que reset() ne vide campaignId
      reset()
      router.push(`/campagne/${updated.id}`)
    } catch (e: any) {
      leavingRef.current = false
      toast.error(e?.message ?? 'Erreur lors de la finalisation')
      setFinalizing(false)
    }
  }
  const [duration, setDuration]           = useState(15)

  // Formats vidéo restreints aux choix de l'étape 2 (préfixe app- normalisé).
  // Si aucun ne correspond (ex: campagne 100% shooting photo), on propose tout.
  const normalizedSelected = selectedContentIds.map((id) => id.replace(/^app-/, ''))
  const allStudioTypes  = [...ALL_FORMATS.ugc.types, ...ALL_FORMATS.commercial.types]
  const campaignTypes   = mounted ? allStudioTypes.filter((t) => normalizedSelected.includes(t.id)) : []
  const studioTypes     = campaignTypes.length > 0 ? campaignTypes : allStudioTypes
  const isFiltered      = campaignTypes.length > 0

  // Seuls les onglets ayant au moins un format sont proposés (pas de grille vide)
  const availableTabs = (['all', 'ugc', 'commercial'] as const).filter(
    (tab) => tab === 'all' || studioTypes.some((t) => ALL_FORMATS[tab].types.some((x) => x.id === t.id))
  )
  const effectiveTab: FormatTab = availableTabs.includes(activeTab) ? activeTab : 'all'

  const filteredTypes = effectiveTab === 'all'
    ? studioTypes
    : studioTypes.filter((t) => ALL_FORMATS[effectiveTab].types.some((x) => x.id === t.id))

  return (
    <div className="min-h-screen flex flex-col">
      <StepBar current={4} />

      {/* Workspace */}
      <div className="flex-1 flex relative">

        {/* Left toolbar — décoratif (pas de curseur trompeur) */}
        <div className="w-[66px] border-r border-border bg-bg-surface flex flex-col items-center pt-5 gap-4">
          <div className="w-11 h-11 rounded-neo-lg border border-border bg-bg-card flex items-center justify-center">
            
          </div>
          <div className="w-11 h-11 rounded-neo-lg border border-border bg-bg-card flex items-center justify-center opacity-40">
            
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex-1 flex flex-col bg-bg-base relative">

          {/* Context banner — ADN + formats + avatars (rendu après mount : store persisté) */}
          {mounted && (campaignDna !== step1.name || selectedContentIds.length > 0 || avatarAssignments.length > 0) && (
            <div className="px-9 py-2.5 bg-teal/[0.03] border-b border-fg/50 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-sans text-[9px] font-bold text-teal">ADN</span>
                <span className="font-sans text-[10px] text-text-dim truncate max-w-[280px]" title={campaignDna}>
                  {campaignDna.slice(0, 80)}{campaignDna.length > 80 ? '…' : ''}
                </span>
              </div>
              {selectedContentIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-[9px] font-bold text-purple">FORMATS</span>
                  <div className="flex gap-1">
                    {selectedContentIds.slice(0, 3).map((id) => (
                      <span key={id} className="font-sans text-[9px] text-purple border border-border-purple/40 px-1.5 py-0.5 rounded-neo">
                        {id.split('-').slice(1).join(' ')}
                      </span>
                    ))}
                    {selectedContentIds.length > 3 && (
                      <span className="font-sans text-[9px] text-text-dim">+{selectedContentIds.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
              {avatarAssignments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-[9px] font-bold text-accent">AVATARS</span>
                  <div className="flex gap-1">
                    {avatarAssignments.slice(0, 3).map((a) => (
                      <span key={a.avatarId} className="font-sans text-[9px] text-accent border border-accent/30 px-1.5 py-0.5 rounded-neo">
                        {a.avatarName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top bar */}
          <div className="px-9 py-5 flex items-center justify-between border-b border-border">
            <h1 className="font-display font-bold text-[20px] text-text-primary">
              Creative Studio <span className="text-accent font-normal opacity-80">— Production</span>
            </h1>
            <div className="flex gap-2">
              {AGENTS.slice(0, 4).map((ag, i) => (
                <div key={ag.id} className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-border rounded-neo-lg">
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
              <div className="w-full max-w-[880px] flex flex-col gap-4">
                {/* Récap ADN */}
                {mounted && campaignDna && campaignDna !== step1.name && (
                  <div className="bg-teal/5 border border-border-teal rounded-neo-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-sans text-[9px] font-bold text-teal">ADN CAMPAGNE</span>
                      <span className="font-sans text-[9px] text-text-dim">— injecté dans les prompts IA</span>
                    </div>
                    <p className="text-[12px] text-teal/80 leading-relaxed line-clamp-3">{campaignDna}</p>
                  </div>
                )}
                {mounted && avatarAssignments.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {avatarAssignments.map((a) => (
                      <div key={a.avatarId} className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-border rounded-neo">
                        <div className="w-6 h-6 rounded-neo bg-accent/20 flex items-center justify-center font-sans text-[10px] font-bold text-accent">
                          {a.avatarName[0]}
                        </div>
                        <div>
                          <div className="font-sans text-[10px] font-bold text-text-primary">{a.avatarName}</div>
                          {a.role && <div className="font-sans text-[9px] text-text-dim">{a.role}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="h-[240px] bg-bg-card border border-border border-dashed rounded-neo-lg flex items-center justify-center">
                  <div className="text-center opacity-30">
                    <div className="font-sans text-[13px] uppercase text-text-dim tracking-widest">
                      Décris le contenu → GENERATE
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Génération en cours */}
            {generating && (
              <div className="w-full max-w-[880px] bg-bg-card border border-accent/40 rounded-neo-lg p-8">
                <div className="flex flex-col gap-6">

                  {/* Étape 1 : Research */}
                  <div className={`flex items-center gap-4 p-4 rounded-neo-lg border transition-all ${
                    genPhase === 'research' ? 'border-purple bg-purple/5' : 'border-border opacity-50'
                  }`}>
                    <div className={`w-10 h-10 rounded-neo-lg border flex items-center justify-center text-xl flex-shrink-0 ${
                      genPhase === 'research' ? 'border-purple bg-purple/15 animate-pulse' : 'border-border'
                    }`}>
                      
                    </div>
                    <div className="flex-1">
                      <p className={`font-display font-bold text-[14px] ${genPhase === 'research' ? 'text-purple' : 'text-text-muted'}`}>
                        Research Agent — Perplexity Sonar
                      </p>
                      <p className="font-sans text-[11px] text-text-dim">
                        Recherche web · Tendances actuelles · Formats viraux · Contexte culturel
                      </p>
                    </div>
                    {genPhase === 'research' && (
                      <div className="font-sans text-[10px] text-purple animate-pulse">En cours...</div>
                    )}
                    {genPhase !== 'research' && genPhase !== 'idle' && (
                      <div className="font-sans text-[10px] text-teal">✓ Terminé</div>
                    )}
                  </div>

                  {/* Étape 2 : Script */}
                  <div className={`flex items-center gap-4 p-4 rounded-neo-lg border transition-all ${
                    genPhase === 'script' ? 'border-accent bg-accent/5' : 'border-border opacity-50'
                  }`}>
                    <div className={`w-10 h-10 rounded-neo-lg border flex items-center justify-center text-xl flex-shrink-0 ${
                      genPhase === 'script' ? 'border-accent bg-accent/10 animate-pulse' : 'border-border'
                    }`}>
                      
                    </div>
                    <div className="flex-1">
                      <p className={`font-display font-bold text-[14px] ${genPhase === 'script' ? 'text-accent' : 'text-text-muted'}`}>
                        Script Writer — ChatGPT GPT-4o
                      </p>
                      <p className="font-sans text-[11px] text-text-dim">
                        Rédaction · Intégration tendances · Hook · Voix off · CTA
                      </p>
                    </div>
                    {genPhase === 'script' && (
                      <div className="font-sans text-[10px] text-accent animate-pulse">En cours...</div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-sans text-[10px] text-text-dim">
                      Pipeline : Perplexity → ChatGPT → Script enrichi aux tendances actuelles
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Résultat script */}
            {script && !videoJob && (
              <div className="w-full max-w-[920px] animate-reveal">

                {/* Bandeau Research */}
                {researchCtx && researchCtx.trends.length > 0 && (
                  <div className="mb-4 bg-purple/5 border border-border-purple rounded-neo-lg px-4 py-3 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-sans text-[9px] font-bold text-purple">PERPLEXITY</span>
                      <span className="font-sans text-[9px] text-text-dim">·</span>
                      <span className="font-sans text-[9px] text-text-dim">{new Date(researchCtx.researchedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {researchCtx.trends.slice(0, 3).map((t, i) => (
                        <span key={i} className="font-sans text-[9px] text-purple border border-border-purple/50 bg-purple/5 rounded px-2 py-0.5">
                          ↗ {t.topic}
                        </span>
                      ))}
                      {researchCtx.trendingKeywords.slice(0, 4).map((k) => (
                        <span key={k} className="font-sans text-[9px] text-text-dim border border-border rounded px-1.5 py-0.5">
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-[1fr_340px] gap-5">
                  {/* Script principal */}
                  <div className="bg-bg-card border border-accent/30 rounded-neo-lg p-6">
                    {/* Hook */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-sans text-[9px] font-bold text-accent uppercase tracking-widest">Hook (0-3s)</span>
                        <span className="font-sans text-[9px] text-text-dim border border-border rounded px-1.5 py-0.5">Accroche</span>
                      </div>
                      <p className="font-display font-bold text-[18px] text-accent leading-snug">{script.hook}</p>
                    </div>

                    {/* Script */}
                    <div className="mb-5">
                      <span className="font-sans text-[9px] font-bold text-text-dim uppercase tracking-widest block mb-2">Script complet</span>
                      <div className="bg-bg-surface border border-border rounded-neo p-4 font-sans text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                        {script.script}
                      </div>
                    </div>

                    {/* Voiceover */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="font-sans text-[9px] font-bold text-text-dim uppercase tracking-widest">Voix off</span>
                        {voiceAvatar ? (
                          <button
                            onClick={generateVoiceOff}
                            disabled={generatingVoice}
                            className="font-sans text-[9px] font-bold text-teal border border-border-teal rounded-neo px-2 py-1 hover:bg-teal/10 transition-colors disabled:opacity-50"
                          >
                            {generatingVoice ? 'Synthèse…' : `▶ Générer (voix de ${voiceAvatar.name})`}
                          </button>
                        ) : (
                          <span className="font-sans text-[9px] text-text-dim">Aucune voix d'avatar assignée</span>
                        )}
                      </div>
                      <p className="text-[13px] text-text-muted italic leading-relaxed">{script.voiceover}</p>
                      {voiceB64 && (
                        <audio controls src={`data:audio/mpeg;base64,${voiceB64}`} className="w-full mt-3 h-9" />
                      )}
                    </div>

                    {/* CTA + Hashtags */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-sans text-[9px] font-bold text-teal uppercase tracking-widest block mb-1.5">CTA</span>
                        <p className="font-display font-bold text-[14px] text-teal">{script.cta}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end max-w-[220px]">
                        {script.hashtags.map((h) => (
                          <span key={h} className="font-sans text-[9px] text-accent/70 border border-accent/20 rounded px-1.5 py-0.5">#{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Panel droite */}
                  <div className="flex flex-col gap-4">
                    {/* Métadonnées */}
                    <div className="bg-bg-card border border-border rounded-neo-lg p-4">
                      <p className="nb-label mb-3">Paramètres</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Format',   value: selectedFormat.label },
                          { label: 'Durée',    value: `~${script.duration}s` },
                          { label: 'Aspect',   value: aspect },
                          { label: 'Modèle',   value: 'GPT-4o via AIML API' },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between border-b border-fg/40 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-sans text-[10px] text-text-dim">{r.label}</span>
                            <span className="font-sans text-[10px] font-bold text-text-secondary">{r.value}</span>
                          </div>
                        ))}
                      </div>
                      {/* Look pioché dans la garde-robe de l'avatar */}
                      {currentLook && (currentLook.outfit || currentLook.environment) && (
                        <div className="mt-3 pt-3 border-t border-fg/40 flex flex-col gap-1.5">
                          {currentLook.outfit && (
                            <div className="flex items-center gap-1.5 font-sans text-[10px]">
                              <span className="text-text-dim">Tenue</span>
                              <span className="text-teal font-bold ml-auto">{currentLook.outfit.name}</span>
                            </div>
                          )}
                          {currentLook.environment && (
                            <div className="flex items-center gap-1.5 font-sans text-[10px]">
                              <span className="text-text-dim">Décor</span>
                              <span className="text-purple font-bold ml-auto">{currentLook.environment.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleGenerateVideo}
                        disabled={videoPolling || submittingVideo}
                        className="w-full h-12 rounded-neo-lg border border-accent bg-accent text-bg-base font-bold text-[13px] flex items-center justify-center gap-2 transition-all shadow-neo disabled:opacity-50"
                      >
                        {submittingVideo ? 'Soumission…' : 'Générer la vidéo (Kling)'}
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="w-full h-10 rounded-neo-lg border border-border text-text-muted font-sans text-[11px] hover:border-border-strong transition-colors"
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
                  <div className="bg-bg-card border border-accent/40 rounded-neo-lg p-8 flex flex-col items-center gap-5">
                    <div className="w-16 h-16 rounded-full border border-accent border-t-transparent animate-spin" />
                    <div className="text-center">
                      <p className="font-display font-bold text-[16px] text-text-primary mb-1">
                        Kling v2.1 génère votre vidéo...
                      </p>
                      <p className="font-sans text-[11px] text-text-dim">
                        Job ID: {videoJob.generationId.slice(0, 16)}... · Statut: {videoJob.status}
                      </p>
                    </div>
                    <div className="w-full max-w-[400px] h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                      <div className="h-full gen-stripes text-accent" />
                    </div>
                    <p className="font-sans text-[10px] text-text-dim tabular-nums">Écoulé : {videoElapsed} · polling toutes les 10s — peut prendre 2-5 min</p>
                    <button
                      onClick={() => { setVideoJob(null); stopPolling() }}
                      className="font-sans text-[10px] text-text-dim border border-border rounded-neo px-3 py-1.5 hover:border-border-strong"
                    >
                      ← Retour au script
                    </button>
                  </div>
                ) : (
                  <div className="bg-bg-card border border-teal rounded-neo-lg overflow-hidden animate-reveal">
                    {videoJob.videoUrl ? (
                      <video
                        src={videoJob.videoUrl}
                        controls
                        className="w-full max-h-[420px] object-contain bg-black"
                        poster={videoJob.thumbnailUrl}
                      />
                    ) : (
                      <div className="h-[280px] flex items-center justify-center">
                        <p className="font-sans text-text-dim">Vidéo disponible mais URL manquante</p>
                      </div>
                    )}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-sans text-[11px] font-bold text-teal">✓ Vidéo générée par Kling v2.1</p>
                        <p className="font-sans text-[10px] text-text-dim mt-0.5">ID: {videoJob.generationId.slice(0, 16)}...</p>
                      </div>
                      {videoJob.videoUrl && (
                        <a
                          href={videoJob.videoUrl}
                          download
                          className="font-sans text-[11px] font-bold text-teal border border-border-teal rounded-neo px-3 py-1.5 hover:bg-teal/10 transition-colors"
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
              <div className="absolute bottom-[130px] left-[260px] w-[260px] bg-bg-card border border-border rounded-neo-lg p-3 shadow-neo z-50 animate-slide-up">
                {settingsTab === 'main' && (
                  <div className="flex flex-col gap-1">
                    {[
                      { label: 'Aspect ratio', value: aspect,         next: 'aspect'   as SettingsTab },
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
                          className={`px-3 py-2.5 rounded-neo border cursor-pointer transition-all text-[13px] font-semibold text-center
                            ${aspect === ar.label ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                        >
                          {ar.label}
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
                        <span className="font-sans text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">MIN 7s</span>
                        <span className="font-sans text-[9px] px-1.5 py-0.5 rounded-neo border border-border text-text-dim">MAX 60s</span>
                      </div>
                    </div>
                    <input
                      type="range" min="7" max="60" value={duration}
                      onChange={(e) => setDuration(+e.target.value)}
                      className="w-full accent-accent"
                    />
                    <p className="font-sans text-[9px] text-text-dim mt-2 leading-relaxed">
                      ℹ Durée du script. La vidéo Kling sera de {duration <= 10 ? '5s' : '10s'} (le modèle supporte 5s ou 10s).
                    </p>
                    <Button className="mt-3 w-full" size="sm" onClick={() => setSettingsTab('main')}>
                      Valider
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Main command bar */}
            <div className="bg-bg-card border border-border rounded-neo-lg px-5 py-4 flex items-center gap-5 shadow-neo">
              {/* Input area */}
              <div className="flex-1 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Describe what happens in the ad..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !generating && prompt.trim()) handleGenerate()
                  }}
                  className="bg-transparent border-none text-text-primary text-[14px] outline-none placeholder:text-text-dim"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border rounded-neo text-[11px] font-semibold text-text-muted hover:border-border-strong transition-colors"
                  >
                    {selectedFormat.label} ▾
                  </button>
                  <button
                    onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab('main') }}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] transition-all
                      ${settingsOpen ? 'border-coral bg-coral/20 text-coral' : 'border-border bg-bg-surface text-text-muted hover:border-border-strong'}`}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="h-[76px] px-6 rounded-neo-lg border border-accent bg-accent flex flex-col items-center justify-center gap-1 cursor-pointer shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
              >
                <div className="flex items-center gap-1.5 text-bg-base text-[13px] font-bold">
                  {generating ? '...' : 'GENERATE'}
                </div>
                <div className="text-bg-base/70 font-sans text-[11px] font-bold">
                  {generating ? 'GPT-4o...' : 'AIML API'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-[66px] right-0 z-10 flex items-center justify-between px-6 py-3 bg-bg-surface/90 backdrop-blur-sm border-t border-border">
        <button
          onClick={() => router.push('/campagne/etape-3')}
          className="font-sans text-[11px] text-text-dim hover:text-text-muted transition-colors"
        >
          ← Étape 3 — Avatars
        </button>
        <div className="flex items-center gap-3">
          {mounted && campaignId && (
            <span className="font-sans text-[10px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              Campagne sauvegardée
            </span>
          )}
          <Button
            size="sm"
            loading={finalizing}
            onClick={handleFinalize}
          >
            Finaliser la Campagne →
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
            className="w-full max-w-[820px] max-h-[72vh] bg-bg-card border border-border rounded-neo-lg flex flex-col overflow-hidden shadow-neo animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <h2 className="font-display font-bold text-[15px] text-text-primary">Formats de Production</h2>
                  {isFiltered && (
                    <span className="font-sans text-[9px] font-bold text-teal border border-border-teal px-2 py-0.5 rounded-neo">
                      filtré selon l'étape 2
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border uppercase transition-all
                        ${effectiveTab === tab ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
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
                      <div className={`relative h-[170px] bg-bg-elevated rounded-neo-lg overflow-hidden border transition-all
                        ${isSel ? 'border-accent shadow-neo' : 'border-border group-hover:border-border-strong'}`}
                      >
                        {(() => {
                          const preview = previewByCat.get(type.category)
                          if (!preview) return null
                          return preview.kind === 'video'
                            ? <video autoPlay muted loop playsInline src={preview.url} className="w-full h-full object-cover opacity-80" />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={preview.url} alt={type.label} className="w-full h-full object-cover opacity-80" />
                        })()}
                        <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-neo border flex items-center justify-center text-[10px] font-bold
                          ${isSel ? 'bg-accent border-accent text-bg-base' : 'bg-black/40 border-border text-text-dim'}`}>
                          {isSel ? '✓' : ''}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="px-1">
                        <div className={`text-[12.5px] font-bold ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                          {type.label}
                        </div>
                        <div className="font-sans text-[10px] text-text-dim mt-0.5">{type.desc}</div>
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
