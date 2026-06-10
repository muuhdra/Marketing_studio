'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Textarea, Input } from '@/components/ui/Input'
import AvatarWardrobe from './AvatarWardrobe'
import AvatarEnvironment from './AvatarEnvironment'
import { createAvatar } from '@/lib/actions/avatars'
import { actionGenerateAvatarPhoto } from '@/lib/actions/ai'
import { useToast } from '@/lib/stores/toastStore'
import { useMediaStore } from '@/lib/stores/mediaStore'

const PIPELINE_STEPS = [
  { id: 1, label: 'Modèle de base' },
  { id: 2, label: 'Garde-robe'     },
  { id: 3, label: 'Environnements' },
]

export default function AvatarStudioView() {
  const router    = useRouter()
  const toast     = useToast()
  const addAsset  = useMediaStore((s) => s.addAsset)

  const [step, setStep]                     = useState<1 | 2 | 3>(1)
  const [modelValidated, setModelValidated] = useState(false)
  const [isAnalyzing, setIsAnalyzing]       = useState(false)
  const [isSaving, setIsSaving]             = useState(false)
  const [uploadedImage, setUploadedImage]   = useState(false)
  const [avatarId, setAvatarId]             = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [generatingPhoto, setGeneratingPhoto] = useState(false)
  const [generatedPhotoUrl, setGeneratedPhotoUrl] = useState<string | null>(null)

  const [prompt, setPrompt]               = useState('')
  const [avatarName, setAvatarName]       = useState('')
  const [avatarAge, setAvatarAge]         = useState('')
  const [avatarEthnicity, setAvatarEthnicity] = useState('')
  const [avatarStyle, setAvatarStyle]     = useState('')

  const [selectedOutfits, setSelectedOutfits]     = useState<Set<string>>(new Set())
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set())
  const [envMode, setEnvMode]                     = useState<'evolving' | 'locked'>('evolving')

  async function generateFluxPhoto() {
    if (!avatarName.trim()) { setError('Saisissez d\'abord un nom pour l\'avatar.'); return }
    setGeneratingPhoto(true); setError(null)
    try {
      const result = await actionGenerateAvatarPhoto({
        name:      avatarName.trim(),
        age:       avatarAge ? parseInt(avatarAge) : undefined,
        ethnicity: avatarEthnicity.trim() || undefined,
        style:     avatarStyle.trim() || undefined,
        setting:   'lifestyle, modern apartment, natural light',
      })
      setGeneratedPhotoUrl(result.url)
      setUploadedImage(true)
      toast.success('Photo IA générée par Flux Pro ✦')
      addAsset({
        type:      'image',
        url:       result.url,
        title:     `Portrait · ${avatarName.trim()}`,
        engine:    'flux-pro',
        avatarName: avatarName.trim(),
        prompt:    `Avatar: ${avatarName.trim()}${avatarAge ? `, ${avatarAge} ans` : ''}${avatarEthnicity ? `, ${avatarEthnicity}` : ''}${avatarStyle ? `, ${avatarStyle}` : ''}`,
      })
    } catch (e: any) {
      const msg = e.message ?? 'Erreur génération photo'
      setError(msg)
      toast.error(msg)
    } finally {
      setGeneratingPhoto(false)
    }
  }

  function reverseEngineer() {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setUploadedImage(true)
      setPrompt('{\n  "genre": "femme",\n  "ethnie": "caucasienne",\n  "age": 25,\n  "taille": "1m70",\n  "corpulence": "mince",\n  "cheveux": "longs, blonds, ondulés",\n  "traits": "visage ovale, yeux verts, taches de rousseur",\n  "style": "casual chic, minimaliste"\n}')
      setAvatarName('Elena')
      setAvatarAge('25')
      setAvatarEthnicity('Caucasienne')
      setAvatarStyle('Casual chic minimaliste')
    }, 1500)
  }

  async function validateModel() {
    if (!avatarName.trim()) { setError('Le nom de l\'avatar est requis.'); return }
    setIsSaving(true); setError(null)
    try {
      const tags = avatarStyle ? avatarStyle.split(',').map((s) => s.trim()).filter(Boolean) : []
      const avatar = await createAvatar({
        name:       avatarName.trim(),
        age:        avatarAge ? parseInt(avatarAge) : null,
        ethnicity:  avatarEthnicity.trim() || null,
        style_tags: tags,
        continuity_mode: 'evolutif',
      })
      setAvatarId(avatar.id)
      setModelValidated(true)
      toast.success(`Avatar "${avatar.name}" créé ✓`)
      setStep(2)
    } catch (e: any) {
      const msg = e.message ?? 'Erreur lors de la sauvegarde'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  function handleFinalize() {
    toast.success('Avatar finalisé — redirection vers la Galerie')
    router.push('/galerie')
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="nb-label mb-2">Avatar Studio</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">
            Moteur de Création
          </h1>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="flex gap-3 mb-8">
        {PIPELINE_STEPS.map((s) => {
          const isActive    = step === s.id
          const isLocked    = s.id > 1 && !modelValidated
          const isCompleted = s.id < step || (s.id === 1 && modelValidated)
          return (
            <button
              key={s.id}
              onClick={() => !isLocked && setStep(s.id as 1 | 2 | 3)}
              disabled={isLocked}
              className={`
                flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-neo-lg border-2
                transition-all duration-100
                ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                  ? 'border-accent bg-accent/5 shadow-neo -translate-x-px -translate-y-px'
                  : 'border-border bg-bg-card hover:border-border-strong'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-neo flex items-center justify-center flex-shrink-0
                text-[10px] font-bold
                ${isCompleted ? 'bg-accent text-bg-base' : isActive ? 'bg-accent/20 text-accent' : 'bg-bg-surface text-text-dim'}
              `}>
                {isCompleted ? '✓' : s.id}
              </div>
              <div className="text-left">
                <div className={`text-[12px] font-semibold ${isActive || isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>
                  {s.label}
                </div>
                {isLocked && (
                  <div className="font-mono text-[9px] text-text-dim">🔒 Requiert validation</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-7">

        {/* Left panel */}
        <div className="flex flex-col gap-6">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fade-in flex flex-col gap-5">

              {/* Reverse Engineering + Flux Pro */}
              <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
                <h2 className="font-display font-bold text-[15px] text-text-primary mb-2 flex items-center gap-2">
                  <span>🔬</span> Génération Photo IA
                </h2>
                <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
                  Générez un portrait photoréaliste avec Flux Pro depuis le profil de l'avatar,
                  ou uploadez une image source pour l'analyser.
                </p>
                <div className="flex gap-3 items-center flex-wrap">
                  {/* Preview miniature */}
                  <div className={`
                    w-20 h-20 rounded-neo-lg border-2 flex items-center justify-center overflow-hidden
                    font-mono text-text-dim text-xs transition-all duration-200 flex-shrink-0
                    ${generatedPhotoUrl ? 'border-accent' : uploadedImage ? 'border-accent bg-accent/10' : 'border-dashed border-border bg-bg-surface'}
                  `}>
                    {generatedPhotoUrl ? (
                      <img src={generatedPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : uploadedImage ? '✓' : '+'}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Générer avec Flux */}
                    <Button
                      size="sm"
                      onClick={generateFluxPhoto}
                      loading={generatingPhoto}
                      disabled={generatingPhoto || !avatarName.trim()}
                    >
                      {generatingPhoto ? 'Flux Pro...' : generatedPhotoUrl ? '✦ Regénérer (Flux Pro)' : '✦ Générer photo IA (Flux Pro)'}
                    </Button>

                    {/* Reverse engineering */}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={reverseEngineer}
                      loading={isAnalyzing}
                      disabled={isAnalyzing || uploadedImage}
                    >
                      {isAnalyzing ? 'Analyse...' : uploadedImage ? 'Image analysée ✓' : '📁 Uploader & analyser'}
                    </Button>
                  </div>
                </div>
                {!avatarName.trim() && (
                  <p className="font-mono text-[10px] text-amber mt-2">
                    ⚠ Saisissez un nom d'avatar pour générer la photo
                  </p>
                )}
              </div>

              {/* Champs identité */}
              <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5">
                <h2 className="font-display font-bold text-[15px] text-text-primary mb-4 flex items-center gap-2">
                  <span>✦</span> Identité du personnage
                </h2>
                <div className="flex flex-col gap-4">
                  <Input
                    label="* Nom"
                    placeholder="Ex: Elena, Karim, Sophie..."
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Âge"
                      type="number"
                      placeholder="Ex: 25"
                      value={avatarAge}
                      onChange={(e) => setAvatarAge(e.target.value)}
                    />
                    <Input
                      label="Ethnie / Origine"
                      placeholder="Ex: Caucasienne"
                      value={avatarEthnicity}
                      onChange={(e) => setAvatarEthnicity(e.target.value)}
                    />
                  </div>
                  <Input
                    label="Style (tags séparés par virgules)"
                    placeholder="Ex: Casual chic, Minimaliste, Gen Z"
                    value={avatarStyle}
                    onChange={(e) => setAvatarStyle(e.target.value)}
                  />
                </div>
              </div>

              {/* Prompt JSON */}
              <div>
                <label className="nb-label block mb-2">Prompt descriptif JSON <span className="text-text-dim font-normal">(optionnel — généré par l'IA)</span></label>
                <textarea
                  rows={8}
                  className="w-full bg-accent/[0.02] border-2 border-accent/20 rounded-neo-lg
                    px-4 py-3 text-accent font-mono text-[12px] leading-relaxed
                    focus:outline-none focus:border-accent resize-y
                    placeholder:text-text-dim"
                  placeholder="Le prompt JSON s'affichera ici après analyse..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-coral/5 border-2 border-coral/30 rounded-neo px-4 py-2.5">
                  <p className="font-mono text-[11px] text-coral">{error}</p>
                </div>
              )}

              <Button onClick={validateModel} size="lg" loading={isSaving} disabled={!avatarName.trim()}>
                {modelValidated ? '✓ Modèle mis à jour' : '✦ Créer l\'Avatar & Continuer'}
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <AvatarWardrobe selectedOutfits={selectedOutfits} setSelectedOutfits={setSelectedOutfits} />
              <div className="flex justify-between pt-4 border-t-2 border-border">
                <Button variant="ghost" onClick={() => setStep(1)}>← Modèle de base</Button>
                <Button onClick={() => setStep(3)}>Environnements →</Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <AvatarEnvironment
                selectedLocations={selectedLocations}
                setSelectedLocations={setSelectedLocations}
                envMode={envMode}
                setEnvMode={setEnvMode}
              />
              <div className="flex justify-between pt-4 border-t-2 border-border">
                <Button variant="ghost" onClick={() => setStep(2)}>← Garde-robe</Button>
                <Button onClick={handleFinalize}>
                  ✦ Finaliser l'Avatar → Galerie
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — sticky preview */}
        <div className="sticky top-0 self-start">
          <div className="bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden">

            {/* Preview image */}
            <div className="h-[220px] bg-bg-elevated flex items-center justify-center relative border-b-2 border-border overflow-hidden">
              {generatingPhoto && (
                <div className="absolute inset-0 bg-bg-elevated/80 flex flex-col items-center justify-center gap-2 z-10">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-[10px] text-text-dim">Flux Pro...</span>
                </div>
              )}
              {generatedPhotoUrl ? (
                <img src={generatedPhotoUrl} alt={avatarName} className="w-full h-full object-cover" />
              ) : uploadedImage ? (
                <div className="absolute inset-0 bg-bg-elevated flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-2 border-accent bg-accent/20 flex items-center justify-center font-display font-bold text-accent text-lg">
                    {avatarName[0] || 'E'}
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center font-mono text-text-dim text-sm">
                  IA
                </div>
              )}
              {modelValidated && (
                <div className="absolute top-3 right-3 bg-accent/90 text-bg-base font-mono text-[10px] font-bold px-2.5 py-1 rounded-neo">
                  Modèle Actif
                </div>
              )}
              {generatedPhotoUrl && !generatingPhoto && (
                <div className="absolute top-3 left-3 bg-purple/90 text-bg-base font-mono text-[9px] font-bold px-2 py-0.5 rounded-neo">
                  Flux Pro
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <div className="font-display font-bold text-[18px] text-text-primary">
                  {avatarName || 'Nouvel Avatar'}
                </div>
                <div className="text-[12px] text-text-muted mt-0.5">
                  {avatarStyle || 'En attente de description...'}
                </div>
              </div>

              <div className="border-t-2 border-border pt-4 flex flex-col gap-3">
                <div>
                  <div className="nb-label mb-1">Statut du Modèle</div>
                  <div className={`text-[12.5px] font-medium ${modelValidated ? 'text-accent' : 'text-text-muted'}`}>
                    {modelValidated ? '✓ Validé & Prêt' : 'En cours de création'}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="nb-label mb-1">Garde-robe</div>
                  <div className="text-[12.5px] text-text-primary">
                    {selectedOutfits.size} tenue{selectedOutfits.size !== 1 ? 's' : ''} configurée{selectedOutfits.size !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="nb-label mb-1">
                    Environnements ({envMode === 'evolving' ? 'Évolutif' : 'Verrouillé'})
                  </div>
                  <div className="text-[12.5px] text-text-primary">
                    {selectedLocations.size} lieu{selectedLocations.size > 1 ? 'x' : ''} autorisé{selectedLocations.size > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
