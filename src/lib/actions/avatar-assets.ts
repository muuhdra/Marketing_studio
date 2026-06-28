'use server'

/**
 * Server Actions — Assets d'avatar (portrait, garde-robe, environnements)
 *
 * Chaque avatar possède sa propre bibliothèque persistée :
 *   - 1 portrait de base (source_photo_url)
 *   - N outfits (avatar_outfits)
 *   - N environnements (avatar_environments)
 * Réutilisables : à la génération de contenu, le système pioche dedans.
 *
 * Sécurité :
 * - requireAuth() + vérification que l'avatar appartient à l'utilisateur
 * - Fichiers stockés sous {userId}/avatars/... (conforme RLS bucket privé)
 * - Accès lecture via URL signée
 */

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { avatars, avatar_outfits, avatar_environments } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS, MAX_FILE_SIZES } from '@/lib/supabase/storage'
import { cloneVoiceElevenLabs, isVoiceCloneEnabled } from '@/lib/ai/voice-clone'

type OutfitStyle = 'casual' | 'smart' | 'sport' | 'formal' | 'streetwear' | 'custom'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertAvatarOwner(avatarId: string, userId: string) {
  const [a] = await db
    .select({ user_id: avatars.user_id })
    .from(avatars)
    .where(eq(avatars.id, avatarId))
  if (!a || a.user_id !== userId) throw new Error('Avatar introuvable ou accès refusé')
}

function extFromMime(mime: string): string {
  if (mime.includes('png'))  return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'png'
}

// ─── Portrait de base : on télécharge l'image générée et on la stocke durablement ──

export async function actionPersistAvatarPhoto(avatarId: string, sourceUrl: string): Promise<string | null> {
  const user = await requireAuth()
  await assertAvatarOwner(avatarId, user.id)
  if (!sourceUrl) return null

  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error('Téléchargement de l\'image échoué')
    const mime   = res.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await res.arrayBuffer())
    const path   = ASSET_PATHS.avatarPhoto(user.id, avatarId)

    const supabase = await createClient()
    const { error } = await supabase.storage
      .from(BUCKETS.ASSETS)
      .upload(path, buffer, { contentType: mime, upsert: true })
    if (error) throw error

    await db.update(avatars).set({ source_photo_url: path, updated_at: new Date() }).where(eq(avatars.id, avatarId))
    return path
  } catch {
    // Best-effort : si le stockage échoue, l'avatar reste utilisable (portrait en galerie)
    return null
  }
}

// ─── Upload d'une photo de base fournie par l'utilisateur ──────────────────────

export async function actionUploadAvatarPhoto(formData: FormData): Promise<string | null> {
  const user = await requireAuth()
  const avatarId = formData.get('avatarId') as string
  const file     = formData.get('file') as File | null
  if (!avatarId) throw new Error('avatarId requis')
  if (!file || file.size === 0) throw new Error('Aucune image fournie')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > MAX_FILE_SIZES.avatar_source_photo) throw new Error('Image trop lourde (max 20 MB)')
  await assertAvatarOwner(avatarId, user.id)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const path   = ASSET_PATHS.avatarPhoto(user.id, avatarId)
    const supabase = await createClient()
    const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type, upsert: true })
    if (error) throw error
    await db.update(avatars).set({ source_photo_url: path, updated_at: new Date() }).where(eq(avatars.id, avatarId))
    return path
  } catch {
    return null
  }
}

// ─── Clonage de voix (optionnel) — échantillon uploadé sur l'avatar ────────────
// Le clonage réel passe par une API ElevenLabs dédiée (à venir), gated.
// Sans API : l'échantillon est stocké, et l'UI invite à utiliser « description » / « auto ».

export interface CloneVoiceActionResult {
  sampleStored: boolean
  cloned:       boolean
  message?:     string
}

export async function actionCloneAvatarVoice(formData: FormData): Promise<CloneVoiceActionResult> {
  const user = await requireAuth()
  const avatarId = formData.get('avatarId') as string
  const file     = formData.get('file') as File | null
  const name     = (formData.get('name') as string) || 'Avatar'
  if (!avatarId) throw new Error('avatarId requis')
  if (!file || file.size === 0) throw new Error('Aucun échantillon audio fourni')
  if (!file.type.startsWith('audio/')) throw new Error('Le fichier doit être un audio')
  if (file.size > MAX_FILE_SIZES.voice_sample) throw new Error('Échantillon trop lourd (max 50 MB)')
  await assertAvatarOwner(avatarId, user.id)

  // 1. Stocker l'échantillon (utilisable tout de suite, indépendamment du clonage)
  const ext  = file.type.includes('wav') ? 'wav' : file.type.includes('mpeg') || file.type.includes('mp3') ? 'mp3' : 'mp3'
  const path = ASSET_PATHS.avatarVoice(user.id, avatarId, ext)
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) throw error
  await db.update(avatars).set({ voice_sample_url: path, updated_at: new Date() }).where(eq(avatars.id, avatarId))

  // 2. Clonage gated : sans API dédiée, on s'arrête là proprement (échantillon conservé)
  if (!isVoiceCloneEnabled()) {
    return { sampleStored: true, cloned: false, message: 'Échantillon enregistré. Le clonage sera disponible dès l\'activation de l\'API dédiée.' }
  }

  // 3. Clonage réel (quand l'API dédiée est branchée)
  const { voiceId } = await cloneVoiceElevenLabs({ name, sampleUrl: path })
  await db.update(avatars).set({
    voice_provider:    'elevenlabs',
    voice_provider_id: voiceId,
    voice_engine:      'elevenlabs',
    voice_mode:        'clone',
    voice_label:       `${name} (clone)`,
    updated_at:        new Date(),
  }).where(eq(avatars.id, avatarId))

  return { sampleStored: true, cloned: true }
}

// ─── URL signée pour afficher un asset privé ───────────────────────────────────

export async function actionGetAssetSignedUrl(path: string): Promise<string | null> {
  const user = await requireAuth()
  if (!path) return null
  if (!path.startsWith(`${user.id}/`)) throw new Error('Accès refusé')
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl ?? null
}

/**
 * Liste légère des avatars pour un sélecteur (id, nom, portrait signé).
 * Utilisé par Creative Studio (zone Avatar → source img2vid).
 */
export async function actionListAvatarsForPicker(): Promise<{ id: string; name: string; photoUrl: string | null }[]> {
  const user = await requireAuth()
  const rows = await db
    .select({ id: avatars.id, name: avatars.name, photo: avatars.source_photo_url })
    .from(avatars)
    .where(eq(avatars.user_id, user.id))
    .orderBy(avatars.created_at)
  const supabase = await createClient()
  return Promise.all(rows.map(async (r) => {
    let photoUrl: string | null = null
    if (r.photo) {
      const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(r.photo, 60 * 60)
      photoUrl = data?.signedUrl ?? null
    }
    return { id: r.id, name: r.name, photoUrl }
  }))
}

/**
 * Upload temporaire d'une image (data URL) → URL signée (1h) fetchable + path.
 * Donne à Kling img2vid une image uploadée localement (avatar). Sous {userId}/tmp/.
 * Le `path` permet la suppression après usage ; un cron purge les orphelins (>24h).
 */
export async function actionUploadTempImage(dataUrl: string): Promise<{ url: string; path: string }> {
  const user = await requireAuth()
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/)
  if (!m) throw new Error('Image invalide')
  const mime = m[1]
  const ext  = extFromMime(mime)
  const buffer = Buffer.from(m[2], 'base64')
  const path = `${user.id}/tmp/${randomUUID()}.${ext}`
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: mime, upsert: true })
  if (error) throw error
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
  return { url: data?.signedUrl ?? '', path }
}

/** Upload temporaire d'une VIDÉO (via FormData) → URL signée 1h. Pour Clonage studio. */
export async function actionUploadTempVideo(formData: FormData): Promise<{ url: string; path: string }> {
  const user = await requireAuth()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('Aucune vidéo fournie')
  if (!file.type.startsWith('video/')) throw new Error('Le fichier doit être une vidéo')
  if (file.size > 100 * 1024 * 1024) throw new Error('Vidéo trop lourde (max 100 MB)')
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || 'mp4'
  const path = `${user.id}/tmp/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
  return { url: data?.signedUrl ?? '', path }
}

/** Supprime un fichier temporaire (suppression après usage). Restreint à {userId}/tmp/. */
export async function actionDeleteTempImage(path: string): Promise<void> {
  const user = await requireAuth()
  if (!path || !path.startsWith(`${user.id}/tmp/`)) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.ASSETS).remove([path]).catch(() => {})
}

// ─── Garde-robe (outfits) ──────────────────────────────────────────────────────

export async function actionListOutfits(avatarId: string) {
  const user = await requireAuth()
  await assertAvatarOwner(avatarId, user.id)
  return db.select().from(avatar_outfits).where(eq(avatar_outfits.avatar_id, avatarId)).orderBy(avatar_outfits.created_at)
}

// Bibliothèque complète d'un avatar (tenues + décors) — pour la modale d'assignation
export async function actionAddOutfit(formData: FormData) {
  const user = await requireAuth()

  const avatarId    = formData.get('avatarId') as string
  const name        = ((formData.get('name') as string) ?? '').trim()
  const styleType   = ((formData.get('styleType') as string) ?? 'casual') as OutfitStyle
  const description = ((formData.get('description') as string) ?? '').trim() || null
  const file        = formData.get('file') as File | null

  if (!avatarId) throw new Error('avatarId requis')
  if (!name)     throw new Error('Nom de la tenue requis')
  // Validation du fichier AVANT tout insert — sinon une erreur laisserait une ligne orpheline
  const hasFile = !!(file && file.size > 0)
  if (hasFile) {
    if (!file!.type.startsWith('image/'))        throw new Error('La référence doit être une image')
    if (file!.size > MAX_FILE_SIZES.outfit_ref)  throw new Error('Image trop lourde (max 10 MB)')
  }
  await assertAvatarOwner(avatarId, user.id)

  // Insère pour obtenir l'id (sert au chemin de stockage)
  const [outfit] = await db.insert(avatar_outfits).values({
    avatar_id:   avatarId,
    name,
    style_type:  styleType,
    description,
  }).returning()

  // Photo de référence optionnelle (déjà validée)
  if (hasFile) {
    try {
      const buffer = Buffer.from(await file!.arrayBuffer())
      const path   = ASSET_PATHS.avatarOutfit(user.id, avatarId, outfit.id, extFromMime(file!.type))
      const supabase = await createClient()
      const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file!.type, upsert: true })
      if (!error) {
        await db.update(avatar_outfits).set({ reference_photo_url: path }).where(eq(avatar_outfits.id, outfit.id))
        outfit.reference_photo_url = path
      }
    } catch { /* best-effort — la tenue existe même sans photo */ }
  }

  return outfit
}

export async function actionDeleteOutfit(outfitId: string) {
  const user = await requireAuth()
  // Ownership via jointure avatar
  const [row] = await db
    .select({ ref: avatar_outfits.reference_photo_url, owner: avatars.user_id })
    .from(avatar_outfits)
    .leftJoin(avatars, eq(avatar_outfits.avatar_id, avatars.id))
    .where(eq(avatar_outfits.id, outfitId))
  if (!row || row.owner !== user.id) throw new Error('Tenue introuvable ou accès refusé')

  if (row.ref) {
    try { const supabase = await createClient(); await supabase.storage.from(BUCKETS.ASSETS).remove([row.ref]) } catch { /* best-effort */ }
  }
  await db.delete(avatar_outfits).where(eq(avatar_outfits.id, outfitId))
}

// ─── Environnements ─────────────────────────────────────────────────────────────

export async function actionListEnvironments(avatarId: string) {
  const user = await requireAuth()
  await assertAvatarOwner(avatarId, user.id)
  return db.select().from(avatar_environments).where(eq(avatar_environments.avatar_id, avatarId)).orderBy(avatar_environments.created_at)
}

export async function actionAddEnvironment(formData: FormData) {
  const user = await requireAuth()

  const avatarId     = formData.get('avatarId') as string
  const name         = ((formData.get('name') as string) ?? '').trim()
  const locationType = ((formData.get('locationType') as string) ?? '').trim() || null
  const description  = ((formData.get('description') as string) ?? '').trim() || null
  const file         = formData.get('file') as File | null

  if (!avatarId) throw new Error('avatarId requis')
  if (!name)     throw new Error('Nom de l\'environnement requis')
  // Validation du fichier AVANT l'insert (pas de ligne orpheline si invalide)
  const hasFile = !!(file && file.size > 0)
  if (hasFile) {
    if (!file!.type.startsWith('image/'))      throw new Error('La référence doit être une image')
    if (file!.size > MAX_FILE_SIZES.env_ref)   throw new Error('Image trop lourde (max 10 MB)')
  }
  await assertAvatarOwner(avatarId, user.id)

  const [environment] = await db.insert(avatar_environments).values({
    avatar_id:     avatarId,
    name,
    location_type: locationType,
    description,
  }).returning()

  if (hasFile) {
    try {
      const buffer = Buffer.from(await file!.arrayBuffer())
      const path   = ASSET_PATHS.avatarEnvironment(user.id, avatarId, environment.id, extFromMime(file!.type))
      const supabase = await createClient()
      const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType: file!.type, upsert: true })
      if (!error) {
        await db.update(avatar_environments).set({ reference_photo_url: path }).where(eq(avatar_environments.id, environment.id))
        environment.reference_photo_url = path
      }
    } catch { /* best-effort */ }
  }

  return environment
}

export async function actionDeleteEnvironment(envId: string) {
  const user = await requireAuth()
  const [row] = await db
    .select({ ref: avatar_environments.reference_photo_url, owner: avatars.user_id })
    .from(avatar_environments)
    .leftJoin(avatars, eq(avatar_environments.avatar_id, avatars.id))
    .where(eq(avatar_environments.id, envId))
  if (!row || row.owner !== user.id) throw new Error('Environnement introuvable ou accès refusé')

  if (row.ref) {
    try { const supabase = await createClient(); await supabase.storage.from(BUCKETS.ASSETS).remove([row.ref]) } catch { /* best-effort */ }
  }
  await db.delete(avatar_environments).where(eq(avatar_environments.id, envId))
}

