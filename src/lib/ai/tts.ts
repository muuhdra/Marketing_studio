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

// Catalogue de voix + émotions — défini dans voice-catalog (client-safe), ré-exporté ici.
export {
  VOICE_PROFILES,
  getVoiceProfile,
  MINIMAX_EMOTIONS,
  type VoiceProfile,
  type VoiceEngine,
  type MinimaxEmotion,
} from './voice-catalog'
import type { MinimaxEmotion } from './voice-catalog'

export interface GenerateSpeechParams {
  text:     string
  engine?:  TtsEngine
  voice?:   TtsVoice
  model?:   string       // override model ID explicite
  format?:  TtsFormat
  speed?:   number       // 0.5 – 2.0
  pitch?:   number       // MiniMax : -12 à 12
  emotion?: MinimaxEmotion  // MiniMax uniquement
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
    model: params.model ?? MODELS.tts.elevenTurbo,
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

// L'audio peut être une chaîne (URL ou base64) OU un objet { url } selon le modèle.
type MinimaxAudio = string | { url?: string } | undefined
interface MinimaxTtsResponse {
  audio_file?: MinimaxAudio
  audio?:      MinimaxAudio
  data?: { audio?: MinimaxAudio }
  meta?: { credits_used?: number; usd_spent?: number }
}

export async function generateSpeechMinimax(params: {
  text:     string
  voice?:   MinimaxVoice
  model?:   string
  speed?:   number
  pitch?:   number
  emotion?: MinimaxEmotion
}): Promise<string /* base64 */> {
  // Contrat AIML : POST /v1/tts · champ `text` · modèle 'minimax/speech-2.6-hd' · réponse `audio` (URL).
  const body = {
    model: params.model ?? MODELS.tts.minimax,
    text:  params.text,
    voice_setting: {
      voice_id: params.voice ?? 'Wise_Woman',
      speed:    params.speed ?? 1.0,
      pitch:    params.pitch ?? 0,
      vol:      1.0,
      ...(params.emotion ? { emotion: params.emotion } : {}),
    },
  }

  const response = await aimlFetch<MinimaxTtsResponse>('/tts', {
    method:  'POST',
    body:    JSON.stringify(body),
    version: 'v1',
  })

  // Le champ audio peut être une chaîne (URL/base64) OU un objet { url }.
  const field = response.audio ?? response.audio_file ?? response.data?.audio
  const audio = typeof field === 'string' ? field : (field?.url ?? '')
  if (!audio) return ''
  // URL → on télécharge et convertit en base64 pour conserver le contrat audioBase64.
  if (/^https?:\/\//.test(audio)) {
    const fileRes = await fetch(audio)
    return Buffer.from(await fileRes.arrayBuffer()).toString('base64')
  }
  return audio
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
  const engine = params.engine ?? 'minimax'   // défaut = MiniMax (ElevenLabs réservé au clonage)

  if (engine === 'minimax') {
    const audio = await generateSpeechMinimax({
      text:    params.text,
      voice:   params.voice as MinimaxVoice | undefined,
      model:   params.model,
      speed:   params.speed,
      pitch:   params.pitch,
      emotion: params.emotion,
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
    model:       params.model ?? MODELS.tts.elevenTurbo,
    voice:       params.voice ?? 'Rachel',
  }
}

