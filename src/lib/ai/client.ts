/**
 * AIML API — Client unifié
 *
 * Une seule clé (AIMLAPI_KEY) donne accès à tous les modèles.
 * SDK OpenAI-compatible pour v1 (text + image).
 * fetch natif pour v2 (vidéo async, TTS avancé).
 *
 * Docs : https://docs.aimlapi.com
 * Base : https://api.aimlapi.com/v1  (text + image)
 *        https://api.aimlapi.com/v2  (video + tts)
 */

import OpenAI from 'openai'

// ─── Constantes ──────────────────────────────────────────────────────────────

export const AIML_BASE_V1 = 'https://api.aimlapi.com/v1'
export const AIML_BASE_V2 = 'https://api.aimlapi.com/v2'

/**
 * Modèles utilisés dans Marketing Studio — tous accessibles via AIML API.
 *
 * 1. TEXTE     → Claude (Anthropic) + ChatGPT (OpenAI)
 * 2. IMAGE     → Nano Banana + Flux (Black Forest Labs)
 * 3. VIDÉO     → Kling AI + Seedance (ByteDance)
 * 4. VOIX/TTS  → ElevenLabs + MiniMax
 */
export const MODELS = {

  // ── 1. Texte ─────────────────────────────────────────────────────────────
  text: {
    // ChatGPT — scripts, copy, hooks (rapide)
    chatgpt:      'gpt-4o',
    chatgptFast:  'gpt-4o-mini',
    // Claude — stratégie, orchestration, raisonnement complexe
    claude:       'claude-opus-4-5',
    claudeFast:   'claude-3-5-haiku-20241022',
  },

  // ── 2. Image ─────────────────────────────────────────────────────────────
  image: {
    // Nano Banana — génération rapide, style unique
    nanoBanana:   'nanobanana',
    // Flux — haute qualité, usage commercial
    fluxPro:      'flux-pro/v1.1',
    fluxFast:     'flux/schnell',
  },

  // ── 3. Vidéo ─────────────────────────────────────────────────────────────
  video: {
    // Kling AI — UGC réaliste, vidéos avatar
    klingStandard:  'kling-video/v1.6/standard/text-to-video',
    klingPro:       'kling-video/v2.1/pro/text-to-video',
    klingImg2Vid:   'kling-video/v2.1/pro/image-to-video',
    // Seedance — ByteDance, style cinématique
    seedanceLite:   'seedance-1-lite',
    seedancePro:    'seedance-1-pro',
  },

  // ── 4. Voix / TTS ────────────────────────────────────────────────────────
  tts: {
    // ElevenLabs — clonage vocal, multilingue, émotionnel
    elevenLabs:     'eleven_multilingual_v2',
    elevenTurbo:    'eleven_turbo_v2_5',
    // MiniMax — TTS haute qualité, voix expressives
    minimax:        'minimax-speech-01',
    minimaxHD:      'minimax-speech-01-hd',
  },

} as const

// ─── Types utilitaires ───────────────────────────────────────────────────────

export type TextModel  = typeof MODELS.text[keyof typeof MODELS.text]
export type ImageModel = typeof MODELS.image[keyof typeof MODELS.image]
export type VideoModel = typeof MODELS.video[keyof typeof MODELS.video]
export type TtsModel   = typeof MODELS.tts[keyof typeof MODELS.tts]

// ─── Client OpenAI-compatible ────────────────────────────────────────────────

function getApiKey() {
  const key = process.env.AIMLAPI_KEY
  if (!key) throw new Error('AIMLAPI_KEY is not set in environment variables')
  return key
}

/** Client OpenAI SDK pointant vers AIML API v1 */
export function createAimlClient() {
  return new OpenAI({
    baseURL: AIML_BASE_V1,
    apiKey:  getApiKey(),
  })
}

// ─── Fetch helper pour v2 (vidéo, tts avancé) ────────────────────────────────

export async function aimlFetch<T = unknown>(
  path:    string,
  options: RequestInit & { version?: 'v1' | 'v2' } = {},
): Promise<T> {
  const { version = 'v2', ...fetchOptions } = options
  const base = version === 'v1' ? AIML_BASE_V1 : AIML_BASE_V2

  const res = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type':  'application/json',
      ...fetchOptions.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AIML API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}
