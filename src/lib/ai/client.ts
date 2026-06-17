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
 *   Visuels campagne      → Nano Banana      (MODÈLE PRINCIPAL — tous les visuels)
 *   Moodboards            → Nano Banana      (4 variations rapides)
 *   Thumbnails vidéo      → Nano Banana      (impact visuel rapide)
 *   Portraits avatar      → Nano Banana      (portraits photoréalistes)
 *   Vidéo UGC (principal) → Kling v2.1 Pro   (avatars humains, talking head)
 *   Vidéo B-roll          → Seedance Pro     (plans cinématiques, produit)
 *   Voix avatar           → ElevenLabs       (émotionnel, multilingue)
 *   Voix expressif        → MiniMax          (expressif, multi-langue)
 *   Veille & tendances    → Perplexity Sonar (recherche web temps réel)
 */
// ⚠️ AIML limite une clé API à 10 modèles. Cette liste DOIT correspondre
// exactement aux 10 modèles activés sur la clé (sinon erreur "model not allowed").
// 10 modèles : GPT-4o · Claude 4.5 Opus · Gemini 2.5 Flash · Nano Banana 2 ·
//   Eleven Turbo v2.5 · Sonar · Seedance 2.0 · Speech 2.8 HD ·
//   Kling 2.1 Pro Image-to-Video · Kling 2.1 Master Text-to-Video
export const MODELS = {

  // ── 1. Texte (3) ─────────────────────────────────────────────────────────
  text: {
    chatgpt: 'gpt-4o',                    // GPT-4o — scripts UGC, copy, hooks
    claude:  'claude-opus-4-5',           // Claude 4.5 Opus — stratégie, Clone Lab
    gemini:  'google/gemini-2.5-flash',   // Gemini 2.5 Flash — analyse vidéo frame par frame
  },

  // ── 2. Image (1) ─────────────────────────────────────────────────────────
  image: {
    nanoBanana: 'google/nano-banana-2',   // Nano Banana 2 — SEUL modèle image (confirmé AIML)
  },

  // ── 3. Vidéo (3) ─────────────────────────────────────────────────────────
  video: {
    klingText:    'klingai/v2.1-master-text-to-video',      // Kling 2.1 Master T2V (confirmé catalogue AIML)
    klingImg2Vid: 'kling-video/v2.1/pro/image-to-video',    // Kling 2.1 Pro I2V (confirmé catalogue AIML)
    seedance:     'bytedance/dreamina-seedance-2-0',        // Seedance 2.0 — B-roll (confirmé catalogue AIML)
  },

  // ── 4. Voix / TTS (2) ────────────────────────────────────────────────────
  tts: {
    minimax:     'minimax/speech-2.8-hd',  // Speech 2.8 HD — synthèse principale (AIML : POST /v1/tts)
    elevenTurbo: 'elevenlabs/eleven_turbo_v2_5',  // Eleven Turbo v2.5 — clonage vocal (confirmé catalogue AIML)
  },

  // ── 5. Research Agent — Perplexity (1) ───────────────────────────────────
  research: {
    sonar: 'perplexity/sonar',             // Sonar — veille web temps réel
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
