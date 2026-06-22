/**
 * Catalogue de voix — source unique de vérité (client-safe, aucune dépendance serveur).
 * Importable depuis les composants client ET les modules serveur (tts, voice-design).
 */

export type VoiceEngine = 'elevenlabs' | 'minimax'

export type MinimaxEmotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised'

export const MINIMAX_EMOTIONS: MinimaxEmotion[] =
  ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']

// Langues générées par les voix multilingues (MiniMax `speech-2.6-hd` & ElevenLabs `multilingual-v2`).
// Toutes les voix du catalogue sont `lang: 'Multi'` → elles couvrent ce même jeu de langues.
export interface VoiceLanguage { code: string; flag: string; label: string }
export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'Anglais' },
  { code: 'es', flag: '🇪🇸', label: 'Espagnol' },
  { code: 'de', flag: '🇩🇪', label: 'Allemand' },
  { code: 'it', flag: '🇮🇹', label: 'Italien' },
  { code: 'pt', flag: '🇵🇹', label: 'Portugais' },
  { code: 'nl', flag: '🇳🇱', label: 'Néerlandais' },
  { code: 'pl', flag: '🇵🇱', label: 'Polonais' },
  { code: 'ja', flag: '🇯🇵', label: 'Japonais' },
  { code: 'zh', flag: '🇨🇳', label: 'Chinois' },
  { code: 'ar', flag: '🇸🇦', label: 'Arabe' },
  { code: 'hi', flag: '🇮🇳', label: 'Hindi' },
]

// Langues d'une voix (toutes multilingues pour l'instant ; prêt pour des voix mono-langue futures).
export function getVoiceLanguages(_profile?: { lang?: string }): VoiceLanguage[] {
  return VOICE_LANGUAGES
}

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

// Synthèse TTS via AIML : MiniMax (`/v1/tts`) + ElevenLabs (`/v1/audio/speech`).
// Le CLONAGE de voix (échantillon → voix custom) reste réservé à ElevenLabs API dédiée (gated).
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

  // ── ElevenLabs (synthèse via AIML `/v1/audio/speech`) ──
  { id: 'rachel', engine: 'elevenlabs', voice: 'Rachel', label: 'Rachel', gender: 'f', age: 'adult',  tags: ['calme', 'professionnelle', 'claire'], lang: 'Multi' },
  { id: 'bella',  engine: 'elevenlabs', voice: 'Bella',  label: 'Bella',  gender: 'f', age: 'adult',  tags: ['naturelle', 'chaleureuse', 'douce'],  lang: 'Multi' },
  { id: 'domi',   engine: 'elevenlabs', voice: 'Domi',   label: 'Domi',   gender: 'f', age: 'adult',  tags: ['forte', 'confiante', 'assurée'],      lang: 'Multi' },
  { id: 'elli',   engine: 'elevenlabs', voice: 'Elli',   label: 'Elli',   gender: 'f', age: 'young',  tags: ['douce', 'jeune', 'délicate'],         lang: 'Multi' },
  { id: 'adam',   engine: 'elevenlabs', voice: 'Adam',   label: 'Adam',   gender: 'm', age: 'mature', tags: ['profond', 'autoritaire', 'posé'],     lang: 'Multi' },
  { id: 'antoni', engine: 'elevenlabs', voice: 'Antoni', label: 'Antoni', gender: 'm', age: 'young',  tags: ['dynamique', 'jeune', 'énergique'],    lang: 'Multi' },
]

export function getVoiceProfile(id: string | null | undefined): VoiceProfile | undefined {
  return id ? VOICE_PROFILES.find((p) => p.id === id) : undefined
}
