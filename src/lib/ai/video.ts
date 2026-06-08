/**
 * AIML API — Génération de vidéo
 *
 * Usages : UGC, commerciaux, vidéos avatar
 * Modèles : Kling v2.1, Seedance, Hailuo (MiniMax)
 *
 * Pattern async :
 *   1. POST → { generation_id }
 *   2. GET  → poll jusqu'à status === 'completed'
 *   3. Retourne l'URL vidéo
 */

import { aimlFetch } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoModel =
  | 'kling-video/v1.6/standard/text-to-video'
  | 'kling-video/v2.1/standard/text-to-video'
  | 'kling-video/v2.1/pro/text-to-video'
  | 'seedance-1-lite'
  | 'seedance-1-pro'

export type VideoAspectRatio = '9:16' | '16:9' | '1:1' | '4:3'
export type VideoDuration    = 5 | 10 | 15 | 30

export interface GenerateVideoParams {
  prompt:       string
  model?:       VideoModel
  imageUrl?:    string             // image-to-video (si fourni)
  duration?:    VideoDuration
  aspectRatio?: VideoAspectRatio
  negativePrompt?: string
}

export interface VideoJob {
  generationId: string
  status:       'pending' | 'in_progress' | 'completed' | 'failed'
  videoUrl?:    string
  thumbnailUrl?: string
  error?:       string
  model:        string
}

interface AimlVideoResponse {
  id:      string
  status?: string
  output?: { url: string; thumbnail?: string }[]
  error?:  string
}

// ─── Soumettre une génération vidéo ──────────────────────────────────────────

export async function submitVideoGeneration(params: GenerateVideoParams): Promise<VideoJob> {
  const model = params.model ?? 'kling-video/v1.6/standard/text-to-video'

  const body: Record<string, unknown> = {
    model,
    prompt:          params.prompt,
    duration:        params.duration ?? 5,
    aspect_ratio:    params.aspectRatio ?? '9:16',
  }

  if (params.imageUrl)       body.image_url        = params.imageUrl
  if (params.negativePrompt) body.negative_prompt  = params.negativePrompt

  const response = await aimlFetch<AimlVideoResponse>('/video/generations', {
    method: 'POST',
    body:   JSON.stringify(body),
    version: 'v2',
  })

  return {
    generationId: response.id,
    status:       'pending',
    model,
  }
}

// ─── Récupérer le statut d'un job ────────────────────────────────────────────

export async function getVideoStatus(generationId: string): Promise<VideoJob> {
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
    model:        '',
  }
}

// ─── Polling jusqu'à completion ──────────────────────────────────────────────

/**
 * Poll un job vidéo toutes les `intervalMs` ms jusqu'à completion ou timeout.
 * À utiliser côté serveur uniquement (Server Action ou API route).
 */
export async function waitForVideo(
  generationId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<VideoJob> {
  const { intervalMs = 5000, timeoutMs = 300_000 } = options  // 5 min max
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const job = await getVideoStatus(generationId)

    if (job.status === 'completed') return job
    if (job.status === 'failed')    throw new Error(job.error ?? 'Video generation failed')

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`Video generation timeout after ${timeoutMs / 1000}s`)
}

// ─── Génération complète (submit + wait) ─────────────────────────────────────

/**
 * Génère une vidéo et attend le résultat.
 * ⚠️ Peut prendre 2-5 min — à appeler depuis un job background (ex: Trigger.dev)
 * ou une API route avec streaming/long-polling.
 */
export async function generateVideo(params: GenerateVideoParams): Promise<VideoJob> {
  const job = await submitVideoGeneration(params)
  return waitForVideo(job.generationId)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapStatus(raw?: string): VideoJob['status'] {
  if (!raw)               return 'pending'
  if (raw === 'completed') return 'completed'
  if (raw === 'failed')    return 'failed'
  if (raw === 'queued')    return 'pending'
  return 'in_progress'
}

// ─── Prompts UGC prêts à l'emploi ───────────────────────────────────────────

export function buildUgcPrompt(options: {
  avatarName?:   string
  avatarStyle?:  string
  product:       string
  hook:          string
  setting?:      string
}): string {
  return [
    options.hook,
    options.avatarName
      ? `A ${options.avatarStyle ?? 'authentic'} content creator named ${options.avatarName}`
      : 'A relatable content creator',
    `talks about ${options.product}.`,
    options.setting
      ? `Setting: ${options.setting}.`
      : 'Indoor, natural lighting, casual authentic atmosphere.',
    'Vertical video, 9:16 format, TikTok/Reels style.',
    'High quality, cinematic, authentic UGC feel.',
  ].join(' ')
}
