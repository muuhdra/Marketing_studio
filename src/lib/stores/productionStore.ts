import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Suivi de la production du jour (page Campaigns › Production).
// Compteur par type de contenu, réinitialisé automatiquement chaque jour.

function today(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

interface ProductionState {
  day: string
  produced: Record<string, number>
  /** Nombre déjà produit aujourd'hui pour un type donné (0 si jour périmé). */
  countOf: (id: string) => number
  /** Incrémente le compteur du jour pour un type (réinitialise si le jour a changé). */
  markProduced: (id: string) => void
  /** Remet tous les compteurs à zéro. */
  reset: () => void
}

export const useProduction = create<ProductionState>()(
  persist(
    (set, get) => ({
      day: today(),
      produced: {},
      countOf: (id) => {
        const s = get()
        if (s.day !== today()) return 0
        return s.produced[id] ?? 0
      },
      markProduced: (id) =>
        set((s) => {
          const d = today()
          const base = s.day === d ? s.produced : {}
          return { day: d, produced: { ...base, [id]: (base[id] ?? 0) + 1 } }
        }),
      reset: () => set({ day: today(), produced: {} }),
    }),
    { name: 'production-tracker', storage: createJSONStorage(() => localStorage) },
  ),
)
