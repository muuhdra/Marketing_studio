/**
 * AIML API — Génération d'images
 *
 * Nano Banana → SEUL modèle image — visuels campagne, moodboards, portraits, thumbnails
 *
 * Via la même clé AIMLAPI_KEY.
 */

import { createAimlClient, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageGenerationModel = 'nano-banana'

export type ImageSize =
  | '1024x1024'   // carré 1:1
  | '1792x1024'   // paysage 16:9
  | '1024x1792'   // portrait 9:16
  | '1344x768'    // 16:9 compact

export interface GenerateImageParams {
  prompt:      string
  model?:      ImageGenerationModel
  size?:       ImageSize
  quality?:    'standard' | 'hd'
  n?:          number
}

export interface ImageResult {
  url:          string
  revisedPrompt?: string
  model:        string
}

// ─── Résolution du model ID AIML ─────────────────────────────────────────────

function resolveImageModel(_choice?: ImageGenerationModel): string {
  return MODELS.image.nanoBanana  // Nano Banana = seul modèle image
}

// ─── Génération d'image ───────────────────────────────────────────────────────

export async function generateImage(params: GenerateImageParams): Promise<ImageResult[]> {
  const client  = createAimlClient()
  const modelId = resolveImageModel(params.model)

  const response = await client.images.generate({
    model:   modelId,
    prompt:  params.prompt,
    n:       params.n ?? 1,
    size:    (params.size ?? '1024x1024') as '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512',
    quality: (params.quality ?? 'standard') as 'standard' | 'hd',
  })

  const resData = (response as { data?: { url?: string; revised_prompt?: string }[] }).data ?? []
  return resData.map((img) => ({
    url:           img.url ?? '',
    revisedPrompt: img.revised_prompt,
    model:         modelId,
  }))
}

// ─── Fonctions prêtes à l'emploi ─────────────────────────────────────────────

/**
 * Visuel campagne — Nano Banana (modèle principal visuels)
 * Style créatif, impact visuel fort, 4 variations rapides possibles.
 */
export async function generateCampaignVisual(options: {
  campaignName: string
  dna:          string
  style?:       string
  format?:      '16:9' | '9:16' | '1:1'
}): Promise<ImageResult> {
  const sizeMap: Record<string, ImageSize> = {
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '1:1':  '1024x1024',
  }

  const prompt = `Marketing campaign visual for "${options.campaignName}".
Style: ${options.style ?? 'bold creative commercial photography, vibrant, high impact'}.
Brief: ${options.dna.slice(0, 300)}.
No text overlays, no watermarks. Strong visual composition.`

  const results = await generateImage({
    prompt,
    model: 'nano-banana',   // Nano Banana = modèle principal visuels
    size:  sizeMap[options.format ?? '16:9'],
  })

  return results[0]
}

/**
 * Moodboard créatif — Nano Banana (style unique, 4 variations rapides)
 */
export async function generateMoodboard(
  campaignDna: string,
  count: number = 4,
): Promise<ImageResult[]> {
  const prompt = `Creative moodboard image for a marketing campaign.
Concept: ${campaignDna.slice(0, 400)}.
Style: editorial photography, diverse perspectives, artistic composition.`

  return generateImage({
    prompt,
    model: 'nano-banana',   // Nano Banana = rapid creative exploration
    size:  '1024x1024',
    n:     Math.min(count, 4),
  })
}

/**
 * Portrait avatar IA — Nano Banana (portraits, avatars marketing)
 */
export async function generateAvatarPhoto(options: {
  name:       string
  age?:       number
  ethnicity?: string
  style?:     string
  setting?:   string
}): Promise<ImageResult> {
  const prompt = [
    'Professional portrait photo of a person.',
    options.ethnicity ? `Ethnicity: ${options.ethnicity}.` : '',
    options.age       ? `Age approximately ${options.age} years old.` : '',
    options.style     ? `Style: ${options.style}.` : '',
    options.setting   ? `Setting: ${options.setting}.` : 'Clean neutral background, studio lighting.',
    'High-end photography, natural lighting, authentic look, no text, no watermarks.',
    'Digital marketing avatar, professional quality.',
  ].filter(Boolean).join(' ')

  const results = await generateImage({
    prompt,
    model:   'nano-banana',
    size:    '1024x1792',
    quality: 'hd',
  })

  return results[0]
}

/**
 * Thumbnail vidéo — Nano Banana (rapide, impact visuel)
 */
export async function generateVideoThumbnail(options: {
  title:   string
  style?:  string
  format?: '16:9' | '9:16' | '1:1'
}): Promise<ImageResult> {
  const sizeMap: Record<string, ImageSize> = {
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '1:1':  '1024x1024',
  }

  const prompt = `Eye-catching video thumbnail for "${options.title}".
Style: ${options.style ?? 'vibrant, bold, high contrast, social media optimized'}.
No text overlays. Maximum visual impact, professional quality.`

  const results = await generateImage({
    prompt,
    model: 'nano-banana',
    size:  sizeMap[options.format ?? '16:9'],
  })

  return results[0]
}
