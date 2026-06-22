import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Brand {
  id: string
  name: string
  color: string // accent color for the brand icon
}

interface BrandsState {
  brands: Brand[]
  activeBrandId: string | null
  addBrand: (name: string, color?: string) => void
  setActiveBrand: (id: string) => void
  removeBrand: (id: string) => void
}

const DEFAULT_COLOR = '#ea580c'

export const useBrands = create<BrandsState>()(
  persist(
    (set, get) => ({
      brands: [
        { id: 'default', name: 'My Brand', color: DEFAULT_COLOR },
      ],
      activeBrandId: 'default',

      addBrand: (name, color = DEFAULT_COLOR) => {
        const id = crypto.randomUUID()
        set((state) => ({
          brands: [...state.brands, { id, name, color }],
          activeBrandId: id,
        }))
      },

      setActiveBrand: (id) => {
        set({ activeBrandId: id })
      },

      removeBrand: (id) => {
        set((state) => {
          const brands = state.brands.filter((b) => b.id !== id)
          return {
            brands,
            activeBrandId:
              state.activeBrandId === id
                ? (brands[0]?.id ?? null)
                : state.activeBrandId,
          }
        })
      },
    }),
    {
      name: 'studio-brands',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
