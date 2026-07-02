'use server'

/**
 * Helper d'authentification partagé entre les Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { brands, brand_members } from '@/lib/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { isDevEmail } from '@/lib/auth/access'

export async function requireAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Non authentifié')
  return user
}

/** Réservé au développeur : lève si l'utilisateur authentifié n'est pas dans la liste DEV. */
export async function requireDev() {
  const user = await requireAuth()
  if (!isDevEmail(user.email)) throw new Error('Accès réservé au développeur')
  return user
}

/** True si l'utilisateur courant est développeur (pour conditionner l'UI). */
export async function actionIsDev(): Promise<boolean> {
  try {
    await requireDev()
    return true
  } catch {
    return false
  }
}


/**
 * Marque active de l'utilisateur (cookie `active-brand`, validé en base).
 * Repli sur la première marque créée. Renvoie null si l'utilisateur n'a aucune marque.
 */
export async function getActiveBrandId(): Promise<string | null> {
  const user = await requireAuth()
  const cookieStore = await cookies()
  const cookieId = cookieStore.get('active-brand')?.value

  if (cookieId) {
    // La marque active doit être une marque DONT l'utilisateur est membre (proprio ou invité).
    const [m] = await db
      .select({ id: brand_members.brand_id })
      .from(brand_members)
      .where(and(eq(brand_members.brand_id, cookieId), eq(brand_members.user_id, user.id)))
    if (m) return m.id
  }

  // Repli : première marque accessible (par membership), la plus ancienne.
  const [first] = await db
    .select({ id: brand_members.brand_id })
    .from(brand_members)
    .innerJoin(brands, eq(brands.id, brand_members.brand_id))
    .where(eq(brand_members.user_id, user.id))
    .orderBy(asc(brands.created_at))
    .limit(1)
  return first?.id ?? null
}

/** True si l'utilisateur est membre de la marque (proprio ou invité). */
export async function isBrandMember(userId: string, brandId: string): Promise<boolean> {
  const [m] = await db.select({ id: brand_members.id }).from(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, userId)))
  return Boolean(m)
}

/** IDs des marques accessibles à l'utilisateur (membership). */
export async function accessibleBrandIds(userId: string): Promise<string[]> {
  const rows = await db.select({ id: brand_members.brand_id }).from(brand_members).where(eq(brand_members.user_id, userId))
  return rows.map((r) => r.id)
}

/**
 * IDs des utilisateurs qui collaborent avec `userId` (co-membres d'au moins une marque commune).
 * Inclut l'utilisateur lui-même. Sert au partage des avatars (non scopés marque).
 */
export async function collaboratorUserIds(userId: string): Promise<string[]> {
  const brandIds = await accessibleBrandIds(userId)
  if (brandIds.length === 0) return [userId]
  const rows = await db.select({ uid: brand_members.user_id }).from(brand_members).where(inArray(brand_members.brand_id, brandIds))
  return Array.from(new Set([userId, ...rows.map((r) => r.uid)]))
}
