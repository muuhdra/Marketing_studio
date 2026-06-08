/**
 * AIML API — Text-to-Speech
 *
 * ElevenLabs  → clonage vocal, multilingue, émotionnel (voix avatars)
 * MiniMax     → TTS HD haute qualité, expressif, voix variées
 *
 * Les deux via la même clé AIMLAPI_KEY.
 */

import { createAimlClient, aimlFetch, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TtsEngine = 'elevenlabs' | 'minimax'

// Voix ElevenLabs
export type ElevenLabsVoice =
  | 'Rachel'    // calme, professionnelle — FR/EN
  | 'Bella'     // naturelle, chaleureuse
  | 'Domi'      // forte, confiante
  | 'Elli'      // douce, jeune
  | 'Adam'      // profond, autoritaire
  | 'Antoni'    // dynamique, jeune homme

// Voix MiniMax
export type MinimaxVoice =
  | 'Wise_Woman'
  | 'Friendly_Person'
  | 'Inspirational_girl'
  | 'Deep_Voice_Man'
  | 'Calm_Woman'
  | 'Casual_Guy'
  | 'Lively_Girl'
  | 'Patient_Man'

export type TtsVoice  = ElevenLabsVoice | MinimaxVoice
export type TtsFormat = 'mp3' | 'opus' | 'wav'

export interface GenerateSpeechParams {
  text:    string
  engine?: TtsEngine
  voice?:  TtsVoice
  model?:  string       // override model ID explicite
  format?: TtsFormat
  speed?:  number       // 0.5 – 2.0
}

export interface SpeechResult {
  audioBase64: string
  engine:      TtsEngine
  model:       string
  voice:       string
}

// ─── ElevenLabs via AIML API ─────────────────────────────────────────────────

interface ElevenLabsResponse {
  audio_base64?: string
  audio?:        string
}

export async function generateSpeechElevenLabs(params: {
  text:   string
  voice?: ElevenLabsVoice
  model?: string
  speed?: number
}): Promise<string /* base64 */> {
  const body = {
    model: params.model ?? MODELS.tts.elevenLabs,
    input: params.text,
    voice: params.voice ?? 'Rachel',
    ...(params.speed ? { speed: params.speed } : {}),
  }

  const response = await aimlFetch<ElevenLabsResponse>('/audio/speech', {
    method:  'POST',
    body:    JSON.stringify(body),
    version: 'v1',
  })

  return response.audio_base64 ?? response.audio ?? ''
}

// ─── MiniMax via AIML API ─────────────────────────────────────────────────────

interface MinimaxTtsResponse {
  audio_file?: string
  audio?:      string
  data?: {
    audio?: string
  }
}

export async function generateSpeechMinimax(params: {
  text:   string
  voice?: MinimaxVoice
  model?: string
  speed?: number
}): Promise<string /* base64 */> {
  const body = {
    model:  params.model ?? MODELS.tts.minimax,
    input:  params.text,
    voice_setting: {
      voice_id: params.voice ?? 'Wise_Woman',
      speed:    params.speed ?? 1.0,
      pitch:    0,
      vol:      1.0,
    },
  }

  const response = await aimlFetch<MinimaxTtsResponse>('/text-to-speech', {
    method:  'POST',
    body:    JSON.stringify(body),
    version: 'v2',
  })

  return response.audio_file ?? response.audio ?? response.data?.audio ?? ''
}

// ─── OpenAI TTS (fallback via SDK) ──────────────────────────────────────────

export async function generateSpeechOpenAI(params: {
  text:   string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  model?: string
  speed?: number
}): Promise<string /* base64 */> {
  const { createAimlClient } = await import('./client')
  const client = createAimlClient()

  const response = await client.audio.speech.create({
    model:           params.model ?? 'tts-1-hd',
    voice:           params.voice ?? 'nova',
    input:           params.text,
    response_format: 'mp3',
    speed:           params.speed ?? 1.0,
  })

  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

// ─── Fonction unifiée ─────────────────────────────────────────────────────────

export async function generateSpeech(params: GenerateSpeechParams): Promise<SpeechResult> {
  const engine = params.engine ?? 'elevenlabs'

  if (engine === 'minimax') {
    const audio = await generateSpeechMinimax({
      text:  params.text,
      voice: params.voice as MinimaxVoice | undefined,
      model: params.model,
      speed: params.speed,
    })
    return {
      audioBase64: audio,
      engine:      'minimax',
      model:       params.model ?? MODELS.tts.minimax,
      voice:       params.voice ?? 'Wise_Woman',
    }
  }

  // ElevenLabs (défaut)
  const audio = await generateSpeechElevenLabs({
    text:  params.text,
    voice: params.voice as ElevenLabsVoice | undefined,
    model: params.model,
    speed: params.speed,
  })
  return {
    audioBase64: audio,
    engine:      'elevenlabs',
    model:       params.model ?? MODELS.tts.elevenLabs,
    voice:       params.voice ?? 'Rachel',
  }
}

// ─── Profils de voix par avatar ──────────────────────────────────────────────

export const VOICE_PROFILES = [
  // ElevenLabs
  { id: 'rachel',   engine: 'elevenlabs' as TtsEngine, voice: 'Rachel'   as TtsVoice, label: 'Rachel',   gender: 'f', desc: 'Calme & professionnelle',  lang: 'FR/EN' },
  { id: 'bella',    engine: 'elevenlabs' as TtsEngine, voice: 'Bella'    as TtsVoice, label: 'Bella',    gender: 'f', desc: 'Naturelle & chaleureuse',  lang: 'FR/EN' },
  { id: 'domi',     engine: 'elevenlabs' as TtsEngine, voice: 'Domi'     as TtsVoice, label: 'Domi',     gender: 'f', desc: 'Forte & confiante',        lang: 'EN'    },
  { id: 'elli',     engine: 'elevenlabs' as TtsEngine, voice: 'Elli'     as TtsVoice, label: 'Elli',     gender: 'f', desc: 'Douce & jeune',            lang: 'EN'    },
  { id: 'adam',     engine: 'elevenlabs' as TtsEngine, voice: 'Adam'     as TtsVoice, label: 'Adam',     gender: 'm', desc: 'Profond & autoritaire',    lang: 'EN'    },
  { id: 'antoni',   engine: 'elevenlabs' as TtsEngine, voice: 'Antoni'   as TtsVoice, label: 'Antoni',   gender: 'm', desc: 'Dynamique & jeune',        lang: 'EN'    },
  // MiniMax
  { id: 'wise',     engine: 'minimax'    as TtsEngine, voice: 'Wise_Woman'        as TtsVoice, label: 'Sage',     gender: 'f', desc: 'Sage & posée (MiniMax)',   lang: 'Multi' },
  { id: 'friendly', engine: 'minimax'    as TtsEngine, voice: 'Friendly_Person'   as TtsVoice, label: 'Friendly', gender: 'n', desc: 'Amical & accessible',      lang: 'Multi' },
  { id: 'lively',   engine: 'minimax'    as TtsEngine, voice: 'Lively_Girl'       as TtsVoice, label: 'Vivante',  gender: 'f', desc: 'Vivante & enthousiaste',   lang: 'Multi' },
  { id: 'deep',     engine: 'minimax'    as TtsEngine, voice: 'Deep_Voice_Man'    as TtsVoice, label: 'Deep',     gender: 'm', desc: 'Grave & impactant',        lang: 'Multi' },
  { id: 'casual',   engine: 'minimax'    as TtsEngine, voice: 'Casual_Guy'        as TtsVoice, label: 'Casual',   gender: 'm', desc: 'Décontracté & naturel',    lang: 'Multi' },
] as const

export type VoiceProfileId = typeof VOICE_PROFILES[number]['id']
