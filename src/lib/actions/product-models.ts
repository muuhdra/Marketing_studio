'use server'

/**
 * Server Actions — Acteurs & mains « Shooting Produit » (kind = actor | hand), RLS par user.
 * Acteurs filtrés par `category`. Images dans le bucket `assets` sous {userId}/product-models/...
 */

import { randomUUID } from 'crypto'
import { and, eq, desc } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { product_models } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS } from '@/lib/supabase/storage'
import { generateImage } from '@/lib/ai/image'
import { MODEL_NATIONALITIES, MODEL_GENDERS, MODEL_BODY_TYPES, MODEL_SKIN_TONES, pickRandom } from '@/lib/fashion/model-traits'

export interface ProductModelDTO {
  id: string
  kind: 'actor' | 'hand'
  category: string | null
  nationality: string | null
  url: string | null
}

function extFromType(type: string): string {
  if (type.includes('webp')) return 'webp'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  return 'png'
}

async function toDTO(row: { id: string; kind: string; category: string | null; nationality: string | null; path: string }): Promise<ProductModelDTO> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(row.path, 60 * 60)
  return { id: row.id, kind: row.kind as 'actor' | 'hand', category: row.category, nationality: row.nationality, url: data?.signedUrl ?? null }
}

export async function actionListProductModels(): Promise<ProductModelDTO[]> {
  const user = await requireAuth()
  const rows = await db.select().from(product_models).where(eq(product_models.user_id, user.id)).orderBy(desc(product_models.created_at))
  return Promise.all(rows.map((r) => toDTO(r)))
}

async function persistFromUrl(userId: string, url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Téléchargement du rendu impossible')
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = ASSET_PATHS.productModel(userId, randomUUID(), extFromType(contentType))
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType, upsert: false })
  if (error) throw error
  return path
}

// Variété de mains « catalogue » — chaque génération tire genre / carnation / pose / lumière
// au hasard pour obtenir des mains d'hommes ET de femmes, dans le style éditorial des références.
const HAND_GENDERS = [
  "woman's hand, slender fingers, manicured natural nails",
  "woman's hand, elegant fingers, soft skin",
  "man's hand, strong defined fingers, natural nails",
  "man's hand, masculine with subtle veins and knuckles",
]
const HAND_POSES = [
  'open palm facing up, relaxed, ready to hold a product',
  'fingers gently curved in a natural cupping gesture',
  'hand poised and slightly tilted as if about to present an object',
  'relaxed hand reaching forward as if to grasp an item',
  'side view of the hand with fingers softly parted, palm ready',
]
// Décor / ambiance (inspiré des références éditoriales : lin, miroir flou, mur ensoleillé, halo).
const HAND_SCENES = [
  'warm beige linen fabric backdrop with soft folds',
  'sunlit wall casting a crisp hard shadow of the hand',
  'cozy interior with a blurred vintage vanity mirror softly out of focus behind',
  'a softly glowing round light source behind the hand creating a golden halo',
  'warm wooden dresser surface bathed in afternoon light',
  'minimalist cream studio with a subtle warm gradient',
]
// Lumière dramatique / éditoriale.
const HAND_LIGHTS = [
  'warm golden-hour sunlight, directional, long soft shadows',
  'soft window light with gentle falloff and warm amber tones',
  'dramatic single-source light, chiaroscuro mood, deep rich shadows',
  'glowing backlight creating a luminous rim around the fingers',
]
function pick<T>(arr: T[] | readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function buildHandPrompt(gender?: string, skinTone?: string): string {
  const pool = gender === 'Female' ? HAND_GENDERS.filter((h) => h.startsWith('woman'))
    : gender === 'Male' ? HAND_GENDERS.filter((h) => h.startsWith('man'))
    : HAND_GENDERS
  const skin = (skinTone && skinTone.toUpperCase() !== 'ALL') ? skinTone : pick(MODEL_SKIN_TONES)
  return [
    `Editorial close-up photograph of a ${pick(pool)}, ${skin} skin tone,`,
    `${pick(HAND_POSES)}, completely empty hand holding nothing.`,
    `Scene: ${pick(HAND_SCENES)}. Lighting: ${pick(HAND_LIGHTS)}.`,
    'Shot on an 85mm lens, shallow depth of field, soft natural film grain, warm cinematic color grade, fashion editorial mood,',
    'vertical 9:16 framing, photorealistic, ultra-detailed natural skin texture and pores, single hand only, no product, no text, no watermark.',
  ].join(' ')
}

// Variété d'acteurs « catalogue » — portrait éditorial upper-body, mains vides prêtes à
// tenir un produit, dans le style des références (coiffeuse, chambre, lumière de fenêtre, cinéma).
const ACTOR_HAIR = [
  'short bob haircut', 'long straight hair', 'wavy shoulder-length hair',
  'pastel pink hair', 'soft blonde hair', 'dark brown hair', 'short cropped hair',
  'natural voluminous afro', 'tight curly afro hair', 'long box braids', 'cornrows',
  'shoulder-length dreadlocks', 'an afro puff', 'twist-out curls', 'kinky coily hair',
  'curly hair with defined ringlets', 'silk press straight hair',
]
const ACTOR_POSES = [
  'upper body, hands raised near the chest in a natural gesture, ready to hold a product',
  'seated and leaning slightly, one hand gently lifted as if to present an item',
  'looking toward the camera, hands poised to cup a product',
  'three-quarter pose, relaxed hands ready to grasp an object',
  'leaning on a surface, chin resting near one hand, the other hand open and ready',
  'turning over the shoulder toward camera, one hand softly raised',
  'both hands gently cupped together in front, ready to receive a product',
  'profile view, one hand reaching forward as if to take an item',
  'standing relaxed, arms framing the chest, hands open and inviting',
  'soft candid laugh, hands lifted naturally near the collarbone',
]
const ACTOR_SCENES = [
  'cozy bedroom vanity with an illuminated makeup mirror, glowing bulbs softly out of focus',
  'warm bedroom with a soft bedside lamp glow and blurred decor',
  'by a bright window with soft daylight and sheer curtains',
  'minimalist room with a vintage vanity mirror softly out of focus behind',
  'moody styled interior with cinematic ambient lighting',
  'sunlit cafe corner with warm bokeh in the background',
  'plant-filled bright room with soft natural light',
  'neutral beige studio backdrop with a single soft key light',
  'rooftop at golden hour with a softly blurred city skyline',
  'boho interior with warm textiles and macrame, soft afternoon light',
  'modern kitchen with morning light and clean blurred surfaces',
  'pastel-toned studio with gentle gradient backdrop',
]
const ACTOR_LIGHTS = [
  'warm cinematic lighting with a soft amber glow',
  'cool blue window daylight with gentle contrast',
  'dreamy soft pink and warm tones, editorial mood',
  'dramatic side light, shallow depth of field',
  'soft beauty-dish front light, flattering and even',
  'golden-hour backlight with a warm rim around the hair',
  'neon-tinted ambient glow, modern editorial mood',
]
function buildActorPrompt(category: string, gender: string, nationality: string, bodyType: string): string {
  const person = gender === 'Female' ? 'woman' : 'man'
  return [
    `Editorial upper-body portrait of a ${nationality} ${person}, ${bodyType.toLowerCase()} build, ${pick(ACTOR_HAIR)},`,
    `${pick(ACTOR_POSES)}, empty hands holding nothing yet, styled for a ${category.toLowerCase()} product photoshoot.`,
    `Scene: ${pick(ACTOR_SCENES)}. Lighting: ${pick(ACTOR_LIGHTS)}.`,
    'Shot on a 50mm lens, shallow depth of field, soft natural film grain, cinematic color grade, fashion editorial mood,',
    'vertical 9:16 framing, photorealistic, ultra-detailed natural skin texture, single person, no product, no text, no watermark.',
  ].join(' ')
}

// Génère un acteur (catégorie + sexe/nationalité/morphologie) ou une main, puis le persiste.
export async function actionGenerateProductModel(input: {
  kind: 'actor' | 'hand'
  category?: string | null
  gender?: string | null
  nationality?: string | null
  bodyType?: string | null
  skinTone?: string | null
}): Promise<ProductModelDTO> {
  const user = await requireAuth()
  const kind = input.kind
  const category = kind === 'actor' ? (input.category?.trim() || null) : null
  if (kind === 'actor' && !category) throw new Error('Choisis une catégorie')

  // Acteur : sexe / nationalité / morphologie imposés par les filtres, sinon aléatoires (diversité).
  const isAll = (v?: string | null) => !v || v.toUpperCase() === 'ALL'
  const gender = isAll(input.gender) ? pickRandom(MODEL_GENDERS) : input.gender!.trim()
  const bodyType = isAll(input.bodyType) ? pickRandom(MODEL_BODY_TYPES) : input.bodyType!.trim()
  const nationality = kind === 'actor'
    ? (isAll(input.nationality)
        ? pickRandom(MODEL_NATIONALITIES).name
        : (MODEL_NATIONALITIES.find((n) => n.name === input.nationality)?.name ?? pickRandom(MODEL_NATIONALITIES).name))
    : null

  const prompt = kind === 'hand'
    ? buildHandPrompt(gender, input.skinTone ?? undefined)
    : buildActorPrompt(category!, gender, nationality!, bodyType)

  const results = await generateImage({ prompt, model: 'nano-banana', size: '1024x1792', n: 1 })
  const url = results.find((r) => r.url)?.url
  if (!url) throw new Error('Aucune image générée')
  const path = await persistFromUrl(user.id, url)

  const [row] = await db.insert(product_models).values({ user_id: user.id, kind, category, nationality, prompt, path }).returning()
  return toDTO(row)
}

// Importe une image custom comme acteur/main persisté.
export async function actionUploadProductModel(formData: FormData): Promise<ProductModelDTO> {
  const user = await requireAuth()
  const file = formData.get('file') as File | null
  const kind = ((formData.get('kind') as string | null) ?? '') as 'actor' | 'hand'
  const category = kind === 'actor' ? ((formData.get('category') as string | null)?.trim() || null) : null
  if (!file || file.size === 0) throw new Error('Aucune image fournie')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (kind !== 'actor' && kind !== 'hand') throw new Error('Type invalide')

  const path = ASSET_PATHS.productModel(user.id, randomUUID(), extFromType(file.type))
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) throw error

  const [row] = await db.insert(product_models).values({ user_id: user.id, kind, category, path }).returning()
  return toDTO(row)
}

export async function actionDeleteProductModel(id: string): Promise<void> {
  const user = await requireAuth()
  const [row] = await db.select().from(product_models).where(and(eq(product_models.id, id), eq(product_models.user_id, user.id)))
  if (!row) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.ASSETS).remove([row.path]).catch(() => {})
  await db.delete(product_models).where(and(eq(product_models.id, id), eq(product_models.user_id, user.id)))
}
