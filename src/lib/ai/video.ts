/**
 * AIML API — Génération vidéo async
 *
 * Kling AI v2.1 Pro → MODÈLE PRINCIPAL — UGC, avatars humains, talking head,
 *                     image-to-video (photo avatar → vidéo), lifestyle
 * Seedance Pro      → B-roll cinématique, plans produit, ambiance visuelle
 *
 * Pattern async :
 *   1. POST → { generation_id }
 *   2. GET  → poll toutes les 10s jusqu'à status === 'completed'
 *   3. Retourne l'URL vidéo
 */

import { aimlFetch, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoEngine      = 'kling' | 'seedance'
export type KlingVersion     = 'v1.6-standard' | 'v2.1-standard' | 'v2.1-pro'
export type SeedanceVersion  = 'lite' | 'pro'
export type VideoAspectRatio = '9:16' | '16:9' | '1:1' | '4:3'
export type VideoDuration    = 4 | 5 | 6 | 8 | 10 | 12 | 15   // Kling : 5/10 · Seedance 2.0 : 4/5/6/8/10/12/15

export interface GenerateVideoParams {
  prompt:          string
  engine?:         VideoEngine
  klingVersion?:   KlingVersion
  seedanceVersion?: SeedanceVersion
  imageUrl?:       string          // image-to-video
  duration?:       VideoDuration
  aspectRatio?:    VideoAspectRatio
  negativePrompt?: string
}

export interface VideoJob {
  generationId:  string
  status:        'pending' | 'in_progress' | 'completed' | 'failed'
  videoUrl?:     string
  thumbnailUrl?: string
  error?:        string
  engine:        VideoEngine
  modelId:       string
}

// Réponse AIML tolérante : le champ exact varie selon le modèle (Kling/Seedance).
interface AimlVideoResponse {
  id?:             string
  generation_id?:  string
  status?:         string
  // Variantes possibles de l'URL de sortie
  output?:         { url?: string; thumbnail?: string }[] | { url?: string; thumbnail?: string }
  video?:          { url?: string } | string
  video_url?:      string
  url?:            string
  data?:           { video?: { url?: string }; url?: string; output?: { url?: string }[] }
  error?:          string
}

// Extrait l'URL vidéo quel que soit le format de réponse
function extractVideoUrl(r: AimlVideoResponse): string | undefined {
  const out = r.output
  const fromOut = Array.isArray(out) ? out[0]?.url : out?.url
  const video = r.video
  const fromVideo = typeof video === 'string' ? video : video?.url
  return (
    fromOut ??
    fromVideo ??
    r.video_url ??
    r.url ??
    r.data?.video?.url ??
    r.data?.url ??
    r.data?.output?.[0]?.url ??
    undefined
  )
}

// ─── Résolution du model ID ───────────────────────────────────────────────────

// Note : la clé AIML n'expose qu'UNE variante par usage (10 modèles max).
// Les sous-versions (klingVersion/seedanceVersion) sont donc ignorées ici.
function resolveVideoModelId(params: GenerateVideoParams): string {
  const engine = params.engine ?? 'kling'
  if (engine === 'seedance') return MODELS.video.seedance      // Seedance 2.0 — B-roll
  return MODELS.video.klingText                                // Kling 2.1 Master — text-to-video
}

function resolveImg2VidModelId(engine: VideoEngine): string {
  if (engine === 'seedance') return MODELS.video.seedance      // Seedance 2.0 — i2v (contrôle 1ère/dernière frame)
  return MODELS.video.klingImg2Vid                             // Kling 2.1 Pro — image-to-video
}

// ─── Soumettre un job vidéo ───────────────────────────────────────────────────

export async function submitVideoGeneration(params: GenerateVideoParams): Promise<VideoJob> {
  const engine  = params.engine ?? 'kling'
  const modelId = params.imageUrl
    ? resolveImg2VidModelId(engine)
    : resolveVideoModelId(params)

  const body: Record<string, unknown> = {
    model:        modelId,
    prompt:       params.prompt,
    duration:     params.duration ?? 5,
    aspect_ratio: params.aspectRatio ?? '9:16',
  }

  if (params.imageUrl)       body.image_url       = params.imageUrl
  if (params.negativePrompt) body.negative_prompt = params.negativePrompt

  const response = await aimlFetch<AimlVideoResponse>('/video/generations', {
    method:  'POST',
    body:    JSON.stringify(body),
    version: 'v2',
  })

  const generationId = response.id ?? response.generation_id
  if (!generationId) throw new Error('Soumission vidéo : aucun identifiant de génération renvoyé')
  return {
    generationId,
    status:       'pending',
    engine,
    modelId,
  }
}

// ─── Récupérer le statut ──────────────────────────────────────────────────────

export async function getVideoStatus(generationId: string, engine: VideoEngine = 'kling'): Promise<VideoJob> {
  const response = await aimlFetch<AimlVideoResponse>(
    `/video/generations?generation_id=${generationId}`,
    { method: 'GET', version: 'v2' },
  )

  const videoUrl = extractVideoUrl(response)
  // Une URL présente ⇒ génération terminée, quel que soit le libellé de statut renvoyé
  const status: VideoJob['status'] = videoUrl ? 'completed' : mapStatus(response.status)
  const out = response.output
  const thumbnail = Array.isArray(out) ? out[0]?.thumbnail : out?.thumbnail

  return {
    generationId,
    status,
    videoUrl,
    thumbnailUrl: thumbnail,
    error:        response.error,
    engine,
    modelId:      '',
  }
}

// ─── Polling complet (usage serveur uniquement) ───────────────────────────────

export async function waitForVideo(
  generationId: string,
  engine: VideoEngine = 'kling',
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<VideoJob> {
  const { intervalMs = 8000, timeoutMs = 300_000 } = options
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const job = await getVideoStatus(generationId, engine)

    if (job.status === 'completed') return job
    if (job.status === 'failed')    throw new Error(job.error ?? 'Video generation failed')

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`Video generation timeout after ${timeoutMs / 1000}s`)
}

// ─── Helpers de prompt ────────────────────────────────────────────────────────

/** Construit un prompt UGC optimisé pour Kling */
export function buildKlingUgcPrompt(options: {
  avatarName?:  string
  avatarStyle?: string
  hook:         string
  product:      string
  setting?:     string
}): string {
  return [
    options.hook,
    options.avatarName
      ? `A ${options.avatarStyle ?? 'authentic relatable'} person named ${options.avatarName}`
      : 'A relatable content creator',
    `talks about ${options.product}.`,
    options.setting ?? 'Indoor, natural lighting, casual authentic atmosphere.',
    'Vertical 9:16, TikTok/Reels style, high quality UGC feel, cinematic.',
  ].join(' ')
}

/** Construit un prompt cinématique optimisé pour Seedance */
export function buildSeedanceCinematicPrompt(options: {
  scene:        string
  mood:         string
  product?:     string
  cameraMove?:  string
}): string {
  return [
    options.scene,
    `Mood: ${options.mood}.`,
    options.product ? `Featuring ${options.product}.` : '',
    options.cameraMove ?? 'Smooth camera movement, dynamic angles.',
    'Cinematic quality, professional color grading, 8K resolution.',
  ].filter(Boolean).join(' ')
}

// ─── Helper interne ───────────────────────────────────────────────────────────

function mapStatus(raw?: string): VideoJob['status'] {
  const s = (raw ?? '').toLowerCase()
  if (!s)                                                          return 'pending'
  if (['completed', 'success', 'succeeded', 'finished', 'done'].includes(s)) return 'completed'
  if (['failed', 'error', 'cancelled', 'canceled'].includes(s))   return 'failed'
  if (['queued', 'pending', 'waiting', 'created'].includes(s))     return 'pending'
  return 'in_progress'
}
