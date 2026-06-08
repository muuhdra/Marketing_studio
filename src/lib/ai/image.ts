/**
 * AIML API — Génération d'images
 *
 * Usages : visuels campagne, moodboards, thumbnails, avatars
 * Modèles : Flux Pro, DALL-E 3, Stable Diffusion
 */

import { createAimlClient, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageModel = 'flux/schnell' | 'flux-pro/v1.1' | 'dall-e-3'
export type ImageSize  =
  | '1024x1024'
  | '1792x1024'   // paysage 16:9
  | '1024x1792'   // portrait 9:16
  | '1344x768'    // 16:9 compact

export interface GenerateImageParams {
  prompt:      string
  model?:      ImageModel
  size?:       ImageSize
  quality?:    'standard' | 'hd'
  style?:      'vivid' | 'natural'         // DALL-E uniquement
  n?:          number                      // nombre d'images (max 4)
}

export interface ImageResult {
  url:         string
  revisedPrompt?: string
  model:       string
}

// ─── Génération d'image ───────────────────────────────────────────────────────

export async function generateImage(params: GenerateImageParams): Promise<ImageResult[]> {
  const client = createAimlClient()
  const model  = params.model ?? MODELS.image.quality

  const response = await client.images.generate({
    model,
    prompt:  params.prompt,
    n:       params.n ?? 1,
    size:    (params.size ?? '1024x1024') as Parameters<typeof client.images.generate>[0]['size'],
    quality: params.quality ?? 'standard',
    // style uniquement pour DALL-E
    ...(model === 'dall-e-3' && params.style ? { style: params.style } : {}),
  })

  return (response.data ?? []).map((img) => ({
    url:           img.url ?? '',
    revisedPrompt: img.revised_prompt,
    model,
  }))
}

// ─── Prompts prêts à l'emploi ────────────────────────────────────────────────

/**
 * Génère un visuel de campagne à partir de l'ADN
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
  const size = sizeMap[options.format ?? '16:9']

  const prompt = `Professional marketing campaign visual for "${options.campaignName}".
Style: ${options.style ?? 'modern, clean, high-end commercial photography'}.
Brief: ${options.dna.slice(0, 300)}.
Ultra HD, 8K quality, cinematic lighting, no text overlays.`

  const results = await generateImage({
    prompt,
    model: MODELS.image.quality,
    size,
    quality: 'hd',
  })

  return results[0]
}

/**
 * Génère une photo d'avatar IA
 */
export async function generateAvatarPhoto(options: {
  name:       string
  age?:       number
  ethnicity?: string
  style?:     string
  setting?:   string
}): Promise<ImageResult> {
  const prompt = `Professional portrait photo of a person.
${options.ethnicity ? `Ethnicity: ${options.ethnicity}.` : ''}
${options.age ? `Age: approximately ${options.age} years old.` : ''}
${options.style ? `Style: ${options.style}.` : ''}
${options.setting ? `Setting: ${options.setting}.` : 'Clean neutral background.'}
High-end photography, natural lighting, authentic look, no text, no watermarks.
This is a digital avatar for marketing content creation.`

  const results = await generateImage({
    prompt,
    model: MODELS.image.quality,
    size:  '1024x1792',  // portrait
    quality: 'hd',
  })

  return results[0]
}

/**
 * Génère un moodboard (4 images variées)
 */
export async function generateMoodboard(
  campaignDna: string,
  count: number = 4,
): Promise<ImageResult[]> {
  const prompt = `Moodboard image for a marketing campaign.
Concept: ${campaignDna.slice(0, 400)}.
Style: editorial photography, high-end commercial, diverse perspectives.
Clean composition, professional quality.`

  return generateImage({
    prompt,
    model: MODELS.image.fast,  // Flux Schnell pour le moodboard (rapidité)
    size:  '1024x1024',
    n:     Math.min(count, 4),
  })
}
