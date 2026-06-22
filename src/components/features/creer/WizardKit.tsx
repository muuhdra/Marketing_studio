'use client'

import { ArrowLeft, ChevronDown, Download, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { fileToDataUrl } from '@/lib/media/videoFrames'

// Upload d'un fichier image → URL temporaire exploitable par l'IA (null si échec/format invalide).
export async function uploadImageFile(file: File | undefined | null): Promise<string | null> {
  if (!file || !file.type.startsWith('image/')) return null
  try {
    const dataUrl = await fileToDataUrl(file)
    const { url } = await actionUploadTempImage(dataUrl)
    return url || null
  } catch {
    return null
  }
}

// Tailles supportées par Nano Banana.
export type NanoSize = '1024x1024' | '1792x1024' | '1024x1792'

// Mappe un ratio « w:h » vers la taille Nano Banana la plus proche (carré / paysage / portrait).
export function ratioToSize(ratio: string): NanoSize {
  const [w, h] = ratio.split(':').map(Number)
  if (!w || !h || w === h) return '1024x1024'
  return w > h ? '1792x1024' : '1024x1792'
}

// Briques partagées des wizards « Créer une image » (statics / carousel / product / fashion).

export type AnimationPhase = 'idle' | 'exit' | 'enter'

// Transition « scroll » : l'étape sortante glisse vers le haut, la suivante remonte depuis le bas.
export function AnimatedStep({ phase, children }: { phase: AnimationPhase; children: ReactNode }) {
  const stateClass = phase === 'exit'
    ? 'opacity-0 -translate-y-16 duration-200'
    : phase === 'enter'
      ? 'opacity-0 translate-y-20 duration-[450ms]'
      : 'opacity-100 translate-y-0 duration-[450ms]'

  return (
    <div className={`w-full flex justify-center transition-all ease-out will-change-transform ${stateClass}`}>
      {children}
    </div>
  )
}

// Transition « pile glissante » — calquée sur le flux « + Create Actor » (Characters).
// Toutes les étapes sont montées simultanément ; le conteneur se translate verticalement
// de `translateY(-index * 100%)` pour faire défiler une étape à la fois.
export function StepSlider({ index, children, slideClassName = 'flex items-center justify-center px-8 py-10' }: { index: number; children: ReactNode[]; slideClassName?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full w-full flex-col transition-transform duration-500 ease-in-out will-change-transform"
        style={{ transform: `translateY(-${index * 100}%)` }}
      >
        {children.map((node, i) => (
          <div key={i} className={`h-full w-full shrink-0 overflow-y-auto ${slideClassName}`}>
            {node}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ContinueButton({ disabled, onClick, children = 'Continuer' }: { disabled?: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-9 rounded-[8px] bg-accent px-5 text-[14px] font-extrabold text-white inline-flex items-center gap-3 shadow-sm hover:brightness-105 transition disabled:opacity-55 disabled:cursor-not-allowed"
    >
      {children} <ChevronDown size={16} />
    </button>
  )
}

// Bouton « Retour » partagé — à utiliser sur toutes les étapes sauf la première.
export function BackButton({ onClick, children = 'Retour' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-9 rounded-[8px] bg-fg/[0.08] px-4 text-[14px] font-extrabold text-text-primary inline-flex items-center gap-2 hover:bg-fg/[0.12] transition"
    >
      <ChevronDown size={16} className="rotate-90" /> {children}
    </button>
  )
}

// Wrapper de page : annule le padding du <main> du dashboard, occupe toute la zone visible,
// FIXE (pas de scroll de page). Source de vérité — utilisé par toutes les pages à section principale.
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      {children}
    </div>
  )
}

// Panneau principal arrondi unifié (header + contenu à l'intérieur). Le contenu interne scrolle, pas la page.
export function MainPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm ${className}`}>
      {children}
    </section>
  )
}

// En-tête intégré au panneau principal.
export function WizardHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex h-[56px] flex-shrink-0 items-center gap-5 border-b border-border px-5">
      <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary hover:bg-fg/[0.04] transition-colors" aria-label="Retour">
        <ArrowLeft size={20} />
      </button>
      <span className="w-px h-7 bg-border" />
      <h1 className="font-display text-[20px] font-extrabold tracking-tight text-text-primary">{title}</h1>
    </header>
  )
}

// [DEV] Navigation libre entre toutes les étapes (à retirer en prod).
export function DevStepNav<T extends string>({ steps, active, onJump }: { steps: { id: T; label: string }[]; active: T; onJump: (id: T) => void }) {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 rounded-full border border-border bg-bg-card/95 backdrop-blur px-2 py-1.5 shadow-neo-lg">
      <span className="px-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">Dev</span>
      {steps.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onJump(id)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${active === id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-fg/[0.06]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Overlay de résultats (grille + lightbox) — pour les pages sans panneau d'aperçu (statics, carrousel).
export function ResultsOverlay({ open, generating, results, title, onClose }: { open: boolean; generating: boolean; results: { url: string }[]; title: string; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-[860px] max-h-[85vh] overflow-y-auto rounded-[16px] bg-bg-card shadow-neo-lg p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-extrabold text-text-primary">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-fg/[0.04] hover:text-text-primary transition-colors" aria-label="Fermer"><X size={20} /></button>
        </div>
        {generating ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-text-secondary">
            <span className="w-9 h-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-[14px] font-semibold">Génération en cours…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-text-secondary">Aucun résultat pour le moment</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((result, index) => (
              <div key={`${result.url}-${index}`} className="group relative aspect-square rounded-[12px] overflow-hidden border border-border bg-bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.url} alt="" className="absolute inset-0 h-full w-full object-cover cursor-zoom-in" onClick={() => setLightbox(result.url)} />
                <a href={result.url} target="_blank" rel="noreferrer" download className="absolute top-2 right-2 w-8 h-8 rounded-full bg-bg-card/90 backdrop-blur flex items-center justify-center text-text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Télécharger"><Download size={15} /></a>
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[1300] bg-black/90 flex items-center justify-center p-8" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain rounded-[10px]" />
        </div>
      )}
    </div>
  )
}

// Aperçu proportionnel d'un ratio (carré témoin) pour les sélecteurs de dimensions.
export function ratioStyle(ratio: string): { width: number; height: number } {
  const [w, h] = ratio.split(':').map(Number)
  if (!w || !h) return { width: 40, height: 40 }
  const max = 40
  if (w >= h) return { width: max, height: Math.max(14, Math.round((max * h) / w)) }
  return { width: Math.max(14, Math.round((max * w) / h)), height: max }
}
