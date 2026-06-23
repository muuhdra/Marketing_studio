'use server'

/**
 * Server Actions — Brand Assets (bibliothèque média de la marque), RLS par user.
 * Fichiers dans le bucket `assets` sous {userId}/brand-assets/... (lecture via URL signée).
 */

import { randomUUID } from 'crypto'
import { and, eq, desc } from 'drizzle-orm'
import { requireAuth, getActiveBrandId } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { brand_folders, brand_assets } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS } from '@/lib/supabase/storage'
import { generateImage, type ImageSize } from '@/lib/ai/image'

export type AssetType = 'image' | 'video' | 'audio'

const LIMITS: Record<AssetType, number> = {
  image: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
}

function extFromName(name: string, type: AssetType): string {
  const m = name.match(/\.([a-z0-9]+)$/i)
  if (m) return m[1].toLowerCase()
  return type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png'
}

// ── Dossiers ──
export interface FolderDTO { id: string; name: string; color: string | null }

export async function actionListFolders(): Promise<FolderDTO[]> {
  const user = await requireAuth()
  const brandId = await getActiveBrandId()
  if (!brandId) return []
  const rows = await db.select().from(brand_folders)
    .where(and(eq(brand_folders.user_id, user.id), eq(brand_folders.brand_id, brandId)))
    .orderBy(desc(brand_folders.created_at))
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color }))
}

export async function actionCreateFolder(input: { name: string; color?: string | null }): Promise<FolderDTO> {
  const user = await requireAuth()
  if (!input.name?.trim()) throw new Error('Nom requis')
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(brand_folders).values({ user_id: user.id, brand_id: brandId, name: input.name.trim(), color: input.color ?? null }).returning()
  return { id: row.id, name: row.name, color: row.color }
}

export async function actionDeleteFolder(id: string): Promise<void> {
  const user = await requireAuth()
  await db.delete(brand_folders).where(and(eq(brand_folders.id, id), eq(brand_folders.user_id, user.id)))
}

// ── Assets ──
export interface BrandAssetDTO { id: string; type: AssetType; name: string; url: string | null; folderId: string | null }

export async function actionListBrandAssets(): Promise<BrandAssetDTO[]> {
  const user = await requireAuth()
  const brandId = await getActiveBrandId()
  if (!brandId) return []
  const rows = await db.select().from(brand_assets)
    .where(and(eq(brand_assets.user_id, user.id), eq(brand_assets.brand_id, brandId)))
    .orderBy(desc(brand_assets.created_at))
  const supabase = await createClient()
  const out: BrandAssetDTO[] = []
  for (const r of rows) {
    const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(r.path, 60 * 60)
    out.push({ id: r.id, type: r.type as AssetType, name: r.name, url: data?.signedUrl ?? null, folderId: r.folder_id })
  }
  return out
}

export async function actionUploadBrandAsset(formData: FormData): Promise<BrandAssetDTO> {
  const user = await requireAuth()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as AssetType | null) ?? 'image'
  const folderId = (formData.get('folderId') as string | null) || null
  if (!file || file.size === 0) throw new Error('Aucun fichier fourni')
  if (!['image', 'video', 'audio'].includes(type)) throw new Error('Type invalide')
  if (file.size > LIMITS[type]) throw new Error('Fichier trop lourd')

  const path = ASSET_PATHS.brandAsset(user.id, randomUUID(), extFromName(file.name, type))
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type || undefined, upsert: false })
  if (error) throw error
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(brand_assets).values({ user_id: user.id, brand_id: brandId, folder_id: folderId, type, name: file.name, path }).returning()
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
  return { id: row.id, type: row.type as AssetType, name: row.name, url: data?.signedUrl ?? null, folderId: row.folder_id }
}

// Génère une image (Nano Banana) et l'enregistre comme asset image, persistée dans le bucket.
export async function actionGenerateBrandAsset(input: { prompt: string; aspect?: string; folderId?: string | null }): Promise<BrandAssetDTO> {
  const user = await requireAuth()
  if (!input.prompt?.trim()) throw new Error('Prompt requis')
  const size: ImageSize = input.aspect === '16:9' ? '1792x1024' : input.aspect === '9:16' ? '1024x1792' : '1024x1024'

  const results = await generateImage({ prompt: input.prompt.trim(), model: 'nano-banana', size, n: 1 })
  const url = results.find((r) => r.url)?.url
  if (!url) throw new Error('Aucune image générée')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Téléchargement du rendu impossible')
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png'
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = ASSET_PATHS.brandAsset(user.id, randomUUID(), ext)
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType, upsert: false })
  if (error) throw error
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(brand_assets).values({ user_id: user.id, brand_id: brandId, folder_id: input.folderId ?? null, type: 'image', name: input.prompt.trim().slice(0, 60), path }).returning()
  return { id: row.id, type: 'image', name: row.name, url: (await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)).data?.signedUrl ?? null, folderId: row.folder_id }
}

export async function actionDeleteBrandAsset(id: string): Promise<void> {
  const user = await requireAuth()
  const [row] = await db.select().from(brand_assets).where(and(eq(brand_assets.id, id), eq(brand_assets.user_id, user.id)))
  if (!row) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.ASSETS).remove([row.path]).catch(() => {})
  await db.delete(brand_assets).where(and(eq(brand_assets.id, id), eq(brand_assets.user_id, user.id)))
}
