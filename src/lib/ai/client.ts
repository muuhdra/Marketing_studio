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
 * ASSIGNATIONS :
 *   Scripts UGC           → ChatGPT GPT-4o   (créativité, rapidité)
 *   Stratégie campagne    → Claude Opus 4    (raisonnement profond)
 *   Clone Lab             → Claude Opus 4    (analyse persona + style)
 *   Visuels campagne      → Nano Banana      (MODÈLE PRINCIPAL — visuels)
 *   Moodboards            → Nano Banana      (4 variations rapides)
 *   Thumbnails vidéo      → Nano Banana      (impact visuel rapide)
 *   Portrait avatar       → Flux Pro         (photoréalisme portrait)
 *   Vidéo UGC (principal) → Kling v2.1 Pro   (avatars humains, talking head)
 *   Vidéo B-roll          → Seedance Pro     (plans cinématiques, produit)
 *   Voix avatar           → ElevenLabs       (émotionnel, multilingue)
 *   Voix expressif        → MiniMax          (expressif, multi-langue)
 *   Veille & tendances    → Perplexity Sonar (recherche web temps réel)
 */
export const MODELS = {

  // ── 1. Texte ─────────────────────────────────────────────────────────────
  text: {
    // ChatGPT — scripts UGC, copy, hooks (créativité + rapidité)
    chatgpt:      'gpt-4o',
    chatgptFast:  'gpt-4o-mini',
    // Claude — stratégie, Clone Lab, raisonnement profond
    claude:       'claude-opus-4-5',
    claudeFast:   'claude-3-5-haiku-20241022',
  },

  // ── 2. Image ─────────────────────────────────────────────────────────────
  image: {
    // Nano Banana — MODÈLE PRINCIPAL visuels (campagne, moodboards, thumbnails)
    nanoBanana:   'nanobanana',
    // Flux Pro — portraits avatar photoréalistes uniquement
    fluxPro:      'flux-pro/v1.1',
    fluxFast:     'flux/schnell',
  },

  // ── 3. Vidéo ─────────────────────────────────────────────────────────────
  video: {
    // Kling AI — MODÈLE PRINCIPAL vidéo (UGC, avatars, talking head, img2vid)
    klingStandard:  'kling-video/v1.6/standard/text-to-video',
    klingPro:       'kling-video/v2.1/pro/text-to-video',      // ← principal
    klingImg2Vid:   'kling-video/v2.1/pro/image-to-video',     // avatar photo → vidéo
    // Seedance — B-roll cinématique, plans produit, ambiance
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

  // ── 5. Research Agent — Perplexity (veille web temps réel) ──────────────
  research: {
    // Sonar — recherche web rapide avec citations
    sonar:          'perplexity/sonar',
    // Sonar Pro — recherche approfondie, multi-sources
    sonarPro:       'perplexity/sonar-pro',
    // Sonar Reasoning — web search + raisonnement structuré
    sonarReasoning: 'perplexity/sonar-reasoning',
  },

} as const

// ─── Types utilitaires ───────────────────────────────────────────────────────

export type TextModel     = typeof MODELS.text[keyof typeof MODELS.text]
export type ImageModel    = typeof MODELS.image[keyof typeof MODELS.image]
export type VideoModel    = typeof MODELS.video[keyof typeof MODELS.video]
export type TtsModel      = typeof MODELS.tts[keyof typeof MODELS.tts]
export type ResearchModel = typeof MODELS.research[keyof typeof MODELS.research]

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
