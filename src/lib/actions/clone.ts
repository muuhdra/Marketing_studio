'use server'

/**
 * Server Actions — Clonage studio (Kling 3.0 motion-control via kie.ai).
 * La clé KIE_API_KEY reste serveur. Flux async : submit → polling status côté client.
 */

import { requireAuth } from './auth'
import { submitKlingMotionControl, getKieTask, type KlingMotionParams, type KieTaskResult } from '@/lib/ai/kie'

export async function actionSubmitClone(input: KlingMotionParams): Promise<{ taskId: string }> {
  await requireAuth()
  if (!input.characterImageUrl) throw new Error('Image du personnage requise')
  if (!input.motionVideoUrl) throw new Error('Vidéo des mouvements requise')
  return submitKlingMotionControl(input)
}

export async function actionGetCloneStatus(taskId: string): Promise<KieTaskResult> {
  await requireAuth()
  return getKieTask(taskId)
}
