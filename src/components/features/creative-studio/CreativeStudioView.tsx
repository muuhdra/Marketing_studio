'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Input'

const FORMATS = [
  { id: 'ugc',          label: 'UGC Vidéo',      desc: 'Social media video',       color: 'text-accent',  border: 'border-accent',        activeBg: 'bg-accent/5'   },
  { id: 'commercial',   label: 'Commercial',      desc: 'TV Spot / Hyper Motion',   color: 'text-purple',  border: 'border-border-purple',  activeBg: 'bg-purple/5'   },
  { id: 'shooting',     label: 'Shooting Photo',  desc: 'Packshot, Lifestyle',      color: 'text-teal',    border: 'border-border-teal',    activeBg: 'bg-teal/5'     },
  { id: 'illustration', label: 'Illustration',    desc: 'Affiche, poster, visuel',  color: 'text-coral',   border: 'border-border-coral',   activeBg: 'bg-coral/5'    },
  { id: 'mockup',       label: 'App Mockup',      desc: 'Capture UI, device frame', color: 'text-pink',    border: 'border-pink/40',        activeBg: 'bg-pink/5'     },
  { id: 'voix',         label: 'Voix off',        desc: 'Narration, sound effects', color: 'text-amber',   border: 'border-amber/40',       activeBg: 'bg-amber/5'    },
]

const PLATFORMS = ['TikTok', 'Instagram Reels', 'Instagram Feed', 'YouTube Shorts', 'Facebook', 'LinkedIn', 'Pinterest']
const RATIOS    = ['9:16 Vertical', '1:1 Carré', '16:9 Horizontal', '4:5 Portrait', '2:3 Portrait']

const AGENTS = [
  { name: 'Scénariste',       formats: ['ugc', 'commercial'] },
  { name: 'DA & Prompt Eng.', formats: ['ugc', 'commercial', 'shooting', 'illustration', 'mockup'] },
  { name: 'Monteur Rythmique',formats: ['ugc', 'commercial'] },
  { name: 'Analyste Qualité', formats: ['ugc', 'commercial', 'shooting', 'illustration'] },
]

export default function CreativeStudioView() {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [prompt, setPrompt]   = useState('')
  const [generating, setGenerating] = useState(false)

  const fmt = FORMATS.find(f => f.id === selectedFormat)
  const canGenerate = !!selectedFormat && !!prompt.trim()
  const activeAgents = selectedFormat
    ? AGENTS.filter(a => a.formats.includes(selectedFormat))
    : []

  function generate() {
    if (!canGenerate) return
    setGenerating(true)
    setTimeout(() => setGenerating(false), 3000)
  }

  return (
    <div className="animate-fade-in">

      {/* ── Header ── */}
      <div className="mb-7">
        <p className="nb-label mb-2">Génération libre</p>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
          Creative Studio
        </h1>
        <p className="text-[12.5px] text-text-muted">
          Générez n'importe quel format de contenu, sans lien avec une campagne
        </p>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Colonne gauche ── */}
        <div>

          {/* Sélection format */}
          <div className="mb-6">
            <p className="nb-label mb-3">Type de contenu</p>
            <div className="grid grid-cols-3 gap-2.5">
              {FORMATS.map((f) => {
                const isActive = selectedFormat === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormat(isActive ? null : f.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-neo-lg border-2 text-left
                      transition-all duration-100 cursor-pointer
                      ${isActive
                        ? `${f.border} ${f.activeBg} -translate-x-px -translate-y-px shadow-[2px_2px_0px_currentColor]`
                        : 'border-border bg-bg-card hover:border-border-strong hover:bg-bg-elevated'
                      }
                    `}
                  >
                    <div className={`w-8 h-8 rounded-neo border-2 flex-shrink-0 flex items-center justify-center ${isActive ? f.border : 'border-border'}`}>
                      <div className={`w-2.5 h-2.5 rounded-neo ${isActive ? f.color.replace('text-', 'bg-') : 'bg-text-dim'}`} />
                    </div>
                    <div>
                      <div className={`text-[12.5px] font-bold mb-0.5 ${isActive ? f.color : 'text-text-primary'}`}>
                        {f.label}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted">{f.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Prompt */}
          <div className="mb-5">
            <Textarea
              label="Description / Brief créatif"
              rows={5}
              placeholder="Décrivez le contenu que vous souhaitez générer. Plus vous êtes précis, meilleur sera le résultat..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Params sortie */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="nb-label block mb-1.5">Plateforme cible</label>
              <select className="nb-input text-[13px] py-2.5 px-3.5">
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="nb-label block mb-1.5">Ratio / Format</label>
              <select className="nb-input text-[13px] py-2.5 px-3.5">
                {RATIOS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Bouton générer */}
          <Button
            onClick={generate}
            loading={generating}
            disabled={!canGenerate}
            size="lg"
          >
            {generating ? 'Génération en cours...' : '✦ Générer le contenu'}
          </Button>

          {/* Preview generating */}
          {generating && (
            <div className="mt-5 bg-bg-card border-2 border-accent rounded-neo-lg p-5 text-center shadow-neo animate-fade-in">
              <div className="w-9 h-9 rounded-neo-md border-2 border-accent flex items-center justify-center mx-auto mb-4">
                <div className="w-3 h-3 rounded-neo bg-accent animate-pulse-dot" />
              </div>
              <p className="text-[14px] text-text-muted mb-4">Les agents IA travaillent sur votre contenu...</p>
              <div className="h-2 bg-bg-base border border-border rounded-neo overflow-hidden max-w-[300px] mx-auto">
                <div className="h-full w-[60%] bg-accent rounded-neo" />
              </div>
            </div>
          )}
        </div>

        {/* ── Panneau droit ── */}
        <div className="sticky top-0 flex flex-col gap-3.5">

          {/* Agents */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Agents impliqués</p>
            {selectedFormat ? (
              <div className="flex flex-col gap-2">
                {AGENTS.map((ag) => {
                  const active = ag.formats.includes(selectedFormat)
                  return (
                    <div key={ag.name} className={`
                      flex items-center gap-2 px-3 py-2 rounded-neo border-2 transition-colors
                      ${active
                        ? 'bg-accent/5 border-accent'
                        : 'bg-bg-surface border-border'
                      }
                    `}>
                      <span className={`text-[12px] font-medium ${active ? 'text-accent' : 'text-text-muted'}`}>
                        {ag.name}
                      </span>
                      <div className={`ml-auto w-2 h-2 rounded-neo flex-shrink-0 ${active ? 'bg-accent' : 'bg-border'}`} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="font-mono text-[11px] text-text-dim">
                Sélectionnez un format pour voir les agents
              </p>
            )}
          </div>

          {/* Coût estimé */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-2">Coût estimé</p>
            <div className="font-display font-bold text-[22px] text-text-primary">
              {selectedFormat ? '~0.40' : <span className="text-text-dim">—</span>}
              {selectedFormat && <span className="text-[13px] font-normal text-text-muted ml-1">USD</span>}
            </div>
            <p className="font-mono text-[10px] text-text-dim mt-1">Estimation pour 1 génération</p>
          </div>

          {/* Historique */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4">
            <p className="nb-label mb-3">Historique récent</p>
            <div className="flex flex-col">
              {[
                { fmt: 'UGC Social',  date: 'Il y a 2h' },
                { fmt: 'Packshot',    date: 'Hier 14h'  },
                { fmt: 'TV Spot',     date: 'Il y a 2j' },
              ].map((item, i) => (
                <div key={item.fmt} className={`flex items-center justify-between py-2 ${i < 2 ? 'border-b border-border' : ''}`}>
                  <span className="text-[12px] text-text-secondary">{item.fmt}</span>
                  <span className="font-mono text-[10px] text-text-dim">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
