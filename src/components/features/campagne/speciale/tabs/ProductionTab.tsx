'use client'

import { useState, useRef, useEffect } from 'react'
import { useElapsed } from '@/lib/hooks/useElapsed'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import { persistOutput } from '@/lib/actions/outputs'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import Link from 'next/link'
import {
  actionSubmitVideo,
  actionGetVideoStatus,
  actionGenerateSpeech,
} from '@/lib/actions/ai'
import { listAvatarVoices } from '@/lib/actions/avatars'
import { actionGetAvatarRefImage } from '@/lib/actions/avatar-assets'
import { getVoiceProfile } from '@/lib/ai/voice-catalog'
import type { VideoJob } from '@/lib/ai/video'

// Voix d'un avatar (verrouillée en génération)
interface AvatarVoice {
  id:             string
  name:           string
  voice_engine:   string | null
  voice_id:       string | null
  voice_mode:     string | null
  voice_settings: { emotion?: string; speed?: number; pitch?: number } | null
  voice_label:    string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const FORMATS: { id: string; label: string; aspect: '9:16' | '16:9' | '1:1' | '4:3' }[] = [
  { id: 'short',      label: '9:16 · Short',      aspect: '9:16' },
  { id: 'widescreen', label: '16:9 · Widescreen', aspect: '16:9' },
  { id: 'square',     label: '1:1 · Square',      aspect: '1:1'  },
  { id: 'feed',       label: '4:3 · Feed',         aspect: '4:3'  },
]

const DURATIONS: { label: string; val: 5 | 10 }[] = [
  { label: '5s',  val: 5  },
  { label: '10s', val: 10 },
]

type ProdPhase = 'idle' | 'voice' | 'video' | 'polling' | 'done' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductionTab() {
  const toast      = useToast()
  const audioRef   = useRef<HTMLAudioElement>(null)
  const campaignId = useCampaignWizard((s) => s.campaignId)

  // ── Form ────
  const [scenario, setScenario]               = useState('')
  const [script, setScript]                   = useState('')
  const [selectedFormat, setSelectedFormat]   = useState(FORMATS[0])
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(5)
  const [generateVoice, setGenerateVoice]     = useState(true)

  // ── Voix verrouillée sur l'avatar ────
  const [avatarVoices, setAvatarVoices]       = useState<AvatarVoice[]>([])
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const selectedAvatar = avatarVoices.find((a) => a.id === selectedAvatarId) ?? null

  // Charge les avatars dont la voix est configurée (verrouillage voix en génération)
  useEffect(() => {
    listAvatarVoices()
      .then((list) => {
        setAvatarVoices(list)
        setSelectedAvatarId((cur) => cur ?? list[0]?.id ?? null)
      })
      .catch(() => { /* non authentifié / pas d'avatar — géré par l'UI */ })
  }, [])

  // ── Résultats ────
  const [phase, setPhase]         = useState<ProdPhase>('idle')
  const [audioB64, setAudioB64]   = useState<string | null>(null)
  const [videoJob, setVideoJob]   = useState<VideoJob | null>(null)
  const [progress, setProgress]   = useState(0)
  const pollRef        = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const runningRef     = useRef(false)   // garde anti double-soumission (synchrone)

  const canGenerate = scenario.trim().length > 10
  // Voix activée mais aucun avatar avec voix configurée → on bloque (évite une vidéo sans voix par surprise)
  const voiceBlocked = generateVoice && avatarVoices.length === 0

  function stopPolling() {
    if (pollRef.current)        { clearInterval(pollRef.current);       pollRef.current = null }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null }
  }

  // ── Cleanup polling + timeout on unmount ────
  useEffect(() => {
    return () => { stopPolling() }
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
    if (!canGenerate || runningRef.current || voiceBlocked) return   // anti double-soumission + voix requise
    runningRef.current = true
    setPhase('idle')
    setAudioB64(null)
    setVideoJob(null)
    setProgress(0)

    // Capture les valeurs au moment de la soumission (pas de stale closure)
    const capturedScenario = scenario.trim()
    const capturedFormat   = selectedFormat.aspect
    const capturedDuration = selectedDuration
    const capturedAvatar   = selectedAvatar

    try {
      // ── Étape 1 : Voix de l'avatar (verrouillée) ───────────────────────────
      const voiceProfile = getVoiceProfile(capturedAvatar?.voice_id)
      if (generateVoice && script.trim() && capturedAvatar && voiceProfile) {
        setPhase('voice')
        const s = capturedAvatar.voice_settings ?? {}
        const voiceRes = await actionGenerateSpeech({
          text:    script.trim().slice(0, 500),
          engine:  voiceProfile.engine,
          voice:   voiceProfile.voice as never,
          speed:   s.speed,
          pitch:   s.pitch,
          emotion: s.emotion as never,
        })
        setAudioB64(voiceRes.audioBase64)
      }

      // ── Étape 2 : Vidéo Kling v2.1 Pro ─────────────────────────────────────
      setPhase('video')
      // Cohérence : on part du portrait de l'avatar sélectionné (img2vid) si dispo
      const avatarRef = capturedAvatar?.id
        ? await actionGetAvatarRefImage(capturedAvatar.id).catch(() => null)
        : null
      const job = await actionSubmitVideo({
        prompt:      capturedScenario,
        engine:      'kling',
        klingVersion: 'v2.1-pro',
        aspectRatio: capturedFormat,
        duration:    capturedDuration,
        negativePrompt: 'blur, low quality, watermark, text overlay, distorted faces',
        ...(avatarRef ? { imageUrl: avatarRef } : {}),
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
            stopPolling()
            runningRef.current = false
            setPhase('done')
            toast.success('Vidéo générée par Kling')
            // Persiste dans la galerie — sinon l'URL Kling éphémère est perdue
            if (status.videoUrl) {
              persistOutput({
                type:       'video',
                sourceUrl:  status.videoUrl,
                title:      capturedScenario.slice(0, 60) || 'Production Spéciale',
                prompt:     capturedScenario,
                engine:     'kling-v2.1-pro',
                campaignId: campaignId ?? null,
                format:     capturedFormat,
                durationSeconds: capturedDuration,
                avatarName: capturedAvatar?.name,
              }).catch(() => {})
            }
          } else if (status.status === 'failed') {
            stopPolling()
            runningRef.current = false
            setPhase('error')
            toast.error('Kling — génération échouée : ' + (status.error ?? 'erreur inconnue'))
          }
        } catch (e: any) {
          stopPolling()
          runningRef.current = false
          setPhase('error')
          toast.error('Polling erreur : ' + (e.message ?? 'erreur'))
        }
      }, 10_000)

      // Timeout de sécurité : jamais de polling éternel si Kling reste bloqué
      pollTimeoutRef.current = setTimeout(() => {
        stopPolling()
        runningRef.current = false
        setPhase('error')
        toast.error('Génération vidéo trop longue (>10 min) — réessayez')
      }, 10 * 60 * 1000)

    } catch (e: any) {
      stopPolling()
      runningRef.current = false
      setPhase('error')
      toast.error(e.message ?? 'Erreur production')
    }
  }

  function reset() {
    stopPolling()
    runningRef.current = false
    setPhase('idle')
    setAudioB64(null)
    setVideoJob(null)
    setProgress(0)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isRunning   = phase === 'voice' || phase === 'video' || phase === 'polling'
  const indeterminate = phase === 'voice' || phase === 'video'
  const elapsed     = useElapsed(isRunning)
  const phaseLabel  = phase === 'voice'   ? 'Synthèse vocale...' :
                      phase === 'video'   ? 'Soumission Kling v2.1 Pro...' :
                      phase === 'polling' ? `Génération vidéo · ${Math.round(progress)}%` :
                      phase === 'done'    ? 'Production terminée' : ''

  return (
    <div className="animate-fade-in flex gap-6 min-h-[600px]">

      {/* ── Panneau gauche ── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-3.5">

        {/* Avatar actif badge */}
        <div className="bg-purple/5 border border-border-purple rounded-neo-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-neo-md border border-border-purple bg-purple/15 flex items-center justify-center text-xl text-purple">●</div>
          <div className="min-w-0">
            <div className="font-sans text-[10px] font-bold text-purple mb-0.5">Avatar actif</div>
            <div className="font-display font-bold text-[13px] text-text-primary truncate">
              {selectedAvatar?.name ?? 'Aucun avatar'}
            </div>
          </div>
          <div className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-accent animate-pulse' : 'bg-teal'}`} />
        </div>

        <div className="bg-bg-card border border-border rounded-neo-lg p-4 flex-1 flex flex-col gap-4">

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
                className={`w-8 h-4 rounded-neo border relative cursor-pointer transition-all flex-shrink-0
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

          {/* Voix — verrouillée sur l'avatar */}
          {generateVoice && (
            <div>
              <p className="nb-label mb-2">Voix de l'avatar</p>
              {avatarVoices.length === 0 ? (
                <div className="bg-amber/5 border border-amber/30 rounded-neo p-3">
                  <p className="font-sans text-[10px] text-amber leading-relaxed mb-2">
                    Aucun avatar n'a de voix configurée.
                  </p>
                  <Link href="/avatar-studio" className="font-sans text-[10px] text-accent hover:underline">
                    → Configurer une voix dans Avatar Studio
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Sélecteur d'avatar (si plusieurs) */}
                  {avatarVoices.length > 1 && (
                    <select
                      value={selectedAvatarId ?? ''}
                      onChange={(e) => setSelectedAvatarId(e.target.value)}
                      className="nb-input text-[12px] py-2"
                    >
                      {avatarVoices.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                  {/* Voix verrouillée (lecture seule) */}
                  {selectedAvatar && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-neo border border-teal bg-teal/5">
                      <div className="w-2 h-2 rounded-neo bg-teal flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-sans text-[11px] font-bold text-teal truncate">
                          {selectedAvatar.voice_label ?? getVoiceProfile(selectedAvatar.voice_id)?.label ?? 'Voix'}
                        </div>
                        <div className="font-sans text-[8.5px] text-text-dim">
                          {(getVoiceProfile(selectedAvatar.voice_id)?.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs')}
                          {selectedAvatar.voice_mode === 'description' ? ' · par description' : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  className={`font-sans text-[10px] font-bold px-2 py-2 rounded-neo border cursor-pointer transition-all
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
                  className={`flex-1 font-sans text-[11px] font-bold py-2 rounded-neo border cursor-pointer transition-all
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
            <div className="mt-auto flex flex-col gap-1.5">
              {voiceBlocked && (
                <p className="font-sans text-[9px] text-amber leading-relaxed">
                  Configure une voix d'avatar (Avatar Studio) ou désactive le script vocal pour lancer.
                </p>
              )}
              <Button
                onClick={runProduction}
                loading={isRunning}
                disabled={!canGenerate || isRunning || voiceBlocked}
                size="lg"
              >
                {isRunning ? phaseLabel : 'Générer la Vidéo'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Canvas / Preview ── */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Preview canvas */}
        <div className="flex-1 bg-bg-base border border-border rounded-neo-lg relative overflow-hidden flex items-center justify-center min-h-[400px]">
          <div className="absolute inset-0 opacity-50"
            style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(167,139,250,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(45,212,191,0.05) 0%, transparent 60%)' }}
          />

          {/* Idle */}
          {phase === 'idle' && (
            <div className="text-center z-10 opacity-30">
              <div className="font-sans text-[13px] text-text-dim uppercase tracking-widest">
                Configurez le scénario et lancez la génération
              </div>
            </div>
          )}

          {/* Voice phase */}
          {phase === 'voice' && (
            <div className="text-center z-10">
              <div className="flex items-end justify-center gap-1 h-8 mb-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-teal rounded-full animate-pulse-dot"
                    style={{ height: `${[40, 70, 100, 60, 45][i]}%`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="font-display font-bold text-[15px] text-teal mb-1">Synthèse vocale</div>
              <div className="font-sans text-[11px] text-text-dim">
                {(getVoiceProfile(selectedAvatar?.voice_id)?.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs')}
                {selectedAvatar ? ` · ${selectedAvatar.voice_label ?? getVoiceProfile(selectedAvatar.voice_id)?.label ?? ''}` : ''}
              </div>
            </div>
          )}

          {/* Video submitting */}
          {phase === 'video' && (
            <div className="text-center z-10">
              <div className="w-16 h-16 rounded-full border border-accent border-t-transparent animate-spin mx-auto mb-5" />
              <div className="font-display font-bold text-[15px] text-text-primary mb-1">Soumission Kling</div>
              <div className="font-sans text-[11px] text-text-dim">Kling v2.1 Pro · {selectedFormat.label}</div>
            </div>
          )}

          {/* Polling */}
          {phase === 'polling' && (
            <div className="text-center z-10">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--fg) / 0.06)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="rgb(var(--accent))"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-sans text-[13px] font-bold text-accent">
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="font-display font-bold text-[15px] text-text-primary mb-1">Kling génère...</div>
              <div className="font-sans text-[11px] text-text-dim">
                {selectedDuration}s · {selectedFormat.label} · Polling toutes les 10s
              </div>
              {videoJob?.generationId && (
                <div className="mt-2 font-sans text-[9px] text-text-dim/50">ID: {videoJob.generationId.slice(0, 12)}…</div>
              )}
            </div>
          )}

          {/* Done — video player */}
          {phase === 'done' && videoJob?.videoUrl && (
            <div className="absolute inset-0 flex flex-col animate-reveal">
              <video
                src={videoJob.videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 right-3 bg-accent/90 text-bg-base font-sans text-[10px] font-bold px-2.5 py-1 rounded-neo">
                Kling v2.1 Pro
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="text-center z-10">
              <div className="text-4xl mb-4">⚠️</div>
              <div className="font-display font-bold text-[15px] text-coral mb-1">Erreur de génération</div>
              <div className="font-sans text-[11px] text-text-dim">{videoJob?.error ?? 'Vérifiez votre clé AIML API'}</div>
            </div>
          )}

          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg-base to-transparent">
            <div className="h-1.5 bg-bg-card border border-border rounded-neo overflow-hidden mb-2">
              {indeterminate ? (
                <div className="h-full gen-stripes text-accent" />
              ) : (
                <div
                  className={`h-full rounded-neo transition-all duration-500 ${phase === 'error' ? 'bg-coral' : phase === 'done' ? 'bg-teal' : 'bg-accent'}`}
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] text-text-dim">
                {phase === 'idle' ? 'En attente' : phaseLabel}
              </span>
              <span className="font-sans text-[10px] text-text-dim tabular-nums">
                {isRunning ? elapsed : `${selectedDuration}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Audio preview + Timeline */}
        <div className="bg-bg-card border border-border rounded-neo-lg px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="nb-label">Timeline</p>
            {phase === 'done' && (
              <span className="font-sans text-[10px] text-teal font-bold">✓ Production terminée</span>
            )}
          </div>
          <div className="flex gap-2">
            {/* Clone track */}
            <div className="flex-1 bg-bg-surface border border-border rounded-neo p-3">
              <div className="font-sans text-[10px] text-text-dim mb-2">Clone · Kling</div>
              <div className={`h-1.5 rounded-neo transition-all duration-500 ${phase === 'done' ? 'bg-accent w-full' : phase === 'polling' ? 'bg-accent/60 animate-pulse' : 'bg-bg-base border border-border'}`} />
            </div>

            {/* Voix track */}
            <div className="flex-1 bg-bg-surface border border-border rounded-neo p-3">
              <div className="font-sans text-[10px] text-text-dim mb-2">Voix · ElevenLabs</div>
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
            <div className="flex-1 bg-bg-surface border border-border rounded-neo p-3 opacity-40">
              <div className="font-sans text-[10px] text-text-dim mb-2">Musique</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo" />
            </div>

            {/* SFX */}
            <div className="flex-1 bg-bg-surface border border-border rounded-neo p-3 opacity-40">
              <div className="font-sans text-[10px] text-text-dim mb-2">SFX</div>
              <div className="h-1.5 bg-bg-base border border-border rounded-neo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
