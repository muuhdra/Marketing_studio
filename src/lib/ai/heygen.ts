/**
 * HeyGen API — Video Avatar Cloning
 *
 * HEYGEN_API_KEY est strictement serveur — jamais exposée client.
 * Toutes les fonctions sont appelées uniquement depuis les Server Actions.
 *
 * Flow complet :
 *   1. uploadVideoToHeygen()    → upload vidéo source → asset URL
 *   2. createInstantAvatar()    → crée le clone IA → avatar_id (traitement ~5-15 min)
 *   3. getAvatarStatus()        → poll jusqu'à 'completed'
 *   4. generateCloneVideo()     → avatar_id + script → video_id
 *   5. getVideoStatus()         → poll jusqu'à 'completed' → videoUrl final
 */

const HEYGEN_API    = 'https://api.heygen.com'
const HEYGEN_UPLOAD = 'https://upload.heygen.com'

function getKey(): string {
  const key = process.env.HEYGEN_API_KEY
  if (!key) throw new Error('HEYGEN_API_KEY manquant dans .env.local')
  return key
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeyGenAvatar {
  avatarId:    string
  name:        string
  status:      'processing' | 'completed' | 'failed' | 'pending'
  previewUrl?: string
}

export interface HeyGenVideoResult {
  videoId:   string
  status:    'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  error?:    string
}

export type VideoRatio = '9:16' | '16:9' | '1:1'

const RATIO_DIMENSIONS: Record<VideoRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1':  { width: 1080, height: 1080 },
}

// ─── Upload vidéo source ──────────────────────────────────────────────────────

/**
 * Upload la vidéo source vers HeyGen Asset Storage.
 * Retourne l'URL publique de l'asset.
 */
export async function uploadVideoToHeygen(
  buffer:   Buffer,
  mimeType: string = 'video/mp4',
): Promise<string> {
  const key = getKey()

  const res = await fetch(`${HEYGEN_UPLOAD}/v1/asset`, {
    method:  'POST',
    headers: {
      'X-Api-Key':    key,
      'Content-Type': mimeType,
    },
    body: buffer as unknown as BodyInit,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HeyGen upload échoué: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    code: number
    data: { url: string; asset_id: string }
  }

  if (!json.data?.url) throw new Error('HeyGen upload: URL non retournée')
  return json.data.url
}

// ─── Créer un Instant Avatar ──────────────────────────────────────────────────

/**
 * Crée un Instant Avatar depuis une URL vidéo hébergée.
 * Le traitement HeyGen prend généralement 5 à 15 minutes.
 * Retourne l'avatar_id à utiliser pour le polling.
 */
export async function createInstantAvatar(
  videoUrl: string,
  name:     string,
): Promise<string> {
  const key = getKey()

  const res = await fetch(`${HEYGEN_API}/v2/instant_avatar`, {
    method:  'POST',
    headers: {
      'X-Api-Key':    key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ video_url: videoUrl, name }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HeyGen createAvatar échoué: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    code: number
    data: { avatar_id: string }
  }

  if (!json.data?.avatar_id) throw new Error('HeyGen createAvatar: avatar_id non retourné')
  return json.data.avatar_id
}

// ─── Statut de l'avatar ───────────────────────────────────────────────────────

export async function getAvatarStatus(avatarId: string): Promise<HeyGenAvatar> {
  const key = getKey()

  const res = await fetch(
    `${HEYGEN_API}/v2/instant_avatar?instant_avatar_id=${encodeURIComponent(avatarId)}`,
    { headers: { 'X-Api-Key': key } },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HeyGen getAvatarStatus échoué: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    code: number
    data: {
      instant_avatar_id:  string
      name:               string
      status:             string
      preview_image_url?: string
    }
  }

  const d = json.data
  return {
    avatarId:   d.instant_avatar_id,
    name:       d.name,
    status:     (d.status as HeyGenAvatar['status']) ?? 'pending',
    previewUrl: d.preview_image_url,
  }
}

// ─── Lister les avatars ───────────────────────────────────────────────────────

export async function listInstantAvatars(): Promise<HeyGenAvatar[]> {
  const key = getKey()

  const res = await fetch(`${HEYGEN_API}/v2/instant_avatar/list`, {
    headers: { 'X-Api-Key': key },
  })

  if (!res.ok) return []

  const json = await res.json() as {
    code: number
    data: {
      instant_avatar_list: {
        instant_avatar_id:  string
        name:               string
        status:             string
        preview_image_url?: string
      }[]
    }
  }

  return (json.data?.instant_avatar_list ?? []).map((a) => ({
    avatarId:   a.instant_avatar_id,
    name:       a.name,
    status:     (a.status as HeyGenAvatar['status']) ?? 'pending',
    previewUrl: a.preview_image_url,
  }))
}

// ─── Générer une vidéo avec le clone ─────────────────────────────────────────

export interface GenerateCloneVideoParams {
  avatarId:  string
  script:    string
  ratio?:    VideoRatio
  voiceId?:  string   // HeyGen voice_id (si non fourni = voix clonée de l'avatar)
  language?: string   // 'fr' | 'en' | 'es' | etc.
}

/**
 * Lance la génération d'une vidéo talking-head avec le clone.
 * Retourne le video_id pour polling.
 */
export async function generateCloneVideo(
  params: GenerateCloneVideoParams,
): Promise<string> {
  const key = getKey()
  const dim = RATIO_DIMENSIONS[params.ratio ?? '9:16']

  // Voix : si voiceId fourni on l'utilise explicitement.
  // Sinon on utilise les voice_id HeyGen natifs par langue.
  // ⚠️  Ces IDs sont issus du catalogue HeyGen public — à vérifier/mettre à jour
  //     via GET https://api.heygen.com/v2/voices si une voix ne fonctionne pas.
  const HEYGEN_VOICE_BY_LANG: Record<string, string> = {
    fr: 'fr-FR-DeniseNeural',  // Azure Neural FR (supporté par HeyGen)
    en: 'en-US-JennyNeural',   // Azure Neural EN (supporté par HeyGen)
    es: 'es-ES-ElviraNeural',
    de: 'de-DE-KatjaNeural',
    pt: 'pt-BR-FranciscaNeural',
  }
  const voice = params.voiceId
    ? {
        type:       'text',
        input_text: params.script,
        voice_id:   params.voiceId,
        speed:      1.0,
      }
    : {
        type:       'text',
        input_text: params.script,
        voice_id:   HEYGEN_VOICE_BY_LANG[params.language ?? 'fr'] ?? HEYGEN_VOICE_BY_LANG.fr,
        speed:      1.0,
      }

  const payload = {
    video_inputs: [{
      character: {
        type:         'avatar',
        avatar_id:    params.avatarId,
        avatar_style: 'normal',
      },
      voice,
      background: {
        type:  'color',
        value: '#1a1a1a',
      },
    }],
    dimension: dim,
  }

  const res = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method:  'POST',
    headers: {
      'X-Api-Key':    key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HeyGen generateVideo échoué: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    code: number
    data: { video_id: string }
  }

  if (!json.data?.video_id) throw new Error('HeyGen generateVideo: video_id non retourné')
  return json.data.video_id
}

// ─── Statut de la vidéo ───────────────────────────────────────────────────────

export async function getVideoStatus(videoId: string): Promise<HeyGenVideoResult> {
  const key = getKey()

  const res = await fetch(
    `${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    { headers: { 'X-Api-Key': key } },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HeyGen getVideoStatus échoué: ${res.status} — ${err}`)
  }

  const json = await res.json() as {
    code: number
    data: {
      video_id:   string
      status:     string
      video_url?: string
      error?:     string
    }
  }

  const d = json.data
  return {
    videoId:  d.video_id,
    status:   (d.status as HeyGenVideoResult['status']) ?? 'pending',
    videoUrl: d.video_url,
    error:    d.error,
  }
}
