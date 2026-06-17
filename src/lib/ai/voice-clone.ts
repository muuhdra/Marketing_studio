/**
 * Clonage de voix — ElevenLabs Instant Voice Cloning.
 *
 * RÉSERVÉ à la Campagne Spéciale. AIML ne fait pas de gestion de voix :
 * le clonage passe par une API ElevenLabs DÉDIÉE qui sera ajoutée ultérieurement.
 *
 * Tant que `ELEVENLABS_CLONE_ENABLED=true` n'est pas posé (et l'endpoint dédié branché),
 * l'appel échoue proprement — aucun appel hasardeux n'est émis.
 *
 * Point d'intégration unique : `cloneVoiceElevenLabs()`.
 */

export interface CloneVoiceParams {
  name:      string   // nom de la voix clonée (ex. nom de l'avatar)
  sampleUrl: string   // URL Storage de l'échantillon audio (≥ 30s)
}

export interface CloneVoiceResult {
  voiceId:  string
  provider: 'elevenlabs'
}

export function isVoiceCloneEnabled(): boolean {
  return process.env.ELEVENLABS_CLONE_ENABLED === 'true' && !!process.env.ELEVENLABS_API_KEY
}

export async function cloneVoiceElevenLabs(_params: CloneVoiceParams): Promise<CloneVoiceResult> {
  if (!isVoiceCloneEnabled()) {
    throw new Error(
      'Clonage de voix bientôt disponible — l\'API dédiée ElevenLabs n\'est pas encore configurée.',
    )
  }

  // ── POINT D'INTÉGRATION (à brancher quand l'API dédiée est fournie) ──
  // Flux ElevenLabs Instant Voice Cloning :
  //   1. récupérer l'échantillon depuis Storage (_params.sampleUrl)
  //   2. POST https://api.elevenlabs.io/v1/voices/add  (multipart: name, files[])
  //      header: 'xi-api-key': process.env.ELEVENLABS_API_KEY
  //   3. récupérer voice_id de la réponse → CloneVoiceResult
  throw new Error('Clonage non implémenté — point d\'intégration prêt (voir voice-clone.ts).')
}
