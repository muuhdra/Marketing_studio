'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionSubmitVideo,
  actionGetVideoStatus,
  actionGenerateSpeech,
} from '@/lib/actions/ai'
import type { VideoJob } from '@/lib/ai/video'

// ─── Config ───────────────────────────────────────────────────────────────────

const FORMATS: { id: string; label: string; aspect: '9:16' | '16:9' | '1:1' | '4:3' }[] = [
  { id: 'short',      label: '9:16 · Short',      aspect: '9:16' },
  { id: 'widescreen', label: '16:9 · Widescreen', aspect: '16:9' },
  { id: 'square',     label: '1:1 · Square',      aspect: '1:1'  },
  { id: 'feed',       label: '4:5 · Feed',         aspect: '4:3'  },
]

const DURATIONS: { label: string; val: 5 | 10 }[] = [
  { label: '5s',  val: 5  },
  { label: '10s', val: 10 },
]

const VOICE_OPTIONS = [
  { id: 'Rachel',  label: 'Rachel',  sub: 'Féminine · Naturelle'  },
  { id: 'Bella',   label: 'Bella',   sub: 'Féminine · Chaleureuse'},
  { id: 'Adam',    label: 'Adam',    sub: 'Masculin · Posé'        },
  { id: 'Antoni',  label: 'Antoni',  sub: 'Masculin · Dynamique'  },
] as const

type VoiceId = typeof VOICE_OPTIONS[number]['id']

type ProdPhase = 'idle' | 'voice' | 'video' | 'polling' | 'done' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductionTab() {
  const toast = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)

  // ── Form ────
  const [scenario, setScenario]               = useState('')
  const [script, setScript]                   = useState('')
  const [selectedFormat, setSelectedFormat]   = useState(FORMATS[0])
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(5)
  const [selectedVoice, setSelectedVoice]     = useState<VoiceId>('Rachel')
  const [generateVoice, setGenerateVoice]     = useState(true)

  // ── Résultats ────
  const [phase, setPhase]         = useState<ProdPhase>('idle')
  const [audioB64, setAudioB64]   = useState<string | null>(null)
  const [videoJob, setVideoJob]   = useState<VideoJob | null>(null)
  const [progress, setProgress]   = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const canGenerate = scenario.trim().length > 10

  // ── Cleanup polling on unmount ────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // ── Progress animation ────
  useEffect(() => {
    if (phase === 'video' || phase === 'polling') {
      const id = setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 400)
      return () => clearInterval(id)
    }
    if (phase === 'done') setProgress(100)
    if (phase === 'idle') setProgress(0)
  }, [phase])

  // ─── Pipeline Production ───────────────────────────────────────────────────

  async function runProduction() {
    if (!canGenerate) return
    setPhase('idle')
    setAudioB64(null)
    setVideoJob(null)
    setProgress(0)

    try {
      // ── Étape 1 : Voix ElevenLabs ──────────────────────────────────────────
      if (generateVoice && script.trim()) {
        setPhase('voice')
        const voiceRes = await actionGenerateSpeech({
          text:   script.trim().slice(0, 500),
          engine: 'elevenlabs',
          voice:  selectedVoice,
        })
        setAudioB64(voiceRes.audioBase64)
      }

      // ── Étape 2 : Vidéo Kling v2.1 Pro ─────────────────────────────────────
      setPhase('video')
      const job = await actionSubmitVideo({
        prompt:      scenario.trim(),
        engine:      'kling',
        klingVersion: 'v2.1-pro',
        aspectRatio: selectedFormat.aspect,
        duration:    selectedDuration,
        negativePrompt: 'blur, low quality, watermark, text overlay, distorted faces',
      })
      setVideoJob(job)
      toast.success('Kling v2.1 Pro — job soumis ✓')

      // ── Étape 3 : Polling ──────────────────────────────────────────────────
      setPhase('polling')
      pollRef.current = setInterval(async () => {
        try {
          const status = await actionGetVideoStatus(job.generationId, 'kling')
          setVideoJob(status)

          if (status.status === 'completed') {
            clearInterval(pollRef.current!)
            setPhase('done')
            toast.success('Vidéo générée par Kling ✦')
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current!)
            setPhase('error')
            toast.error('Kling — génération échouée : ' + (status.error ?? 'erreur inconnue'))
          }
        } catch (e: any) {
          clearInterval(pollRef.current!)
          setPhase('error')
          toast.error('Polling erreur : ' + (e.message ?? 'erreur'))
        }
      }, 10_000)

    } catch (e: any) {
      setPhase('error')
      toast.error(e.message ?? 'Erreur production')
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setPhase('idle')
    setAudioB64(null)
    setVideoJob(null)
    setProgress(0)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isRunning   = phase === 'voice' || phase === 'video' || phase === 'polling'
  const phaseLabel  = phase === 'voice'   ? '🎙️ Synthèse vocale ElevenLabs...' :
                      phase === 'video'   ? '🎬 Soumission Kling v2.1 Pro...' :
                      phase === 'polling' ? `⏳ Génération vidéo · ${Math.round(progress)}%` :
                      phase === 'done'    ? '✦ Production terminée' : ''

  return (
    <div className="animate-fade-in flex gap-6 min-h-[600px]">

      {/* ── Panneau gauche ── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-3.5">

        {/* Clone actif badge */}
        <div className="bg-purple/5 border-2 border-border-purple rounded-neo-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-neo-md border-2 border-border-purple bg-purple/15 flex items-center justify-center text-xl">🧬</div>
          <div>
            <div className="font-mono text-[10px] font-bold text-purple mb-0.5">Clone actif</div>
            <div className="font-display font-bold text-[13px] text-text-primary">Kling v2.1 Pro</div>
          </div>
          <div className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-accent animate-pulse' : 'bg-teal'}`} />
        </div>

        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4 flex-1 flex flex-col gap-4">

          {/* Scénario */}
          <Textarea
            label="Scénario / Action"
            rows={4}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Ex : Le clone entre dans une boutique, regarde la caméra et montre le produit avec enthousiasme..."
          />

          {/* Script vocal toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="nb-label">Script Vocal</label>
              <div
                onClick={() => setGenerateVoice(!generateVoice)}
                className={`w-8 h-4 rounded-neo border-2 relative cursor-pointer transition-all flex-shrink-0
                  ${generateVoice ? 'bg-teal border-teal' : 'bg-bg-base border-border'}`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-neo transition-all
                  ${generateVoice ? 'left-[17px] bg-bg-base' : 'left-[1px] bg-text-dim'}`} />
              </div>
            </div>
            {generateVoice && (
              <Textarea
                rows={3}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Texte que le clone prononce..."
              />
            )}
          </div>

          {/* Voix */}
          {generateVoice && (
            <div>
              <p className="nb-label mb-2">Profil vocal · ElevenLabs</p>
              <div className="grid grid-cols-2 gap-1.5">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`text-left px-2.5 py-2 rounded-neo border-2 transition-all
                      ${selectedVoice === v.id ? 'border-teal bg-teal/10 text-teal' : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    <div className="font-mono text-[10px] font-bold">{v.label}</div>
                    <div className="font-mono text-[8.5px] text-text-dim">{v.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format */}
          <div>
            <p className="nb-label mb-2">Format</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f)}
                  className={`font-mono text-[10px] font-bold px-2 py-2 rounded-neo border-2 cursor-pointer transition-all
                    ${selectedFormat.id === f.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Durée */}
          <div>
            <p className="nb-label mb-2">Durée</p>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.val}
                  onClick={() => setSelectedDuration(d.val)}
                  className={`flex-1 font-mono text-[11px] font-bold py-2 rounded-neo border-2 cursor-pointer transition-all
                    ${selectedDuration === d.val ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {phase === 'done' || phase === 'error' ? (
            <Button variant="secondary" onClick={reset} size="lg" className="mt-auto">
              ↩ Nouvelle production
            </Button>
          ) : (
            <Button
              onClick={runProduction}
              loading={isRunning}
              disabled={!canGenerate || isRunning}
              size="lg"
              className="mt-auto"
            >
              {isRunning ? phaseLabel : '🚀 Générer la Vidéo'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Canvas / Preview ── */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Preview canvas */}
        <div className="flex-1 bg-bg-base border-2 border-border rounded-neo-lg relative overflow-hidden flex items-center justify-center min-h-[400px]">
          <div className="absolute inset-0 opacity-50"
            style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(160,154,224,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(200,245,90,0.04) 0%, transparent 60%)' }}
          />

          {/* Idle */}
          {phase === 'idle' && (
            <div className="text-center z-10 opacity-30">
              <div className="text-5xl mb-4">🎬</div>
              <div className="font-mono text-[13px] text-text-dim uppercase tracking-widest">
                Configurez le scénario et lancez la génération
              </div>
            </div>
          )}

          {/* Voice phase */}
          {phase === 'voice' && (
            <div className="text-center z-10">
              <div className="text-4xl mb-4 animate-pulse">🎙️</div>
              <div className="font-display font-bold text-[15px] text-teal mb-1">Synthèse vocale</div>
              <div className="font-mono text-[11px] text-text-dim">ElevenLabs · {selectedVoice}</div>
            </div>
          )}

          {/* Video submitting */}
          {phase === 'video' && (
            <div className="text-center z-10">
              <div className="w-16 h-16 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-5" />
              <div className="font-display font-bold text-[15px] text-text-primary mb-1">Soumission Kling</div>
              <div className="font-mono text-[11px] text-text-dim">Kling v2.1 Pro · {selectedFormat.label}</div>
            </div>
          )}

          {/* Polling */}
          {phase === 'polling' && (
            <div className="text-center z-10">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-bold text-accent">
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="font-display font-bold text-[15px] text-text-primary mb-1">Kling génère...</div>
              <div className="font-mono text-[11px] text-text-dim">
                {selectedDuration}s · {selectedFormat.label} · Polling toutes les 10s
              </div>
              {videoJob?.generationId && (
                <div className="mt-2 font-mono text-[9px] text-text-dim/50">ID: {videoJob.generationId.slice(0, 12)}…</div>
              )}
            </div>
          )}

          {/* Done — video player */}
          {phase === 'done' && videoJob?.videoUrl && (
            <div className="absolute inset-0 flex flex-col">
              <video
                src={videoJob.videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 right-3 bg-accent/90 text-bg-base font-mono text-[10px] font-bold px-2.5 py-1 rounded-neo">
                Kling v2.1 Pro ✦
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="text-center z-10">
              <div className="text-4xl mb-4">⚠️</div>
              <div className="font-display font-bold text-[15px] text-coral mb-1">Erreur de génération</div>
              <div className="font-mono text-[11px] text-text-dim">{videoJob?.error ?? 'Vérifiez votre clé AIML API'}</div>
            </div>
          )}

          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg-base to-transparent">
            <div className="h-1.5 bg-bg-card border border-border rounded-neo overflow-hidden mb-2">
              <div
                className={`h-full rounded-neo transition-all duration-500 ${phase === 'error' ? 'bg-coral' : phase === 'done' ? 'bg-teal' : 'bg-accent'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-text-dim">
                {phase === 'idle' ? 'En attente' : phaseLabel}
              </span>
              <span className="font-mono text-[10px] text-text-dim">{selectedDuration}s</span>
            </div>
          </div>
        </div>

        {/* Audio preview + Timeline */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="nb-label">Timeline</p>
            {phase === 'done' && (
              <span className="font-mono text-[10px] text-teal font-bold">✓ Production terminée</span>
            )}
          </div>
          <div className="flex gap-2">
            {/* Clone track */}
            <div className="flex-1 bg-bg-surface border-2 border-border rounded-neo p-3">
              <div className="font-mono text-[10px] text-text-dim mb-2">🎬 Clone · Kling</div>
              <div className={`h-1.5 rounded-neo transition-all duration-500 ${phase === 'done' ? 'bg-accent w-full' : phase === 'polling' ? 'bg-accent/60 animate-pulse' : 'bg-bg-base border border-border'}`} />
            </div>

            {/* Voix track */}
            <div className="flex-1 bg-bg-surface border-2 border-border rounded-neo p-3">
              <div className="font-mono text-[10px] text-text-dim mb-2">🎙️ Voix · ElevenLabs</div>
              {audioB64 ? (
                <audio
                  ref={audioRef}
                  src={`data:audio/mpeg;base64,${audioB64}`}
                  controls
                  className="w-full h-6"
                />
              ) : (
                <div className={`h-1.5 rounded-neo transition-all ${generateVoice && script.trim() ? (phase === 'done' ? 'bg-teal w-full' : 'bg-bg-base border border-border') : 'bg-bg-base border border-border opacity-40'}`} />
              )}
            </div>

            {/* Musique */}
            <div className="flex-1 bg-bg-surface border-2 border-border rounded-neo p-3 opacity-40">
              <div className="font-mono text-[10px] text-text-dim mb-2">🎵 Musique</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo" />
            </div>

            {/* SFX */}
            <div className="flex-1 bg-bg-surface border-2 border-border rounded-neo p-3 opacity-40">
              <div className="font-mono text-[10px] text-text-dim mb-2">⚡ SFX</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
