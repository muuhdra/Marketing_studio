'use server'

/**
 * Server Actions — Marques (multi-marques).
 * Une marque = entité par utilisateur ; le profil complet (Identité/Ton/Audience…)
 * est stocké dans `profile` (JSONB) et exploité par la section Brand → Profile.
 */

import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq, asc, and } from 'drizzle-orm'
import { requireAuth } from './auth'
import { createAimlClient, MODELS } from '@/lib/ai/client'
import { parseJsonLoose } from '@/lib/ai/json'

export interface BrandDTO {
  id: string
  name: string
  color: string
  logoUrl: string | null
  category: string | null
  profile: Record<string, unknown>
  createdAt: string
}

function toDTO(r: typeof brands.$inferSelect): BrandDTO {
  return {
    id: r.id,
    name: r.name,
    color: r.color ?? '#ea580c',
    logoUrl: r.logo_url,
    category: r.category,
    profile: (r.profile as Record<string, unknown>) ?? {},
    createdAt: r.created_at.toISOString(),
  }
}

/** Liste les marques de l'utilisateur (anciennes → récentes). */
export async function listBrands(): Promise<BrandDTO[]> {
  const user = await requireAuth()
  const rows = await db
    .select()
    .from(brands)
    .where(eq(brands.user_id, user.id))
    .orderBy(asc(brands.created_at))
  return rows.map(toDTO)
}

/** Crée une marque. Le profil JSONB est initialisé avec le nom + la catégorie. */
export async function createBrand(input: {
  name: string
  color?: string
  category?: string | null
  logoUrl?: string | null
}): Promise<BrandDTO> {
  const user = await requireAuth()
  const name = input.name.trim()
  if (!name) throw new Error('Le nom de la marque est requis')

  const profile: Record<string, unknown> = { name }
  if (input.category) profile.category = input.category

  const [row] = await db
    .insert(brands)
    .values({
      user_id: user.id,
      name,
      color: input.color || '#ea580c',
      category: input.category || null,
      logo_url: input.logoUrl || null,
      profile,
    })
    .returning()
  return toDTO(row)
}

/** Met à jour une marque (méta + profil partiel mergé). */
export async function updateBrand(id: string, patch: {
  name?: string
  color?: string
  category?: string | null
  logoUrl?: string | null
  profile?: Record<string, unknown>
}): Promise<BrandDTO> {
  const user = await requireAuth()
  const [existing] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, id), eq(brands.user_id, user.id)))
  if (!existing) throw new Error('Marque introuvable ou accès refusé')

  const merged = patch.profile
    ? { ...(existing.profile as Record<string, unknown>), ...patch.profile }
    : (existing.profile as Record<string, unknown>)

  const [row] = await db
    .update(brands)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.logoUrl !== undefined ? { logo_url: patch.logoUrl } : {}),
      profile: merged,
      updated_at: new Date(),
    })
    .where(and(eq(brands.id, id), eq(brands.user_id, user.id)))
    .returning()
  return toDTO(row)
}

/** Supprime une marque. */
export async function deleteBrand(id: string): Promise<void> {
  const user = await requireAuth()
  await db.delete(brands).where(and(eq(brands.id, id), eq(brands.user_id, user.id)))
}

// ── Importer une marque depuis son site web (scrape + extraction IA) ──
export interface BrandAnalysis {
  name?:              string
  description?:       string
  category?:          string
  communicationTone?: string
  targetAudience?:    string
  keyFeatures?:       string[]
  preferredWords?:    string[]
  audienceDesires?:   string[]
  audienceProblems?:  string[]
}

/** Analyse le site d'une marque → champs de profil pré-remplis (proposés au client). */
export async function actionAnalyzeBrandUrl(url: string): Promise<BrandAnalysis> {
  await requireAuth()
  let u: URL
  try { u = new URL(url) } catch { throw new Error('URL invalide') }
  if (!/^https?:$/.test(u.protocol)) throw new Error('URL invalide')

  const res = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingStudioBot/1.0)' } })
  if (!res.ok) throw new Error(`Site inaccessible (${res.status})`)
  const html = await res.text()

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)

  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.claude,
    messages: [
      { role: 'system', content: "Tu analyses le site d'une marque pour en extraire l'identité marketing. Réponds UNIQUEMENT en JSON." },
      { role: 'user', content: `À partir de ce site, extrais en JSON exact : {"name": string (nom de la marque), "description": string (1-2 phrases), "category": string, "communicationTone": string (ton de communication), "targetAudience": string (audience cible), "keyFeatures": string[] (3-5 atouts), "preferredWords": string[] (mots récurrents de la marque), "audienceDesires": string[] (2-3 désirs de l'audience), "audienceProblems": string[] (2-3 problèmes résolus)}.\n\nTITRE: ${title ?? ''}\nMETA: ${desc ?? ''}\n\nCONTENU: ${text}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 700,
  })

  try { return parseJsonLoose<BrandAnalysis>(response.choices[0]?.message?.content) } catch { return {} }
}
