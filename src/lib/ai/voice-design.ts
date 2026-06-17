/**
 * Voice Design — personnalisation de la voix d'un avatar par description simple.
 *
 * AIML ne fait que de la SYNTHÈSE (pas de clonage/voice-design ElevenLabs).
 * On obtient donc une « voix personnalisée » en mappant une description libre
 * vers une configuration MiniMax : voix de base du catalogue + émotion/vitesse/pitch.
 * Le mapping est interprété par Claude (langage naturel → config structurée).
 */

import { createAimlClient, MODELS } from './client'
import { parseJsonLoose } from './json'
import { VOICE_PROFILES, getVoiceProfile, MINIMAX_EMOTIONS, type MinimaxEmotion, type VoiceProfile } from './voice-catalog'

const MINIMAX_PROFILES = VOICE_PROFILES.filter((p) => p.engine === 'minimax')
const EMOTIONS = MINIMAX_EMOTIONS

export interface VoiceDesign {
  profileId: string
  engine:    'minimax'
  voice:     string          // voice_id MiniMax
  label:     string
  settings:  { emotion: MinimaxEmotion; speed: number; pitch: number }
}

const clamp = (n: number, min: number, max: number, fallback: number) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback

/**
 * Mappe une description libre (+ indices avatar) vers une config voix MiniMax.
 * Déterministe à défaut : si Claude renvoie un id inconnu, on retombe proprement.
 */
export async function designVoiceFromDescription(input: {
  description: string
  avatarName?: string | null
  age?:        number | null
  styleTags?:  string[] | null
}): Promise<VoiceDesign> {
  const client = createAimlClient()

  const catalogue = MINIMAX_PROFILES
    .map((p) => `- ${p.id} : ${p.label} · ${p.gender === 'f' ? 'féminine' : p.gender === 'm' ? 'masculine' : 'neutre'} · ${p.age} · ${p.tags.join(', ')}`)
    .join('\n')

  const response = await client.chat.completions.create({
    model: MODELS.text.claude,
    messages: [
      {
        role: 'system',
        content: `Tu es un directeur de casting vocal. À partir d'une description, tu choisis la voix de base la plus adaptée dans un catalogue, puis tu règles l'émotion, la vitesse et la hauteur (pitch). Réponds uniquement en JSON.`,
      },
      {
        role: 'user',
        content: `Choisis et règle la voix correspondant à cette description.

RÈGLE PRIORITAIRE : la voix DOIT correspondre au GENRE de la personne décrite — voix féminine pour une femme/fille, voix masculine pour un homme/garçon, neutre seulement si le genre est ambigu. Ne te trompe jamais de genre.

DESCRIPTION : "${input.description}"
${input.avatarName ? `AVATAR : ${input.avatarName}` : ''}
${input.age ? `ÂGE : ${input.age} ans` : ''}
${input.styleTags?.length ? `STYLE : ${input.styleTags.join(', ')}` : ''}

CATALOGUE (choisis un seul "profileId" dans cette liste) :
${catalogue}

ÉMOTIONS possibles : ${EMOTIONS.join(', ')}

JSON exact :
{
  "profileId": "<un id du catalogue>",
  "emotion": "<une émotion de la liste>",
  "speed": <nombre 0.8 à 1.3, défaut 1.0>,
  "pitch": <entier -6 à 6, défaut 0>
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 200,
  })

  // Parse tolérant ; en cas d'échec on garde {} → le repli déterministe ci-dessous s'applique
  let raw: { profileId?: string; emotion?: string; speed?: number; pitch?: number } = {}
  try { raw = parseJsonLoose(response.choices[0]?.message?.content) } catch { /* repli déterministe */ }

  // Genre attendu déduit de la description (garde-fou anti-erreur de genre)
  const desc = input.description.toLowerCase()
  const femaleHint = /\b(femme|fille|woman|female|girl|f[ée]minine?|elle|madame|jeune femme)\b/.test(desc)
  const maleHint   = /\b(homme|gar[çc]on|man|male|boy|masculine?|il|monsieur)\b/.test(desc)
  const wantGender: 'f' | 'm' | null = femaleHint && !maleHint ? 'f' : maleHint && !femaleHint ? 'm' : null

  // Validation + repli déterministe, en respectant le genre détecté
  const candidate = getVoiceProfile(raw.profileId)
  const picked = candidate?.engine === 'minimax' ? candidate : null
  // On rejette le choix de Claude s'il contredit le genre clairement décrit
  const valid = picked && (!wantGender || picked.gender === wantGender) ? picked : null
  const profile: VoiceProfile =
    valid
    ?? (wantGender ? MINIMAX_PROFILES.find((p) => p.gender === wantGender) : undefined)
    ?? MINIMAX_PROFILES[0]
  const emotion: MinimaxEmotion = EMOTIONS.includes(raw.emotion as MinimaxEmotion) ? (raw.emotion as MinimaxEmotion) : 'neutral'

  return {
    profileId: profile.id,
    engine:    'minimax',
    voice:     profile.voice as string,
    label:     profile.label,
    settings: {
      emotion,
      speed: clamp(Number(raw.speed), 0.8, 1.3, 1.0),
      pitch: Math.round(clamp(Number(raw.pitch), -6, 6, 0)),
    },
  }
}
