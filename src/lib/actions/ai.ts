'use server'

/**
 * Server Actions — AIML API
 *
 * AIMLAPI_KEY n'est jamais exposée côté client.
 * Tous les appels IA passent par ces actions serveur.
 *
 * Modèles disponibles :
 *   Texte  → Claude (Anthropic) + ChatGPT (OpenAI)
 *   Image  → Nano Banana + Flux Pro
 *   Vidéo  → Kling AI + Seedance
 *   TTS    → ElevenLabs + MiniMax
 */

import { requireAuth } from './auth'
import {
  generateScript,
  generateCopy,
  generateStrategy,
  generateHooks,
  generateCloneScript,
  type GenerateScriptParams,
  type GenerateCopyParams,
  type GenerateStrategyParams,
} from '@/lib/ai/text'
import {
  generateImage,
  generateCampaignVisual,
  generateAvatarPhoto,
  generateMoodboard,
  generateVideoThumbnail,
  type GenerateImageParams,
} from '@/lib/ai/image'
import {
  submitVideoGeneration,
  getVideoStatus,
  type GenerateVideoParams,
  type VideoEngine,
} from '@/lib/ai/video'
import {
  generateSpeech,
  type GenerateSpeechParams,
} from '@/lib/ai/tts'

// ─── Texte : Claude + ChatGPT ────────────────────────────────────────────────

export async function actionGenerateScript(params: GenerateScriptParams) {
  await requireAuth()
  return generateScript(params)
}

export async function actionGenerateCopy(params: GenerateCopyParams) {
  await requireAuth()
  return generateCopy(params)
}

/** Stratégie — Claude par défaut (raisonnement profond) */
export async function actionGenerateStrategy(params: GenerateStrategyParams) {
  await requireAuth()
  return generateStrategy({ ...params, model: params.model ?? 'claude' })
}

export async function actionGenerateHooks(
  campaignDna: string,
  count?: number,
  model?: 'chatgpt' | 'claude',
) {
  await requireAuth()
  return generateHooks(campaignDna, count, model)
}

/** Clone Lab — Claude génère un script dans le style d'un persona */
export async function actionGenerateCloneScript(options: {
  personaDescription: string
  product:            string
  platform:           'tiktok' | 'instagram' | 'youtube'
  duration?:          number
}) {
  await requireAuth()
  return generateCloneScript(options)
}

// ─── Image : Nano Banana + Flux Pro ─────────────────────────────────────────

export async function actionGenerateImage(params: GenerateImageParams) {
  await requireAuth()
  return generateImage(params)
}

/** Visuel campagne HD — Flux Pro */
export async function actionGenerateCampaignVisual(options: {
  campaignName: string
  dna:          string
  style?:       string
  format?:      '16:9' | '9:16' | '1:1'
}) {
  await requireAuth()
  return generateCampaignVisual(options)
}

/** Photo avatar — Flux Pro (portrait photoréaliste) */
export async function actionGenerateAvatarPhoto(options: {
  name:       string
  age?:       number
  ethnicity?: string
  style?:     string
  setting?:   string
}) {
  await requireAuth()
  return generateAvatarPhoto(options)
}

/** Moodboard 4 images — Nano Banana (rapide & créatif) */
export async function actionGenerateMoodboard(campaignDna: string, count?: number) {
  await requireAuth()
  return generateMoodboard(campaignDna, count)
}

/** Thumbnail vidéo — Nano Banana */
export async function actionGenerateVideoThumbnail(options: {
  title:   string
  style?:  string
  format?: '16:9' | '9:16' | '1:1'
}) {
  await requireAuth()
  return generateVideoThumbnail(options)
}

// ─── Vidéo : Kling AI + Seedance ────────────────────────────────────────────

/** Soumet un job vidéo (Kling ou Seedance) — retourne immédiatement */
export async function actionSubmitVideo(params: GenerateVideoParams) {
  await requireAuth()
  return submitVideoGeneration(params)
}

/** Récupère le statut d'un job vidéo en cours */
export async function actionGetVideoStatus(generationId: string, engine?: VideoEngine) {
  await requireAuth()
  return getVideoStatus(generationId, engine)
}

// ─── TTS : ElevenLabs + MiniMax ─────────────────────────────────────────────

export async function actionGenerateSpeech(params: GenerateSpeechParams) {
  await requireAuth()
  return generateSpeech(params)
}
