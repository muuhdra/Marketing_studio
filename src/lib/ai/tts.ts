/**
 * AIML API — Text-to-Speech (voix avatars)
 *
 * Modèles : ElevenLabs multilingual via AIML API, OpenAI TTS
 * Usages  : voix off UGC, narration commerciale, voix avatar clone
 */

import { createAimlClient, aimlFetch, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TtsVoice =
  // Voix ElevenLabs (AIML)
  | 'Rachel'    // calme, professionnelle (FR/EN)
  | 'Antoni'    // jeune homme dynamique
  | 'Bella'     // jeune femme naturelle
  | 'Adam'      // profond, autoritaire
  | 'Domi'      // forte, confiante
  | 'Elli'      // enfantine, douce
  // Voix OpenAI TTS
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer'

export type TtsFormat  = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav'
export type TtsSpeed   = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0

export interface GenerateSpeechParams {
  text:      string
  voice?:    TtsVoice
  model?:    'eleven_multilingual_v2' | 'tts-1' | 'tts-1-hd'
  format?:   TtsFormat
  speed?:    TtsSpeed
}

export interface SpeechResult {
  audioBase64?: string            // si retourné directement
  audioUrl?:    string            // si URL signée
  durationMs?:  number
  model:        string
  voice:        string
}

// ─── OpenAI TTS (via AIML API) ───────────────────────────────────────────────

/**
 * Génère une voix off via le SDK OpenAI-compatible.
 * Retourne un ArrayBuffer (audio binaire).
 */
export async function generateSpeechOpenAI(
  params: GenerateSpeechParams,
): Promise<ArrayBuffer> {
  const client = createAimlClient()

  const response = await client.audio.speech.create({
    model:           params.model ?? MODELS.tts.openai,
    voice:           (params.voice ?? 'nova') as Parameters<typeof client.audio.speech.create>[0]['voice'],
    input:           params.text,
    response_format: (params.format ?? 'mp3') as Parameters<typeof client.audio.speech.create>[0]['response_format'],
    speed:           params.speed ?? 1.0,
  })

  return response.arrayBuffer()
}

// ─── ElevenLabs via AIML API v1 ─────────────────────────────────────────────

interface ElevenLabsTtsResponse {
  audio_base64?: string
  audio?:        string
}

/**
 * Génère une voix via ElevenLabs (qualité supérieure, multilingual).
 */
export async function generateSpeechElevenLabs(params: {
  text:    string
  voice?:  TtsVoice
  model?:  string
}): Promise<string /* base64 audio */> {
  const body = {
    model:      params.model ?? MODELS.tts.default,
    input:      params.text,
    voice:      params.voice ?? 'Rachel',
  }

  const response = await aimlFetch<ElevenLabsTtsResponse>('/audio/speech', {
    method:  'POST',
    body:    JSON.stringify(body),
    version: 'v1',
  })

  return response.audio_base64 ?? response.audio ?? ''
}

// ─── Fonction unifiée ────────────────────────────────────────────────────────

/**
 * Génère de la parole — choisit ElevenLabs si voix EL, sinon OpenAI TTS.
 */
export async function generateSpeech(params: GenerateSpeechParams): Promise<SpeechResult> {
  const elevenLabsVoices: TtsVoice[] = ['Rachel', 'Antoni', 'Bella', 'Adam', 'Domi', 'Elli']
  const isElevenLabs = elevenLabsVoices.includes(params.voice ?? 'nova')

  if (isElevenLabs || params.model === 'eleven_multilingual_v2') {
    const audio = await generateSpeechElevenLabs({
      text:  params.text,
      voice: params.voice,
      model: params.model ?? MODELS.tts.default,
    })
    return {
      audioBase64: audio,
      model:       params.model ?? MODELS.tts.default,
      voice:       params.voice ?? 'Rachel',
    }
  }

  // OpenAI TTS — retourne ArrayBuffer → converti en base64
  const buffer = await generateSpeechOpenAI(params)
  const base64  = Buffer.from(buffer).toString('base64')
  return {
    audioBase64: base64,
    model:       params.model ?? MODELS.tts.openai,
    voice:       params.voice ?? 'nova',
  }
}

// ─── Voix recommandées par profil avatar ────────────────────────────────────

export const VOICE_PROFILES = [
  { id: 'rachel',  label: 'Rachel',  desc: 'Calme & professionnelle',  gender: 'f', lang: 'FR/EN', preview: 'Rachel' as TtsVoice },
  { id: 'bella',   label: 'Bella',   desc: 'Naturelle & chaleureuse',  gender: 'f', lang: 'FR/EN', preview: 'Bella'  as TtsVoice },
  { id: 'domi',    label: 'Domi',    desc: 'Forte & confiante',        gender: 'f', lang: 'EN',    preview: 'Domi'   as TtsVoice },
  { id: 'elli',    label: 'Elli',    desc: 'Douce & jeune',            gender: 'f', lang: 'EN',    preview: 'Elli'   as TtsVoice },
  { id: 'adam',    label: 'Adam',    desc: 'Profond & autoritaire',    gender: 'm', lang: 'EN',    preview: 'Adam'   as TtsVoice },
  { id: 'antoni', label: 'Antoni', desc: 'Dynamique & jeune',        gender: 'm', lang: 'EN',    preview: 'Antoni' as TtsVoice },
  { id: 'nova',    label: 'Nova',    desc: 'Chaleureuse (OpenAI)',     gender: 'f', lang: 'Multi', preview: 'nova'   as TtsVoice },
  { id: 'onyx',    label: 'Onyx',    desc: 'Grave & profond (OpenAI)', gender: 'm', lang: 'Multi', preview: 'onyx'   as TtsVoice },
] as const
