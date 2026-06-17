'use server'

/**
 * Server Actions — Bibliothèque de templates de contenu (vidéos/images + prompt).
 *
 * Fichiers dans le bucket public `templates`, métadonnées dans `content_templates`.
 * Globaux (pas per-user) — tout utilisateur authentifié peut gérer (= admin).
 */

import { randomUUID } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { content_templates } from '@/lib/db/schema'
import { BUCKETS } from '@/lib/supabase/storage'
import { reverseEngineerPrompt } from '@/lib/ai/vision'

const MAX_TEMPLATE_SIZE = 100 * 1024 * 1024  // 100 MB

export interface TemplateDTO {
  id:          string
  kind:        string   // video | image
  category:    string
  label:       string
  description: string | null
  prompt:      string | null
  url:         string   // URL publique
  sortOrder:   number
  active:      boolean
  createdAt:   string
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4'))  return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('quicktime')) return 'mov'
  if (mime.includes('png'))  return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif'))  return 'gif'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'bin'
}

function publicUrl(path: string): string {
  // Bucket public → URL directe stable (pas de signature).
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${BUCKETS.TEMPLATES}/${path}`
}

function toDTO(r: typeof content_templates.$inferSelect): TemplateDTO {
  return {
    id: r.id, kind: r.kind, category: r.category, label: r.label,
    description: r.description, prompt: r.prompt, url: publicUrl(r.storage_path),
    sortOrder: r.sort_order, active: r.active, createdAt: r.created_at.toISOString(),
  }
}

/** Crée un template : upload fichier (vidéo/image) + enregistre métadonnées + prompt. */
export async function createTemplate(formData: FormData): Promise<TemplateDTO> {
  await requireAuth()
  const file        = formData.get('file') as File | null
  const category    = (formData.get('category') as string)?.trim()
  const label       = (formData.get('label') as string)?.trim()
  const description = ((formData.get('description') as string) || '').trim() || null
  const prompt      = ((formData.get('prompt') as string) || '').trim() || null

  if (!file || file.size === 0) throw new Error('Fichier requis')
  if (!label)    throw new Error('Libellé requis')
  if (!category) throw new Error('Catégorie requise')
  const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null
  if (!kind) throw new Error('Le fichier doit être une vidéo ou une image')
  if (file.size > MAX_TEMPLATE_SIZE) throw new Error('Fichier trop lourd (max 100 MB)')

  const path = `${randomUUID()}.${extFromMime(file.type)}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.TEMPLATES).upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) throw error

  const [row] = await db.insert(content_templates).values({
    kind, category, label, description, prompt, storage_path: path,
  }).returning()
  return toDTO(row)
}

/** Liste tous les templates (triés catégorie puis ordre). */
export async function listTemplates(): Promise<TemplateDTO[]> {
  await requireAuth()
  const rows = await db
    .select()
    .from(content_templates)
    .orderBy(asc(content_templates.category), asc(content_templates.sort_order))
  return rows.map(toDTO)
}

/** Met à jour un template (libellé, catégorie, description, prompt, ordre, actif). */
export async function updateTemplate(id: string, patch: {
  label?: string; category?: string; description?: string | null
  prompt?: string | null; sort_order?: number; active?: boolean
}): Promise<void> {
  await requireAuth()
  await db.update(content_templates).set(patch).where(eq(content_templates.id, id))
}

/**
 * Analyse un template (reverse-engineering) → génère et enregistre son prompt.
 * Image : analysée depuis son URL publique. Vidéo : depuis une frame (data URL) capturée côté client.
 */
export async function analyzeTemplate(input: {
  id: string
  imageUrl?: string
  frameDataUrl?: string
  frames?: string[]        // vidéo : frames ordonnées (décomposition Gemini)
  hint?: string
}): Promise<string> {
  await requireAuth()
  const prompt = await reverseEngineerPrompt({
    imageUrl:  input.imageUrl,
    imageData: input.frameDataUrl,
    frames:    input.frames,
    hint:      input.hint,
  })
  if (prompt) {
    await db.update(content_templates).set({ prompt }).where(eq(content_templates.id, input.id))
  }
  return prompt
}

/** Supprime un template (fichier + ligne). */
export async function deleteTemplate(id: string): Promise<void> {
  await requireAuth()
  const [row] = await db
    .select({ storage_path: content_templates.storage_path })
    .from(content_templates)
    .where(eq(content_templates.id, id))
  if (!row) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.TEMPLATES).remove([row.storage_path]).catch(() => {})
  await db.delete(content_templates).where(eq(content_templates.id, id))
}
