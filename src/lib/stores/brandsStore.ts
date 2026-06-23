import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BrandDTO } from '@/lib/actions/brands'

// Marques chargées depuis la base (Supabase). Seule la marque active est persistée
// localement (sélection par appareil) ; la liste vient toujours de la DB.
interface BrandsState {
  brands: BrandDTO[]
  activeBrandId: string | null
  setBrands: (brands: BrandDTO[]) => void
  setActiveBrand: (id: string) => void
}

export const useBrands = create<BrandsState>()(
  persist(
    (set) => ({
      brands: [],
      activeBrandId: null,
      setBrands: (brands) =>
        set((state) => ({
          brands,
          activeBrandId:
            state.activeBrandId && brands.some((b) => b.id === state.activeBrandId)
              ? state.activeBrandId
              : (brands[0]?.id ?? null),
        })),
      setActiveBrand: (id) => set({ activeBrandId: id }),
    }),
    {
      name: 'studio-active-brand',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ activeBrandId: s.activeBrandId }),
    },
  ),
)
