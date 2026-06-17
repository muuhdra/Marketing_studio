'use server'

/**
 * Server Actions — ADN de campagne (upload de document)
 *
 * Flow :
 *   1. L'utilisateur upload un fichier (Word / PDF / Markdown / texte)
 *   2. Le serveur extrait le texte
 *   3. Best-effort : l'original est stocké dans Supabase Storage (bucket assets)
 *   4. Retourne le texte extrait → devient l'ADN éditable + l'URL du fichier
 *
 * Sécurité :
 * - requireAuth() obligatoire
 * - Type de fichier validé (docx/pdf/md/txt)
 * - Taille max 10 MB
 * - AIMLAPI_KEY jamais exposée (analyse Claude via lib serveur)
 */

import { randomUUID } from 'crypto'
import { eq, like } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { campaign_dna } from '@/lib/db/schema'
import { detectFileKind, extractDnaText } from '@/lib/ai/dna'
import { BUCKETS, ASSET_PATHS, MAX_FILE_SIZES } from '@/lib/supabase/storage'

// ─── Nettoyage opportuniste des drafts orphelins ──────────────────────────────
// Un draft devient permanent dès qu'une campagne le référence (campaign_dna.file_url).
// On supprime donc uniquement les drafts de l'utilisateur qui sont :
//   - plus vieux que 7 jours (wizard abandonné, sessionStorage perdu)
//   - ET non référencés par une ligne campaign_dna
// Déclenché à chaque nouvel upload — pas besoin de cron.

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

async function cleanupOrphanDrafts(userId: string): Promise<void> {
  try {
    const folder   = `${userId}/campaigns/dna-drafts`
    const supabase = await createClient()

    const { data: files, error } = await supabase.storage
      .from(BUCKETS.ASSETS)
      .list(folder, { limit: 100 })
    if (error || !files?.length) return

    const cutoff = Date.now() - DRAFT_MAX_AGE_MS
    const oldFiles = files.filter(
      (f) => f.created_at && new Date(f.created_at).getTime() < cutoff,
    )
    if (!oldFiles.length) return

    // Chemins référencés par une campagne → à préserver
    const referenced = await db
      .select({ path: campaign_dna.file_url })
      .from(campaign_dna)
      .where(like(campaign_dna.file_url, `${folder}/%`))
    const keep = new Set(referenced.map((r) => r.path))

    const toDelete = oldFiles
      .map((f) => `${folder}/${f.name}`)
      .filter((p) => !keep.has(p))

    if (toDelete.length) {
      await supabase.storage.from(BUCKETS.ASSETS).remove(toDelete)
    }
  } catch {
    // Best-effort — le nettoyage ne doit jamais perturber le flow utilisateur
  }
}

export interface ExtractDnaResult {
  text:     string
  fileName: string
  filePath: string | null   // chemin Storage (bucket privé) ; null si stockage échoué
}

export async function actionExtractDnaFile(formData: FormData): Promise<ExtractDnaResult> {
  const user = await requireAuth()

  const file = formData.get('file') as File | null
  if (!file)                              throw new Error('Aucun fichier fourni')
  if (file.size > MAX_FILE_SIZES.dna_doc) throw new Error('Fichier trop lourd (max 10 MB)')

  const kind = detectFileKind(file.name, file.type)
  if (!kind) throw new Error('Format non supporté — utilisez Word (.docx), PDF, Markdown ou texte')

  const buffer = Buffer.from(await file.arrayBuffer())

  // 1. Extraction du texte
  const text = await extractDnaText(buffer, kind)
  if (!text || text.trim().length < 10) {
    throw new Error('Impossible d\'extraire du texte exploitable de ce fichier')
  }

  // 2. Stockage best-effort de l'original (n'interrompt jamais le flow).
  //    Bucket privé → on conserve le CHEMIN, l'accès se fait via URL signée à la demande.
  let filePath: string | null = null
  try {
    const ext  = kind === 'md' ? 'md' : kind
    const path = ASSET_PATHS.campaignDnaDraft(user.id, randomUUID(), ext)
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from(BUCKETS.ASSETS)
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (!error) filePath = path
  } catch {
    // Stockage indisponible → on garde quand même le texte extrait
    filePath = null
  }

  // 3. Nettoyage opportuniste des drafts abandonnés (> 7 jours, non référencés)
  await cleanupOrphanDrafts(user.id)

  return { text, fileName: file.name, filePath }
}

// ─── Suppression d'un fichier ADN draft (cleanup) ─────────────────────────────

export async function actionDeleteDnaDraft(path: string): Promise<void> {
  const user = await requireAuth()
  if (!path) return
  // Seuls les fichiers de l'utilisateur sont supprimables (1er dossier = son id)
  if (!path.startsWith(`${user.id}/`)) throw new Error('Accès refusé')

  try {
    // Un draft référencé par une version ADN sauvegardée est devenu permanent —
    // le supprimer casserait le lien « Document source original » de la campagne.
    const [ref] = await db
      .select({ id: campaign_dna.id })
      .from(campaign_dna)
      .where(eq(campaign_dna.file_url, path))
      .limit(1)
    if (ref) return

    const supabase = await createClient()
    await supabase.storage.from(BUCKETS.ASSETS).remove([path])
  } catch {
    // Best-effort — un échec de cleanup ne doit jamais bloquer l'utilisateur
  }
}

// ─── URL signée pour consulter le fichier ADN (bucket privé) ──────────────────

export async function actionGetDnaSignedUrl(path: string): Promise<string | null> {
  const user = await requireAuth()
  if (!path) return null
  // Le chemin doit appartenir à l'utilisateur (1er dossier = son id)
  if (!path.startsWith(`${user.id}/`)) throw new Error('Accès refusé')

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(BUCKETS.ASSETS)
    .createSignedUrl(path, 60 * 60) // valable 1 h
  if (error) return null
  return data.signedUrl ?? null
}
