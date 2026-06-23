'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from './auth'
import { BUCKETS } from '@/lib/supabase/storage'
import { generateImage } from '@/lib/ai/image'
import { appearanceCategories, buildAppearancePrompt, type AppearanceGender } from '@/lib/avatar/appearance-options'

/**
 * Génère (et upload) les illustrations d'une catégorie d'apparence (Coiffure, etc.).
 * Modèle Black / afro-américain, décliné homme + femme. Idempotent (upsert).
 * Stockage : bucket public `templates` → appearance/{category}/{gender}/{slug}.png
 * Upload via service-role (bypass RLS) — ce sont des assets globaux, pas par utilisateur.
 */
export async function actionGenerateAppearanceIllustrations(
  categorySlug: string,
  force = false,
): Promise<{ count: number; failed: number; skipped: number; error?: string }> {
  await requireAuth()
  const cat = appearanceCategories.find((c) => c.slug === categorySlug)
  if (!cat) throw new Error('Catégorie inconnue')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Config Supabase service-role manquante')
  const supabase = createServiceClient(url, serviceKey, { auth: { persistSession: false } })

  const genders: AppearanceGender[] = ['male', 'female']

  // Inventaire des illustrations déjà présentes → on ne régénère pas (sauf force).
  const existing = new Set<string>()
  if (!force) {
    for (const gender of genders) {
      const { data } = await supabase.storage.from(BUCKETS.TEMPLATES).list(`appearance/${cat.slug}/${gender}`)
      data?.forEach((f) => existing.add(`${gender}/${f.name}`))
    }
  }

  let count = 0
  let failed = 0
  let skipped = 0
  let firstError = ''
  const note = (msg: string) => { if (!firstError) firstError = msg; console.error('[appearance-illustrations]', msg) }

  for (const opt of cat.options) {
    if (opt.custom || !opt.slug) continue
    for (const gender of genders) {
      if (existing.has(`${gender}/${opt.slug}.png`)) { skipped++; continue }
      try {
        const prompt = buildAppearancePrompt(cat, opt, gender)
        const [img] = await generateImage({ prompt, model: 'nano-banana', size: '1024x1024', quality: 'hd' })
        if (!img?.url) { failed++; note(`${opt.slug}/${gender}: génération sans URL`); continue }
        const res = await fetch(img.url)
        if (!res.ok) { failed++; note(`${opt.slug}/${gender}: download ${res.status}`); continue }
        const buffer = Buffer.from(await res.arrayBuffer())
        const path = `appearance/${cat.slug}/${gender}/${opt.slug}.png`
        const { error } = await supabase.storage.from(BUCKETS.TEMPLATES).upload(path, buffer, {
          contentType: 'image/png',
          upsert: true,
        })
        if (error) { failed++; note(`${opt.slug}/${gender}: upload ${error.message}`); continue }
        count++
      } catch (e) {
        failed++
        note(`${opt.slug}/${gender}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return { count, failed, skipped, error: firstError || undefined }
}
