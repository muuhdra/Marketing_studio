'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import { useCloneStore, type LocalClone } from '@/lib/stores/cloneStore'
import { useMediaStore } from '@/lib/stores/mediaStore'
import {
  actionCreateHeyGenClone,
  actionGetCloneStatus,
  actionGenerateCloneVideo,
  actionGetCloneVideoStatus,
} from '@/lib/actions/heygen'
import type { VideoRatio } from '@/lib/ai/heygen'

// ─── Config ───────────────────────────────────────────────────────────────────

const RATIOS = [
  { val: '9:16' as VideoRatio, label: '9:16 Vertical',  sub: 'TikTok · Reels' },
  { val: '16:9' as VideoRatio, label: '16:9 Paysage',   sub: 'YouTube · Web' },
  { val: '1:1'  as VideoRatio, label: '1:1 Carré',      sub: 'Instagram Feed' },
]

const LANGUAGES = [
  { val: 'fr', label: '🇫🇷 Français'  },
  { val: 'en', label: '🇺🇸 English'   },
  { val: 'es', label: '🇪🇸 Español'   },
  { val: 'de', label: '🇩🇪 Deutsch'   },
  { val: 'pt', label: '🇧🇷 Português' },
]

type ActiveTab = 'clones' | 'create' | 'generate'

// ─── Component ───────────────────────────────────────────────────────────────

export default function VideoCloneSection() {
  const toast    = useToast()
  const addAsset = useMediaStore((s) => s.addAsset)
  const { clones, addClone, updateClone, removeClone } = useCloneStore()

  // ── Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('clones')

  // ── Upload / Create clone
  const [cloneName, setCloneName]           = useState('')
  const [videoFile, setVideoFile]           = useState<File | null>(null)
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Polling avatar creation
  const avatarPollRef = useRef<NodeJS.Timeout | null>(null)

  // ── Generate video
  const [selectedCloneId, setSelectedCloneId] = useState<string | null>(null)
  const [script, setScript]                   = useState('')
  const [ratio, setRatio]                     = useState(RATIOS[0])
  const [language, setLanguage]               = useState(LANGUAGES[0])
  const [generating, setGenerating]           = useState(false)
  const [genPhase, setGenPhase]               = useState('')
  const [genProgress, setGenProgress]         = useState(0)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const videoPollRef = useRef<NodeJS.Timeout | null>(null)

  // Stable refs
  const completedClones = useMemo(() => clones.filter((c) => c.status === 'completed'), [clones])
  const processingClones = useMemo(() => clones.filter((c) => c.status === 'processing'), [clones])
  const selectedClone = useMemo(
    () => clones.find((c) => c.id === selectedCloneId) ?? null,
    [clones, selectedCloneId],
  )

  // Cleanup on unmount
  useEffect(() => () => {
    if (avatarPollRef.current) clearInterval(avatarPollRef.current)
    if (videoPollRef.current)  clearInterval(videoPollRef.current)
  }, [])

  // Progress animation while video generating
  useEffect(() => {
    if (generating) {
      const id = setInterval(() => setGenProgress((p) => Math.min(p + 0.6, 92)), 500)
      return () => clearInterval(id)
    }
    if (!generating) setGenProgress(0)
  }, [generating])

  // ─── Drag & drop ─────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) setVideoFile(f)
  }

  // ─── Create clone ─────────────────────────────────────────────────────────

  async function handleCreateClone() {
    if (!videoFile || !cloneName.trim()) return
    setUploading(true)
    setUploadProgress(15)

    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('name', cloneName.trim())

      setUploadProgress(40)
      const result = await actionCreateHeyGenClone(formData)
      setUploadProgress(90)

      // Sauvegarder localement
      addClone({
        name:           cloneName.trim(),
        heygenAvatarId: result.avatarId,
        status:         'processing',
      })

      setUploadProgress(100)
      toast.success('Clone soumis à HeyGen ✓ — traitement en cours (5-15 min)')

      // Polling toutes les 30 secondes
      avatarPollRef.current = setInterval(async () => {
        try {
          const status = await actionGetCloneStatus(result.avatarId)
          if (status.status === 'completed') {
            clearInterval(avatarPollRef.current!)
            updateClone(result.avatarId, {
              status:     'completed',
              previewUrl: status.previewUrl,
            })
            toast.success(`Clone "${cloneName.trim()}" prêt ✦`)
          } else if (status.status === 'failed') {
            clearInterval(avatarPollRef.current!)
            updateClone(result.avatarId, { status: 'failed' })
            toast.error('Clone HeyGen : traitement échoué')
          }
        } catch {
          // On continue le polling silencieusement
        }
      }, 30_000)

      // Reset form et retour à l'onglet clones
      setCloneName('')
      setVideoFile(null)
      setActiveTab('clones')

    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la création du clone')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ─── Generate video ───────────────────────────────────────────────────────

  async function handleGenerateVideo() {
    if (!selectedClone || !script.trim()) return

    setGenerating(true)
    setGeneratedVideoUrl(null)
    setGenPhase('🎬 Soumission à HeyGen...')

    try {
      const { videoId } = await actionGenerateCloneVideo({
        avatarId: selectedClone.heygenAvatarId,
        script:   script.trim(),
        ratio:    ratio.val,
        language: language.val,
      })

      setGenPhase('⏳ HeyGen génère votre clone vidéo...')
      toast.success('Vidéo soumise ✓ — génération en cours')

      // Polling toutes les 10 secondes
      videoPollRef.current = setInterval(async () => {
        try {
          const status = await actionGetCloneVideoStatus(videoId)

          if (status.status === 'completed' && status.videoUrl) {
            clearInterval(videoPollRef.current!)
            setGeneratedVideoUrl(status.videoUrl)
            setGenerating(false)
            setGenPhase('')

            addAsset({
              type:       'video',
              url:        status.videoUrl,
              title:      `Clone Vidéo · ${selectedClone.name}`,
              engine:     'heygen',
              prompt:     script.slice(0, 200),
              format:     ratio.val,
              avatarName: selectedClone.name,
              avatarId:   selectedClone.heygenAvatarId,
            })
            toast.success('Vidéo clone générée ✦')

          } else if (status.status === 'failed') {
            clearInterval(videoPollRef.current!)
            setGenerating(false)
            setGenPhase('')
            toast.error('HeyGen : génération échouée · ' + (status.error ?? 'erreur inconnue'))
          }
        } catch {
          // On continue le polling silencieusement
        }
      }, 10_000)

    } catch (e: any) {
      setGenerating(false)
      setGenPhase('')
      toast.error(e.message ?? 'Erreur génération vidéo clone')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 p-5 bg-pink/5 border-2 border-pink/30 rounded-neo-lg">
        <div className="w-12 h-12 rounded-neo-md border-2 border-pink/40 bg-pink/15 flex items-center justify-center text-2xl flex-shrink-0">
          🎭
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-[15px] text-pink">Clone IA</span>
            <span className="font-mono text-[9px] font-bold text-pink border border-pink/30 px-2 py-0.5 rounded-neo">
              HEYGEN
            </span>
          </div>
          <p className="font-mono text-[11px] text-text-muted leading-relaxed">
            Uploadez une vidéo de vous (30 sec min) → HeyGen clone votre image et votre voix →
            Générez du contenu UGC illimité <strong className="text-text-primary">sans jamais retourner devant une caméra.</strong>
          </p>
        </div>
        {processingClones.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[9px] text-amber">
            <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
            {processingClones.length} clone(s) en cours
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b-2 border-border">
        {([
          { id: 'clones'   as const, label: '👤 Mes Clones',     badge: clones.length > 0 ? String(clones.length) : null },
          { id: 'create'   as const, label: '📹 Créer un Clone', badge: null },
          { id: 'generate' as const, label: '🎬 Générer Vidéo',  badge: null },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 font-mono text-[11px] font-bold px-5 py-3
              border-b-[3px] -mb-[2px] transition-all
              ${activeTab === tab.id
                ? 'border-pink text-pink'
                : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-strong'}
            `}
          >
            {tab.label}
            {tab.badge && (
              <span className="font-mono text-[9px] bg-pink/20 text-pink px-1.5 py-0.5 rounded-neo">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ MES CLONES ═══ */}
      {activeTab === 'clones' && (
        <div className="flex flex-col gap-4">
          {clones.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 gap-5 border-2 border-dashed border-border rounded-neo-lg">
              <span className="text-5xl opacity-60">🎭</span>
              <div className="text-center">
                <p className="font-display font-bold text-[15px] text-text-primary mb-2">Aucun clone créé</p>
                <p className="font-mono text-[11px] text-text-muted max-w-sm leading-relaxed">
                  Filmez-vous 30 secondes, uploadez la vidéo —<br />
                  HeyGen va cloner votre visage et votre voix.
                </p>
              </div>
              <Button onClick={() => setActiveTab('create')}>
                📹 Créer mon premier clone
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {clones.map((clone) => (
                <CloneCard
                  key={clone.id}
                  clone={clone}
                  isSelected={selectedCloneId === clone.id}
                  onSelect={() => {
                    if (clone.status === 'completed') {
                      setSelectedCloneId(clone.id)
                      setActiveTab('generate')
                    }
                  }}
                  onDelete={() => removeClone(clone.id)}
                />
              ))}

              {/* Ajouter un nouveau clone */}
              <button
                onClick={() => setActiveTab('create')}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-neo-lg border-2 border-dashed border-border hover:border-pink hover:bg-pink/5 transition-all text-text-muted hover:text-pink min-h-[120px]"
              >
                <span className="text-2xl">+</span>
                <span className="font-mono text-[11px] font-bold">Nouveau clone</span>
              </button>
            </div>
          )}

          {processingClones.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber/5 border-2 border-amber/20 rounded-neo-lg">
              <span className="text-lg flex-shrink-0">⏳</span>
              <div>
                <p className="font-mono text-[11px] font-bold text-amber mb-1">
                  {processingClones.length} clone(s) en traitement HeyGen
                </p>
                <p className="font-mono text-[10px] text-text-dim leading-relaxed">
                  HeyGen entraîne votre modèle IA. Cela prend généralement 5 à 15 minutes.
                  Cette page se met à jour automatiquement.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════ CRÉER UN CLONE ════ */}
      {activeTab === 'create' && (
        <div className="flex flex-col gap-6">

          {/* Étapes */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: '01', icon: '📹', title: 'Filmez-vous',       desc: '30 sec minimum · bonne lumière · face caméra · parlez naturellement' },
              { n: '02', icon: '🤖', title: 'HeyGen entraîne',   desc: 'Clone votre visage + voix en 5-15 min via IA générative' },
              { n: '03', icon: '🎬', title: 'Générez à volonté', desc: "N'importe quel script, n'importe quand, sans caméra" },
            ].map((s) => (
              <div key={s.n} className="flex flex-col gap-2.5 p-4 bg-bg-card border-2 border-border rounded-neo-lg">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-pink border border-pink/30 px-1.5 py-0.5 rounded-neo">{s.n}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="font-display font-bold text-[12px] text-text-primary">{s.title}</p>
                <p className="font-mono text-[10px] text-text-dim leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Formulaire */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 flex flex-col gap-5">

            <Input
              label="Nom du clone"
              placeholder="Ex: Thomas Clone, Sophie UGC, Mon Avatar..."
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />

            {/* Zone upload vidéo */}
            <div>
              <label className="nb-label block mb-2">Vidéo source *</label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`
                  flex flex-col items-center justify-center gap-4 p-10 rounded-neo-lg
                  border-2 border-dashed cursor-pointer transition-all
                  ${videoFile
                    ? 'border-teal bg-teal/5'
                    : 'border-border hover:border-pink hover:bg-pink/5'}
                `}
              >
                {videoFile ? (
                  <>
                    <span className="text-4xl">🎬</span>
                    <div className="text-center">
                      <p className="font-mono text-[12px] font-bold text-teal">{videoFile.name}</p>
                      <p className="font-mono text-[10px] text-text-dim mt-1">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · {videoFile.type}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setVideoFile(null) }}
                      className="font-mono text-[10px] text-coral border border-coral/30 px-3 py-1 rounded-neo hover:bg-coral/10 transition-colors"
                    >
                      ✕ Changer de vidéo
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-4xl opacity-60">📹</span>
                    <div className="text-center">
                      <p className="font-mono text-[13px] font-bold text-text-primary">
                        Glissez votre vidéo ici
                      </p>
                      <p className="font-mono text-[11px] text-text-muted mt-1">
                        ou cliquez pour choisir un fichier
                      </p>
                      <p className="font-mono text-[10px] text-text-dim mt-2 opacity-60">
                        MP4 · MOV · WebM &nbsp;·&nbsp; max 200 MB &nbsp;·&nbsp; 30 sec minimum recommandé
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setVideoFile(f)
                }}
              />
            </div>

            {/* Conseils */}
            <div className="bg-amber/5 border border-amber/20 rounded-neo p-4">
              <p className="font-mono text-[10px] font-bold text-amber mb-2">💡 Conseils pour un clone de qualité</p>
              <ul className="font-mono text-[10px] text-text-dim space-y-1.5 leading-relaxed">
                <li>• <strong className="text-text-secondary">Lumière</strong> — naturelle ou softbox, évitez les ombres fortes sur le visage</li>
                <li>• <strong className="text-text-secondary">Cadrage</strong> — tête + épaules, face caméra, fond neutre (mur uni)</li>
                <li>• <strong className="text-text-secondary">Voix</strong> — parlez clairement à votre rythme naturel, variez les phrases</li>
                <li>• <strong className="text-text-secondary">Durée</strong> — minimum 30 sec, idéalement 2-3 minutes pour une meilleure qualité</li>
              </ul>
            </div>

            {/* Barre de progression upload */}
            {uploading && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] text-pink font-bold">Upload en cours...</span>
                  <span className="font-mono text-[10px] text-text-dim">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden">
                  <div
                    className="h-full bg-pink rounded-neo transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateClone}
              disabled={!videoFile || !cloneName.trim() || uploading}
              loading={uploading}
              size="lg"
            >
              🎭 Créer mon clone HeyGen
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ GÉNÉRER VIDÉO ═════ */}
      {activeTab === 'generate' && (
        <div className="flex flex-col gap-5">

          {completedClones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5 border-2 border-dashed border-border rounded-neo-lg">
              <span className="text-5xl opacity-60">👤</span>
              <div className="text-center">
                <p className="font-display font-bold text-[15px] text-text-primary mb-2">Aucun clone prêt</p>
                <p className="font-mono text-[11px] text-text-muted max-w-sm">
                  {processingClones.length > 0
                    ? `${processingClones.length} clone(s) en cours de traitement — revenez dans quelques minutes.`
                    : 'Créez d\'abord un clone pour pouvoir générer des vidéos.'}
                </p>
              </div>
              <Button size="sm" onClick={() => setActiveTab(processingClones.length > 0 ? 'clones' : 'create')}>
                {processingClones.length > 0 ? '👀 Voir mes clones' : '📹 Créer un clone'}
              </Button>
            </div>
          ) : (
            <>
              {/* Sélection du clone */}
              <div>
                <label className="nb-label block mb-3">Clone à utiliser</label>
                <div className="flex gap-2 flex-wrap">
                  {completedClones.map((clone) => (
                    <button
                      key={clone.id}
                      onClick={() => setSelectedCloneId(clone.id)}
                      className={`
                        flex items-center gap-2.5 px-3 py-2.5 rounded-neo border-2 transition-all
                        ${selectedCloneId === clone.id
                          ? 'border-pink bg-pink/10 text-pink shadow-[2px_2px_0px_theme(colors.pink.DEFAULT)]'
                          : 'border-border text-text-muted hover:border-border-strong'}
                      `}
                    >
                      {clone.previewUrl ? (
                        <img src={clone.previewUrl} alt="" className="w-7 h-7 rounded-neo object-cover flex-shrink-0" />
                      ) : (
                        <span className="text-lg flex-shrink-0">👤</span>
                      )}
                      <span className="font-mono text-[11px] font-bold">{clone.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Script */}
              <div>
                <Textarea
                  label="Script — ce que le clone dira"
                  rows={7}
                  placeholder={`Salut les amis ! Aujourd'hui je veux vous parler de quelque chose qui a vraiment changé ma routine...\n\n[Parlez naturellement, comme si vous vous adressiez directement à votre audience]`}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`font-mono text-[10px] ${script.length > 1800 ? 'text-amber' : 'text-text-dim'}`}>
                    {script.length} / 2 000 caractères
                  </span>
                  {script.length > 2000 && (
                    <span className="font-mono text-[10px] text-coral font-bold">Script trop long</span>
                  )}
                </div>
              </div>

              {/* Options format */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="nb-label block mb-2.5">Format vidéo</label>
                  <div className="flex flex-col gap-1.5">
                    {RATIOS.map((r) => (
                      <button
                        key={r.val}
                        onClick={() => setRatio(r)}
                        className={`
                          flex items-center justify-between px-3 py-2.5 rounded-neo border-2 text-left transition-all
                          ${ratio.val === r.val
                            ? 'border-pink bg-pink/5 text-pink'
                            : 'border-border text-text-muted hover:border-border-strong'}
                        `}
                      >
                        <span className="font-mono text-[11px] font-bold">{r.label}</span>
                        <span className="font-mono text-[9px] text-text-dim">{r.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="nb-label block mb-2.5">Langue du script</label>
                  <div className="flex flex-col gap-1.5">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.val}
                        onClick={() => setLanguage(l)}
                        className={`
                          px-3 py-2.5 rounded-neo border-2 text-left transition-all
                          ${language.val === l.val
                            ? 'border-pink bg-pink/5 text-pink'
                            : 'border-border text-text-muted hover:border-border-strong'}
                        `}
                      >
                        <span className="font-mono text-[11px] font-bold">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* État génération */}
              {generating && (
                <div className="bg-bg-card border-2 border-pink/40 rounded-neo-lg p-5 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-neo border-2 border-pink flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-neo bg-pink animate-pulse" />
                    </div>
                    <div>
                      <p className="font-mono text-[12px] font-bold text-pink">{genPhase || 'Génération en cours...'}</p>
                      <p className="font-mono text-[10px] text-text-dim">
                        {selectedClone?.name} · {ratio.label} · {language.label}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg-base border border-border rounded-neo overflow-hidden">
                    <div
                      className="h-full bg-pink rounded-neo transition-all duration-500"
                      style={{ width: `${genProgress}%` }}
                    />
                  </div>
                  <p className="font-mono text-[9px] text-text-dim mt-2 opacity-60">
                    HeyGen génère généralement une vidéo en 2 à 5 minutes
                  </p>
                </div>
              )}

              {/* Résultat vidéo */}
              {generatedVideoUrl && (
                <div className="bg-bg-card border-2 border-teal rounded-neo-lg overflow-hidden animate-fade-in">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full max-h-[420px] object-contain bg-black"
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[12px] font-bold text-teal">✦ Clone vidéo généré</span>
                      <span className="font-mono text-[10px] text-text-dim ml-2.5">
                        HeyGen · {selectedClone?.name} · {ratio.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setGeneratedVideoUrl(null); setScript('') }}
                        className="font-mono text-[10px] text-text-dim border border-border px-3 py-1.5 rounded-neo hover:border-border-strong transition-colors"
                      >
                        ↩ Nouveau script
                      </button>
                      <a
                        href={generatedVideoUrl}
                        download={`clone-${selectedClone?.name ?? 'video'}.mp4`}
                        className="font-mono text-[10px] text-teal border border-teal/30 px-3 py-1.5 rounded-neo hover:bg-teal/10 transition-colors"
                      >
                        ⬇ Télécharger
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA génération */}
              {!generating && !generatedVideoUrl && (
                <Button
                  onClick={handleGenerateVideo}
                  disabled={!selectedClone || !script.trim() || script.length > 2000}
                  size="lg"
                >
                  🎬 Générer la vidéo avec mon clone
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Clone Card ───────────────────────────────────────────────────────────────

function CloneCard({
  clone,
  isSelected,
  onSelect,
  onDelete,
}: {
  clone:      LocalClone
  isSelected: boolean
  onSelect:   () => void
  onDelete:   () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative flex items-center gap-3 p-4 rounded-neo-lg border-2 transition-all
        ${clone.status === 'completed'
          ? isSelected
            ? 'border-pink bg-pink/5 cursor-pointer shadow-[2px_2px_0px_theme(colors.pink.DEFAULT)]'
            : 'border-border hover:border-pink hover:bg-pink/5 cursor-pointer'
          : 'border-border opacity-60 cursor-default'}
      `}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-neo border-2 border-border bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
        {clone.previewUrl ? (
          <img src={clone.previewUrl} alt={clone.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">
            {clone.status === 'processing' ? '⏳' : clone.status === 'failed' ? '❌' : '👤'}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[13px] text-text-primary truncate">{clone.name}</div>
        <div className="font-mono text-[10px] text-text-dim mt-0.5">
          {new Date(clone.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div className={`font-mono text-[9px] font-bold mt-1 flex items-center gap-1.5
          ${clone.status === 'completed' ? 'text-teal' :
            clone.status === 'processing' ? 'text-amber' : 'text-coral'}`}
        >
          {clone.status === 'completed' && '✓ Prêt à utiliser'}
          {clone.status === 'processing' && (
            <><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" /> Traitement HeyGen...</>
          )}
          {clone.status === 'failed' && '✗ Traitement échoué'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {clone.status === 'completed' && (
          <span className="font-mono text-[9px] text-pink">Utiliser →</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="font-mono text-[9px] text-text-dim hover:text-coral transition-colors"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
