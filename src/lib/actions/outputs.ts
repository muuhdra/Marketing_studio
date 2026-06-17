'use server'

/**
 * Server Actions — Contenus générés (outputs)
 *
 * Persistés dans le bucket `outputs` (privé, RLS par userId) + métadonnées en DB.
 * Expirent après OUTPUT_TTL_HOURS (48h) → purge pg_cron (migration 0006).
 * Accès lecture via URL signée (jamais d'URL publique).
 */

import { randomUUID } from 'crypto'
import { and, eq, gt, gte, desc, isNull } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { generated_outputs, campaigns } from '@/lib/db/schema'
import { BUCKETS, getOutputExpiresAt } from '@/lib/supabase/storage'
import { estimateCost } from '@/lib/ai/costs'

export type OutputType = 'image' | 'video' | 'audio'

export interface OutputDTO {
  id:              string
  type:            string
  engine:          string | null
  title:           string | null
  format:          string | null
  campaignId:      string | null
  campaignName:    string | null
  avatarName:      string | null
  durationSeconds: number | null
  createdAt:       string
  expiresAt:       string
  url:             string   // URL signée (1h)
}

interface PersistInput {
  type:             OutputType
  engine?:          string | null
  title?:           string | null
  prompt?:          string | null
  format?:          string | null
  durationSeconds?: number | null   // vidéos : pour le coût au prorata
  campaignId?:      string | null
  avatarName?:      string | null
  sourceUrl?:       string   // URL provider (image / vidéo)
  dataUrl?:         string   // data:...;base64,... (audio)
}

function resolveBytes(input: PersistInput, buf: Buffer, contentType: string): { ext: string } {
  void buf
  if (input.type === 'video') return { ext: 'mp4' }
  if (input.type === 'audio') return { ext: contentType.includes('wav') ? 'wav' : 'mp3' }
  return { ext: contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg' }
}

/** Télécharge/décode le contenu généré, le stocke dans `outputs`, enregistre +48h. */
export async function persistOutput(input: PersistInput): Promise<OutputDTO | null> {
  const user = await requireAuth()

  let buffer: Buffer
  let contentType: string
  if (input.dataUrl?.startsWith('data:')) {
    const m = input.dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/)
    if (!m) throw new Error('dataUrl invalide')
    contentType = m[1]
    buffer = Buffer.from(m[2], 'base64')
  } else if (input.sourceUrl) {
    const res = await fetch(input.sourceUrl)
    if (!res.ok) throw new Error('Téléchargement du contenu échoué')
    contentType = res.headers.get('content-type') || (input.type === 'video' ? 'video/mp4' : input.type === 'audio' ? 'audio/mpeg' : 'image/png')
    buffer = Buffer.from(await res.arrayBuffer())
  } else {
    throw new Error('sourceUrl ou dataUrl requis')
  }

  const { ext } = resolveBytes(input, buffer, contentType)
  const path = `${user.id}/${randomUUID()}.${ext}`   // userId en 1er dossier → RLS

  const supabase = await createClient()
  const { error: upErr } = await supabase.storage.from(BUCKETS.OUTPUTS).upload(path, buffer, { contentType, upsert: true })
  if (upErr) throw upErr

  const [row] = await db.insert(generated_outputs).values({
    user_id:          user.id,
    campaign_id:      input.campaignId ?? null,
    type:             input.type,
    engine:           input.engine ?? null,
    title:            input.title ?? null,
    prompt:           input.prompt ?? null,
    format:           input.format ?? null,
    duration_seconds: input.durationSeconds ?? null,
    avatar_name:      input.avatarName ?? null,
    storage_path:     path,
    expires_at:       getOutputExpiresAt(),
  }).returning()

  const { data: signed } = await supabase.storage.from(BUCKETS.OUTPUTS).createSignedUrl(path, 60 * 60)
  return {
    id: row.id, type: row.type, engine: row.engine, title: row.title, format: row.format,
    campaignId: row.campaign_id, campaignName: null, avatarName: row.avatar_name,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at.toISOString(), expiresAt: row.expires_at.toISOString(),
    url: signed?.signedUrl ?? '',
  }
}

/** Liste les outputs ACTIFS (fichier dispo, non purgé) de l'utilisateur, URLs signées (1h). */
export async function listOutputs(): Promise<OutputDTO[]> {
  const user = await requireAuth()
  const rows = await db
    .select({
      id: generated_outputs.id, type: generated_outputs.type, engine: generated_outputs.engine,
      title: generated_outputs.title, format: generated_outputs.format,
      campaign_id: generated_outputs.campaign_id, campaignName: campaigns.name,
      avatar_name: generated_outputs.avatar_name, duration: generated_outputs.duration_seconds,
      storage_path: generated_outputs.storage_path,
      created_at: generated_outputs.created_at, expires_at: generated_outputs.expires_at,
    })
    .from(generated_outputs)
    .leftJoin(campaigns, eq(generated_outputs.campaign_id, campaigns.id))
    .where(and(
      eq(generated_outputs.user_id, user.id),
      isNull(generated_outputs.purged_at),
      gt(generated_outputs.expires_at, new Date()),
    ))
    .orderBy(desc(generated_outputs.created_at))
  if (rows.length === 0) return []

  const supabase = await createClient()
  const { data: signed } = await supabase.storage
    .from(BUCKETS.OUTPUTS)
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60)
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return rows.map((r) => ({
    id: r.id, type: r.type, engine: r.engine, title: r.title, format: r.format,
    campaignId: r.campaign_id, campaignName: r.campaignName ?? null, avatarName: r.avatar_name,
    durationSeconds: r.duration,
    createdAt: r.created_at.toISOString(), expiresAt: r.expires_at.toISOString(),
    url: urlByPath.get(r.storage_path) ?? '',
  }))
}

/** Retire un output de la galerie : supprime le fichier mais CONSERVE la métadonnée (stats). */
export async function deleteOutput(id: string): Promise<boolean> {
  const user = await requireAuth()
  const [row] = await db
    .select({ storage_path: generated_outputs.storage_path })
    .from(generated_outputs)
    .where(and(eq(generated_outputs.id, id), eq(generated_outputs.user_id, user.id)))
  if (!row) throw new Error('Output introuvable ou accès refusé')

  const supabase = await createClient()
  await supabase.storage.from(BUCKETS.OUTPUTS).remove([row.storage_path]).catch(() => {})
  // On marque la ligne purgée (l'historique reste pour Analytics/Dashboard).
  await db.update(generated_outputs)
    .set({ purged_at: new Date() })
    .where(and(eq(generated_outputs.id, id), eq(generated_outputs.user_id, user.id)))
  return true
}

// ─── Historique complet (métadonnées, sans fichier) pour Analytics / Dashboard ──

export interface OutputMeta {
  id:              string
  type:            string
  engine:          string | null
  title:           string | null
  campaignName:    string | null
  durationSeconds: number | null
  createdAt:       string
}

/** Coût estimé (USD) des contenus générés DEPUIS LE 1er DU MOIS en cours. */
export async function getEstimatedMonthlyCost(): Promise<{ total: number; count: number }> {
  const user = await requireAuth()
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const rows = await db
    .select({ engine: generated_outputs.engine, duration: generated_outputs.duration_seconds })
    .from(generated_outputs)
    .where(and(eq(generated_outputs.user_id, user.id), gte(generated_outputs.created_at, start)))
  let total = 0
  for (const r of rows) total += estimateCost(r.engine, r.duration)
  return { total, count: rows.length }
}

/** Toutes les générations de l'utilisateur (y compris purgées) — pas limité à 48h. */
export async function listOutputMeta(): Promise<OutputMeta[]> {
  const user = await requireAuth()
  const rows = await db
    .select({
      id:           generated_outputs.id,
      type:         generated_outputs.type,
      engine:       generated_outputs.engine,
      title:        generated_outputs.title,
      campaignName: campaigns.name,
      duration:     generated_outputs.duration_seconds,
      created_at:   generated_outputs.created_at,
    })
    .from(generated_outputs)
    .leftJoin(campaigns, eq(generated_outputs.campaign_id, campaigns.id))
    .where(eq(generated_outputs.user_id, user.id))
    .orderBy(desc(generated_outputs.created_at))
  return rows.map((r) => ({
    id: r.id, type: r.type, engine: r.engine, title: r.title,
    campaignName: r.campaignName ?? null, durationSeconds: r.duration,
    createdAt: r.created_at.toISOString(),
  }))
}
