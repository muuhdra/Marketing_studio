/**
 * Client kie.ai — agrégateur d'API IA (utilisé pour les modèles indispo/quota sur AIML).
 * Actuellement : Kling 3.0 motion-control (Clonage studio).
 *
 * Async : createTask → taskId → polling recordInfo jusqu'à state='success'.
 * Clé jamais exposée côté client : KIE_API_KEY (serveur uniquement).
 */

const KIE_BASE = 'https://api.kie.ai/api/v1/jobs'

function kieKey(): string {
  const k = process.env.KIE_API_KEY
  if (!k) throw new Error('KIE_API_KEY manquante (ajoute-la dans .env.local)')
  return k
}

export type KieState = 'waiting' | 'queuing' | 'generating' | 'success' | 'fail'

export interface KieTaskResult {
  state: KieState
  videoUrl?: string
  error?: string
}

export interface KlingMotionParams {
  characterImageUrl: string
  motionVideoUrl: string
  prompt?: string
  mode?: '720p' | '1080p'
  /** Orientation du personnage : suit la vidéo (mouvements complexes) ou l'image (mouvements caméra). */
  orientation?: 'video' | 'image'
  backgroundSource?: 'input_video' | 'input_image'
}

/** Crée une tâche Kling 3.0 motion-control (video-to-video) → renvoie le taskId. */
export async function submitKlingMotionControl(p: KlingMotionParams): Promise<{ taskId: string }> {
  const res = await fetch(`${KIE_BASE}/createTask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kieKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kling-3.0/motion-control',
      input: {
        ...(p.prompt ? { prompt: p.prompt.slice(0, 2500) } : {}),
        input_urls: [p.characterImageUrl],
        video_urls: [p.motionVideoUrl],
        mode: p.mode ?? '720p',
        character_orientation: p.orientation ?? 'video',
        background_source: p.backgroundSource ?? 'input_video',
      },
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.code !== 200 || !json?.data?.taskId) {
    throw new Error(json?.msg || `Échec de la création de tâche kie.ai (${res.status})`)
  }
  return { taskId: json.data.taskId as string }
}

/** Récupère l'état d'une tâche + l'URL vidéo si terminée. */
export async function getKieTask(taskId: string): Promise<KieTaskResult> {
  const res = await fetch(`${KIE_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${kieKey()}` },
  })
  const json = await res.json().catch(() => null)
  const data = json?.data
  if (!res.ok || !data) return { state: 'fail', error: json?.msg || `Erreur kie.ai (${res.status})` }

  const state = data.state as KieState
  let videoUrl: string | undefined
  if (state === 'success' && data.resultJson) {
    try { videoUrl = JSON.parse(data.resultJson)?.resultUrls?.[0] } catch { /* ignore */ }
  }
  return { state, videoUrl, error: state === 'fail' ? (data.failMsg || 'Génération échouée') : undefined }
}
