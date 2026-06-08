'use client'

import React from 'react'

export interface Outfit { id: string; label: string; icon: string; colors: string[] }

export const OUTFITS: Outfit[] = [
  { id: 'casual',     label: 'Casual urbain',  icon: '👕', colors: ['#0a0a0f', '#f5f5f5', '#2a2a40'] },
  { id: 'smart',      label: 'Smart casual',   icon: '👔', colors: ['#1a1f0e', '#f0f0e0', '#4a4a5a'] },
  { id: 'sport',      label: 'Sportswear',     icon: '👟', colors: ['#ff3366', '#ffffff', '#111820'] },
  { id: 'formal',     label: 'Formel',         icon: '🕴️', colors: ['#000000', '#ffffff', '#1a1a2e'] },
  { id: 'streetwear', label: 'Streetwear',     icon: '🛹', colors: ['#c8f55a', '#0a0a0f', '#888888'] },
]

interface AvatarWardrobeProps {
  selectedOutfits: Set<string>
  setSelectedOutfits: React.Dispatch<React.SetStateAction<Set<string>>>
}

export default function AvatarWardrobe({ selectedOutfits, setSelectedOutfits }: AvatarWardrobeProps) {
  const toggle = (id: string) =>
    setSelectedOutfits((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-[18px] text-text-primary mb-1">Bibliothèque de tenues</h2>
          <p className="text-[12.5px] text-text-muted">Sélectionnez les styles que cet avatar peut porter.</p>
        </div>
        <button className="nb-btn-secondary text-xs px-3 py-1.5">+ Créer tenue custom</button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {OUTFITS.map((o) => {
          const isSel = selectedOutfits.has(o.id)
          return (
            <div
              key={o.id}
              onClick={() => toggle(o.id)}
              className={`
                flex flex-col items-center gap-3 p-5 rounded-neo-lg border-2 cursor-pointer
                transition-all duration-100
                ${isSel
                  ? 'border-accent bg-accent/5 shadow-neo -translate-x-px -translate-y-px'
                  : 'border-border bg-bg-card hover:border-border-strong'
                }
              `}
            >
              <div className="text-3xl">{o.icon}</div>
              <div className={`text-[13px] font-bold text-center ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                {o.label}
              </div>
              <div className="flex gap-1">
                {o.colors.map((c, i) => (
                  <div key={i} style={{ background: c }} className="w-3 h-3 rounded-full border border-border" />
                ))}
              </div>
              {isSel && (
                <div className="font-mono text-[10px] font-bold text-accent">✓ Activé</div>
              )}
            </div>
          )
        })}

        {/* Upload card */}
        <div className="
          flex flex-col items-center justify-center gap-3 p-5 rounded-neo-lg border-2 border-dashed
          border-border bg-bg-surface cursor-pointer min-h-[160px]
          hover:border-border-strong hover:bg-bg-elevated
          transition-all duration-150
        ">
          <div className="w-10 h-10 rounded-neo-md border-2 border-border flex items-center justify-center text-text-dim text-lg">+</div>
          <div className="text-[12px] font-medium text-text-dim text-center leading-snug">
            Upload un style<br />sur mesure
          </div>
        </div>
      </div>
    </div>
  )
}
