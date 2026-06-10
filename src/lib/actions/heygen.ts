'use server'

/**
 * Server Actions — HeyGen Video Cloning
 *
 * HEYGEN_API_KEY n'est jamais exposée côté client.
 * Toutes les actions vérifient l'auth via requireAuth().
 *
 * Sécurité :
 * - Taille max upload : 200 MB
 * - Script max : 2 000 caractères
 * - Fichier doit être de type video/*
 */

import { requireAuth } from './auth'
import {
  uploadVideoToHeygen,
  createInstantAvatar,
  getAvatarStatus,
  generateCloneVideo,
  getVideoStatus,
  listInstantAvatars,
  type GenerateCloneVideoParams,
  type HeyGenAvatar,
  type HeyGenVideoResult,
} from '@/lib/ai/heygen'

// ─── Créer un clone (upload + soumission à HeyGen) ───────────────────────────

export async function actionCreateHeyGenClone(formData: FormData): Promise<{
  avatarId: string
  name:     string
  status:   string
}> {
  await requireAuth()

  const file = formData.get('video') as File | null
  const name = ((formData.get('name') as string | null) ?? 'Mon Clone').trim()

  if (!file)                             throw new Error('Aucune vidéo fournie')
  if (!file.type.startsWith('video/'))   throw new Error('Fichier invalide — format vidéo requis')
  if (file.size > 200 * 1024 * 1024)    throw new Error('Vidéo trop lourde (max 200 MB)')
  if (!name)                             throw new Error('Nom du clone requis')

  // Lire le buffer côté serveur
  const buffer   = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'video/mp4'

  // Upload vers HeyGen puis créer l'avatar
  const videoUrl = await uploadVideoToHeygen(buffer, mimeType)
  const avatarId = await createInstantAvatar(videoUrl, name)

  return { avatarId, name, status: 'processing' }
}

// ─── Polling statut d'un avatar ──────────────────────────────────────────────

export async function actionGetCloneStatus(avatarId: string): Promise<HeyGenAvatar> {
  await requireAuth()
  if (!avatarId) throw new Error('avatarId requis')
  return getAvatarStatus(avatarId)
}

// ─── Générer une vidéo avec le clone ─────────────────────────────────────────

export async function actionGenerateCloneVideo(
  params: GenerateCloneVideoParams,
): Promise<{ videoId: string }> {
  await requireAuth()

  if (!params.avatarId)       throw new Error('avatar_id requis')
  if (!params.script?.trim()) throw new Error('Script requis')
  if (params.script.length > 2000) throw new Error('Script trop long (max 2 000 caractères)')

  const videoId = await generateCloneVideo(params)
  return { videoId }
}

// ─── Polling statut d'une vidéo ──────────────────────────────────────────────

export async function actionGetCloneVideoStatus(videoId: string): Promise<HeyGenVideoResult> {
  await requireAuth()
  if (!videoId) throw new Error('videoId requis')
  return getVideoStatus(videoId)
}

// ─── Lister les clones HeyGen du compte ──────────────────────────────────────

export async function actionListHeyGenClones(): Promise<HeyGenAvatar[]> {
  await requireAuth()
  return listInstantAvatars()
}
