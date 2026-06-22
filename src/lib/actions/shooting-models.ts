'use server'

/**
 * Server Actions — Mannequins « Shooting Mode » générés par IA (onglet Modèles Système).
 * Chaque modèle porte son cadrage (shotType) + couleur de fond (backgroundColor) pour le filtrage.
 * Images dans le bucket `assets` sous {userId}/shooting-models/... (lecture via URL signée). RLS par user.
 */

import { randomUUID } from 'crypto'
import { and, eq, desc } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { shooting_models } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS } from '@/lib/supabase/storage'
import { generateImage } from '@/lib/ai/image'
import { MODEL_NATIONALITIES, MODEL_GENDERS, MODEL_BODY_TYPES, MODEL_POSES, MODEL_TSHIRT_TONES, pickRandom } from '@/lib/fashion/model-traits'

export interface ShootingModelDTO {
  id: string
  shotType: string
  backgroundColor: string
  nationality: string | null
  url: string | null
}

async function toDTO(row: { id: string; shot_type: string; background_color: string; nationality: string | null; path: string }): Promise<ShootingModelDTO> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(row.path, 60 * 60)
  return { id: row.id, shotType: row.shot_type, backgroundColor: row.background_color, nationality: row.nationality, url: data?.signedUrl ?? null }
}

export async function actionListShootingModels(): Promise<ShootingModelDTO[]> {
  const user = await requireAuth()
  const rows = await db.select().from(shooting_models).where(eq(shooting_models.user_id, user.id)).orderBy(desc(shooting_models.created_at))
  return Promise.all(rows.map((r) => toDTO(r)))
}

// Génère un mannequin de mode cadré selon shotType, sur fond backgroundColor, et le persiste.
// Diversité : genre / nationalité / morphologie tirés au hasard (ou imposés via les filtres).
export async function actionGenerateShootingModel(input: {
  shotType: string
  backgroundColor: string
  gender?: string | null
  nationality?: string | null
  bodyType?: string | null
}): Promise<ShootingModelDTO> {
  const user = await requireAuth()
  const shotType = input.shotType?.trim()
  const backgroundColor = input.backgroundColor?.trim()
  if (!shotType) throw new Error('Shot type requis')
  if (!backgroundColor || backgroundColor.toUpperCase() === 'ALL') throw new Error('Choisis une couleur de fond')

  // Résolution des traits : valeur imposée par le filtre, sinon aléatoire (diversité).
  const isAll = (v?: string | null) => !v || v.toUpperCase() === 'ALL'
  const gender = isAll(input.gender) ? pickRandom(MODEL_GENDERS) : input.gender!.trim()
  const bodyType = isAll(input.bodyType) ? pickRandom(MODEL_BODY_TYPES) : input.bodyType!.trim()
  const nationality = isAll(input.nationality)
    ? pickRandom(MODEL_NATIONALITIES).name
    : (MODEL_NATIONALITIES.find((n) => n.name === input.nationality)?.name ?? pickRandom(MODEL_NATIONALITIES).name)

  const framing = shotType.toLowerCase()  // ex. "full body"
  const prompt = [
    `Professional ${gender.toLowerCase()} ${nationality} fashion model for a clean e-commerce catalogue photoshoot, ${bodyType.toLowerCase()} fit physique, natural authentic features, photorealistic, single person.`,
    `Wearing a plain solid-color crew-neck ${pickRandom(MODEL_TSHIRT_TONES)} t-shirt (no print, no logo).`,
    `${pickRandom(MODEL_POSES)}, confident neutral expression.`,
    `Framing: ${framing} shot, centered.`,
    `Clean seamless ${backgroundColor.toLowerCase()} studio background, soft even diffused lighting, subtle shadow.`,
    'Sharp focus, high resolution, magazine e-commerce look, no text, no watermark.',
  ].join(' ')

  // Mannequins en portrait (les cartes de la galerie sont en 3/5).
  const results = await generateImage({ prompt, model: 'nano-banana', size: '1024x1792', n: 1 })
  const url = results.find((r) => r.url)?.url
  if (!url) throw new Error('Aucune image générée')

  // L'URL fournisseur est temporaire → on persiste l'image dans le bucket assets.
  const res = await fetch(url)
  if (!res.ok) throw new Error('Téléchargement du rendu impossible')
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = ASSET_PATHS.shootingModel(user.id, randomUUID(), ext)
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType, upsert: false })
  if (error) throw error

  const [row] = await db.insert(shooting_models).values({
    user_id: user.id, shot_type: shotType, background_color: backgroundColor, nationality, prompt, path,
  }).returning()
  return toDTO(row)
}

export async function actionDeleteShootingModel(id: string): Promise<void> {
  const user = await requireAuth()
  const [row] = await db.select().from(shooting_models).where(and(eq(shooting_models.id, id), eq(shooting_models.user_id, user.id)))
  if (!row) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.ASSETS).remove([row.path]).catch(() => {})
  await db.delete(shooting_models).where(and(eq(shooting_models.id, id), eq(shooting_models.user_id, user.id)))
}
