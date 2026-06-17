'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import GenerationProgress, { type GenStep } from '@/components/ui/GenerationProgress'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionGenerateScript,
  actionGenerateCampaignVisual,
  actionGenerateMoodboard,
  actionSubmitVideo,
  actionGetVideoStatus,
  actionInspireFromMedia,
} from '@/lib/actions/ai'
import { actionListAvatarsForPicker, actionUploadTempImage, actionDeleteTempImage } from '@/lib/actions/avatar-assets'
import { estimateCost } from '@/lib/ai/costs'
import type { VideoJob, VideoDuration } from '@/lib/ai/video'
import type { ScriptResult } from '@/lib/ai/text'
import type { ImageResult } from '@/lib/ai/image'
import { useMediaStore } from '@/lib/stores/mediaStore'
import { persistOutput } from '@/lib/actions/outputs'
import { listTemplates, type TemplateDTO } from '@/lib/actions/templates'
import { captureVideoFrames, fileToDataUrl } from '@/lib/media/videoFrames'
import { PRODUIT_FORMATS, APP_FORMATS, GROUPS, categoryToEngineFormat, type ContentTypeDef } from '@/lib/content/taxonomy'

// Type d'une carte du sélecteur (taxonomie + champs template DB)
interface SelectorType extends ContentTypeDef { kind?: 'video' | 'image'; url?: string; prompt?: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const FORMATS = [
  { id: 'ugc',          label: 'UGC Vidéo',      desc: 'Script + Seedance 2.0',     color: 'text-accent',  border: 'border-accent',        activeBg: 'bg-accent/5',  engine: 'video'   },
  { id: 'image',        label: 'Visuel Campagne', desc: 'Nano Banana — impact fort',   color: 'text-teal',    border: 'border-border-teal',   activeBg: 'bg-teal/5',    engine: 'image'   },
  { id: 'moodboard',    label: 'Moodboard',       desc: 'Nano Banana — 4 variations',  color: 'text-purple',  border: 'border-border-purple',  activeBg: 'bg-purple/5',  engine: 'image'   },
  { id: 'commercial',   label: 'Commercial',      desc: 'Script + Seedance 2.0',     color: 'text-coral',   border: 'border-border-coral',   activeBg: 'bg-coral/5',   engine: 'video'   },
  { id: 'shooting',     label: 'Shooting Photo',  desc: 'Nano Banana — lifestyle',     color: 'text-pink',    border: 'border-pink/40',        activeBg: 'bg-pink/5',    engine: 'image'   },
] as const

type FormatId = typeof FORMATS[number]['id']

// Étapes & couleur d'accent du tracker de génération, par format.
const GEN_STEPS: Record<FormatId, GenStep[]> = {
  ugc:        [{ key: 'script', label: 'ChatGPT — rédaction du script' }, { key: 'submit', label: 'Seedance — soumission' }, { key: 'render', label: 'Seedance — génération vidéo' }],
  commercial: [{ key: 'script', label: 'ChatGPT — rédaction du script' }, { key: 'submit', label: 'Seedance — soumission' }, { key: 'render', label: 'Seedance — génération vidéo' }],
  image:      [{ key: 'img',   label: 'Nano Banana — génération du visuel' }],
  shooting:   [{ key: 'img',   label: 'Nano Banana — shooting lifestyle' }],
  moodboard:  [{ key: 'mood',  label: 'Nano Banana — 4 variations' }],
}
const GEN_ACCENT: Record<FormatId, 'accent' | 'purple' | 'teal' | 'coral' | 'pink' | 'amber'> = {
  ugc: 'accent', commercial: 'coral', image: 'teal', shooting: 'pink', moodboard: 'purple',
}

const PLATFORMS = ['TikTok', 'Instagram Reels', 'Instagram Feed', 'YouTube Shorts', 'Facebook', 'LinkedIn']
const RATIOS_VIDEO = [{ label: '9:16 Vertical', val: '9:16' as const }, { label: '16:9 Wide', val: '16:9' as const }, { label: '1:1 Square', val: '1:1' as const }]
const DURATIONS = [5, 8, 10, 12, 15] as const   // durées vidéo supportées (Seedance 2.0), en secondes
const RATIOS_IMAGE = [{ label: '16:9 Wide', val: '1792x1024' as const }, { label: '9:16 Story', val: '1024x1792' as const }, { label: '1:1 Square', val: '1024x1024' as const }]

// Moteurs IA par format
const FORMAT_ENGINES: Record<FormatId, string> = {
  ugc:        'ChatGPT → script · Seedance 2.0 → vidéo',
  image:      'Nano Banana → visuel campagne',
  moodboard:  'Nano Banana → 4 variations créatives',
  commercial:  'ChatGPT → script · Seedance 2.0 → vidéo',
  shooting:   'Nano Banana → photo lifestyle',
}

const COST_MAP: Record<FormatId, string> = {
  ugc:       '~0.35',
  image:     '~0.04',
  moodboard: '~0.16',
  commercial: '~0.35',
  shooting:  '~0.04',
}

// ─── Résultat union ───────────────────────────────────────────────────────────

type GenerationResult =
  | { type: 'script'; data: ScriptResult }
  | { type: 'images'; data: ImageResult[] }
  | { type: 'video';  job: VideoJob }

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreativeStudioView() {
  const toast    = useToast()
  const allAssets = useMediaStore((s) => s.assets)

  // Outputs chargés depuis Supabase (cache mediaStore)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); useMediaStore.getState().loadFromServer() }, [])
  const recentAssets = useMemo(() => (mounted ? allAssets.slice(0, 5) : []), [allAssets, mounted])


  const [selectedFormat, setSelectedFormat] = useState<FormatId | null>(null)
  // Sélecteur type/format (reflète l'étape 2 de campagne)
  const [group, setGroup]                   = useState<'produit' | 'app'>('produit')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>('')
  const [typeModalOpen, setTypeModalOpen]   = useState(false)
  const [typeTemplates, setTypeTemplates]   = useState<TemplateDTO[]>([])
  const [prompt, setPrompt]                 = useState('')
  const [platform, setPlatform]             = useState(PLATFORMS[0])
  const [videoRatio, setVideoRatio]         = useState(RATIOS_VIDEO[0])
  const [videoDuration, setVideoDuration]   = useState<typeof DURATIONS[number]>(DURATIONS[0])
  const [imageRatio, setImageRatio]         = useState(RATIOS_IMAGE[0])
  const [generating, setGenerating]         = useState(false)
  const [phase, setPhase]                   = useState<string>('')
  const [genStep, setGenStep]               = useState(0)
  const [result, setResult]                 = useState<GenerationResult | null>(null)
  const [videoJob, setVideoJob]             = useState<VideoJob | null>(null)
  const [lightbox, setLightbox]             = useState<{ type: 'image' | 'video'; url: string } | null>(null)
  const [progress, setProgress]             = useState(0)
  const pollRef        = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Templates DB → remplacent la taxonomie codée par catégorie (repli si vide), comme à l'étape 2
  useEffect(() => { listTemplates().then(setTypeTemplates).catch(() => {}) }, [])

  const formats = useMemo(() => {
    const base = group === 'produit' ? PRODUIT_FORMATS : APP_FORMATS
    const out: Record<string, { label: string; types: SelectorType[] }> = {}
    for (const [key, fmt] of Object.entries(base)) {
      const tpl = typeTemplates.filter((t) => t.category === key)
      out[key] = {
        label: fmt.label,
        types: tpl.length > 0
          ? tpl.map((t) => ({ id: t.id, label: t.label, desc: t.description ?? '', kind: t.kind as 'video' | 'image', url: t.url, prompt: t.prompt ?? undefined }))
          : fmt.types,
      }
    }
    return out
  }, [group, typeTemplates])

  const displayedTypes: SelectorType[] = activeCategory === 'all'
    ? Object.values(formats).flatMap((f) => f.types)
    : formats[activeCategory]?.types ?? []

  // Catégorie (ugc/commercial/shooting/visuel) par id de carte — y compris UUID de template
  const categoryById = useMemo(() => {
    const m = new Map<string, string>()
    for (const [key, fmt] of Object.entries(formats)) for (const t of fmt.types) m.set(t.id, key)
    return m
  }, [formats])
  const categoryOf = (id: string): string => categoryById.get(id) ?? 'ugc'

  // Ouvre la modale de choix de type pour un groupe (comme à l'étape 2)
  function openTypeModal(key: 'produit' | 'app') {
    setGroup(key)
    setActiveCategory('all')
    setTypeModalOpen(true)
  }

  // Sélection d'un type de la taxonomie → engine déduit de la catégorie, puis ferme la modale
  function pickType(type: SelectorType, category: string) {
    setSelectedFormat(categoryToEngineFormat(category) as FormatId)
    setSelectedTypeId(type.id)
    setSelectedTypeLabel(type.label)
    reset()
    // Pré-remplit le brief avec le prompt du template (si présent et brief vide)
    if (type.prompt?.trim()) setPrompt((p) => p || type.prompt!.trim())
    setTypeModalOpen(false)
  }

  // Moodboard : mode hors taxonomie
  function pickExtra(fmtId: 'moodboard') {
    setSelectedFormat((cur) => cur === fmtId ? null : fmtId)
    setSelectedTypeId(null)
    setSelectedTypeLabel('')
    reset()
  }

  // Retire le type sélectionné
  function clearType() {
    setSelectedFormat(null)
    setSelectedTypeId(null)
    setSelectedTypeLabel('')
    reset()
  }

  function stopPolling() {
    if (pollRef.current)        { clearInterval(pollRef.current);       pollRef.current = null }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null }
  }

  // ── Zone 1 — Référence (image ou vidéo) : inspiration / clonage ────────────
  const [refPreview, setRefPreview]       = useState<string | null>(null)   // object URL
  const [refKind, setRefKind]             = useState<'image' | 'video' | null>(null)
  const [refInspiration, setRefInspiration] = useState('')                  // prompt reverse-engineered
  const [refAnalyzing, setRefAnalyzing]   = useState(false)
  const refFileRef    = useRef<HTMLInputElement>(null)
  const refPreviewRef = useRef<string | null>(null)

  // ── Zone 2 — Avatar (bibliothèque OU upload) → source Seedance img2vid ────────
  const [avatarSel, setAvatarSel]         = useState<{ name: string; photoUrl: string } | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [pickerOpen, setPickerOpen]       = useState(false)
  const [avatarList, setAvatarList]       = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [avatarListLoading, setAvatarListLoading] = useState(false)
  const avatarFileRef    = useRef<HTMLInputElement>(null)
  const avatarPreviewRef = useRef<string | null>(null)
  const avatarTempPathRef = useRef<string | null>(null)   // fichier {userId}/tmp/ à purger après usage

  // Cleanup object URLs + fichier temp sur démontage (navigation interne)
  useEffect(() => () => {
    if (refPreviewRef.current?.startsWith('blob:'))    URL.revokeObjectURL(refPreviewRef.current)
    if (avatarPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewRef.current)
    if (avatarTempPathRef.current) actionDeleteTempImage(avatarTempPathRef.current).catch(() => {})
  }, [])

  // ── Référence : upload + analyse d'inspiration (auto) ──────────────────────
  async function handleReferenceFile(file: File) {
    const kind: 'image' | 'video' | null =
      file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
    if (!kind) { toast.error('Référence : image ou vidéo uniquement'); return }
    if (refPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(refPreviewRef.current)
    const url = URL.createObjectURL(file)
    refPreviewRef.current = url
    setRefPreview(url)
    setRefKind(kind)
    setRefInspiration('')

    // Reverse-engineering automatique d'un prompt d'inspiration (Gemini)
    setRefAnalyzing(true)
    try {
      const hint = selectedTypeLabel || selectedFormat || undefined
      let insp: string
      if (kind === 'video') {
        const frames = await captureVideoFrames(file, 6)   // décomposition frame par frame
        if (frames.length === 0) throw new Error('Impossible de lire la vidéo')
        insp = await actionInspireFromMedia({ frames, hint })
      } else {
        const dataUrl = await fileToDataUrl(file)
        insp = await actionInspireFromMedia({ dataUrl, hint })
      }
      if (insp) { setRefInspiration(insp); toast.success('Inspiration extraite de la référence') }
    } catch {
      toast.error('Analyse de la référence échouée — tu peux décrire manuellement')
    } finally {
      setRefAnalyzing(false)
    }
  }

  function clearReference() {
    if (refPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(refPreviewRef.current)
    refPreviewRef.current = null
    setRefPreview(null); setRefKind(null); setRefInspiration(''); setRefAnalyzing(false)
  }

  // ── Avatar : sélection bibliothèque + upload ───────────────────────────────
  async function openPicker() {
    setPickerOpen(true)
    if (avatarList.length === 0) {
      setAvatarListLoading(true)
      try { setAvatarList(await actionListAvatarsForPicker()) }
      catch { toast.error('Chargement des avatars impossible') }
      finally { setAvatarListLoading(false) }
    }
  }

  function pickAvatar(a: { name: string; photoUrl: string | null }) {
    if (!a.photoUrl) { toast.error('Cet avatar n\'a pas encore de portrait'); return }
    if (avatarPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewRef.current)
    avatarPreviewRef.current = null
    // Remplace un éventuel upload temp précédent → on le purge
    if (avatarTempPathRef.current) { actionDeleteTempImage(avatarTempPathRef.current).catch(() => {}); avatarTempPathRef.current = null }
    setAvatarSel({ name: a.name, photoUrl: a.photoUrl })
    setPickerOpen(false)
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Avatar : image uniquement'); return }
    if (avatarPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewRef.current)
    // Purge le temp précédent avant d'en créer un nouveau
    if (avatarTempPathRef.current) { actionDeleteTempImage(avatarTempPathRef.current).catch(() => {}); avatarTempPathRef.current = null }
    const localUrl = URL.createObjectURL(file)
    avatarPreviewRef.current = localUrl
    setAvatarSel({ name: 'Image importée', photoUrl: localUrl })   // aperçu immédiat
    setAvatarUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const { url, path } = await actionUploadTempImage(dataUrl)    // URL fetchable pour img2vid
      if (!url) throw new Error('Upload échoué')
      avatarTempPathRef.current = path
      setAvatarSel({ name: 'Image importée', photoUrl: url })
    } catch {
      toast.error('Upload de l\'avatar échoué')
      clearAvatar()
    } finally {
      setAvatarUploading(false)
    }
  }

  function clearAvatar() {
    if (avatarPreviewRef.current?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewRef.current)
    avatarPreviewRef.current = null
    if (avatarTempPathRef.current) { actionDeleteTempImage(avatarTempPathRef.current).catch(() => {}); avatarTempPathRef.current = null }
    setAvatarSel(null)
  }

  const fmt         = FORMATS.find(f => f.id === selectedFormat)
  // Brief effectif = description + inspiration extraite de la référence
  const effectivePrompt = [prompt.trim(), refInspiration.trim()].filter(Boolean).join('\n\n')
  // L'avatar (bibliothèque ou upload) alimente la génération img2vid. Un aperçu local (blob) n'est pas fetchable.
  const effectiveImageUrl = avatarSel && !avatarSel.photoUrl.startsWith('blob:') ? avatarSel.photoUrl : undefined

  // Moteur vidéo HYBRIDE : avatar (img2vid) → Kling (Seedance refuse les portraits réels) ;
  // sinon (text-to-video / B-roll) → Seedance 2.0 (moins cher, jusqu'à 15s).
  const useImg2Vid       = !!effectiveImageUrl
  const videoEngine: 'kling' | 'seedance' = useImg2Vid ? 'kling' : 'seedance'
  const videoEngineKey   = useImg2Vid ? 'kling-v2.1-pro' : 'seedance-pro'
  const videoEngineLabel = useImg2Vid ? 'Kling v2.1 Pro' : 'Seedance 2.0'
  const durOptions: readonly number[] = useImg2Vid ? [5, 10] : DURATIONS
  const effDuration: VideoDuration = (durOptions.includes(videoDuration) ? videoDuration : durOptions[durOptions.length - 1]) as VideoDuration

  // Coût estimé affiché : vidéo = script (ChatGPT) + moteur × durée ; sinon forfait
  const costLabel: string | null = !selectedFormat
    ? null
    : fmt?.engine === 'video'
      ? `~${(estimateCost('chatgpt') + estimateCost(videoEngineKey, effDuration)).toFixed(2)}`
      : COST_MAP[selectedFormat]

  // Génération possible dès qu'on a un brief/inspiration OU un avatar
  const canGenerate = !!selectedFormat && (effectivePrompt.length > 5 || !!effectiveImageUrl)
  const isPolling   = generating && (selectedFormat === 'ugc' || selectedFormat === 'commercial')

  // Cleanup : aucun timer zombie après démontage
  useEffect(() => () => { stopPolling() }, [])

  // Lightbox : fermeture par touche Échap
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  // Progress animation for video
  useEffect(() => {
    if (generating && (selectedFormat === 'ugc' || selectedFormat === 'commercial')) {
      const id = setInterval(() => setProgress(p => Math.min(p + 1.5, 90)), 500)
      return () => clearInterval(id)
    }
    if (!generating) { setProgress(0) }
  }, [generating, selectedFormat])

  // ─── Generate ─────────────────────────────────────────────────────────────

  async function generate() {
    if (!canGenerate || !selectedFormat) return
    setGenerating(true)
    setResult(null)
    setVideoJob(null)
    setProgress(0)
    setGenStep(0)

    try {
      switch (selectedFormat) {

        // ── UGC Vidéo + Commercial : ChatGPT → Seedance ──────────────────────
        case 'ugc':
        case 'commercial': {
          // Étape 1 : Script ChatGPT
          setPhase('ChatGPT — rédaction script...')
          const scriptRes = await actionGenerateScript({
            campaignName: 'Creative Studio',
            campaignDna:  effectivePrompt,
            contentType:  selectedFormat === 'ugc' ? 'ugc' : 'commercial',
            platform:     platform.toLowerCase().includes('tiktok') ? 'tiktok' :
                          platform.toLowerCase().includes('instagram') ? 'instagram' : 'youtube',
            model: 'chatgpt',
          })
          setResult({ type: 'script', data: scriptRes })

          // Étape 2 : Vidéo — avatar → Kling img2vid, sinon Seedance 2.0 text-to-video
          setGenStep(1)
          setPhase(`${videoEngineLabel}${effectiveImageUrl ? ' img2vid' : ''} — soumission...`)
          const job = await actionSubmitVideo({
            prompt:      `${scriptRes.hook}. ${effectivePrompt}`.slice(0, 600),
            engine:      videoEngine,
            aspectRatio: videoRatio.val,
            duration:    effDuration,
            ...(effectiveImageUrl ? { imageUrl: effectiveImageUrl } : {}),
          })
          setVideoJob(job)
          toast.success(`${videoEngineLabel} soumis ✓`)

          // Étape 3 : Polling (valeurs capturées pour l'asset)
          setGenStep(2)
          setPhase(`${videoEngineLabel} génère la vidéo...`)
          const fmtId   = selectedFormat
          const capPlat = platform
          const capPrompt = effectivePrompt
          const capRatio  = videoRatio.val
          const capDuration = effDuration
          const capEngineKey = videoEngineKey
          const capEngineLabel = videoEngineLabel
          const capAvatar = avatarSel?.name
          const capLabel  = selectedTypeLabel
          pollRef.current = setInterval(async () => {
            try {
              const status = await actionGetVideoStatus(job.generationId, videoEngine)
              setVideoJob(status)
              if (status.status === 'completed') {
                stopPolling()
                setResult({ type: 'video', job: status })
                setGenerating(false)
                setPhase('')
                toast.success(`Vidéo ${capEngineLabel} terminée`)
                if (status.videoUrl) {
                  persistOutput({
                    type:    'video',
                    sourceUrl: status.videoUrl,
                    title:   `${capLabel || (fmtId === 'ugc' ? 'UGC' : 'Commercial')} · ${capPlat}`,
                    engine:  capEngineKey,
                    prompt:  capPrompt.slice(0, 200),
                    format:  capRatio,
                    durationSeconds: capDuration,
                    avatarName: capAvatar,
                  }).catch(() => {})
                }
              } else if (status.status === 'failed') {
                stopPolling()
                setGenerating(false)
                setPhase('')
                toast.error(`${capEngineLabel} — échec : ` + (status.error ?? 'erreur'))
              }
            } catch { /* erreur transitoire — on retentera au prochain tick */ }
          }, 10_000)

          // Timeout de sécurité : jamais de polling éternel si Seedance reste bloqué
          pollTimeoutRef.current = setTimeout(() => {
            stopPolling()
            setGenerating(false)
            setPhase('')
            toast.error('Génération vidéo trop longue (>10 min) — réessayez')
          }, 10 * 60 * 1000)
          return // ne pas setGenerating(false) ici — le polling le fera
        }

        // ── Visuel + Shooting : Nano Banana ───────────────────────────────
        case 'image':
        case 'shooting': {
          setPhase('Nano Banana — génération...')
          const imgRes = await actionGenerateCampaignVisual({
            campaignName: 'Creative Studio',
            dna: effectivePrompt,
            format: imageRatio.val === '1792x1024' ? '16:9' : imageRatio.val === '1024x1792' ? '9:16' : '1:1',
            imageUrl: effectiveImageUrl,   // avatar → image-to-image
          })
          setResult({ type: 'images', data: [imgRes] })
          toast.success('Visuel Nano Banana')
          await persistOutput({
            type:   'image',
            sourceUrl: imgRes.url,
            title:  `${selectedTypeLabel || (selectedFormat === 'shooting' ? 'Shooting' : 'Visuel')} · ${platform}`,
            engine: 'nano-banana',
            prompt: effectivePrompt.slice(0, 200),
            format: imageRatio.val,
            avatarName: avatarSel?.name,
          }).catch(() => {})
          break
        }

        // ── Moodboard : Nano Banana ×4 ─────────────────────────────────────
        case 'moodboard': {
          setPhase('Nano Banana — 4 variations...')
          const moodRes = await actionGenerateMoodboard(effectivePrompt, 4, effectiveImageUrl)
          setResult({ type: 'images', data: moodRes })
          toast.success(`Moodboard · ${moodRes.length} images`)
          for (let i = 0; i < moodRes.length; i++) {
            await persistOutput({
              type:   'image',
              sourceUrl: moodRes[i].url,
              title:  `Moodboard ${i + 1}/4`,
              engine: 'nano-banana',
              prompt: effectivePrompt.slice(0, 200),
              avatarName: avatarSel?.name,
            }).catch(() => {})
          }
          break
        }
      }

    } catch (e: any) {
      toast.error(e.message ?? 'Erreur de génération')
      // L'erreur survient avant le démarrage du polling → on débloque l'UI ici
      // (sinon, pour ugc/commercial, le finally laisse `generating` à true indéfiniment).
      stopPolling()
      setGenerating(false)
      setPhase('')
    } finally {
      if (selectedFormat !== 'ugc' && selectedFormat !== 'commercial') {
        setGenerating(false)
        setPhase('')
      }
    }
  }

  // Téléchargement forcé même pour une URL cross-origin (CDN AIML) → via blob
  async function downloadFile(url: string, filename: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const obj = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = obj; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(obj)
    } catch { toast.error('Téléchargement impossible') }
  }

  function reset() {
    stopPolling()
    setResult(null)
    setVideoJob(null)
    setGenerating(false)
    setPhase('')
    setProgress(0)
  }

  function resetFull() {
    reset()
    clearReference()
    clearAvatar()
    setPrompt('')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in max-w-[920px] mx-auto">

      {/* ── Header ── */}
      <div className="mb-7">
        <p className="nb-label mb-2 text-accent">Génération libre</p>
        <h1 className="font-display font-bold text-[30px] tracking-tight text-text-primary mb-1 flex items-center gap-2.5">
          <span className="text-accent text-[24px] leading-none">●</span>
          Creative Studio
        </h1>
        <p className="text-[13px] text-text-muted">
          Générez n'importe quel format de contenu, sans lien avec une campagne
        </p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Composer (pleine largeur) ── */}
        <div>

          {/* ── Composer unique : type + brief + slots + params + générer ── */}
          <div className="bg-bg-card border border-border-strong rounded-neo-lg p-5 mb-5 shadow-neo transition-colors focus-within:border-accent">

            {/* Ligne 1 — chips de type (Product/App ▾, Moodboard, type sélectionné) */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {GROUPS.map((g) => {
                const active = group === g.key && !!selectedTypeId && selectedFormat !== 'moodboard'
                return (
                  <button
                    key={g.key}
                    onClick={() => openTypeModal(g.key)}
                    className={`flex items-center gap-1.5 font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border transition-all
                      ${active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    {g.label}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                )
              })}
              <span className="w-px h-5 bg-border mx-0.5" />
              <button
                onClick={() => pickExtra('moodboard')}
                className={`font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border transition-all
                  ${selectedFormat === 'moodboard' ? 'border-purple text-purple bg-purple/10' : 'border-border text-text-muted hover:border-border-strong'}`}
              >
                Moodboard
              </button>
              {selectedTypeId && selectedFormat !== 'moodboard' && (
                <span className="flex items-center gap-1.5 font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border border-accent text-accent bg-accent/10">
                  <span className="text-[9px]">●</span>
                  {selectedTypeLabel}
                  <button onClick={clearType} title="Retirer" className="ml-0.5 text-coral hover:scale-110 transition-transform leading-none">✕</button>
                </span>
              )}
            </div>

            {/* Ligne 2 — brief */}
            <textarea
              rows={4}
              className="nb-input w-full resize-y bg-bg-base"
              placeholder={
                selectedFormat === 'ugc'        ? "Décrivez le contenu UGC — produit, angle, message principal, ton..." :
                selectedFormat === 'image'      ? "Décrivez le visuel — sujet, ambiance, style, couleurs..." :
                selectedFormat === 'moodboard'  ? "Décrivez le concept créatif — thème, émotion, univers visuel..." :
                selectedFormat === 'commercial' ? "Décrivez la pub — produit, émotion, message, call-to-action..." :
                selectedFormat === 'shooting'   ? "Décrivez la photo lifestyle — sujet, décor, lumière, style..." :
                "Décrivez le contenu à générer..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {refInspiration && (
              <div className="mt-1.5 flex items-start gap-1.5 font-sans text-[9px] text-purple">
                <span className="w-1.5 h-1.5 rounded-full bg-purple inline-block mt-[3px] flex-shrink-0" />
                <span>Inspiration de la référence ajoutée au brief à la génération.</span>
              </div>
            )}

            {/* Ligne 3 — pied de composer : slots + params + générer (toujours visible) */}
            {(
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-end gap-3">

                {/* Slot Référence */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleReferenceFile(f) }}
                    onClick={() => !refPreview && refFileRef.current?.click()}
                    className={`relative w-[68px] h-[68px] rounded-neo border overflow-hidden flex items-center justify-center transition-all
                      ${refPreview ? 'border-purple/60' : 'border-dashed border-border cursor-pointer text-text-dim hover:text-purple hover:border-purple/50 hover:bg-purple/5'}`}
                  >
                    {refPreview ? (
                      <>
                        {refKind === 'video'
                          ? <video src={refPreview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                          : <img src={refPreview} alt="" className="w-full h-full object-cover" />}
                        {refAnalyzing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="font-sans text-[7px] text-white animate-pulse text-center px-1">Analyse…</span></div>}
                        {refInspiration && !refAnalyzing && <div className="absolute bottom-0 left-0 right-0 bg-purple/90 text-bg-base font-sans text-[7px] font-bold text-center leading-none py-0.5"></div>}
                        <button onClick={(e) => { e.stopPropagation(); clearReference() }} className="absolute -top-0 right-0 w-4 h-4 bg-coral text-bg-base font-bold text-[9px] flex items-center justify-center leading-none">✕</button>
                      </>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M12 4l-4 4M12 4l4 4"/><rect x="4" y="16" width="16" height="4" rx="1"/></svg>
                    )}
                  </div>
                  <span className="nb-label text-[8.5px]">Référence</span>
                  <input ref={refFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReferenceFile(f) }} />
                </div>

                {/* Slot Avatar */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    onClick={() => !avatarSel && openPicker()}
                    className={`relative w-[68px] h-[68px] rounded-neo border overflow-hidden flex items-center justify-center transition-all
                      ${avatarSel ? 'border-teal/60' : 'border-dashed border-border cursor-pointer text-text-dim hover:text-teal hover:border-teal/50 hover:bg-teal/5'}`}
                  >
                    {avatarSel ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarSel.photoUrl} alt={avatarSel.name} className="w-full h-full object-cover" />
                        {avatarUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="font-sans text-[7px] text-white animate-pulse">Upload…</span></div>}
                        {effectiveImageUrl && fmt?.engine === 'video' && <div className="absolute bottom-0 left-0 right-0 bg-accent/90 text-bg-base font-sans text-[7px] font-bold text-center leading-none py-0.5">img2vid</div>}
                        <button onClick={(e) => { e.stopPropagation(); clearAvatar() }} className="absolute top-0 right-0 w-4 h-4 bg-coral text-bg-base font-bold text-[9px] flex items-center justify-center leading-none">✕</button>
                      </>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                    )}
                  </div>
                  <button onClick={() => avatarFileRef.current?.click()} className="nb-label text-[8.5px] hover:text-text-primary transition-colors" title="Uploader une image">Avatar ↑</button>
                  <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
                </div>

                {/* Params + Générer (poussés à droite) */}
                <div className="ml-auto flex items-end gap-2">
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="nb-input text-[11px] py-2 px-2.5"
                    title="Plateforme cible"
                  >
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  {fmt?.engine === 'video' ? (
                    <>
                      <select value={videoRatio.val} onChange={(e) => setVideoRatio(RATIOS_VIDEO.find(r => r.val === e.target.value)!)} className="nb-input text-[11px] py-2 px-2.5" title="Ratio">
                        {RATIOS_VIDEO.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
                      </select>
                      <select value={effDuration} onChange={(e) => setVideoDuration(Number(e.target.value) as typeof DURATIONS[number])} className="nb-input text-[11px] py-2 px-2.5" title={useImg2Vid ? 'Durée (Kling : 5/10s pour les avatars)' : 'Durée (Seedance 2.0)'}>
                        {durOptions.map((d) => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </>
                  ) : (
                    <select value={imageRatio.val} onChange={(e) => setImageRatio(RATIOS_IMAGE.find(r => r.val === e.target.value)!)} className="nb-input text-[11px] py-2 px-2.5" title="Format">
                      {RATIOS_IMAGE.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
                    </select>
                  )}
                  {!generating && !result && (
                    <Button onClick={generate} disabled={!canGenerate}>
                      Générer{costLabel ? ` · ${costLabel} $` : ''}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Moteur IA — petite légende */}
            {selectedFormat && (
              <p className="font-sans text-[9px] text-text-dim mt-2">{FORMAT_ENGINES[selectedFormat]}</p>
            )}
          </div>

          {generating && selectedFormat && (
            <div className="mt-1">
              <GenerationProgress
                steps={GEN_STEPS[selectedFormat]}
                current={genStep}
                progress={isPolling ? progress : null}
                active={generating}
                accent={GEN_ACCENT[selectedFormat]}
                subLabel={isPolling && videoJob?.generationId ? `Job : ${videoJob.generationId.slice(0, 16)}…` : (phase || undefined)}
              />
            </div>
          )}

          {/* ── État vide — aucune génération en cours/affichée ── */}
          {!generating && !result && (
            <div
              className="mt-6 rounded-neo-lg border border-dashed border-border flex flex-col items-center justify-center text-center py-16 px-6"
              style={{
                backgroundImage: 'radial-gradient(rgb(var(--fg) / 0.06) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <div className="w-14 h-14 rounded-neo-lg border border-border-strong bg-bg-card shadow-neo flex items-center justify-center mb-4">
                <span className="text-accent text-[22px] leading-none">●</span>
              </div>
              <p className="font-display font-bold text-[15px] text-text-primary mb-1">Ta création apparaîtra ici</p>
              <p className="font-sans text-[11px] text-text-muted max-w-[340px]">
                {selectedFormat
                  ? 'Décris ton brief, ajoute une référence ou un avatar, puis lance la génération.'
                  : 'Choisis un type de contenu pour commencer — UGC, visuel, moodboard…'}
              </p>
              <div className="flex items-center gap-2 mt-5">
                {['Seedance 2.0', 'Kling v2.1', 'Nano Banana', 'Gemini'].map((m) => (
                  <span key={m} className="font-sans text-[9px] font-bold text-text-dim border border-border rounded-neo px-2.5 py-1">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Résultats ── */}
          {result && (
            <div className="mt-6 animate-reveal">

              {/* Script */}
              {result.type === 'script' && (
                <div className="bg-bg-card border border-accent/30 rounded-neo-lg p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-[14px] text-text-primary">Script généré · ChatGPT</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.data.script).then(() => toast.success('Copié'))}
                      className="font-sans text-[10px] text-accent border border-accent/30 px-2 py-1 rounded-neo hover:bg-accent/10 transition-colors"
                    >Copier</button>
                  </div>
                  <div className="bg-bg-base border border-border rounded-neo p-4 mb-3">
                    <p className="font-sans text-[10px] font-bold text-accent mb-1">HOOK</p>
                    <p className="text-[12.5px] text-text-primary mb-3">{result.data.hook}</p>
                    <p className="font-sans text-[10px] font-bold text-text-dim mb-1">SCRIPT</p>
                    <pre className="text-[12px] text-text-muted leading-relaxed whitespace-pre-wrap font-sans">{result.data.script}</pre>
                    {result.data.cta && (
                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border">
                        <span className="font-sans text-[10px] text-text-dim">CTA :</span>
                        <span className="font-sans text-[11px] text-accent font-bold">{result.data.cta}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vidéo */}
              {result.type === 'video' && result.job.videoUrl && (
                <div className="bg-bg-card border border-accent rounded-neo-lg overflow-hidden mb-4">
                  <div
                    className="relative group cursor-zoom-in"
                    onClick={() => setLightbox({ type: 'video', url: result.job.videoUrl! })}
                  >
                    <video src={result.job.videoUrl} muted loop playsInline className="w-full max-h-[400px] object-contain pointer-events-none" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity font-sans text-[11px] font-bold text-white bg-black/60 px-3 py-1.5 rounded-neo">⤢ Agrandir</span>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="font-sans text-[11px] text-text-dim">{videoEngineLabel} · {videoRatio.label} · {effDuration}s</span>
                    <button
                      onClick={() => downloadFile(result.job.videoUrl!, `creation-${Date.now()}.mp4`)}
                      className="font-sans text-[10px] text-accent border border-accent/30 px-2 py-1 rounded-neo hover:bg-accent/10 transition-colors"
                    >⤓ Télécharger</button>
                  </div>
                </div>
              )}

              {/* Images */}
              {result.type === 'images' && (
                <div className={`grid gap-3 mb-4 ${result.data.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {result.data.map((img, i) => (
                    <div
                      key={i}
                      className="bg-bg-card border border-border rounded-neo-lg overflow-hidden group relative cursor-zoom-in"
                      onClick={() => setLightbox({ type: 'image', url: img.url })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={`Visuel ${i + 1}`} className="w-full aspect-video object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-sans text-[11px] font-bold text-white bg-black/60 px-3 py-1.5 rounded-neo">⤢ Agrandir</span>
                      </div>
                      <div className="absolute top-2 left-2 bg-teal/90 text-bg-base font-sans text-[9px] font-bold px-1.5 py-0.5 rounded-neo">
                        Nano Banana
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadFile(img.url, `creation-${Date.now()}-${i + 1}.png`) }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-card/90 font-sans text-[10px] text-accent border border-accent/30 px-2 py-0.5 rounded-neo hover:bg-accent/10"
                      >⤓ Télécharger</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions post-génération */}
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={resetFull}>↩ Nouveau</Button>
                <span className="font-sans text-[10px] text-teal flex items-center gap-1.5">
                  ✓ Ajouté à la galerie
                </span>
                <Link href="/galerie" className="font-sans text-[10px] text-accent hover:underline ml-auto">Voir la galerie →</Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Historique récent (sous le composer, pleine largeur) ── */}
        <div>
          <div className="bg-bg-card border border-border rounded-neo-lg p-4 max-w-[560px] shadow-neo">
            <div className="flex items-center justify-between mb-3">
              <p className="nb-label">Récent</p>
              <Link href="/galerie" className="font-sans text-[9px] text-accent hover:underline">Voir tout →</Link>
            </div>
            {recentAssets.length === 0 ? (
              <p className="font-sans text-[10px] text-text-dim">Rien encore — vos générations apparaîtront ici.</p>
            ) : (
              <div className="flex flex-col">
                {recentAssets.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-2 py-2 ${i < recentAssets.length - 1 ? 'border-b border-fg/40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-[10px] text-text-primary truncate">{item.title}</div>
                      <div className="font-sans text-[9px] text-text-dim">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Lightbox — preview plein écran du contenu généré (fond flouté) ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          {/* Barre d'actions — à côté du contenu (haut-droite) */}
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => downloadFile(lightbox.url, `creation-${Date.now()}.${lightbox.type === 'video' ? 'mp4' : 'png'}`)}
              className="flex items-center gap-1.5 font-sans text-[12px] font-bold text-bg-base bg-accent px-3.5 py-2 rounded-neo border border-accent transition-transform"
            >
              ⤓ Télécharger
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="w-9 h-9 rounded-neo border border-white/30 text-white text-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Contenu */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-[92vw] max-h-[86vh] animate-slide-up">
            {lightbox.type === 'video' ? (
              <video src={lightbox.url} controls autoPlay loop className="max-w-[92vw] max-h-[86vh] rounded-neo-lg border border-border-strong shadow-neo" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.url} alt="Aperçu" className="max-w-[92vw] max-h-[86vh] object-contain rounded-neo-lg border border-border-strong shadow-neo" />
            )}
          </div>
        </div>
      )}

      {/* ── Modale — choix du type de contenu (même affichage que l'étape 2) ── */}
      {typeModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setTypeModalOpen(false)}
        >
          <div
            className="w-full max-w-[1050px] max-h-[88vh] bg-bg-card border border-border rounded-neo-lg flex flex-col overflow-hidden shadow-neo-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + catégories */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-[14px] text-text-primary">
                  Type de contenu — {group === 'produit' ? 'Product' : 'App'}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border transition-all
                      ${activeCategory === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                  >
                    All
                  </button>
                  {Object.entries(formats).map(([key, fmt]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={`font-sans text-[10px] font-bold px-3 py-1 rounded-neo border transition-all
                        ${activeCategory === key ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'}`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>

            {/* Grille des types — sélection unique */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {displayedTypes.map((type) => {
                  const isSel = selectedTypeId === type.id
                  return (
                    <div
                      key={type.id}
                      onClick={() => pickType(type, categoryOf(type.id))}
                      className="flex flex-col gap-2.5 cursor-pointer group"
                    >
                      <div className={`relative h-[240px] bg-bg-elevated rounded-neo-lg overflow-hidden border transition-all duration-150
                        ${isSel ? 'border-accent shadow-neo' : 'border-border group-hover:border-border-strong'}`}>
                        {type.url && type.kind === 'video' ? (
                          <video autoPlay muted loop playsInline src={type.url} className="w-full h-full object-cover" />
                        ) : type.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={type.url} alt={type.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-bg-surface">
                            <div className="w-10 h-10 rounded-neo border border-border" />
                          </div>
                        )}
                        <div className={`absolute top-3 right-3 w-8 h-8 rounded-neo border flex items-center justify-center text-[11px] font-bold transition-all
                          ${isSel ? 'bg-accent border-accent text-bg-base' : 'bg-black/40 border-border text-text-dim'}`}>
                          {isSel ? '✓' : ''}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                      <div className="px-1">
                        <div className={`text-[13px] font-bold ${isSel ? 'text-accent' : 'text-text-primary'}`}>{type.label}</div>
                        {type.desc && <div className="text-[11.5px] text-text-muted mt-0.5 leading-snug">{type.desc}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale — sélection d'avatar (bibliothèque) ── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-[640px] max-h-[80vh] bg-bg-card border border-border rounded-neo-lg flex flex-col overflow-hidden shadow-neo animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="font-display font-bold text-[14px] text-text-primary">Choisir un avatar</h2>
              <button onClick={() => setPickerOpen(false)} className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">×</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {avatarListLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-neo-lg border border-border bg-bg-elevated animate-pulse" />)}
                </div>
              ) : avatarList.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-sans text-[11px] text-text-dim mb-2">Aucun avatar pour le moment.</p>
                  <Link href="/avatar-studio" className="font-sans text-[11px] text-accent hover:underline">Créer un avatar →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {avatarList.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => pickAvatar(a)}
                      disabled={!a.photoUrl}
                      title={a.name}
                      className="group relative rounded-neo-lg border border-border overflow-hidden text-left transition-all hover:border-teal hover:-translate-y-0.5 hover:shadow-neo disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="relative aspect-[4/5] bg-bg-surface overflow-hidden">
                        {a.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.photoUrl} alt={a.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center font-display font-bold text-text-dim text-sm">{a.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 p-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                          <p className="font-display font-bold text-[13px] text-white truncate">{a.name}</p>
                        </div>
                        {a.photoUrl && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-teal text-bg-base flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
