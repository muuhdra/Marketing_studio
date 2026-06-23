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
