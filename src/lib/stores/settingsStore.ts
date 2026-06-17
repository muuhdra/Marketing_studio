import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Préférences du studio — persistées en localStorage.
// studioName pilote le branding de la sidebar.

export type Theme = 'dark' | 'light'

interface SettingsState {
  studioName: string
  locale:     string
  theme:      Theme
  setSettings: (data: Partial<Pick<SettingsState, 'studioName' | 'locale' | 'theme'>>) => void
}

export const DEFAULT_STUDIO_NAME = 'Studio UGC IA'
export const DEFAULT_THEME: Theme = 'dark'

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      studioName: DEFAULT_STUDIO_NAME,
      locale:     'fr-FR',
      theme:      DEFAULT_THEME,
      setSettings: (data) => set(data),
    }),
    {
      name:    'studio-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
