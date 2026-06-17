'use server'

/**
 * Server Actions — AIML API
 *
 * AIMLAPI_KEY n'est jamais exposée côté client.
 * Tous les appels IA passent par ces actions serveur.
 *
 * Modèles disponibles :
 *   Texte  → Claude (Anthropic) + ChatGPT (OpenAI)
 *   Image  → Nano Banana (seul modèle image)
 *   Vidéo  → Kling AI + Seedance
 *   TTS    → ElevenLabs + MiniMax
 */

import { requireAuth } from './auth'
import {
  runResearchAgent,
  quickTrendResearch,
  type ResearchParams,
} from '@/lib/ai/research'
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
  generateAvatarSheet,
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
import {
  designVoiceFromDescription,
} from '@/lib/ai/voice-design'
import {
  cloneVoiceElevenLabs,
  isVoiceCloneEnabled,
} from '@/lib/ai/voice-clone'
import { reverseEngineerPrompt, describeAvatarFromImage } from '@/lib/ai/vision'

// ─── Research Agent : Perplexity ─────────────────────────────────────────────

/**
 * Recherche approfondie — Perplexity Sonar Pro
 * Tendances + formats viraux + actualités + contexte avatar
 */
export async function actionRunResearch(params: ResearchParams) {
  await requireAuth()
  return runResearchAgent(params)
}

/**
 * Recherche rapide — Perplexity Sonar
 * Juste les tendances et formats viraux (avant génération script)
 */
export async function actionQuickTrendResearch(options: {
  topic:    string
  platform: 'tiktok' | 'instagram' | 'youtube'
  locale?:  string
}) {
  await requireAuth()
  return quickTrendResearch(options)
}

/**
 * Pipeline complet : Research → Script
 * Perplexity cherche les tendances → Claude/ChatGPT génère le script enrichi
 */
export async function actionResearchThenScript(
  researchParams: Omit<ResearchParams, 'depth'>,
  scriptParams:   Omit<GenerateScriptParams, 'researchContext'>,
) {
  await requireAuth()

  // Étape 1 : Research Agent (Perplexity)
  const researchContext = await runResearchAgent({
    ...researchParams,
    depth: 'quick',  // rapide pour ne pas bloquer l'UX
  })

  // Étape 2 : Génération du script enrichi (Claude ou ChatGPT)
  const script = await generateScript({
    ...scriptParams,
    researchContext,
  })

  return { researchContext, script }
}

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

// ─── Image : Nano Banana ─────────────────────────────────────────────────────

export async function actionGenerateImage(params: GenerateImageParams) {
  await requireAuth()
  return generateImage(params)
}

/** Visuel campagne HD — Nano Banana (image-to-image si `imageUrl`) */
export async function actionGenerateCampaignVisual(options: {
  campaignName: string
  dna:          string
  style?:       string
  format?:      '16:9' | '9:16' | '1:1'
  imageUrl?:    string
}) {
  await requireAuth()
  return generateCampaignVisual(options)
}

/** Photo avatar — Nano Banana (depuis le profil, ou depuis un prompt dérivé d'une image) */
export async function actionGenerateAvatarPhoto(options: {
  name:       string
  age?:       number
  ethnicity?: string
  style?:     string
  setting?:   string
  traits?:    string
  descriptionPrompt?: string   // prompt issu du reverse-engineering d'une photo
}) {
  await requireAuth()
  return generateAvatarPhoto(options)
}

/** Reverse-engineering d'une photo → prompt de portrait d'avatar (Gemini vision) */
export async function actionDescribeAvatarFromImage(input: { dataUrl: string }): Promise<string> {
  await requireAuth()
  return describeAvatarFromImage(input.dataUrl)
}

/** Fiche de référence personnage (planche 3×3 multi-poses) — Nano Banana */
export async function actionGenerateAvatarSheet(options: {
  age?:       number
  ethnicity?: string
  style?:     string
  traits?:    string
  descriptionPrompt?: string
  imageUrl?:  string
}) {
  await requireAuth()
  return generateAvatarSheet(options)
}

/** Moodboard 4 images — Nano Banana (rapide & créatif ; image-to-image si `imageUrl`) */
export async function actionGenerateMoodboard(campaignDna: string, count?: number, imageUrl?: string) {
  await requireAuth()
  return generateMoodboard(campaignDna, count, imageUrl)
}

/**
 * Inspiration : reverse-engineer un prompt depuis un média de référence
 * (image ou frame de vidéo, en data URL côté client, ou URL publique).
 */
export async function actionInspireFromMedia(input: {
  dataUrl?:  string
  imageUrl?: string
  frames?:   string[]   // vidéo : frames ordonnées (décomposition Gemini)
  hint?:     string
}): Promise<string> {
  await requireAuth()
  return reverseEngineerPrompt({ imageData: input.dataUrl, imageUrl: input.imageUrl, frames: input.frames, hint: input.hint })
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

// ─── Voice Design : description simple → config voix MiniMax ─────────────────

export async function actionDesignVoiceFromDescription(input: {
  description: string
  avatarName?: string | null
  age?:        number | null
  styleTags?:  string[] | null
}) {
  await requireAuth()
  if (!input.description?.trim()) throw new Error('Description vide')
  return designVoiceFromDescription(input)
}

// ─── Clonage de voix — Campagne Spéciale uniquement (ElevenLabs, API dédiée) ──

/** Indique au client si le clonage est activé (sinon l'UI le présente comme « bientôt »). */
export async function actionIsVoiceCloneEnabled() {
  await requireAuth()
  return isVoiceCloneEnabled()
}

export async function actionCloneVoice(params: { name: string; sampleUrl: string }) {
  await requireAuth()
  // Gated : tant que l'API dédiée n'est pas configurée, renvoie une erreur claire.
  return cloneVoiceElevenLabs(params)
}
