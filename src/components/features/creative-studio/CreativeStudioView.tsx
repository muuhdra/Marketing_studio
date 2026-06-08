'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionGenerateScript,
  actionGenerateCampaignVisual,
  actionGenerateImage,
  actionGenerateMoodboard,
  actionSubmitVideo,
  actionGetVideoStatus,
  actionGenerateSpeech,
} from '@/lib/actions/ai'
import type { VideoJob } from '@/lib/ai/video'
import type { ScriptResult } from '@/lib/ai/text'
import type { ImageResult } from '@/lib/ai/image'

// ─── Config ───────────────────────────────────────────────────────────────────

const FORMATS = [
  { id: 'ugc',          label: 'UGC Vidéo',      desc: 'Script + Kling v2.1 Pro',     icon: '🎬', color: 'text-accent',  border: 'border-accent',        activeBg: 'bg-accent/5',  engine: 'video'   },
  { id: 'image',        label: 'Visuel Campagne', desc: 'Nano Banana — impact fort',   icon: '🖼️', color: 'text-teal',    border: 'border-border-teal',   activeBg: 'bg-teal/5',    engine: 'image'   },
  { id: 'moodboard',    label: 'Moodboard',       desc: 'Nano Banana — 4 variations',  icon: '🎨', color: 'text-purple',  border: 'border-border-purple',  activeBg: 'bg-purple/5',  engine: 'image'   },
  { id: 'voix',         label: 'Voix off',        desc: 'ElevenLabs — émotionnel',     icon: '🎙️', color: 'text-amber',   border: 'border-amber/40',       activeBg: 'bg-amber/5',   engine: 'audio'   },
  { id: 'commercial',   label: 'Commercial',      desc: 'Script + Kling v2.1 Pro',     icon: '📺', color: 'text-coral',   border: 'border-border-coral',   activeBg: 'bg-coral/5',   engine: 'video'   },
  { id: 'shooting',     label: 'Shooting Photo',  desc: 'Nano Banana — lifestyle',     icon: '📸', color: 'text-pink',    border: 'border-pink/40',        activeBg: 'bg-pink/5',    engine: 'image'   },
] as const

type FormatId = typeof FORMATS[number]['id']

const PLATFORMS = ['TikTok', 'Instagram Reels', 'Instagram Feed', 'YouTube Shorts', 'Facebook', 'LinkedIn']
const RATIOS_VIDEO = [{ label: '9:16 Vertical', val: '9:16' as const }, { label: '16:9 Wide', val: '16:9' as const }, { label: '1:1 Square', val: '1:1' as const }]
const RATIOS_IMAGE = [{ label: '16:9 Wide', val: '1792x1024' as const }, { label: '9:16 Story', val: '1024x1792' as const }, { label: '1:1 Square', val: '1024x1024' as const }]

// Moteurs IA par format
const FORMAT_ENGINES: Record<FormatId, string> = {
  ugc:        'ChatGPT → script · Kling v2.1 Pro → vidéo',
  image:      'Nano Banana → visuel campagne',
  moodboard:  'Nano Banana → 4 variations créatives',
  voix:       'ElevenLabs → synthèse vocale émotionnelle',
  commercial:  'ChatGPT → script · Kling v2.1 Pro → vidéo',
  shooting:   'Nano Banana → photo lifestyle',
}

const COST_MAP: Record<FormatId, string> = {
  ugc:       '~0.35',
  image:     '~0.04',
  moodboard: '~0.16',
  voix:      '~0.06',
  commercial: '~0.35',
  shooting:  '~0.04',
}

// ─── Résultat union ───────────────────────────────────────────────────────────

type GenerationResult =
  | { type: 'script'; data: ScriptResult }
  | { type: 'images'; data: ImageResult[] }
  | { type: 'audio';  data: string /* base64 */ }
  | { type: 'video';  job: VideoJob }

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreativeStudioView() {
  const toast = useToast()

  const [selectedFormat, setSelectedFormat] = useState<FormatId | null>(null)
  const [prompt, setPrompt]                 = useState('')
  const [platform, setPlatform]             = useState(PLATFORMS[0])
  const [videoRatio, setVideoRatio]         = useState(RATIOS_VIDEO[0])
  const [imageRatio, setImageRatio]         = useState(RATIOS_IMAGE[0])
  const [generating, setGenerating]         = useState(false)
  const [phase, setPhase]                   = useState<string>('')
  const [result, setResult]                 = useState<GenerationResult | null>(null)
  const [videoJob, setVideoJob]             = useState<VideoJob | null>(null)
  const [progress, setProgress]             = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fmt         = FORMATS.find(f => f.id === selectedFormat)
  const canGenerate = !!selectedFormat && prompt.trim().length > 5
  const isPolling   = generating && (selectedFormat === 'ugc' || selectedFormat === 'commercial')

  // Cleanup
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

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

    try {
      switch (selectedFormat) {

        // ── UGC Vidéo + Commercial : ChatGPT → Kling ──────────────────────
        case 'ugc':
        case 'commercial': {
          // Étape 1 : Script ChatGPT
          setPhase('✍️ ChatGPT — rédaction script...')
          const scriptRes = await actionGenerateScript({
            campaignName: 'Creative Studio',
            campaignDna:  prompt,
            contentType:  selectedFormat === 'ugc' ? 'ugc' : 'commercial',
            platform:     platform.toLowerCase().includes('tiktok') ? 'tiktok' :
                          platform.toLowerCase().includes('instagram') ? 'instagram' : 'youtube',
            model: 'chatgpt',
          })
          setResult({ type: 'script', data: scriptRes })

          // Étape 2 : Vidéo Kling
          setPhase('🎬 Kling v2.1 Pro — soumission...')
          const job = await actionSubmitVideo({
            prompt:      `${scriptRes.hook}. ${prompt}`.slice(0, 600),
            engine:      'kling',
            klingVersion: 'v2.1-pro',
            aspectRatio: videoRatio.val,
            duration:    5,
          })
          setVideoJob(job)
          toast.success('Kling soumis ✓')

          // Étape 3 : Polling
          setPhase('⏳ Kling génère la vidéo...')
          pollRef.current = setInterval(async () => {
            const status = await actionGetVideoStatus(job.generationId, 'kling')
            setVideoJob(status)
            if (status.status === 'completed') {
              clearInterval(pollRef.current!)
              setResult({ type: 'video', job: status })
              setGenerating(false)
              setPhase('')
              toast.success('Vidéo Kling terminée ✦')
            } else if (status.status === 'failed') {
              clearInterval(pollRef.current!)
              setGenerating(false)
              setPhase('')
              toast.error('Kling — échec : ' + (status.error ?? 'erreur'))
            }
          }, 10_000)
          return // ne pas setGenerating(false) ici — le polling le fera
        }

        // ── Visuel + Shooting : Nano Banana ───────────────────────────────
        case 'image':
        case 'shooting': {
          setPhase('🖼️ Nano Banana — génération...')
          const imgRes = await actionGenerateCampaignVisual({
            campaignName: 'Creative Studio',
            dna: prompt,
            format: imageRatio.val === '1792x1024' ? '16:9' : imageRatio.val === '1024x1792' ? '9:16' : '1:1',
          })
          setResult({ type: 'images', data: [imgRes] })
          toast.success('Visuel Nano Banana ✦')
          break
        }

        // ── Moodboard : Nano Banana ×4 ─────────────────────────────────────
        case 'moodboard': {
          setPhase('🎨 Nano Banana — 4 variations...')
          const moodRes = await actionGenerateMoodboard(prompt, 4)
          setResult({ type: 'images', data: moodRes })
          toast.success(`Moodboard · ${moodRes.length} images ✦`)
          break
        }

        // ── Voix : ElevenLabs ──────────────────────────────────────────────
        case 'voix': {
          setPhase('🎙️ ElevenLabs — synthèse...')
          const speech = await actionGenerateSpeech({
            text:   prompt.slice(0, 500),
            engine: 'elevenlabs',
            voice:  'Rachel',
          })
          setResult({ type: 'audio', data: speech.audioBase64 })
          toast.success('Voix ElevenLabs générée ✦')
          break
        }
      }

    } catch (e: any) {
      toast.error(e.message ?? 'Erreur de génération')
    } finally {
      if (selectedFormat !== 'ugc' && selectedFormat !== 'commercial') {
        setGenerating(false)
        setPhase('')
      }
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setResult(null)
    setVideoJob(null)
    setGenerating(false)
    setPhase('')
    setProgress(0)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="mb-7">
        <p className="nb-label mb-2">Génération libre</p>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
          Creative Studio
        </h1>
        <p className="text-[12.5px] text-text-muted">
          Générez n'importe quel format de contenu, sans lien avec une campagne
        </p>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6 items-start">

        {/* ── Colonne gauche ── */}
        <div>

          {/* Sélection format */}
          <div className="mb-6">
            <p className="nb-label mb-3">Type de contenu</p>
            <div className="grid grid-cols-3 gap-2.5">
              {FORMATS.map((f) => {
                const isActive = selectedFormat === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFormat(isActive ? null : f.id); reset() }}
                    className={`
                      flex items-center gap-3 p-3 rounded-neo-lg border-2 text-left
                      transition-all duration-100 cursor-pointer
                      ${isActive
                        ? `${f.border} ${f.activeBg} -translate-x-px -translate-y-px shadow-[2px_2px_0px_currentColor]`
                        : 'border-border bg-bg-card hover:border-border-strong hover:bg-bg-elevated'
                      }
                    `}
                  >
                    <span className="text-xl flex-shrink-0">{f.icon}</span>
                    <div>
                      <div className={`text-[12.5px] font-bold mb-0.5 ${isActive ? f.color : 'text-text-primary'}`}>
                        {f.label}
                      </div>
                      <div className="font-mono text-[9.5px] text-text-muted">{f.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Moteur IA actif */}
          {selectedFormat && (
            <div className={`flex items-center gap-2.5 p-3 rounded-neo border-2 mb-4 ${fmt?.border ?? 'border-border'} bg-current/0`}>
              <span className="text-lg">{fmt?.icon}</span>
              <div>
                <div className={`font-mono text-[10px] font-bold ${fmt?.color}`}>Moteur IA</div>
                <div className="font-mono text-[10px] text-text-dim">{FORMAT_ENGINES[selectedFormat]}</div>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div className="mb-5">
            <Textarea
              label="Description / Brief créatif"
              rows={5}
              placeholder={
                selectedFormat === 'ugc'       ? "Décrivez le contenu UGC — produit, angle, message principal, ton..." :
                selectedFormat === 'image'     ? "Décrivez le visuel — sujet, ambiance, style, couleurs..." :
                selectedFormat === 'moodboard' ? "Décrivez le concept créatif — thème, émotion, univers visuel..." :
                selectedFormat === 'voix'      ? "Saisissez le texte à synthétiser en voix off..." :
                selectedFormat === 'commercial'? "Décrivez la pub — produit, emotion, message, call-to-action..." :
                selectedFormat === 'shooting'  ? "Décrivez la photo lifestyle — sujet, décor, lumière, style..." :
                "Décrivez le contenu à générer..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Params sortie */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="nb-label block mb-1.5">Plateforme cible</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="nb-input text-[13px] py-2.5 px-3.5"
              >
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="nb-label block mb-1.5">Ratio / Format</label>
              {fmt?.engine === 'video' ? (
                <select
                  value={videoRatio.val}
                  onChange={(e) => setVideoRatio(RATIOS_VIDEO.find(r => r.val === e.target.value)!)}
                  className="nb-input text-[13px] py-2.5 px-3.5"
                >
                  {RATIOS_VIDEO.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              ) : (
                <select
                  value={imageRatio.val}
                  onChange={(e) => setImageRatio(RATIOS_IMAGE.find(r => r.val === e.target.value)!)}
                  className="nb-input text-[13px] py-2.5 px-3.5"
                >
                  {RATIOS_IMAGE.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Bouton générer */}
          {!generating && !result && (
            <Button onClick={generate} disabled={!canGenerate} size="lg">
              ✦ Générer le contenu
            </Button>
          )}

          {generating && (
            <div className="mt-1 bg-bg-card border-2 border-accent rounded-neo-lg p-5 shadow-neo animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-neo border-2 border-accent flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-neo bg-accent animate-pulse" />
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold text-accent">{phase || 'Génération en cours...'}</p>
                  {isPolling && videoJob?.generationId && (
                    <p className="font-mono text-[9px] text-text-dim">Job : {videoJob.generationId.slice(0, 16)}…</p>
                  )}
                </div>
              </div>
              {isPolling && (
                <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div className="h-full bg-accent rounded-neo transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}

          {/* ── Résultats ── */}
          {result && (
            <div className="mt-6 animate-fade-in">

              {/* Script */}
              {result.type === 'script' && (
                <div className="bg-bg-card border-2 border-accent/30 rounded-neo-lg p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-[14px] text-text-primary">Script généré · ChatGPT</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.data.script).then(() => toast.success('Copié'))}
                      className="font-mono text-[10px] text-accent border border-accent/30 px-2 py-1 rounded-neo hover:bg-accent/10 transition-colors"
                    >📋 Copier</button>
                  </div>
                  <div className="bg-bg-base border border-border rounded-neo p-4 mb-3">
                    <p className="font-mono text-[10px] font-bold text-accent mb-1">HOOK</p>
                    <p className="text-[12.5px] text-text-primary mb-3">{result.data.hook}</p>
                    <p className="font-mono text-[10px] font-bold text-text-dim mb-1">SCRIPT</p>
                    <pre className="text-[12px] text-text-muted leading-relaxed whitespace-pre-wrap font-sans">{result.data.script}</pre>
                    {result.data.cta && (
                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border">
                        <span className="font-mono text-[10px] text-text-dim">CTA :</span>
                        <span className="font-mono text-[11px] text-accent font-bold">{result.data.cta}</span>
                      </div>
                    )}
                  </div>
                  {isPolling && (
                    <div className="flex items-center gap-2 p-3 bg-accent/5 border border-accent/20 rounded-neo">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span className="font-mono text-[10px] text-accent">Kling v2.1 Pro génère la vidéo... ({Math.round(progress)}%)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Vidéo */}
              {result.type === 'video' && result.job.videoUrl && (
                <div className="bg-bg-card border-2 border-accent rounded-neo-lg overflow-hidden mb-4">
                  <video src={result.job.videoUrl} controls autoPlay loop className="w-full max-h-[400px] object-contain" />
                  <div className="p-4 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-text-dim">Kling v2.1 Pro · {videoRatio.label}</span>
                    <a href={result.job.videoUrl} download className="font-mono text-[10px] text-accent border border-accent/30 px-2 py-1 rounded-neo hover:bg-accent/10 transition-colors">
                      ⬇ Télécharger
                    </a>
                  </div>
                </div>
              )}

              {/* Images */}
              {result.type === 'images' && (
                <div className={`grid gap-3 mb-4 ${result.data.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {result.data.map((img, i) => (
                    <div key={i} className="bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden group relative">
                      <img src={img.url} alt={`Visuel ${i + 1}`} className="w-full aspect-video object-cover" />
                      <div className="absolute top-2 left-2 bg-teal/90 text-bg-base font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-neo">
                        Nano Banana
                      </div>
                      <a href={img.url} download className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-card/90 font-mono text-[10px] text-accent border border-accent/30 px-2 py-0.5 rounded-neo">
                        ⬇
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio */}
              {result.type === 'audio' && (
                <div className="bg-bg-card border-2 border-amber/40 rounded-neo-lg p-5 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🎙️</span>
                    <div>
                      <div className="font-mono text-[11px] font-bold text-amber">Voix synthétisée</div>
                      <div className="font-mono text-[9px] text-text-dim">ElevenLabs · Rachel</div>
                    </div>
                  </div>
                  <audio controls src={`data:audio/mpeg;base64,${result.data}`} className="w-full" />
                </div>
              )}

              {/* Actions post-génération */}
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={reset}>↩ Nouveau</Button>
                <Button size="sm">💾 Sauvegarder</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Panneau droit ── */}
        <div className="sticky top-0 flex flex-col gap-3.5">

          {/* Moteur IA */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Moteurs IA actifs</p>
            <div className="flex flex-col gap-2">
              {[
                { fmt: ['ugc', 'commercial'], icon: '✍️', name: 'ChatGPT GPT-4o', role: 'Rédaction script', color: 'text-accent' },
                { fmt: ['ugc', 'commercial'], icon: '🎬', name: 'Kling v2.1 Pro', role: 'Vidéo UGC', color: 'text-accent' },
                { fmt: ['image', 'moodboard', 'shooting'], icon: '🖼️', name: 'Nano Banana', role: 'Visuels', color: 'text-teal' },
                { fmt: ['voix'], icon: '🎙️', name: 'ElevenLabs', role: 'Voix off', color: 'text-amber' },
              ].map((ag) => {
                const active = selectedFormat ? ag.fmt.includes(selectedFormat) : false
                return (
                  <div key={ag.name} className={`flex items-center gap-2.5 px-3 py-2 rounded-neo border-2 transition-all
                    ${active ? 'border-accent bg-accent/5' : 'border-border bg-bg-surface opacity-40'}`}>
                    <span className="text-sm flex-shrink-0">{ag.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono text-[10px] font-bold truncate ${active ? ag.color : 'text-text-dim'}`}>{ag.name}</div>
                      <div className="font-mono text-[9px] text-text-dim">{ag.role}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-accent' : 'bg-border'}`} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Coût estimé */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-2">Coût estimé</p>
            <div className="font-display font-bold text-[22px] text-text-primary">
              {selectedFormat ? COST_MAP[selectedFormat] : <span className="text-text-dim">—</span>}
              {selectedFormat && <span className="text-[13px] font-normal text-text-muted ml-1">USD</span>}
            </div>
            <p className="font-mono text-[10px] text-text-dim mt-1">par génération · via AIML API</p>
          </div>

          {/* Historique récent */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Historique récent</p>
            <div className="flex flex-col">
              {[
                { fmt: 'UGC Social',   model: 'Kling v2.1',    date: 'Il y a 2h' },
                { fmt: 'Moodboard',    model: 'Nano Banana',   date: 'Hier 14h'  },
                { fmt: 'Voix off',     model: 'ElevenLabs',    date: 'Il y a 2j' },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2.5 ${i < 2 ? 'border-b border-border/40' : ''}`}>
                  <div>
                    <div className="font-mono text-[11px] text-text-primary">{item.fmt}</div>
                    <div className="font-mono text-[9px] text-text-dim">{item.model}</div>
                  </div>
                  <span className="font-mono text-[10px] text-text-dim">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
