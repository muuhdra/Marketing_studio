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

import { aimlFetch } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoEngine      = 'kling' | 'seedance'
export type KlingVersion     = 'v1.6-standard' | 'v2.1-standard' | 'v2.1-pro'
export type SeedanceVersion  = 'lite' | 'pro'
export type VideoAspectRatio = '9:16' | '16:9' | '1:1' | '4:3'
export type VideoDuration    = 5 | 10

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

interface AimlVideoResponse {
  id:      string
  status?: string
  output?: { url: string; thumbnail?: string }[]
  error?:  string
}

// ─── Résolution du model ID ───────────────────────────────────────────────────

function resolveVideoModelId(params: GenerateVideoParams): string {
  const engine = params.engine ?? 'kling'

  if (engine === 'seedance') {
    return params.seedanceVersion === 'pro'
      ? 'seedance-1-pro'
      : 'seedance-1-lite'
  }

  // Kling AI (modèle principal — défaut v2.1 Pro)
  switch (params.klingVersion ?? 'v2.1-pro') {
    case 'v2.1-pro':
    default:              return 'kling-video/v2.1/pro/text-to-video'   // ← principal
    case 'v2.1-standard': return 'kling-video/v2.1/standard/text-to-video'
    case 'v1.6-standard': return 'kling-video/v1.6/standard/text-to-video'
  }
}

function resolveImg2VidModelId(params: GenerateVideoParams): string {
  // Kling image-to-video
  return params.klingVersion === 'v2.1-pro'
    ? 'kling-video/v2.1/pro/image-to-video'
    : 'kling-video/v1.6/standard/image-to-video'
}

// ─── Soumettre un job vidéo ───────────────────────────────────────────────────

export async function submitVideoGeneration(params: GenerateVideoParams): Promise<VideoJob> {
  const engine  = params.engine ?? 'kling'
  const modelId = params.imageUrl
    ? resolveImg2VidModelId(params)
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

  return {
    generationId: response.id,
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

  const firstOutput = response.output?.[0]

  return {
    generationId,
    status:       mapStatus(response.status),
    videoUrl:     firstOutput?.url,
    thumbnailUrl: firstOutput?.thumbnail,
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
  if (!raw)                return 'pending'
  if (raw === 'completed') return 'completed'
  if (raw === 'failed')    return 'failed'
  if (raw === 'queued')    return 'pending'
  return 'in_progress'
}
