'use server'

/**
 * Server Actions — AIML API
 *
 * Ces actions s'exécutent côté serveur (AIMLAPI_KEY jamais exposée au client).
 * Appelables directement depuis les composants 'use client' via import.
 */

import { requireAuth } from './auth'
import {
  generateScript,
  generateCopy,
  generateStrategy,
  generateHooks,
  type GenerateScriptParams,
  type GenerateCopyParams,
  type GenerateStrategyParams,
} from '@/lib/ai/text'
import {
  generateImage,
  generateCampaignVisual,
  generateAvatarPhoto,
  generateMoodboard,
  type GenerateImageParams,
} from '@/lib/ai/image'
import {
  submitVideoGeneration,
  getVideoStatus,
  type GenerateVideoParams,
} from '@/lib/ai/video'
import {
  generateSpeech,
  type GenerateSpeechParams,
} from '@/lib/ai/tts'

// ─── Texte ────────────────────────────────────────────────────────────────────

export async function actionGenerateScript(params: GenerateScriptParams) {
  await requireAuth()
  return generateScript(params)
}

export async function actionGenerateCopy(params: GenerateCopyParams) {
  await requireAuth()
  return generateCopy(params)
}

export async function actionGenerateStrategy(params: GenerateStrategyParams) {
  await requireAuth()
  return generateStrategy(params)
}

export async function actionGenerateHooks(campaignDna: string, count?: number) {
  await requireAuth()
  return generateHooks(campaignDna, count)
}

// ─── Image ────────────────────────────────────────────────────────────────────

export async function actionGenerateImage(params: GenerateImageParams) {
  await requireAuth()
  return generateImage(params)
}

export async function actionGenerateCampaignVisual(options: {
  campaignName: string
  dna:          string
  style?:       string
  format?:      '16:9' | '9:16' | '1:1'
}) {
  await requireAuth()
  return generateCampaignVisual(options)
}

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

export async function actionGenerateMoodboard(campaignDna: string, count?: number) {
  await requireAuth()
  return generateMoodboard(campaignDna, count)
}

// ─── Vidéo (async) ───────────────────────────────────────────────────────────

/** Soumet un job vidéo — retourne immédiatement avec generationId */
export async function actionSubmitVideo(params: GenerateVideoParams) {
  await requireAuth()
  return submitVideoGeneration(params)
}

/** Récupère le statut d'un job vidéo */
export async function actionGetVideoStatus(generationId: string) {
  await requireAuth()
  return getVideoStatus(generationId)
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

export async function actionGenerateSpeech(params: GenerateSpeechParams) {
  await requireAuth()
  return generateSpeech(params)
}
