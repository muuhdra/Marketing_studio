'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function CloneLabTab() {
  const [sourceFile, setSourceFile] = useState<string | null>(null)
  const [voiceFile, setVoiceFile]   = useState<string | null>(null)
  const [outfits, setOutfits]       = useState<string[]>([])

  return (
    <div className="animate-fade-in flex flex-col gap-8">

      {/* ── Source du Clone ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-bold text-[17px] text-text-primary">Modèle Source</h2>
          <span className="font-mono text-[9px] font-bold text-purple border border-border-purple px-2 py-0.5 rounded-neo">
            MOTEUR CLONE
          </span>
        </div>

        <div
          onClick={() => setSourceFile('video_source_01.mp4')}
          className={`
            text-center cursor-pointer rounded-neo-lg border-2 border-dashed py-14 px-10
            transition-all duration-150
            ${sourceFile
              ? 'border-border-purple bg-purple/5'
              : 'border-border-purple/30 bg-purple/[0.02] hover:bg-purple/5 hover:border-border-purple'
            }
          `}
        >
          {sourceFile ? (
            <>
              <div className="text-5xl mb-3">🎥</div>
              <div className="font-bold text-[14px] text-purple mb-1">{sourceFile}</div>
              <div className="font-mono text-[11px] text-text-dim">Analyse du modèle en attente · Cliquez pour remplacer</div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-neo-lg border-2 border-border-purple bg-purple/10 flex items-center justify-center text-2xl mx-auto mb-5">
                👤
              </div>
              <div className="font-display font-bold text-[15px] text-purple mb-2">Uploader Vidéo ou Photo Source</div>
              <div className="text-[12px] text-text-muted mb-5">MP4, MOV, JPG, PNG — Minimum 10 secondes de vidéo</div>
              <div className="inline-flex items-center gap-2 bg-purple/15 border-2 border-border-purple rounded-neo px-4 py-2 text-purple text-[12px] font-bold">
                📁 Parcourir les fichiers
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Paramètres du Clone ── */}
      <div>
        <h2 className="font-display font-bold text-[17px] text-text-primary mb-5">Paramètres du Clone</h2>

        <div className="grid grid-cols-3 gap-4">

          {/* Voix */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 flex flex-col">
            <div className="w-11 h-11 rounded-neo-md border-2 border-border-teal bg-teal/10 flex items-center justify-center text-xl mb-4">🎙️</div>
            <div className="font-display font-bold text-[13.5px] text-text-primary mb-2">Clonage Vocal</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed flex-1 mb-4">
              Uploadez un extrait audio propre de 30 secondes minimum pour cloner la voix.
            </div>
            {voiceFile ? (
              <div className="flex items-center gap-2 bg-teal/5 border-2 border-border-teal rounded-neo px-3 py-2">
                <span>🎵</span>
                <span className="text-[12px] text-teal font-semibold">{voiceFile}</span>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setVoiceFile('voix_extrait_30s.wav')}>
                + Ajouter l'extrait vocal
              </Button>
            )}
          </div>

          {/* Vêtements */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 flex flex-col">
            <div className="w-11 h-11 rounded-neo-md border-2 border-border-coral bg-coral/10 flex items-center justify-center text-xl mb-4">👕</div>
            <div className="font-display font-bold text-[13.5px] text-text-primary mb-2">Styles Vestimentaires</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed flex-1 mb-4">
              Photos de référence des tenues que le clone devra porter lors des tournages.
            </div>
            {outfits.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outfits.map((o) => (
                  <span key={o} className="font-mono text-[10px] text-coral bg-coral/10 border border-border-coral px-2 py-0.5 rounded-neo">
                    {o}
                  </span>
                ))}
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setOutfits(['tenue_casual.jpg', 'tenue_pro.jpg'])}>
                + Uploader Tenues
              </Button>
            )}
          </div>

          {/* Environnements */}
          <div className="bg-bg-card border-2 border-border rounded-neo-lg p-5 flex flex-col">
            <div className="w-11 h-11 rounded-neo-md border-2 border-accent/30 bg-accent/10 flex items-center justify-center text-xl mb-4">🌆</div>
            <div className="font-display font-bold text-[13.5px] text-text-primary mb-2">Environnements & Décors</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed flex-1 mb-4">
              Choisissez ou décrivez les décors dans lesquels le clone évoluera.
            </div>
            <Button variant="secondary" size="sm">
              + Configurer les décors
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
