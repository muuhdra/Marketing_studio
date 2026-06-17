'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import { updateAvatar } from '@/lib/actions/avatars'
import { actionDesignVoiceFromDescription, actionGenerateSpeech, actionIsVoiceCloneEnabled } from '@/lib/actions/ai'
import { actionCloneAvatarVoice } from '@/lib/actions/avatar-assets'
import { VOICE_PROFILES, getVoiceProfile, type VoiceProfile } from '@/lib/ai/voice-catalog'

interface VoiceSettings { emotion?: string; speed?: number; pitch?: number }
export interface AvatarVoiceValue {
  voice_engine?:      string | null
  voice_id?:          string | null
  voice_mode?:        string | null
  voice_description?: string | null
  voice_settings?:    VoiceSettings | null
  voice_label?:       string | null
}

interface Props {
  avatarId:   string
  avatarName: string
  age:        number | null
  styleTags:  string[]
  gender?:    string   // 'Femme' | 'Homme' | 'Androgyne' (morphologie) → oriente la voix
  ethnicity?: string   // origine → contexte de la voix
  appearancePrompt?: string   // description libre de l'avatar (souvent porteuse du genre/persona)
  initial?:   AvatarVoiceValue
}

const PREVIEW_TEXT = "Bonjour, voici un aperçu de ma voix pour vos campagnes."

type Mode = 'auto' | 'description' | 'manual' | 'clone'
const MODES: { id: Mode; label: string }[] = [
  { id: 'auto',        label: 'Auto' },
  { id: 'description', label: 'Description' },
  { id: 'manual',      label: 'Catalogue' },
  { id: 'clone',       label: 'Cloner' },
]

// Voix sélectionnée (par auto/description/catalogue) avant sauvegarde
interface Selected { profileId: string; engine: string; label: string; settings: VoiceSettings; mode: Mode }

export default function AvatarVoice({ avatarId, avatarName, age, styleTags, gender, ethnicity, appearancePrompt, initial }: Props) {
  const toast = useToast()

  const initialProfile = getVoiceProfile(initial?.voice_id)
  const [mode, setMode] = useState<Mode>((initial?.voice_mode as Mode) ?? 'auto')
  const [description, setDescription] = useState(initial?.voice_description ?? '')
  const [selected, setSelected] = useState<Selected | null>(
    initialProfile
      ? { profileId: initialProfile.id, engine: initialProfile.engine, label: initial?.voice_label ?? initialProfile.label, settings: initial?.voice_settings ?? {}, mode: (initial?.voice_mode as Mode) ?? 'manual' }
      : null,
  )
  const [designing, setDesigning] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cloneEnabled, setCloneEnabled] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [sampleName, setSampleName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Cache du dernier aperçu généré → permet de rejouer dans un geste utilisateur (contourne l'autoplay bloqué)
  const audioCacheRef = useRef<{ key: string; audio: HTMLAudioElement } | null>(null)

  // Clonage actif ? (sinon mode optionnel, on retombe sur auto/description)
  const [isClone, setIsClone] = useState(initial?.voice_mode === 'clone')
  useEffect(() => { actionIsVoiceCloneEnabled().then(setCloneEnabled).catch(() => {}) }, [])

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }

  async function preview(sel: Selected) {
    const profile = getVoiceProfile(sel.profileId)
    if (!profile) return

    // Clé d'identité de l'aperçu (voix + réglages). Si déjà généré, on rejoue depuis le cache :
    // l'appel .play() reste alors dans le geste utilisateur → l'autoplay n'est pas bloqué.
    const key = `${sel.profileId}|${sel.engine}|${sel.settings.speed}|${sel.settings.pitch}|${sel.settings.emotion}`
    if (audioCacheRef.current?.key === key) {
      stopAudio()
      const audio = audioCacheRef.current.audio
      audio.currentTime = 0
      audioRef.current = audio
      audio.play().catch(() => {})
      return
    }

    setPreviewing(true)
    try {
      const res = await actionGenerateSpeech({
        text:    PREVIEW_TEXT,
        engine:  profile.engine,
        voice:   profile.voice as never,
        speed:   sel.settings.speed,
        pitch:   sel.settings.pitch,
        emotion: sel.settings.emotion as never,
      })
      if (!res.audioBase64) { toast.error('Aperçu indisponible'); return }
      stopAudio()
      const audio = new Audio(`data:audio/mpeg;base64,${res.audioBase64}`)
      audioRef.current = audio
      audioCacheRef.current = { key, audio }
      try {
        await audio.play()
      } catch {
        // Autoplay bloqué par le navigateur : le geste a été « consommé » par l'appel réseau.
        // L'aperçu est prêt et en cache → un clic sur « Écouter » le jouera directement.
        toast.success('Aperçu prêt — clique sur « Écouter » pour le jouer')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur d\'aperçu')
    } finally {
      setPreviewing(false)
    }
  }

  // Mappe une description (libre ou auto) → config MiniMax via Claude
  async function runDesign(desc: string, asMode: 'auto' | 'description') {
    setDesigning(true)
    try {
      const d = await actionDesignVoiceFromDescription({ description: desc, avatarName, age, styleTags })
      const sel: Selected = { profileId: d.profileId, engine: d.engine, label: d.label, settings: d.settings, mode: asMode }
      setSelected(sel); setIsClone(false)
      toast.success(`Voix générée : ${d.label}`)
      preview(sel)
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de la génération de voix')
    } finally {
      setDesigning(false)
    }
  }

  function autoDescription(): string {
    const g = gender === 'Homme' ? 'voix masculine' : gender === 'Femme' ? 'voix féminine' : gender === 'Androgyne' ? 'voix neutre / androgyne' : ''
    const bits: string[] = []
    if (age) bits.push(`${age} ans`)
    if (ethnicity?.trim()) bits.push(ethnicity.trim())
    if (styleTags.length) bits.push(styleTags.join(', '))
    const base = `${g ? `${g}, ` : ''}adaptée à l'avatar ${avatarName}${bits.length ? `, ${bits.join(', ')}` : ''}`
    // Le prompt d'apparence porte souvent le genre/persona (ex. « jeune femme métisse ») :
    // on le joint pour que le casting vocal infère le bon genre même sans chip « Genre ».
    return appearancePrompt?.trim() ? `${base}. Apparence de l'avatar : ${appearancePrompt.trim()}` : base
  }

  function pickManual(p: VoiceProfile) {
    setSelected({ profileId: p.id, engine: p.engine, label: p.label, settings: { emotion: 'neutral', speed: 1, pitch: 0 }, mode: 'manual' })
    setIsClone(false)
  }

  async function save() {
    if (!selected) { toast.error('Choisissez ou générez une voix'); return }
    setSaving(true)
    try {
      await updateAvatar(avatarId, {
        voice_engine:      selected.engine,
        voice_id:          selected.profileId,
        voice_mode:        selected.mode,
        voice_description: selected.mode === 'description' ? description.trim() : null,
        voice_settings:    selected.settings,
        voice_label:       selected.label,
      })
      toast.success('Voix de l\'avatar enregistrée ✓')
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  async function clone() {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Sélectionne un échantillon audio'); return }
    setCloning(true)
    try {
      const fd = new FormData()
      fd.append('avatarId', avatarId)
      fd.append('file', file)
      fd.append('name', avatarName)
      const res = await actionCloneAvatarVoice(fd)
      if (res.cloned) {
        setIsClone(true); setSelected(null)
        toast.success('Voix clonée et enregistrée ✓')
      } else {
        toast.success(res.message ?? 'Échantillon enregistré.')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors du clonage')
    } finally {
      setCloning(false)
    }
  }

  const headerBadge = isClone
    ? `${initial?.voice_label ?? avatarName} · Clone`
    : selected
      ? `${selected.label} · ${selected.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}`
      : null

  return (
    <div className="bg-bg-card border border-border rounded-neo-lg p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-[15px] text-text-primary">Voix de l'avatar</h2>
        {headerBadge && (
          <span className="font-sans text-[10px] text-teal border border-border-teal rounded-neo px-2 py-0.5">{headerBadge}</span>
        )}
      </div>
      <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
        Voix unique et persistante de l'avatar — réutilisée automatiquement dans toutes ses générations.
      </p>

      {/* Bascule mode */}
      <div className="inline-flex gap-1 bg-bg-surface border border-border rounded-neo p-0.5 mb-4 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1.5 rounded-neo font-sans text-[11px] font-bold transition-all
              ${mode === m.id ? 'bg-accent text-bg-base' : 'text-text-dim hover:text-text-primary'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Auto : le système génère depuis le profil de l'avatar ── */}
      {mode === 'auto' && (
        <div className="flex flex-col gap-3">
          <p className="font-sans text-[11px] text-text-dim leading-relaxed">
            Le système choisit une voix d'après l'identité de l'avatar
            {age || styleTags.length ? ` (${[age && `${age} ans`, styleTags.join(', ')].filter(Boolean).join(' · ')})` : ''}.
          </p>
          <div>
            <Button onClick={() => runDesign(autoDescription(), 'auto')} loading={designing} size="sm">
              Générer une voix pour cet avatar
            </Button>
          </div>
        </div>
      )}

      {/* ── Description libre → MiniMax ── */}
      {mode === 'description' && (
        <div className="flex flex-col gap-3">
          <Textarea
            label="Décris la voix (MiniMax)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex. voix féminine douce et posée, plutôt jeune, ton rassurant"
            rows={2}
          />
          <div>
            <Button onClick={() => description.trim() ? runDesign(description.trim(), 'description') : toast.error('Décris la voix souhaitée')} loading={designing} size="sm">
              Générer la voix
            </Button>
          </div>
        </div>
      )}

      {/* ── Catalogue ── */}
      {mode === 'manual' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VOICE_PROFILES.map((p) => {
            const active = !isClone && selected?.profileId === p.id
            return (
              <button
                key={p.id}
                onClick={() => pickManual(p)}
                className={`text-left rounded-neo border p-2.5 transition-all
                  ${active ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}
              >
                <p className="font-sans text-[11px] font-bold text-text-primary">{p.label}</p>
                <p className="font-sans text-[9px] text-text-dim">
                  {p.gender === 'f' ? 'F' : p.gender === 'm' ? 'H' : 'N'} · {p.engine === 'minimax' ? 'MiniMax' : 'ElevenLabs'}
                </p>
                <p className="font-sans text-[9px] text-text-dim truncate">{p.tags.slice(0, 2).join(', ')}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Cloner (optionnel) ── */}
      {mode === 'clone' && (
        <div className="flex flex-col gap-3">
          {!cloneEnabled && (
            <div className="bg-amber/5 border border-amber/30 rounded-neo p-3">
              <p className="font-sans text-[10px] text-amber leading-relaxed">
                Le clonage est optionnel et nécessite une API dédiée (à venir). En attendant, utilise <strong>Auto</strong> ou <strong>Description</strong>.
                L'échantillon que tu déposes est conservé et servira dès l'activation.
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={(e) => setSampleName(e.target.files?.[0]?.name ?? null)}
            className="font-sans text-[11px] text-text-secondary file:mr-3 file:rounded-neo file:border file:border-border file:bg-bg-surface file:px-3 file:py-1.5 file:font-sans file:text-[11px] file:text-text-primary"
          />
          <p className="font-sans text-[9px] text-text-dim">{sampleName ? `Sélectionné : ${sampleName}` : 'Échantillon ≥ 30 s, voix claire, peu de bruit. Max 50 MB.'}</p>
          <div>
            <Button onClick={clone} loading={cloning} size="sm">
              {cloneEnabled ? 'Cloner la voix' : 'Déposer l\'échantillon'}
            </Button>
          </div>
        </div>
      )}

      {/* Actions sur la sélection (auto/description/catalogue) */}
      {selected && mode !== 'clone' && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="secondary" size="sm" onClick={() => preview(selected)} loading={previewing}>▶ Écouter</Button>
          <Button size="sm" onClick={save} loading={saving}>Enregistrer la voix</Button>
        </div>
      )}
    </div>
  )
}
