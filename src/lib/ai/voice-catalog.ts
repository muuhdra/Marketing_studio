/**
 * Catalogue de voix — source unique de vérité (client-safe, aucune dépendance serveur).
 * Importable depuis les composants client ET les modules serveur (tts, voice-design).
 */

export type VoiceEngine = 'elevenlabs' | 'minimax'

export type MinimaxEmotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised'

export const MINIMAX_EMOTIONS: MinimaxEmotion[] =
  ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']

export interface VoiceProfile {
  id:     string
  engine: VoiceEngine
  voice:  string          // voice_id provider (ex. 'Wise_Woman', 'Rachel')
  label:  string
  gender: 'f' | 'm' | 'n'
  age:    'young' | 'adult' | 'mature'
  tags:   string[]        // descripteurs de ton (doux, dynamique, grave…)
  lang:   string
}

// Synthèse TTS = MiniMax uniquement (via AIML `/v1/tts`, vérifié).
// ElevenLabs n'est pas fiable en synthèse via AIML → réservé au clonage (API directe).
export const VOICE_PROFILES: VoiceProfile[] = [
  // ── MiniMax ──
  { id: 'wise',          engine: 'minimax', voice: 'Wise_Woman',         label: 'Sage',        gender: 'f', age: 'mature', tags: ['sage', 'posée', 'sereine'],            lang: 'Multi' },
  { id: 'calm',          engine: 'minimax', voice: 'Calm_Woman',         label: 'Calme',       gender: 'f', age: 'adult',  tags: ['calme', 'douce', 'rassurante'],        lang: 'Multi' },
  { id: 'lively',        engine: 'minimax', voice: 'Lively_Girl',        label: 'Vivante',     gender: 'f', age: 'young',  tags: ['vivante', 'enthousiaste', 'pétillante'], lang: 'Multi' },
  { id: 'inspirational', engine: 'minimax', voice: 'Inspirational_girl', label: 'Inspirante',  gender: 'f', age: 'young',  tags: ['inspirante', 'motivante', 'positive'], lang: 'Multi' },
  { id: 'friendly',      engine: 'minimax', voice: 'Friendly_Person',    label: 'Amicale',     gender: 'n', age: 'adult',  tags: ['amical', 'accessible', 'sympathique'], lang: 'Multi' },
  { id: 'deep',          engine: 'minimax', voice: 'Deep_Voice_Man',     label: 'Grave',       gender: 'm', age: 'adult',  tags: ['grave', 'profond', 'impactant'],       lang: 'Multi' },
  { id: 'casual',        engine: 'minimax', voice: 'Casual_Guy',         label: 'Décontracté', gender: 'm', age: 'young',  tags: ['décontracté', 'naturel', 'cool'],      lang: 'Multi' },
  { id: 'patient',       engine: 'minimax', voice: 'Patient_Man',        label: 'Posé',        gender: 'm', age: 'mature', tags: ['posé', 'patient', 'pédagogue'],        lang: 'Multi' },
]

export function getVoiceProfile(id: string | null | undefined): VoiceProfile | undefined {
  return id ? VOICE_PROFILES.find((p) => p.id === id) : undefined
}
