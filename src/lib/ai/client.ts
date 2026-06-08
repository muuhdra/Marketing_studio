/**
 * AIML API — Client unifié
 *
 * AIML API est OpenAI-compatible → on utilise le SDK openai avec baseURL custom.
 * Pour les endpoints video/TTS (v2), on passe par fetch directement.
 *
 * Docs : https://docs.aimlapi.com
 * Base : https://api.aimlapi.com/v1  (text + image)
 *        https://api.aimlapi.com/v2  (video + tts avancé)
 */

import OpenAI from 'openai'

// ─── Constantes ──────────────────────────────────────────────────────────────

export const AIML_BASE_V1 = 'https://api.aimlapi.com/v1'
export const AIML_BASE_V2 = 'https://api.aimlapi.com/v2'

// Modèles recommandés par usage
export const MODELS = {
  // Texte — orchestration, scripts, copy
  text: {
    fast:    'gpt-4o-mini',                // rapide + économique
    smart:   'gpt-4o',                     // qualité prod
    pro:     'claude-opus-4-5',            // raisonnement complexe (stratégie)
  },
  // Image — visuels campagne
  image: {
    fast:    'flux/schnell',               // 4 étapes, <5s
    quality: 'flux-pro/v1.1',             // haute qualité
    hd:      'dall-e-3',                   // OpenAI DALL-E 3
  },
  // Vidéo — UGC, commerciaux
  video: {
    fast:    'kling-video/v1.6/standard/text-to-video',  // standard ~2min
    pro:     'kling-video/v2.1/pro/text-to-video',       // pro ~5min
    seedance: 'seedance-1-lite',                          // ByteDance
  },
  // TTS — voix avatars
  tts: {
    default: 'eleven_multilingual_v2',     // ElevenLabs via AIML
    openai:  'tts-1-hd',                   // OpenAI TTS
  },
} as const

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
