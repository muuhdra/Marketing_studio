'use client'

/**
 * Synchronise le profil de marque (useBrand) avec la marque active en base :
 * - hydrate useBrand depuis le `profile` JSONB de la marque active (au montage / changement de marque) ;
 * - sauvegarde (debounced) toute modification du profil dans `brands.profile`.
 * Monté une seule fois dans le layout dashboard.
 */

import { useEffect, useRef } from 'react'
import { useBrands } from '@/lib/stores/brandsStore'
import { useBrand, toBrandProfile, type BrandProfile } from '@/lib/stores/brandStore'
import { useBrandSave } from '@/lib/stores/brandSaveStore'
import { updateBrand } from '@/lib/actions/brands'

export default function BrandProfileSync() {
  const activeBrandId = useBrands((s) => s.activeBrandId)
  const brands = useBrands((s) => s.brands)
  const hydrate = useBrand((s) => s.hydrate)

  const hydratingRef = useRef(false)
  const activeIdRef = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate depuis la marque active dès qu'elle est connue / change.
  useEffect(() => {
    activeIdRef.current = activeBrandId
    // Cookie lu côté serveur pour scoper toutes les requêtes par marque active.
    if (activeBrandId) {
      document.cookie = `active-brand=${activeBrandId}; path=/; max-age=31536000; samesite=lax`
    }
    const brand = brands.find((b) => b.id === activeBrandId)
    if (!brand) return
    hydratingRef.current = true
    hydrate(brand.profile as Partial<BrandProfile>)
    // Laisse passer le set synchrone d'hydratation avant de réautoriser les sauvegardes.
    queueMicrotask(() => { hydratingRef.current = false })
  }, [activeBrandId, brands, hydrate])

  // Sauvegarde debouncée à chaque changement du profil (hors hydratation).
  useEffect(() => {
    const setStatus = useBrandSave.getState().setStatus
    const unsub = useBrand.subscribe((state) => {
      if (hydratingRef.current) return
      const id = activeIdRef.current
      if (!id) return
      const profile = toBrandProfile(state)
      setStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateBrand(id, {
          profile: profile as unknown as Record<string, unknown>,
          name: profile.name,
          category: profile.category,
        })
          .then(() => setStatus('saved'))
          .catch(() => setStatus('error'))
      }, 700)
    })
    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return null
}
