'use server'

/**
 * Server Actions — Templates publicitaires de la marque, RLS par user.
 * Images dans le bucket `assets` sous {userId}/brand-templates/... (lecture via URL signée).
 */

import { randomUUID } from 'crypto'
import { and, eq, desc, inArray } from 'drizzle-orm'
import { requireAuth, getActiveBrandId } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { brand_templates } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS } from '@/lib/supabase/storage'
import { generateImage, type ImageSize } from '@/lib/ai/image'

const MAX_IMG = 20 * 1024 * 1024

function extFromType(type: string): string {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  return 'png'
}

function aspectToSize(aspect: string): ImageSize {
  if (aspect === '16:9') return '1792x1024'
  if (aspect === '9:16') return '1024x1792'
  return '1024x1024'
}

export interface BrandTemplateDTO { id: string; name: string; url: string | null; prompt: string | null; active: boolean }

async function toDTO(row: { id: string; name: string; path: string; prompt: string | null; active?: boolean }): Promise<BrandTemplateDTO> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(row.path, 60 * 60)
  return { id: row.id, name: row.name, url: data?.signedUrl ?? null, prompt: row.prompt, active: row.active ?? true }
}

export async function actionListBrandTemplates(): Promise<BrandTemplateDTO[]> {
  const user = await requireAuth()
  const brandId = await getActiveBrandId()
  if (!brandId) return []
  const rows = await db.select().from(brand_templates)
    .where(and(eq(brand_templates.user_id, user.id), eq(brand_templates.brand_id, brandId)))
    .orderBy(desc(brand_templates.created_at))
  return Promise.all(rows.map((r) => toDTO(r)))
}

export async function actionUploadBrandTemplate(formData: FormData): Promise<BrandTemplateDTO> {
  const user = await requireAuth()
  const file = formData.get('file') as File | null
  const name = ((formData.get('name') as string | null) ?? '').trim()
  if (!file || file.size === 0) throw new Error('Aucune image fournie')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > MAX_IMG) throw new Error('Image trop lourde (max 20 MB)')

  const path = ASSET_PATHS.brandTemplate(user.id, randomUUID(), extFromType(file.type))
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) throw error
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(brand_templates).values({ user_id: user.id, brand_id: brandId, name: name || file.name, path }).returning()
  return toDTO(row)
}

export async function actionGenerateBrandTemplate(input: { prompt: string; aspect?: string }): Promise<BrandTemplateDTO> {
  const user = await requireAuth()
  if (!input.prompt?.trim()) throw new Error('Prompt requis')

  const results = await generateImage({ prompt: input.prompt.trim(), model: 'nano-banana', size: aspectToSize(input.aspect ?? '1:1'), n: 1 })
  const url = results.find((r) => r.url)?.url
  if (!url) throw new Error('Aucune image générée')

  // Persiste l'image générée dans le bucket assets (l'URL fournisseur est temporaire).
  const res = await fetch(url)
  if (!res.ok) throw new Error('Téléchargement du rendu impossible')
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = ASSET_PATHS.brandTemplate(user.id, randomUUID(), extFromType(contentType))
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType, upsert: false })
  if (error) throw error
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(brand_templates).values({ user_id: user.id, brand_id: brandId, name: input.prompt.trim().slice(0, 60), prompt: input.prompt.trim(), path }).returning()
  return toDTO(row)
}

export async function actionDeleteBrandTemplate(id: string): Promise<void> {
  const user = await requireAuth()
  const [row] = await db.select().from(brand_templates).where(and(eq(brand_templates.id, id), eq(brand_templates.user_id, user.id)))
  if (!row) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.ASSETS).remove([row.path]).catch(() => {})
  await db.delete(brand_templates).where(and(eq(brand_templates.id, id), eq(brand_templates.user_id, user.id)))
}

/**
 * Définit l'ensemble des templates « actifs » de la marque : ceux dont l'id est dans `activeIds`
 * passent à active=true, tous les autres (de l'utilisateur) à active=false.
 */
export async function actionSetActiveBrandTemplates(activeIds: string[]): Promise<void> {
  const user = await requireAuth()
  const brandId = await getActiveBrandId()
  if (!brandId) return
  // Désactive les templates de CETTE marque, puis active la sélection.
  await db.update(brand_templates).set({ active: false }).where(and(eq(brand_templates.user_id, user.id), eq(brand_templates.brand_id, brandId)))
  if (activeIds.length > 0) {
    await db.update(brand_templates).set({ active: true }).where(and(eq(brand_templates.user_id, user.id), inArray(brand_templates.id, activeIds)))
  }
}
