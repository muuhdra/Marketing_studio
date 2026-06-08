'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'

const FORMATS   = ['9:16 · Short', '16:9 · Widescreen', '1:1 · Square', '4:5 · Feed']
const DURATIONS = ['15s', '30s', '45s', '60s']

export default function ProductionTab() {
  const [scenario, setScenario]             = useState('')
  const [script, setScript]                 = useState('')
  const [selectedFormat, setSelectedFormat] = useState('9:16 · Short')
  const [selectedDuration, setSelectedDuration] = useState('30s')
  const [isGenerating, setIsGenerating]     = useState(false)

  function generate() {
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 3000)
  }

  return (
    <div className="animate-fade-in flex gap-6 min-h-[600px]">

      {/* ── Panneau gauche ── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-3.5">

        {/* Clone badge */}
        <div className="bg-purple/5 border-2 border-border-purple rounded-neo-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-neo-md border-2 border-border-purple bg-purple/15 flex items-center justify-center text-xl">🧬</div>
          <div>
            <div className="font-mono text-[10px] font-bold text-purple mb-0.5">Clone actif</div>
            <div className="font-display font-bold text-[13px] text-text-primary">Modèle Source v1</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-teal flex-shrink-0" />
        </div>

        <div className="bg-bg-card border-2 border-border rounded-neo-lg p-4 flex-1 flex flex-col gap-4">

          {/* Scénario */}
          <Textarea
            label="Scénario / Action"
            rows={4}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Ex : Le clone entre dans une boutique, regarde la caméra et montre le produit..."
          />

          {/* Script vocal */}
          <Textarea
            label="Script Vocal (TTS)"
            rows={3}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Texte que le clone doit prononcer..."
          />

          {/* Format */}
          <div>
            <p className="nb-label mb-2">Format</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFormat(f)}
                  className={`
                    font-mono text-[10px] font-bold px-2 py-2 rounded-neo border-2 cursor-pointer transition-all
                    ${selectedFormat === f ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}
                  `}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Durée */}
          <div>
            <p className="nb-label mb-2">Durée</p>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`
                    flex-1 font-mono text-[11px] font-bold py-2 rounded-neo border-2 cursor-pointer transition-all
                    ${selectedDuration === d ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}
                  `}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} loading={isGenerating} size="lg" className="mt-auto">
            {isGenerating ? 'Génération en cours...' : '🚀 Générer la Vidéo'}
          </Button>
        </div>
      </div>

      {/* ── Canvas / Preview ── */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Preview canvas */}
        <div className="flex-1 bg-bg-base border-2 border-border rounded-neo-lg relative overflow-hidden flex items-center justify-center min-h-[400px]">
          <div className="absolute inset-0 opacity-50"
            style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(160,154,224,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(200,245,90,0.04) 0%, transparent 60%)' }}
          />

          {isGenerating ? (
            <div className="text-center z-10">
              <div className="w-16 h-16 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-5" />
              <div className="font-display font-bold text-[15px] text-text-primary mb-2">Génération en cours</div>
              <div className="font-mono text-[12px] text-text-muted">{selectedDuration} · {selectedFormat}</div>
            </div>
          ) : (
            <div className="text-center z-10 opacity-30">
              <div className="text-5xl mb-4">🎬</div>
              <div className="font-mono text-[13px] text-text-dim uppercase tracking-widest">
                Configurez le scénario et lancez la génération
              </div>
            </div>
          )}

          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg-base to-transparent">
            <div className="h-1.5 bg-bg-card border border-border rounded-neo overflow-hidden mb-2">
              <div
                className="h-full bg-accent rounded-neo transition-all duration-[3000ms] linear"
                style={{ width: isGenerating ? '40%' : '0%' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-text-dim">00:00</span>
              <span className="font-mono text-[10px] text-text-dim">{selectedDuration}</span>
            </div>
          </div>
        </div>

        {/* Mini timeline */}
        <div className="bg-bg-card border-2 border-border rounded-neo-lg px-5 py-4">
          <p className="nb-label mb-3">Timeline</p>
          <div className="flex gap-2">
            {['Clone', 'Voix', 'Musique', 'SFX'].map((track) => (
              <div key={track} className="flex-1 bg-bg-surface border-2 border-border rounded-neo p-3 text-center">
                <div className="font-mono text-[10px] text-text-dim mb-2">{track}</div>
                <div className="h-1.5 bg-bg-base border border-border rounded-neo" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
