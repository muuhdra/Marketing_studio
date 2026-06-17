'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import GenerationProgress, { type GenStep } from '@/components/ui/GenerationProgress'
import { Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionGenerateCloneScript,
  actionGenerateSpeech,
  actionGenerateAvatarPhoto,
} from '@/lib/actions/ai'
import { persistOutput } from '@/lib/actions/outputs'
import { VOICE_PROFILES } from '@/lib/ai/voice-catalog'

// Catalogue central de voix (MiniMax) — `sub` dérivé des tags.
const voiceSub = (tags: string[]) => tags.slice(0, 2).join(' · ')

const PLATFORMS = [
  { value: 'tiktok',    label: 'TikTok'    },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube',   label: 'YouTube'   },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'script' | 'photo' | 'voice' | 'done'

interface CloneResult {
  script:    string
  hooks:     string[]
  cta:       string
  tone:      string
  photoUrl?: string
  audioB64?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CloneLabTab() {

  const toast    = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)


  // ── Form ────
  const [personaDescription, setPersonaDescription] = useState('')
  const [personaName, setPersonaName]               = useState('')
  const [product, setProduct]                       = useState('')
  const [platform, setPlatform]                     = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok')
  const [duration, setDuration]                     = useState(30)
  const [selectedVoice, setSelectedVoice]           = useState(VOICE_PROFILES[0])
  const [generatePhoto, setGeneratePhoto]           = useState(true)
  const [generateVoice, setGenerateVoice]           = useState(true)

  // ── State ────
  const [phase, setPhase]             = useState<Phase>('idle')
  const [result, setResult]           = useState<CloneResult | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'form' | 'result'>('form')

  // ─── Validation ───────────────────────────────────────────────────────────

  const canGenerate = personaDescription.trim().length > 20 && product.trim().length > 3

  // ─── Pipeline Clone ───────────────────────────────────────────────────────

  async function runClonePipeline() {
    if (!canGenerate) return

    setPhase('script')
    setActiveSection('result')
    setResult(null)

    try {
      // ─ Étape 1 : Script Clone via Claude ─────────────────────────────────
      const scriptRes = await actionGenerateCloneScript({
        personaDescription: `${personaName ? `Nom: ${personaName}. ` : ''}${personaDescription}`,
        product,
        platform,
        duration,
      })

      const cloneResult: CloneResult = {
        script: scriptRes.script,
        hooks:  scriptRes.hooks  ?? [],
        cta:    scriptRes.cta    ?? '',
        tone:   scriptRes.tone   ?? '',
      }
      setResult({ ...cloneResult })

      // ─ Étape 2 : Photo IA via Nano Banana ────────────────────────────────
      if (generatePhoto) {
        setPhase('photo')
        setPhotoLoading(true)
        try {
          const photoRes = await actionGenerateAvatarPhoto({
            name:    personaName || 'Clone',
            style:   personaDescription,
            setting: platform === 'tiktok' ? 'modern apartment, lifestyle' : platform === 'instagram' ? 'studio lighting, minimalist' : 'home office setup',
          })
          cloneResult.photoUrl = photoRes.url
          setResult({ ...cloneResult })
          await persistOutput({
            type:      'image',
            sourceUrl: photoRes.url,
            title:     `Clone Portrait · ${personaName || 'Persona'}`,
            engine:    'nano-banana',
            prompt:    personaDescription.slice(0, 200),
            avatarName: personaName || undefined,
          }).catch(() => {})
        } catch (e: any) {
          toast.error('Photo IA : ' + (e.message ?? 'Erreur'))
        } finally {
          setPhotoLoading(false)
        }
      }

      // ─ Étape 3 : Voix via ElevenLabs / MiniMax ───────────────────────────
      if (generateVoice) {
        setPhase('voice')
        setVoiceLoading(true)
        try {
          const voiceRes = await actionGenerateSpeech({
            text:   scriptRes.script.slice(0, 500), // 500 chars max pour preview
            engine: selectedVoice.engine,
            voice:  selectedVoice.voice as never,
          })
          cloneResult.audioB64 = voiceRes.audioBase64
          setResult({ ...cloneResult })
          await persistOutput({
            type:      'audio',
            dataUrl:   `data:audio/mpeg;base64,${voiceRes.audioBase64}`,
            title:     `Voix Clone · ${selectedVoice.label}${personaName ? ` · ${personaName}` : ''}`,
            engine:    selectedVoice.engine === 'elevenlabs' ? 'elevenlabs' : 'minimax',
            prompt:    scriptRes.script.slice(0, 200),
            avatarName: personaName || undefined,
          }).catch(() => {})
        } catch (e: any) {
          toast.error('Voix IA : ' + (e.message ?? 'Erreur'))
        } finally {
          setVoiceLoading(false)
        }
      }

      setPhase('done')
      toast.success('Clone Lab terminé')

    } catch (e: any) {
      setPhase('idle')
      toast.error(e.message ?? 'Erreur lors de la génération Clone')
      setActiveSection('form')
    }
  }

  function reset() {
    setPhase('idle')
    setResult(null)
    setActiveSection('form')
  }

  // ─── Tracker de génération (étapes dynamiques selon les options) ──────────
  const genSteps: GenStep[] = [{ key: 'script', label: 'Claude — script persona' }]
  if (generatePhoto) genSteps.push({ key: 'photo', label: 'Nano Banana — photo réaliste' })
  if (generateVoice) genSteps.push({ key: 'voice', label: `${selectedVoice.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'} — voix synthétisée` })
  const genRunning = phase === 'script' || phase === 'photo' || phase === 'voice'
  const genCurrent = phase === 'done' ? genSteps.length : Math.max(0, genSteps.findIndex((s) => s.key === phase))

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in flex flex-col gap-8">

      {/* ── Header IA ── */}
      <div className="flex items-center gap-3 p-4 bg-purple/5 border border-border-purple rounded-neo-lg">
        <div className="w-10 h-10 rounded-neo-md border border-border-purple bg-purple/15 flex items-center justify-center text-xl flex-shrink-0 text-purple">
          ●
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[13px] text-purple mb-0.5">Clone Lab · Pipeline IA</div>
          <div className="font-sans text-[10px] text-text-dim">
            Claude Opus 4 · Script persona &nbsp;·&nbsp; Nano Banana · Photo réaliste &nbsp;·&nbsp; MiniMax · Voix synthétisée
          </div>
        </div>
        {phase !== 'idle' && phase !== 'done' && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-purple animate-pulse" />
            <span className="font-sans text-[10px] text-purple capitalize">
              {phase === 'script' ? 'Rédaction...' : phase === 'photo' ? 'Photo IA...' : 'Synthèse vocale...'}
            </span>
          </div>
        )}
        {phase === 'done' && (
          <span className="font-sans text-[10px] text-teal font-bold">✓ Clone généré</span>
        )}
      </div>

      {/* ── Navigation form / result ── */}
      {result && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('form')}
            className={`font-sans text-[11px] font-bold px-4 py-2 rounded-neo border transition-all
              ${activeSection === 'form'
                ? 'border-purple text-purple bg-purple/10'
                : 'border-border text-text-muted hover:border-border-strong'}`}
          >
            ← Paramètres
          </button>
          <button
            onClick={() => setActiveSection('result')}
            className={`font-sans text-[11px] font-bold px-4 py-2 rounded-neo border transition-all
              ${activeSection === 'result'
                ? 'border-purple text-purple bg-purple/10'
                : 'border-border text-text-muted hover:border-border-strong'}`}
          >
            Résultats
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ FORM ═══ */}
      {activeSection === 'form' && (
        <div className="flex flex-col gap-6">

          {/* ── Identité du Persona ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display font-bold text-[17px] text-text-primary">Identité du Persona</h2>
              <span className="font-sans text-[9px] font-bold text-purple border border-border-purple px-2 py-0.5 rounded-neo">
                CLAUDE · DEEPCLONE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Nom du persona (optionnel)"
                placeholder="Ex: Sophie, Karim, Léa..."
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
              />
              <Input
                label="Produit / Service à promouvoir"
                placeholder="Ex: Crème hydratante BioSense"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="nb-label block mb-2">
                Description du persona * <span className="text-text-dim font-normal">(style, ton, langage, audience...)</span>
              </label>
              <textarea
                rows={5}
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                placeholder={`Ex: Femme de 28 ans, lifestyle minimaliste, parle avec authenticité et humour doux. Public Gen Z/Millennial. Utilise un ton direct mais chaleureux. Aime les recommandations "bestie to bestie". Évite les formules trop commerciales. Ponctue avec des emojis naturels.`}
                className="w-full bg-purple/[0.02] border border-border-purple/30 focus:border-border-purple rounded-neo-lg px-4 py-3 text-text-primary text-[12.5px] leading-relaxed resize-y transition-colors focus:outline-none placeholder:text-text-dim"
              />
              {personaDescription.length > 0 && personaDescription.length < 20 && (
                <p className="font-sans text-[10px] text-amber mt-1.5">
                  ⚠ Décrivez davantage le persona pour un meilleur résultat ({20 - personaDescription.length} car. min)
                </p>
              )}
            </div>
          </div>

          {/* ── Configuration Script ── */}
          <div>
            <h2 className="font-display font-bold text-[17px] text-text-primary mb-4">Configuration Script</h2>
            <div className="grid grid-cols-3 gap-4">

              {/* Plateforme */}
              <div>
                <label className="nb-label block mb-2">Plateforme</label>
                <div className="flex flex-col gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-neo border text-left transition-all
                        ${platform === p.value
                          ? 'border-purple bg-purple/10 text-purple'
                          : 'border-border text-text-muted hover:border-border-strong'}`}
                    >
                      <span className="font-sans text-[11px] font-bold">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Durée */}
              <div>
                <label className="nb-label block mb-2">Durée cible</label>
                <div className="flex flex-col gap-2">
                  {[15, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-3 py-2.5 rounded-neo border text-left transition-all
                        ${duration === d
                          ? 'border-purple bg-purple/10 text-purple'
                          : 'border-border text-text-muted hover:border-border-strong'}`}
                    >
                      <span className="font-sans text-[11px] font-bold">{d}s</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options IA */}
              <div>
                <label className="nb-label block mb-2">Générations supplémentaires</label>
                <div className="flex flex-col gap-2">

                  {/* Photo toggle */}
                  <div
                    onClick={() => setGeneratePhoto(!generatePhoto)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-neo border cursor-pointer transition-all
                      ${generatePhoto ? 'border-accent bg-accent/5' : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    <div className={`w-8 h-4 rounded-neo border relative flex-shrink-0 transition-all
                      ${generatePhoto ? 'bg-accent border-accent' : 'bg-bg-base border-border'}`}>
                      <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-neo transition-all
                        ${generatePhoto ? 'left-[17px] bg-bg-base' : 'left-[1px] bg-text-dim'}`} />
                    </div>
                    <div>
                      <div className={`font-sans text-[10px] font-bold ${generatePhoto ? 'text-accent' : 'text-text-muted'}`}>
                        Photo IA
                      </div>
                      <div className="font-sans text-[9px] text-text-dim">Nano Banana portrait</div>
                    </div>
                  </div>

                  {/* Voice toggle */}
                  <div
                    onClick={() => setGenerateVoice(!generateVoice)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-neo border cursor-pointer transition-all
                      ${generateVoice ? 'border-teal bg-teal/5' : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    <div className={`w-8 h-4 rounded-neo border relative flex-shrink-0 transition-all
                      ${generateVoice ? 'bg-teal border-teal' : 'bg-bg-base border-border'}`}>
                      <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-neo transition-all
                        ${generateVoice ? 'left-[17px] bg-bg-base' : 'left-[1px] bg-text-dim'}`} />
                    </div>
                    <div>
                      <div className={`font-sans text-[10px] font-bold ${generateVoice ? 'text-teal' : 'text-text-muted'}`}>
                        Voix IA
                      </div>
                      <div className="font-sans text-[9px] text-text-dim">{selectedVoice.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'} preview</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ── Voix sélection ── */}
          {generateVoice && (
            <div>
              <label className="nb-label block mb-3">Profil vocal</label>
              <div className="flex gap-2 flex-wrap">
                {VOICE_PROFILES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v)}
                    className={`flex flex-col items-start px-4 py-3 rounded-neo border transition-all
                      ${selectedVoice.id === v.id
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-border text-text-muted hover:border-border-strong'}`}
                  >
                    <span className={`font-sans text-[11px] font-bold ${selectedVoice.id === v.id ? 'text-teal' : ''}`}>
                      {v.label}
                    </span>
                    <span className="font-sans text-[9px] text-text-dim">{voiceSub(v.tags)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA Génération ── */}
          <div className="pt-2">
            <Button
              onClick={runClonePipeline}
              size="lg"
              fullWidth
              loading={phase !== 'idle' && phase !== 'done'}
              disabled={!canGenerate || (phase !== 'idle' && phase !== 'done')}
              variant="primary"
            >
              {phase === 'script' ? 'Rédaction du script Clone...' :
               phase === 'photo'  ? 'Génération photo IA...' :
               phase === 'voice'  ? 'Synthèse vocale...' :
               'Lancer le Clone Lab'}
            </Button>
            {!canGenerate && (
              <p className="font-sans text-[10px] text-text-dim text-center mt-2">
                Remplissez la description du persona et le produit pour continuer
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ RESULTS ═══ */}
      {activeSection === 'result' && (
        <div className="flex flex-col gap-6">

          {/* Tracker d'étapes pendant la génération */}
          {genRunning && (
            <GenerationProgress steps={genSteps} current={genCurrent} active={genRunning} accent="purple" />
          )}

          {/* Loading skeleton */}
          {phase === 'script' && !result && (
            <div className="flex flex-col gap-4">
              <div className="h-6 bg-purple/10 rounded-neo animate-pulse w-1/3" />
              <div className="h-40 bg-purple/5 border border-border-purple/30 rounded-neo-lg animate-pulse" />
              <div className="h-4 bg-bg-surface rounded-neo animate-pulse w-2/3" />
              <div className="h-4 bg-bg-surface rounded-neo animate-pulse w-1/2" />
            </div>
          )}

          {result && (
            <div className="grid grid-cols-[1fr_320px] gap-5 animate-reveal">

              {/* ── Script ── */}
              <div className="flex flex-col gap-5">

                {/* Hooks */}
                {result.hooks.length > 0 && (
                  <div className="bg-bg-card border border-border rounded-neo-lg p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-display font-bold text-[14px] text-text-primary">Hooks d'Accroche</h3>
                      <span className="font-sans text-[9px] text-purple border border-border-purple px-1.5 py-0.5 rounded-neo">
                        {result.hooks.length} options
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {result.hooks.map((hook, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-purple/5 border border-border-purple/30 rounded-neo">
                          <span className="font-sans text-[10px] font-bold text-purple flex-shrink-0 mt-0.5">#{i + 1}</span>
                          <p className="text-[12px] text-text-primary leading-relaxed">{hook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script complet */}
                <div className="bg-bg-card border border-accent/30 rounded-neo-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-[14px] text-text-primary">Script Clone · {duration}s</h3>
                    <div className="flex items-center gap-2">
                      {result.tone && (
                        <span className="font-sans text-[9px] text-text-dim border border-border px-2 py-0.5 rounded-neo">
                          Ton: {result.tone}
                        </span>
                      )}
                      <button
                        onClick={() => navigator.clipboard.writeText(result!.script).then(() => toast.success('Script copié'))}
                        className="font-sans text-[10px] text-accent border border-accent/30 px-2 py-1 rounded-neo hover:bg-accent/10 transition-colors"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <div className="bg-bg-base border border-border rounded-neo p-4">
                    <pre className="text-[12.5px] text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
                      {result.script}
                    </pre>
                  </div>
                  {result.cta && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-sans text-[10px] text-text-dim">CTA :</span>
                      <span className="font-sans text-[11px] text-accent font-bold">{result.cta}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sidebar : Photo + Audio ── */}
              <div className="flex flex-col gap-4">

                {/* Photo IA */}
                <div className="bg-bg-card border border-border rounded-neo-lg overflow-hidden">
                  <div className="h-[240px] bg-bg-elevated flex items-center justify-center relative border-b border-border">
                    {photoLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="font-sans text-[10px] text-text-dim">Nano Banana...</span>
                      </div>
                    )}
                    {result.photoUrl && !photoLoading ? (
                      <img
                        src={result.photoUrl}
                        alt={personaName || 'Clone'}
                        className="w-full h-full object-cover"
                      />
                    ) : !photoLoading && (
                      <div className="w-20 h-20 rounded-full border border-dashed border-border-purple bg-purple/10 flex items-center justify-center">
                        <span className="text-2xl text-purple/60">●</span>
                      </div>
                    )}
                    {result.photoUrl && (
                      <div className="absolute top-3 right-3 bg-accent/90 text-bg-base font-sans text-[9px] font-bold px-2 py-0.5 rounded-neo">
                        Nano Banana
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="font-display font-bold text-[15px] text-text-primary mb-0.5">
                      {personaName || 'Clone'}
                    </div>
                    <div className="font-sans text-[10px] text-text-dim line-clamp-2">
                      {personaDescription.slice(0, 80)}...
                    </div>
                  </div>
                </div>

                {/* Audio preview */}
                {(generateVoice || voiceLoading || result.audioB64) && (
                  <div className="bg-bg-card border border-border-teal rounded-neo-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div>
                        <div className="font-sans text-[11px] font-bold text-teal">Voix Clone</div>
                        <div className="font-sans text-[9px] text-text-dim">{voiceSub(selectedVoice.tags)}</div>
                      </div>
                    </div>

                    {voiceLoading && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-teal border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <span className="font-sans text-[10px] text-text-dim">Synthèse en cours...</span>
                      </div>
                    )}

                    {result.audioB64 && !voiceLoading && (
                      <audio
                        ref={audioRef}
                        controls
                        className="w-full h-8"
                        src={`data:audio/mpeg;base64,${result.audioB64}`}
                      />
                    )}

                    {!result.audioB64 && !voiceLoading && (
                      <p className="font-sans text-[10px] text-text-dim">En attente du script...</p>
                    )}
                  </div>
                )}

                {/* Infos génération */}
                {phase === 'done' && (
                  <div className="bg-teal/5 border border-border-teal rounded-neo p-3">
                    <p className="font-sans text-[10px] text-teal font-bold mb-1">✓ Clone Lab terminé</p>
                    <p className="font-sans text-[10px] text-text-dim leading-relaxed">
                      Script · {result.script.split(' ').length} mots
                      {result.photoUrl ? ' · Photo Nano Banana' : ''}
                      {result.audioB64 ? ` · Voix ${selectedVoice.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}` : ''}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {phase === 'done' && (
                  <div className="flex flex-col gap-2">
                    {(result.photoUrl || result.audioB64) && (
                      <p className="font-sans text-[10px] text-teal flex items-center gap-1.5 px-1">
                        {result.photoUrl && result.audioB64 ? 'Photo + voix ajoutées à la galerie'
                          : result.photoUrl ? 'Photo ajoutée à la galerie'
                          : 'Voix ajoutée à la galerie'}
                      </p>
                    )}
                    <Button variant="ghost" fullWidth size="sm" onClick={reset}>
                      ↩ Nouveau Clone
                    </Button>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
