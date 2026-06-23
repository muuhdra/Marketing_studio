'use client'

/**
 * Sélecteur d'assets de marque (Brand → Assets) réutilisable dans les outils de création.
 * Optionnel : permet de choisir un visuel/vidéo/audio déjà uploadé comme référence.
 */

import { useEffect, useState } from 'react'
import { Check, X, Music, Video as VideoIcon } from 'lucide-react'
import { actionListBrandAssets, type BrandAssetDTO, type AssetType } from '@/lib/actions/brand-assets'

export function AssetPickerModal({
  open,
  onClose,
  onPick,
  types = ['image'],
  selectedUrls = [],
  closeOnPick = false,
  title = 'Mes Assets',
}: {
  open: boolean
  onClose: () => void
  onPick: (url: string, type: AssetType) => void
  types?: AssetType[]
  selectedUrls?: string[]
  closeOnPick?: boolean
  title?: string
}) {
  const [assets, setAssets] = useState<BrandAssetDTO[]>([])
  useEffect(() => {
    if (!open) return
    actionListBrandAssets()
      .then((a) => setAssets(a.filter((x) => x.url && types.includes(x.type))))
      .catch(() => setAssets([]))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 p-6 animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-neo-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition hover:bg-fg/[0.08] hover:text-text-primary"><X size={16} strokeWidth={2.3} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {assets.length === 0 ? (
            <p className="py-12 text-center text-[13px] font-medium text-text-secondary">Aucun asset disponible. Ajoute-en dans Brand → Assets.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map((a) => {
                const sel = a.url ? selectedUrls.includes(a.url) : false
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { if (a.url) { onPick(a.url, a.type); if (closeOnPick) onClose() } }}
                    className={`group relative aspect-square overflow-hidden rounded-[10px] border-2 bg-fg/[0.04] transition-all ${sel ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-accent/50'}`}
                  >
                    {a.type === 'image' && a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                    ) : a.type === 'video' && a.url ? (
                      <video src={a.url} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-text-faint">{a.type === 'audio' ? <Music size={26} /> : <VideoIcon size={26} />}</span>
                    )}
                    {sel && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white"><Check size={12} strokeWidth={3} /></span>}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-[9px] font-bold text-white">{a.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
