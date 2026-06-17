'use client'

import { useToastStore, type Toast, type ToastVariant } from '@/lib/stores/toastStore'

// ─── Config visuelle par variant ─────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; border: string; bg: string; text: string; bar: string }> = {
  success: { icon: '✓', border: 'border-border-teal',   bg: 'bg-teal/10',   text: 'text-teal',   bar: 'bg-teal'   },
  error:   { icon: '✕', border: 'border-border-coral',  bg: 'bg-coral/10',  text: 'text-coral',  bar: 'bg-coral'  },
  warning: { icon: '⚠', border: 'border-amber/40',      bg: 'bg-amber/10',  text: 'text-amber',  bar: 'bg-amber'  },
  info:    { icon: '', border: 'border-accent',         bg: 'bg-accent/10', text: 'text-accent', bar: 'bg-accent' },
}

// ─── Toast item ───────────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove)
  const cfg    = VARIANT_CONFIG[toast.variant]

  return (
    <div className={`
      relative flex items-start gap-3 w-full
      bg-bg-card border ${cfg.border} ${cfg.bg}
      rounded-neo-lg px-4 py-3 shadow-neo
      animate-slide-up overflow-hidden
    `}>
      {/* Icône */}
      <div className={`
        w-5 h-5 rounded-neo border ${cfg.border} flex-shrink-0
        flex items-center justify-center
        font-sans text-[10px] font-bold ${cfg.text}
        mt-0.5
      `}>
        {cfg.icon}
      </div>

      {/* Message */}
      <p className={`flex-1 text-[13px] font-medium ${cfg.text} leading-snug pt-0.5`}>
        {toast.message}
      </p>

      {/* Close */}
      <button
        onClick={() => remove(toast.id)}
        className={`flex-shrink-0 font-sans text-[14px] ${cfg.text} opacity-60 hover:opacity-100 transition-opacity mt-0.5`}
      >
        ×
      </button>

      {/* Barre de progression (animation 4s) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
        <div
          className={`h-full ${cfg.bar} origin-left`}
          style={{ animation: 'toast-shrink 4s linear forwards' }}
        />
      </div>
    </div>
  )
}

// ─── Toaster (portal fixe en bas à droite) ────────────────────────────────────

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 w-[360px] pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
