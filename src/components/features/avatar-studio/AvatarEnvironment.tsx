'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionListEnvironments,
  actionAddEnvironment,
  actionDeleteEnvironment,
  actionGetAssetSignedUrl,
} from '@/lib/actions/avatar-assets'
import { updateAvatar } from '@/lib/actions/avatars'

interface Environment {
  id: string
  name: string
  location_type: string | null
  description: string | null
  reference_photo_url: string | null
}

export default function AvatarEnvironment({
  avatarId,
  onCount,
  continuityMode,
  setContinuityMode,
}: {
  avatarId: string
  onCount?: (n: number) => void
  continuityMode: 'evolutif' | 'verrouille'
  setContinuityMode: (m: 'evolutif' | 'verrouille') => void
}) {
  const toast = useToast()
  const [envs, setEnvs]       = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [thumbs, setThumbs]   = useState<Record<string, string>>({})

  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await actionListEnvironments(avatarId)
        if (!alive) return
        setEnvs(list as Environment[])
        onCount?.(list.length)
      } catch { /* avatar peut ne pas exister encore */ }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId])

  useEffect(() => {
    envs.forEach(async (e) => {
      if (e.reference_photo_url && !thumbs[e.id]) {
        const u = await actionGetAssetSignedUrl(e.reference_photo_url)
        if (u) setThumbs((p) => ({ ...p, [e.id]: u }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envs])

  async function add() {
    if (!name.trim() || adding) return
    setAdding(true)
    try {
      const fd = new FormData()
      fd.append('avatarId', avatarId)
      fd.append('name', name.trim())
      fd.append('locationType', type)
      fd.append('description', desc)
      if (file) fd.append('file', file)
      const e = await actionAddEnvironment(fd)
      setEnvs((p) => { const n = [...p, e as Environment]; onCount?.(n.length); return n })
      setName(''); setType(''); setDesc(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success(`Environnement "${e.name}" ajouté ✓`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur ajout environnement')
    } finally {
      setAdding(false)
    }
  }

  async function del(id: string) {
    const prev = envs
    setEnvs((p) => { const n = p.filter((e) => e.id !== id); onCount?.(n.length); return n })
    try {
      await actionDeleteEnvironment(id)
    } catch (e: any) {
      setEnvs(prev); onCount?.(prev.length)
      toast.error(e.message ?? 'Erreur suppression')
    }
  }

  async function toggleMode(m: 'evolutif' | 'verrouille') {
    const prev = continuityMode
    setContinuityMode(m)
    try {
      await updateAvatar(avatarId, { continuity_mode: m })
    } catch {
      setContinuityMode(prev)
      toast.error('Impossible de changer le mode')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h2 className="font-display font-bold text-[18px] text-text-primary mb-1">Environnements de l'avatar</h2>
          <p className="text-[12.5px] text-text-muted">
            Plusieurs décors où l'avatar peut évoluer — piochés à la génération de contenu.
          </p>
        </div>
        <div className="flex bg-bg-surface border border-border rounded-neo p-0.5 gap-0.5 flex-shrink-0">
          {([['evolutif', 'Évolutif'], ['verrouille', 'Verrouillé']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => toggleMode(mode)}
              className={`font-sans text-[11px] font-bold px-4 py-1.5 rounded-neo border transition-all
                ${continuityMode === mode ? 'border-accent text-accent bg-accent/10' : 'border-transparent text-text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-bg-card border border-border rounded-neo-lg p-4 mb-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="nb-label block mb-1.5">* Nom du lieu</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Café cosy parisien" className="nb-input text-[13px] py-2 px-3 w-full" />
          </div>
          <div>
            <label className="nb-label block mb-1.5">Type <span className="text-text-dim font-normal">(optionnel)</span></label>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Ex: intérieur, extérieur, studio" className="nb-input text-[13px] py-2 px-3 w-full" />
          </div>
        </div>
        <div className="mb-3">
          <label className="nb-label block mb-1.5">Description / Ambiance <span className="text-text-dim font-normal">(optionnel)</span></label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: lumière chaude, plantes, ambiance matinale" className="nb-input text-[13px] py-2 px-3 w-full" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 font-sans text-[11px] font-bold text-text-secondary border border-border rounded-neo px-3 py-1.5 hover:border-border-strong transition-colors"
          >
            {file ? file.name.slice(0, 24) : 'Photo de référence'}
          </button>
          {file && (
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-coral text-xs">× retirer</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={add}
            disabled={!name.trim() || adding}
            className="ml-auto font-sans text-[12px] font-bold text-bg-base bg-accent border border-accent rounded-neo px-4 py-1.5 shadow-neo-sm transition-all disabled:opacity-50"
          >
            {adding ? 'Ajout…' : '+ Ajouter le lieu'}
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="font-sans text-[11px] text-text-dim">Chargement des environnements…</div>
      ) : envs.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-neo-lg">
          <p className="font-sans text-[11px] text-text-dim">Aucun environnement. Ajoutez-en un ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {envs.map((e) => (
            <div key={e.id} className="relative flex flex-col gap-2 p-3 rounded-neo-lg border border-border bg-bg-card group">
              <button
                onClick={() => del(e.id)}
                className="absolute top-2 right-2 w-5 h-5 rounded-neo bg-coral/90 text-bg-base text-[11px] font-bold flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity z-10"
                title="Supprimer"
              >×</button>
              <div className="h-[100px] rounded-neo bg-bg-elevated border border-border flex items-center justify-center overflow-hidden">
                {thumbs[e.id]
                  ? <img src={thumbs[e.id]} alt={e.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl opacity-40 text-text-dim">●</span>}
              </div>
              <div className="text-[12.5px] font-bold text-text-primary leading-tight">{e.name}</div>
              {e.location_type && <span className="font-sans text-[9px] text-purple border border-border-purple/40 px-1.5 py-0.5 rounded-neo self-start">{e.location_type}</span>}
              {e.description && <div className="font-sans text-[9.5px] text-text-dim line-clamp-2">{e.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
