'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { deleteAvatar } from '@/lib/actions/avatars'
import { actionGetAssetSignedUrl } from '@/lib/actions/avatar-assets'
import { actionGenerateSpeech } from '@/lib/actions/ai'
import { getVoiceProfile } from '@/lib/ai/voice-catalog'
import { useToast } from '@/lib/stores/toastStore'
import { useRouter } from 'next/navigation'
import {
  useMediaStore,
  type MediaAsset,
  type MediaType,
  engineLabel,
  engineColor,
} from '@/lib/stores/mediaStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbAvatar {
  id:               string
  name:             string
  age:              number | null
  ethnicity:        string | null
  style_tags:       string[] | null
  continuity_mode:  'evolutif' | 'verrouille'
  status:           'draft' | 'active' | 'archived'
  source_photo_url: string | null
  reference_sheet_url?: string | null
  voice_engine?:    string | null
  voice_id?:        string | null
  voice_label?:     string | null
  voice_settings?:  { emotion?: string; speed?: number; pitch?: number } | null
  created_at:       Date | string
}

type TabFilter = 'all' | MediaType

const TAB_LIST: { id: TabFilter; label: string }[] = [
  { id: 'all',    label: 'Tout'    },
  { id: 'image',  label: 'Images'  },
  { id: 'video',  label: 'Vidéos'  },
  { id: 'audio',  label: 'Voix'    },
  { id: 'avatar', label: 'Avatars' },
]

const CARD_COLORS = [
  'border-purple',
  'border-border-teal',
  'border-border-coral',
  'border-pink/40',
  'border-accent   shadow-neo',
]

// ─── AudioPlayer ─────────────────────────────────────────────────────────────

function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  // base64 audio ou URL
  const audioSrc = src.startsWith('data:') ? src : src

  function toggle() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  function onTimeUpdate() {
    if (!audioRef.current) return
    const pct = audioRef.current.currentTime / (audioRef.current.duration || 1)
    setProgress(pct * 100)
  }

  return (
    <div className="flex items-center gap-3 bg-bg-surface border border-border rounded-neo px-4 py-3 w-full">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-neo border border-border-teal bg-teal/10 flex items-center justify-center text-teal hover:bg-teal/20 transition-colors flex-shrink-0"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[11px] font-bold text-text-primary truncate mb-1.5">{title}</p>
        <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
    </div>
  )
}

// ─── MediaCard ────────────────────────────────────────────────────────────────

function MediaCard({ asset, onClick }: { asset: MediaAsset; onClick: () => void }) {
  const ecol = engineColor(asset.engine)

  return (
    <div
      onClick={onClick}
      className="group border border-border bg-bg-card rounded-neo-lg overflow-hidden cursor-pointer transition-transform duration-150"
    >
      {/* Preview zone */}
      <div className="h-[152px] bg-bg-elevated relative border-b border-border overflow-hidden flex items-center justify-center">
        {asset.type === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt={asset.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        {asset.type === 'video' && (
          <>
            {asset.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="w-14 h-14 rounded-full border border-teal/60 bg-teal/10 backdrop-blur-sm flex items-center justify-center text-2xl text-teal group-hover:bg-teal/20 transition-colors relative z-[1]">
              ▶
            </div>
            {asset.format && (
              <span className="absolute bottom-2 left-2 font-sans text-[9px] font-bold text-text-primary bg-bg-base/80 border border-border rounded px-1.5 py-0.5">
                {asset.format}
              </span>
            )}
            {asset.duration && (
              <span className="absolute bottom-2 right-2 font-sans text-[9px] text-text-dim bg-bg-base/80 border border-border rounded px-1.5 py-0.5">
                {asset.duration}s
              </span>
            )}
          </>
        )}
        {asset.type === 'audio' && (
          <div className="flex flex-col items-center gap-2">
            {/* mini waveform décoratif */}
            <div className="flex items-end gap-0.5 h-6">
              {[3,5,8,6,9,4,7,5,8,3,6,9,4,7,5].map((h, i) => (
                <div key={i} className="w-0.5 bg-teal/60 rounded-full" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
          </div>
        )}

        {/* Engine badge top-right */}
        <span className={`absolute top-2 right-2 font-sans text-[8px] font-bold border rounded px-1.5 py-0.5 bg-bg-base/90 ${ecol}`}>
          {engineLabel(asset.engine)}
        </span>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="font-sans text-[11px] font-bold text-text-primary truncate mb-0.5">{asset.title}</p>
        {asset.campaignName && (
          <p className="font-sans text-[10px] text-text-dim truncate">{asset.campaignName}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-sans text-[9px] text-text-dim">
            {new Date(asset.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
          {asset.avatarName && (
            <span className="font-sans text-[9px] text-text-dim border border-border rounded px-1.5 py-0.5">
              {asset.avatarName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AvatarCard ───────────────────────────────────────────────────────────────

function AvatarCard({ avatar, index, portrait, onPortraitError, onClick }: { avatar: DbAvatar; index: number; portrait?: string; onPortraitError?: () => void; onClick: () => void }) {
  const color = CARD_COLORS[index % CARD_COLORS.length]
  const initials = avatar.name.slice(0, 2).toUpperCase()
  const firstTag = (avatar.style_tags ?? [])[0]

  const Stat = ({ value, label, first }: { value: string; label: string; first?: boolean }) => (
    <div className={`flex-1 min-w-0 px-2 ${first ? '' : 'border-l border-white/30'}`}>
      <p className="font-display font-bold text-[12px] text-white truncate leading-tight">{value}</p>
      <p className="font-sans text-[8px] uppercase tracking-wider text-white/75 truncate">{label}</p>
    </div>
  )

  return (
    <div
      onClick={onClick}
      className={`relative h-[320px] border ${color} bg-bg-elevated rounded-neo-lg overflow-hidden cursor-pointer transition-transform duration-150`}
    >
      {/* Portrait plein cadre */}
      {portrait ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={portrait} alt={avatar.name} className="absolute inset-0 w-full h-full object-cover" onError={onPortraitError} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-dashed border-border flex items-center justify-center font-sans text-text-dim font-bold text-base">{initials}</div>
        </div>
      )}

      {/* Badge statut */}
      <span className={`absolute top-3 right-3 z-10 font-sans text-[8px] font-bold border rounded px-1.5 py-0.5 bg-black/55 backdrop-blur-sm
        ${avatar.status === 'active' ? 'text-teal border-border-teal' : 'text-white/70 border-white/30'}`}>
        {avatar.status === 'active' ? 'Actif' : 'Brouillon'}
      </span>

      {/* Dégradé bas pour la lisibilité */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Infos en surimpression */}
      <div className="absolute inset-x-0 bottom-0 p-3.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-display font-bold text-[15px] text-white truncate">{avatar.name}</p>
          {avatar.status === 'active' && (
            <svg width="14" height="14" viewBox="0 0 24 24" className="flex-shrink-0 text-accent" aria-hidden="true">
              <path fill="currentColor" d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15.6l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3-.1z"/>
              <path fill="none" stroke="#0f1113" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.3 2.3 4.6-4.8"/>
            </svg>
          )}
        </div>
        <p className="font-sans text-[10px] text-white/85 mb-2.5 truncate">
          {avatar.age ? `${avatar.age} ans` : '—'}{avatar.ethnicity ? ` · ${avatar.ethnicity}` : ''}{firstTag ? ` · ${firstTag}` : ''}
        </p>
        <div className="flex items-stretch border-t border-white/30 pt-2">
          <Stat first value={avatar.age ? `${avatar.age}` : '—'} label="Âge" />
          <Stat value={avatar.ethnicity || '—'} label="Origine" />
          <Stat value={avatar.continuity_mode === 'evolutif' ? 'Évolutif' : 'Verrouillé'} label="Type" />
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaAsset
  onClose: () => void
  onDelete: () => void
}) {
  const ecol = engineColor(asset.engine)

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] bg-bg-card border border-border rounded-neo-lg overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-sans text-[12px] font-bold text-text-primary truncate max-w-[280px]">{asset.title}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-neo border border-border flex items-center justify-center text-text-dim hover:text-text-primary">×</button>
        </div>

        {/* Preview */}
        <div className="bg-bg-elevated border-b border-border" style={{ minHeight: 220 }}>
          {asset.type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.title} className="w-full max-h-[360px] object-contain" />
          )}
          {asset.type === 'video' && (
            <video
              src={asset.url}
              controls
              className="w-full max-h-[360px]"
              style={{ background: '#000' }}
            />
          )}
          {asset.type === 'audio' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <AudioPlayer src={asset.url} title={asset.title} />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="p-5 space-y-3">
          {/* Engine + format */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-sans text-[10px] font-bold border rounded px-2 py-0.5 ${ecol}`}>
              {engineLabel(asset.engine)}
            </span>
            {asset.format && (
              <span className="font-sans text-[10px] text-text-dim border border-border rounded px-2 py-0.5">
                {asset.format}
              </span>
            )}
            {asset.duration && (
              <span className="font-sans text-[10px] text-text-dim border border-border rounded px-2 py-0.5">
                {asset.duration}s
              </span>
            )}
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {asset.campaignName && (
              <div className="bg-bg-surface border border-border rounded-neo px-3 py-2">
                <p className="font-sans text-[9px] text-text-dim mb-0.5">Campagne</p>
                <p className="font-sans font-bold text-text-primary truncate">{asset.campaignName}</p>
              </div>
            )}
            {asset.avatarName && (
              <div className="bg-bg-surface border border-border rounded-neo px-3 py-2">
                <p className="font-sans text-[9px] text-text-dim mb-0.5">Avatar</p>
                <p className="font-sans font-bold text-text-primary truncate">{asset.avatarName}</p>
              </div>
            )}
          </div>

          {/* Prompt */}
          {asset.prompt && (
            <div className="bg-bg-surface border border-border rounded-neo px-3 py-2.5">
              <p className="font-sans text-[9px] text-text-dim mb-1">Prompt</p>
              <p className="font-sans text-[10px] text-text-muted leading-relaxed line-clamp-3">{asset.prompt}</p>
            </div>
          )}

          <p className="font-sans text-[9px] text-text-dim">
            Créé le {new Date(asset.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <a
            href={asset.url}
            download={`${asset.title.replace(/\s+/g, '_')}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button fullWidth size="sm" variant="secondary">Télécharger</Button>
          </a>
          <Button size="sm" variant="danger" onClick={onDelete}>Supprimer</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Avatar Modal ─────────────────────────────────────────────────────────────

// Aperçu de la voix configurée d'un avatar (TTS à la demande + rejeu depuis le cache)
function VoicePreviewButton({ avatar }: { avatar: DbAvatar }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef<HTMLAudioElement | null>(null)
  const profile = getVoiceProfile(avatar.voice_id ?? undefined)
  if (!avatar.voice_id || !profile) return null   // pas de voix configurée → rien à afficher

  async function play() {
    // Rejeu depuis le cache (dans le geste utilisateur → l'autoplay n'est pas bloqué)
    if (cacheRef.current) { cacheRef.current.currentTime = 0; cacheRef.current.play().catch(() => {}); return }
    setLoading(true)
    try {
      const s = avatar.voice_settings ?? {}
      const res = await actionGenerateSpeech({
        text:    `Bonjour, je suis ${avatar.name}. Voici un aperçu de ma voix pour vos campagnes.`,
        engine:  profile!.engine,
        voice:   profile!.voice as never,
        speed:   s.speed ?? 1,
        pitch:   s.pitch ?? 0,
        emotion: (s.emotion ?? 'neutral') as never,
      })
      if (!res.audioBase64) { toast.error('Aperçu voix indisponible'); return }
      const audio = new Audio(`data:audio/mpeg;base64,${res.audioBase64}`)
      cacheRef.current = audio
      try { await audio.play() } catch { toast.success('Voix prête — reclique pour l\'écouter') }
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur aperçu voix')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="nb-label text-[9px] mb-1.5">Voix — {avatar.voice_label ?? profile.label}</p>
      <button
        type="button"
        onClick={play}
        disabled={loading}
        className="w-full h-9 flex items-center justify-center gap-2 rounded-neo-md border border-border bg-fg/[0.03] text-[12px] font-semibold text-text-primary hover:bg-fg/[0.06] hover:border-border-strong transition-all disabled:opacity-50"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          : <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" className="text-accent" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
        Écouter la voix
      </button>
    </div>
  )
}

function AvatarModal({
  avatar,
  index,
  portrait,
  sheet,
  onPortraitError,
  onClose,
  onDelete,
  deleting,
}: {
  avatar: DbAvatar
  index: number
  portrait?: string
  sheet?: string
  onPortraitError?: () => void
  onClose: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const color = CARD_COLORS[index % CARD_COLORS.length]

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[400px] max-h-[90vh] overflow-y-auto bg-bg-card border ${color} rounded-neo-lg animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Portrait dominant + identité en surimpression */}
        <div className="relative h-[320px] bg-bg-elevated">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt={avatar.name} className="absolute inset-0 w-full h-full object-cover" onError={onPortraitError} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border border-dashed border-border flex items-center justify-center font-sans text-text-dim font-bold text-lg">
                {avatar.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 left-3 z-10 w-8 h-8 rounded-neo border border-white/30 bg-black/55 backdrop-blur-sm flex items-center justify-center text-white text-lg hover:bg-black/70 transition-colors">×</button>
          <span className={`absolute top-3 right-3 z-10 font-sans text-[9px] font-bold border rounded px-2 py-0.5 bg-black/55 backdrop-blur-sm
            ${avatar.status === 'active' ? 'text-teal border-border-teal' : 'text-white/70 border-white/30'}`}>
            {avatar.status === 'active' ? 'Actif' : 'Brouillon'}
          </span>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 p-4" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="font-display font-bold text-[22px] text-white truncate">{avatar.name}</h2>
              {avatar.status === 'active' && (
                <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0 text-accent" aria-hidden="true">
                  <path fill="currentColor" d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15.6l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3-.1z"/>
                  <path fill="none" stroke="#0f1113" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.3 2.3 4.6-4.8"/>
                </svg>
              )}
            </div>
            <p className="font-sans text-[10px] text-white/85 mb-2.5 truncate">
              {avatar.age ? `${avatar.age} ans` : '—'}{avatar.ethnicity ? ` · ${avatar.ethnicity}` : ''}{(avatar.style_tags ?? [])[0] ? ` · ${(avatar.style_tags ?? [])[0]}` : ''}
            </p>
            <div className="flex items-stretch border-t border-white/30 pt-2">
              <div className="flex-1 min-w-0 px-2">
                <p className="font-display font-bold text-[13px] text-white truncate leading-tight">{avatar.age ? `${avatar.age}` : '—'}</p>
                <p className="font-sans text-[8px] uppercase tracking-wider text-white/75 truncate">Âge</p>
              </div>
              <div className="flex-1 min-w-0 px-2 border-l border-white/30">
                <p className="font-display font-bold text-[13px] text-white truncate leading-tight">{avatar.ethnicity || '—'}</p>
                <p className="font-sans text-[8px] uppercase tracking-wider text-white/75 truncate">Origine</p>
              </div>
              <div className="flex-1 min-w-0 px-2 border-l border-white/30">
                <p className="font-display font-bold text-[13px] text-white truncate leading-tight">{avatar.continuity_mode === 'evolutif' ? 'Évolutif' : 'Verrouillé'}</p>
                <p className="font-sans text-[8px] uppercase tracking-wider text-white/75 truncate">Type</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {(avatar.style_tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(avatar.style_tags ?? []).map((t) => (
                <span key={t} className="font-sans text-[9px] font-bold text-accent border border-accent/40 rounded px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}

          {/* Fiche de référence (planche multi-poses) */}
          {sheet && (
            <div>
              <p className="nb-label text-[9px] mb-1.5">Fiche de référence</p>
              <a href={sheet} target="_blank" rel="noreferrer" className="block rounded-neo border border-border overflow-hidden hover:border-accent transition-colors" title="Ouvrir en grand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sheet} alt="Fiche de référence" className="w-full object-cover" />
              </a>
            </div>
          )}

          {/* Aperçu de la voix de l'avatar */}
          <VoicePreviewButton avatar={avatar} />

          <p className="font-sans text-[10px] text-text-dim">
            Créé le {new Date(avatar.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="flex flex-col gap-2">
            <Link href={`/avatar-studio?avatar=${avatar.id}`}><Button fullWidth size="sm">Modifier le profil</Button></Link>
            <Button variant="danger" fullWidth size="sm" loading={deleting} onClick={onDelete}>
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GalerieView({ avatars }: { avatars: DbAvatar[] }) {
  const router           = useRouter()
  const toast            = useToast()
  const rawAssets  = useMediaStore((s) => s.assets)
  const removeAsset = useMediaStore((s) => s.removeAsset)

  // Évite le mismatch d'hydratation : le store est persisté en localStorage (vide au SSR,
  // réhydraté au mount). On ne révèle les assets qu'après le mount client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); useMediaStore.getState().loadFromServer() }, [])
  const assets = mounted ? rawAssets : []

  // Portraits d'avatars (bucket privé) → URLs signées résolues à la demande
  const [portraits, setPortraits] = useState<Record<string, string>>({})
  useEffect(() => {
    avatars.forEach(async (av) => {
      if (av.source_photo_url && !portraits[av.id]) {
        try {
          const u = await actionGetAssetSignedUrl(av.source_photo_url)
          if (u) setPortraits((p) => ({ ...p, [av.id]: u }))
        } catch { /* portrait indisponible */ }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatars])

  // Fiches de référence (planche multi-poses) → URLs signées
  const [sheets, setSheets] = useState<Record<string, string>>({})
  useEffect(() => {
    avatars.forEach(async (av) => {
      if (av.reference_sheet_url && !sheets[av.id]) {
        try {
          const u = await actionGetAssetSignedUrl(av.reference_sheet_url)
          if (u) setSheets((p) => ({ ...p, [av.id]: u }))
        } catch { /* fiche indisponible */ }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatars])

  const [activeTab,       setActiveTab]       = useState<TabFilter>('all')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedAvatarId,setSelectedAvatarId]= useState<string | null>(null)
  const [engineFilter,    setEngineFilter]    = useState<string | null>(null)
  const [searchQ,         setSearchQ]         = useState('')
  const [deletingAvatarId,setDeletingAvatarId]= useState<string | null>(null)

  // ── Build unified item list ────────────────────────────────────────────────

  // Avatars → treated as MediaAsset shape for filtering
  const avatarAssets: MediaAsset[] = avatars.map((av) => ({
    id:         av.id,
    type:       'avatar' as MediaType,
    url:        '',
    title:      av.name,
    engine:     'nano-banana' as const,
    createdAt:  new Date(av.created_at).toISOString(),
  }))

  const allAssets: MediaAsset[] = [...assets, ...avatarAssets]

  // ── Counts per tab ─────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:    allAssets.length,
    image:  allAssets.filter((a) => a.type === 'image').length,
    video:  allAssets.filter((a) => a.type === 'video').length,
    audio:  allAssets.filter((a) => a.type === 'audio').length,
    avatar: avatars.length,
  }), [allAssets, avatars])

  // ── Engine filter options (from current tab's assets) ─────────────────────
  const tabAssets = useMemo(() => {
    if (activeTab === 'all') return allAssets
    return allAssets.filter((a) => a.type === activeTab)
  }, [allAssets, activeTab])

  const engineOptions = useMemo(() => {
    const set = new Set<string>()
    tabAssets.forEach((a) => a.type !== 'avatar' && set.add(a.engine))
    return Array.from(set)
  }, [tabAssets])

  // ── Filtered assets ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = tabAssets
    if (engineFilter) list = list.filter((a) => a.engine === engineFilter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q)
        || a.campaignName?.toLowerCase().includes(q)
        || a.avatarName?.toLowerCase().includes(q)
        || a.prompt?.toLowerCase().includes(q)
      )
    }
    return list
  }, [tabAssets, engineFilter, searchQ])

  // Separate avatars from media in the filtered list
  const filteredMedia   = filtered.filter((a) => a.type !== 'avatar')
  const filteredAvatars = filtered.filter((a) => a.type === 'avatar')

  // ── Handlers ───────────────────────────────────────────────────────────────
  const selectedAsset  = assets.find((a) => a.id === selectedAssetId) ?? null
  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId) ?? null
  const selectedAvatarIndex = avatars.findIndex((a) => a.id === selectedAvatarId)

  async function handleDeleteAvatar(id: string) {
    const av = avatars.find((a) => a.id === id)
    setDeletingAvatarId(id)
    try {
      await deleteAvatar(id)
      toast.success(`${av?.name ?? 'Avatar'} supprimé(e) ✓`)
      setSelectedAvatarId(null)
      router.refresh()
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeletingAvatarId(null)
    }
  }

  function handleDeleteAsset(id: string) {
    removeAsset(id)
    setSelectedAssetId(null)
    toast.success('Asset supprimé de la bibliothèque')
  }

  // Portrait dont l'URL signée a expiré → on retire l'entrée (fallback initiales, pas d'icône cassée)
  function handlePortraitError(avatarId: string) {
    setPortraits((p) => { const n = { ...p }; delete n[avatarId]; return n })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="nb-label mb-2">Médiathèque</p>
          <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">
            Galerie
          </h1>
          <p className="text-[13px] text-text-muted mt-1">
            {allAssets.length > 0
              ? `${allAssets.length} asset${allAssets.length > 1 ? 's' : ''} · Images · Vidéos · Voix · Avatars`
              : 'Tout le contenu généré apparaîtra ici'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/creative-studio">
            <Button variant="secondary" size="sm">+ Générer du contenu</Button>
          </Link>
          <Link href="/avatar-studio">
            <Button size="sm">+ Créer un avatar</Button>
          </Link>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {allAssets.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { type: 'image'  as MediaType, label: 'Images',  count: counts.image,  color: 'text-accent' },
            { type: 'video'  as MediaType, label: 'Vidéos',  count: counts.video,  color: 'text-teal' },
            { type: 'audio'  as MediaType, label: 'Voix',    count: counts.audio,  color: 'text-coral' },
            { type: 'avatar' as MediaType, label: 'Avatars', count: counts.avatar, color: 'text-purple' },
          ].map((s) => (
            <button
              key={s.type}
              onClick={() => setActiveTab(s.type)}
              className={`bg-bg-card border rounded-neo-lg px-4 py-3 text-left transition-all
                ${activeTab === s.type ? 'border-accent shadow-neo' : 'border-border hover:border-border-teal'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-display font-bold text-[22px] ${s.color}`}>{s.count}</span>
              </div>
              <p className="font-sans text-[10px] text-text-dim">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Tabs + Filters ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Tab pills */}
        <div className="flex gap-1 bg-bg-surface border border-border rounded-neo p-0.5">
          {TAB_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setEngineFilter(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-neo font-sans text-[11px] font-bold transition-all
                ${activeTab === t.id
                  ? 'bg-accent text-bg-base'
                  : 'text-text-dim hover:text-text-primary'
                }`}
            >
              <span>{t.label}</span>
              <span className={`text-[9px] ${activeTab === t.id ? 'opacity-70' : 'text-text-dim'}`}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Rechercher..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="nb-input text-[12px] py-1.5 px-3 w-44"
        />

        {/* Engine filter */}
        {engineOptions.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setEngineFilter(null)}
              className={`font-sans text-[9px] font-bold border rounded px-2 py-1 transition-colors
                ${!engineFilter ? 'bg-accent text-bg-base border-accent' : 'text-text-dim border-border hover:border-accent'}`}
            >
              Tous moteurs
            </button>
            {engineOptions.map((eng) => (
              <button
                key={eng}
                onClick={() => setEngineFilter(engineFilter === eng ? null : eng)}
                className={`font-sans text-[9px] font-bold border rounded px-2 py-1 transition-colors
                  ${engineFilter === eng ? 'bg-accent text-bg-base border-accent' : 'text-text-dim border-border hover:border-accent'}`}
              >
                {engineLabel(eng as Parameters<typeof engineLabel>[0])}
              </button>
            ))}
          </div>
        )}

        {/* Trash — clear all media */}
        {assets.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`Supprimer les ${assets.length} assets générés de la bibliothèque ?`)) {
                useMediaStore.getState().clearAll()
                toast.success('Bibliothèque vidée')
              }
            }}
            className="ml-auto font-sans text-[10px] text-text-dim hover:text-coral border border-border hover:border-coral rounded-neo px-3 py-1.5 transition-colors"
          >
            Vider
          </button>
        )}
      </div>

      {/* ── Skeleton avant le mount, uniquement quand rien n'est encore affichable ── */}
      {!mounted && filtered.length === 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-neo-lg border border-border bg-bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {mounted && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-neo-lg border border-dashed border-border flex items-center justify-center text-2xl mb-5">
            ●
          </div>
          <p className="font-display font-bold text-[16px] text-text-primary mb-2">
            {searchQ
              ? `Aucun résultat pour "${searchQ}"`
              : activeTab === 'avatar'
                ? 'Aucun avatar pour l\'instant'
                : `Aucun${activeTab === 'all' ? ' asset' : activeTab === 'image' ? 'e image' : activeTab === 'video' ? 'e vidéo' : 'e voix'} généré${activeTab === 'image' || activeTab === 'video' || activeTab === 'audio' ? 'e' : ''}`}
          </p>
          <p className="font-sans text-[11px] text-text-dim mb-6 max-w-sm">
            {activeTab === 'avatar'
              ? 'Créez votre premier personnage IA dans l\'Avatar Studio.'
              : 'Générez du contenu depuis le Creative Studio — tout apparaîtra automatiquement ici.'}
          </p>
          <div className="flex gap-2">
            {activeTab !== 'avatar' && (
              <Link href="/creative-studio">
                <Button size="sm">Ouvrir le Creative Studio</Button>
              </Link>
            )}
            <Link href="/avatar-studio">
              <Button size="sm" variant="secondary">Avatar Studio</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {filtered.length > 0 && (
        <div className="space-y-6">
          {/* Media assets */}
          {filteredMedia.length > 0 && (
            <div>
              {(activeTab === 'all' || activeTab === 'avatar') && filteredAvatars.length > 0 && (
                <p className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3">
                  Contenu généré · {filteredMedia.length}
                </p>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {filteredMedia.map((asset) => (
                  <MediaCard
                    key={asset.id}
                    asset={asset}
                    onClick={() => setSelectedAssetId(asset.id)}
                  />
                ))}
                {/* Add card */}
                {(activeTab === 'image' || activeTab === 'video' || activeTab === 'audio') && (
                  <Link href="/creative-studio" className="block group">
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-bg-surface border border-dashed border-border rounded-neo-lg transition-all group-hover:border-accent group-hover:bg-accent/5 group-hover:border-border-strong">
                      <div className="w-10 h-10 rounded-neo border border-border flex items-center justify-center text-xl text-text-dim group-hover:border-accent group-hover:text-accent transition-colors mb-2">+</div>
                      <span className="font-sans text-[10px] text-text-dim group-hover:text-accent transition-colors">Générer</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Avatars */}
          {filteredAvatars.length > 0 && (
            <div>
              {(activeTab === 'all') && filteredMedia.length > 0 && (
                <p className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3 mt-2">
                  Avatars · {filteredAvatars.length}
                </p>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {filteredAvatars.map((a, i) => {
                  const av = avatars.find((av) => av.id === a.id)!
                  const origIndex = avatars.findIndex((av) => av.id === a.id)
                  return (
                    <AvatarCard
                      key={a.id}
                      avatar={av}
                      index={origIndex}
                      portrait={portraits[av.id]}
                      onPortraitError={() => handlePortraitError(av.id)}
                      onClick={() => setSelectedAvatarId(a.id)}
                    />
                  )
                })}
                <Link href="/avatar-studio" className="block group">
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-bg-surface border border-dashed border-border rounded-neo-lg transition-all group-hover:border-accent group-hover:bg-accent/5 group-hover:border-border-strong">
                    <div className="w-10 h-10 rounded-neo border border-border flex items-center justify-center text-xl text-text-dim group-hover:border-accent group-hover:text-accent transition-colors mb-2">+</div>
                    <span className="font-sans text-[10px] text-text-dim group-hover:text-accent transition-colors">Nouvel avatar</span>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Media Detail Modal ── */}
      {selectedAsset && (
        <DetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAssetId(null)}
          onDelete={() => handleDeleteAsset(selectedAsset.id)}
        />
      )}

      {/* ── Avatar Modal ── */}
      {selectedAvatar && (
        <AvatarModal
          avatar={selectedAvatar}
          index={selectedAvatarIndex}
          portrait={portraits[selectedAvatar.id]}
          sheet={sheets[selectedAvatar.id]}
          onPortraitError={() => handlePortraitError(selectedAvatar.id)}
          onClose={() => setSelectedAvatarId(null)}
          onDelete={() => handleDeleteAvatar(selectedAvatar.id)}
          deleting={deletingAvatarId === selectedAvatar.id}
        />
      )}
    </div>
  )
}
