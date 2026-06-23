'use client'

import { useToastStore, type Toast, type ToastVariant } from '@/lib/stores/toastStore'
import { Check, X, AlertTriangle, Info, type LucideIcon } from 'lucide-react'

// ─── Config visuelle par variant ─────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { Icon: LucideIcon; iconBg: string; bar: string }> = {
  success: { Icon: Check,         iconBg: 'bg-emerald-500', bar: 'bg-emerald-500' },
  error:   { Icon: X,             iconBg: 'bg-coral',       bar: 'bg-coral'       },
  warning: { Icon: AlertTriangle, iconBg: 'bg-amber',       bar: 'bg-amber'       },
  info:    { Icon: Info,          iconBg: 'bg-accent',      bar: 'bg-accent'      },
}

// ─── Toast item ───────────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove)
  const { Icon, iconBg, bar } = VARIANT_CONFIG[toast.variant]

  return (
    <div className="relative flex items-center gap-3 w-full overflow-hidden rounded-[14px] border border-border bg-bg-card px-3.5 py-3 shadow-neo-lg animate-slide-up">
      {/* Pastille d'icône */}
      <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white ${iconBg}`}>
        <Icon size={15} strokeWidth={2.8} />
      </span>

      {/* Message */}
      <p className="flex-1 text-[13px] font-semibold leading-snug text-text-primary">
        {toast.message}
      </p>

      {/* Close */}
      <button
        onClick={() => remove(toast.id)}
        aria-label="Fermer"
        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-fg/[0.08] hover:text-text-primary"
      >
        <X size={14} strokeWidth={2.4} />
      </button>

      {/* Barre de progression (animation 4s) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fg/[0.06]">
        <div className={`h-full origin-left ${bar}`} style={{ animation: 'toast-shrink 4s linear forwards' }} />
      </div>
    </div>
  )
}

// ─── Toaster (portal fixe en bas à droite) ────────────────────────────────────

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex w-[340px] flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
