'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/lib/stores/toastStore'
import {
  actionListOutfits,
  actionAddOutfit,
  actionDeleteOutfit,
  actionGetAssetSignedUrl,
} from '@/lib/actions/avatar-assets'

const STYLE_TYPES = ['casual', 'smart', 'sport', 'formal', 'streetwear', 'custom'] as const

interface Outfit {
  id: string
  name: string
  style_type: string
  description: string | null
  reference_photo_url: string | null
}

export default function AvatarWardrobe({
  avatarId,
  onCount,
}: {
  avatarId: string
  onCount?: (n: number) => void
}) {
  const toast = useToast()
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [thumbs, setThumbs]   = useState<Record<string, string>>({})

  // Formulaire d'ajout
  const [name, setName]       = useState('')
  const [style, setStyle]     = useState<string>('casual')
  const [desc, setDesc]       = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Chargement initial
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await actionListOutfits(avatarId)
        if (!alive) return
        setOutfits(list as Outfit[])
        onCount?.(list.length)
      } catch { /* avatar peut ne pas exister encore */ }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId])

  // Résout les URLs signées des références
  useEffect(() => {
    outfits.forEach(async (o) => {
      if (o.reference_photo_url && !thumbs[o.id]) {
        const u = await actionGetAssetSignedUrl(o.reference_photo_url)
        if (u) setThumbs((p) => ({ ...p, [o.id]: u }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfits])

  async function add() {
    if (!name.trim() || adding) return
    setAdding(true)
    try {
      const fd = new FormData()
      fd.append('avatarId', avatarId)
      fd.append('name', name.trim())
      fd.append('styleType', style)
      fd.append('description', desc)
      if (file) fd.append('file', file)
      const o = await actionAddOutfit(fd)
      setOutfits((p) => { const n = [...p, o as Outfit]; onCount?.(n.length); return n })
      setName(''); setDesc(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success(`Tenue "${o.name}" ajoutée ✓`)
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur ajout tenue')
    } finally {
      setAdding(false)
    }
  }

  async function del(id: string) {
    const prev = outfits
    setOutfits((p) => { const n = p.filter((o) => o.id !== id); onCount?.(n.length); return n })
    try {
      await actionDeleteOutfit(id)
    } catch (e: any) {
      setOutfits(prev); onCount?.(prev.length)   // rollback
      toast.error(e.message ?? 'Erreur suppression')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="font-display font-bold text-[18px] text-text-primary mb-1">Garde-robe de l'avatar</h2>
        <p className="text-[12.5px] text-text-muted">
          Ajoutez plusieurs tenues — le système y piochera lors de la génération pour que l'avatar ne soit pas statique.
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-bg-card border border-border rounded-neo-lg p-4 mb-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="nb-label block mb-1.5">* Nom de la tenue</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Look streetwear pastel"
              className="nb-input text-[13px] py-2 px-3 w-full"
            />
          </div>
          <div>
            <label className="nb-label block mb-1.5">Style</label>
            <div className="flex gap-1.5 flex-wrap">
              {STYLE_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`font-sans text-[10px] font-bold px-2 py-1 rounded-neo border transition-all
                    ${style === s ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-3">
          <label className="nb-label block mb-1.5">Description <span className="text-text-dim font-normal">(optionnel)</span></label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: veste oversize beige, jean clair, sneakers blanches"
            className="nb-input text-[13px] py-2 px-3 w-full"
          />
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={add}
            disabled={!name.trim() || adding}
            className="ml-auto font-sans text-[12px] font-bold text-bg-base bg-accent border border-accent rounded-neo px-4 py-1.5 shadow-neo-sm transition-all disabled:opacity-50"
          >
            {adding ? 'Ajout…' : '+ Ajouter la tenue'}
          </button>
        </div>
      </div>

      {/* Liste des tenues */}
      {loading ? (
        <div className="font-sans text-[11px] text-text-dim">Chargement de la garde-robe…</div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-neo-lg">
          <p className="font-sans text-[11px] text-text-dim">Aucune tenue. Ajoutez-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {outfits.map((o) => (
            <div key={o.id} className="relative flex flex-col gap-2 p-3 rounded-neo-lg border border-border bg-bg-card group">
              <button
                onClick={() => del(o.id)}
                className="absolute top-2 right-2 w-5 h-5 rounded-neo bg-coral/90 text-bg-base text-[11px] font-bold flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity z-10"
                title="Supprimer"
              >×</button>
              <div className="h-[110px] rounded-neo bg-bg-elevated border border-border flex items-center justify-center overflow-hidden">
                {thumbs[o.id]
                  ? <img src={thumbs[o.id]} alt={o.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl opacity-40 text-text-dim">●</span>}
              </div>
              <div className="text-[12.5px] font-bold text-text-primary leading-tight">{o.name}</div>
              <span className="font-sans text-[9px] text-accent border border-accent/30 px-1.5 py-0.5 rounded-neo self-start">{o.style_type}</span>
              {o.description && <div className="font-sans text-[9.5px] text-text-dim line-clamp-2">{o.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
