/**
 * AIML API — Génération d'images
 *
 * Nano Banana → SEUL modèle image — visuels campagne, moodboards, portraits, thumbnails
 *
 * Via la même clé AIMLAPI_KEY.
 */

import { createAimlClient, aimlFetch, MODELS } from './client'

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
  imageUrl?:   string | string[]   // image-to-image : 1 ou plusieurs images de référence — Nano Banana édition
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
  const modelId = resolveImageModel(params.model)

  // ── image-to-image : 1+ images de référence fournies (ex. avatar, produit) ──
  // Le SDK OpenAI images.generate ne gère que le text-to-image ; on passe par
  // l'endpoint brut AIML avec `image_url` (tableau) pour l'édition Nano Banana.
  const refImages = params.imageUrl
    ? (Array.isArray(params.imageUrl) ? params.imageUrl : [params.imageUrl]).filter(Boolean)
    : []
  if (refImages.length > 0) {
    const body: Record<string, unknown> = {
      model:     modelId,
      prompt:    params.prompt,
      image_url: refImages,
    }
    if (params.n) body.num_images = params.n
    const res = await aimlFetch<{ data?: { url?: string; revised_prompt?: string }[] }>(
      '/images/generations',
      { version: 'v1', method: 'POST', body: JSON.stringify(body) },
    )
    const data = res.data ?? []
    return data.map((img) => ({ url: img.url ?? '', revisedPrompt: img.revised_prompt, model: modelId }))
  }

  // ── text-to-image (par défaut) ──
  const client  = createAimlClient()

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
  imageUrl?:    string   // avatar de référence → image-to-image
}): Promise<ImageResult> {
  const sizeMap: Record<string, ImageSize> = {
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '1:1':  '1024x1024',
  }

  const subject = options.imageUrl
    ? '\nFeature the person shown in the provided reference image as the main subject, preserving their identity and appearance.'
    : ''
  const prompt = `Marketing campaign visual for "${options.campaignName}".
Style: ${options.style ?? 'bold creative commercial photography, vibrant, high impact'}.
Brief: ${options.dna.slice(0, 300)}.${subject}
No text overlays, no watermarks. Strong visual composition.`

  const results = await generateImage({
    prompt,
    model:    'nano-banana',   // Nano Banana = modèle principal visuels
    size:     sizeMap[options.format ?? '16:9'],
    imageUrl: options.imageUrl,
  })

  return results[0]
}

/**
 * Moodboard créatif — Nano Banana (style unique, 4 variations rapides)
 */
export async function generateMoodboard(
  campaignDna: string,
  count: number = 4,
  imageUrl?: string,   // avatar de référence → image-to-image
): Promise<ImageResult[]> {
  const subject = imageUrl
    ? '\nFeature the person shown in the provided reference image, preserving their identity and appearance.'
    : ''
  const prompt = `Creative moodboard image for a marketing campaign.
Concept: ${campaignDna.slice(0, 400)}.${subject}
Style: editorial photography, diverse perspectives, artistic composition.`

  return generateImage({
    prompt,
    model: 'nano-banana',   // Nano Banana = rapid creative exploration
    size:  '1024x1024',
    n:     Math.min(count, 4),
    imageUrl,
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
  traits?:    string           // descripteurs morphologiques (peau, cheveux, yeux, physique…)
  descriptionPrompt?: string   // prompt dérivé d'une photo (reverse-engineering) → base de génération
}): Promise<ImageResult> {
  // Portrait type "photo d'identité" : tête + épaules, fond studio neutre, de face.
  const core = options.descriptionPrompt?.trim()
    ? `${options.descriptionPrompt.trim()} Framed as an ID-style headshot, head and shoulders, facing the camera.`
    : 'Professional ID-style headshot portrait of a person, head and shoulders, facing the camera.'

  const prompt = [
    core,
    options.traits?.trim() ? `${options.traits.trim()}.` : '',
    options.ethnicity ? `Ethnicity: ${options.ethnicity}.` : '',
    options.age       ? `Age approximately ${options.age} years old.` : '',
    options.style     ? `Style: ${options.style}.` : '',
    'Neutral seamless studio background, even soft lighting, sharp focus.',
    'Photorealistic, authentic look, no text, no watermarks. Digital marketing avatar, professional quality.',
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
 * Fiche de référence personnage (model sheet) — Nano Banana.
 * Une planche 3×3 du MÊME personnage sous plusieurs angles/expressions (cohérence d'identité).
 */
export async function generateAvatarSheet(options: {
  age?:       number
  ethnicity?: string
  style?:     string
  traits?:    string
  descriptionPrompt?: string   // identité dérivée d'une photo
  imageUrl?:  string           // portrait de référence → image-to-image (fidélité au visage)
}): Promise<ImageResult> {
  const identity = options.descriptionPrompt?.trim() ? `${options.descriptionPrompt.trim()} ` : ''
  // Avec le portrait de référence : on insiste sur la fidélité au visage fourni.
  const lead = options.imageUrl
    ? 'Character reference sheet (model sheet): a 3x3 grid contact sheet of the EXACT SAME person shown in the provided reference image — preserve their face, hairstyle and identity identically in every frame.'
    : `Character reference sheet (model sheet): a 3x3 grid contact sheet of the SAME person, ${identity}with identical face, hairstyle and identity in every frame.`
  const prompt = [
    lead,
    options.traits?.trim() ? `${options.traits.trim()}.` : '',
    options.ethnicity ? `Ethnicity: ${options.ethnicity}.` : '',
    options.age ? `Age approximately ${options.age} years old.` : '',
    options.style ? `Style: ${options.style}.` : '',
    'Varied head poses and expressions across the 9 frames: front neutral, three-quarter view, side profile, smiling, laughing, winking, looking away, looking down, surprised.',
    'Consistent seamless neutral studio background, even lighting, evenly spaced grid. Photorealistic, no text, no watermarks.',
  ].filter(Boolean).join(' ')

  const results = await generateImage({
    prompt,
    model:    'nano-banana',
    size:     '1024x1024',
    quality:  'hd',
    imageUrl: options.imageUrl,
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
