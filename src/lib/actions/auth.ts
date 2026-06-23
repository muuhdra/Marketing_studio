'use server'

/**
 * Helper d'authentification partagé entre les Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

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

/**
 * Marque active de l'utilisateur (cookie `active-brand`, validé en base).
 * Repli sur la première marque créée. Renvoie null si l'utilisateur n'a aucune marque.
 */
export async function getActiveBrandId(): Promise<string | null> {
  const user = await requireAuth()
  const cookieStore = await cookies()
  const cookieId = cookieStore.get('active-brand')?.value

  if (cookieId) {
    const [owned] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.id, cookieId), eq(brands.user_id, user.id)))
    if (owned) return owned.id
  }

  const [first] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.user_id, user.id))
    .orderBy(asc(brands.created_at))
    .limit(1)
  return first?.id ?? null
}
