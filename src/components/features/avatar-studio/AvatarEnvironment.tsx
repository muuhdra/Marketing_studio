'use client'

import React from 'react'
import Button from '@/components/ui/Button'

export interface Location { id: string; label: string; vibe: string; time: string }

export const LOCATIONS: Location[] = [
  { id: 'ext-urban', label: 'Extérieur urbain', vibe: 'Street, Dynamique',  time: 'Jour'           },
  { id: 'home',      label: 'Intérieur maison', vibe: 'Cosy, Intime',       time: 'Matin'          },
  { id: 'office',    label: 'Bureau / Café',    vibe: 'Pro, Productif',     time: 'Jour'           },
  { id: 'studio',    label: 'Studio fond uni',  vibe: 'Clean, Focus',       time: 'Lumière Studio' },
  { id: 'nature',    label: 'Nature / Parc',    vibe: 'Frais, Naturel',     time: 'Golden Hour'    },
]

interface AvatarEnvironmentProps {
  selectedLocations: Set<string>
  setSelectedLocations: React.Dispatch<React.SetStateAction<Set<string>>>
  envMode: 'evolving' | 'locked'
  setEnvMode: React.Dispatch<React.SetStateAction<'evolving' | 'locked'>>
}

export default function AvatarEnvironment({
  selectedLocations, setSelectedLocations, envMode, setEnvMode
}: AvatarEnvironmentProps) {

  const toggle = (id: string) =>
    setSelectedLocations((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-[18px] text-text-primary mb-1">Contextes & Environnements</h2>
          <p className="text-[12.5px] text-text-muted">Définissez où cet avatar peut évoluer.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-bg-surface border-2 border-border rounded-neo p-0.5 gap-0.5">
          {(['evolving', 'locked'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setEnvMode(mode)}
              className={`
                font-mono text-[11px] font-bold px-4 py-1.5 rounded-neo border-2
                transition-all duration-100
                ${envMode === mode
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-transparent text-text-muted'
                }
              `}
            >
              {mode === 'evolving' ? 'Évolutif' : 'Verrouillé'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 mb-8">
        {LOCATIONS.map((loc) => {
          const isSel = selectedLocations.has(loc.id)
          return (
            <div
              key={loc.id}
              onClick={() => toggle(loc.id)}
              className={`
                p-4 rounded-neo-lg border-2 cursor-pointer
                transition-all duration-100
                ${isSel
                  ? 'border-accent bg-accent/5 shadow-neo -translate-x-px -translate-y-px'
                  : 'border-border bg-bg-card hover:border-border-strong'
                }
              `}
            >
              <div className={`text-[13px] font-bold mb-2 ${isSel ? 'text-accent' : 'text-text-primary'}`}>
                {loc.label}
              </div>
              <div className="font-mono text-[10.5px] text-text-dim mb-1">
                Atmosphère: {loc.vibe}
              </div>
              <div className="font-mono text-[10.5px] text-text-dim">
                Lumière: {loc.time}
              </div>
              {isSel && (
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="font-mono text-[10px] font-bold text-accent">Inclus</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Upload card */}
        <div className="
          flex flex-col items-center justify-center gap-3 p-4 rounded-neo-lg border-2 border-dashed
          border-border bg-bg-surface cursor-pointer min-h-[130px]
          hover:border-border-strong hover:bg-bg-elevated
          transition-all duration-150
        ">
          <div className="w-10 h-10 rounded-neo-md border-2 border-border flex items-center justify-center text-text-dim text-lg">+</div>
          <div className="text-[12px] font-medium text-text-dim text-center leading-snug">
            Upload un lieu<br />spécifique
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg">Sauvegarder l'Avatar Complet</Button>
      </div>
    </div>
  )
}
