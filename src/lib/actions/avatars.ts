'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { avatars } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ─── Helper auth ─────────────────────────────────────────────────────────────

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Non authentifié')
  return user
}

// ─── LIST ────────────────────────────────────────────────────────────────────

export async function listAvatars() {
  const user = await getAuthUser()

  return db
    .select()
    .from(avatars)
    .where(eq(avatars.user_id, user.id))
    .orderBy(avatars.created_at)
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createAvatar(data: {
  name:             string
  age?:             number | null
  ethnicity?:       string | null
  style_tags?:      string[]
  continuity_mode?: 'evolutif' | 'verrouille'
}) {
  const user = await getAuthUser()

  const [avatar] = await db
    .insert(avatars)
    .values({
      user_id:          user.id,
      name:             data.name,
      age:              data.age             ?? null,
      ethnicity:        data.ethnicity       ?? null,
      style_tags:       data.style_tags      ?? [],
      continuity_mode:  data.continuity_mode ?? 'evolutif',
      status:           'draft',
    })
    .returning()

  revalidatePath('/galerie')
  revalidatePath('/avatar-studio')
  return avatar
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateAvatar(
  id: string,
  data: Partial<{
    name:             string
    age:              number | null
    ethnicity:        string | null
    style_tags:       string[]
    continuity_mode:  'evolutif' | 'verrouille'
    status:           'draft' | 'active' | 'archived'
  }>
) {
  const user = await getAuthUser()

  const [updated] = await db
    .update(avatars)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(avatars.id, id))
    .returning()

  if (!updated || updated.user_id !== user.id) {
    throw new Error('Avatar introuvable ou accès refusé')
  }

  revalidatePath('/galerie')
  revalidatePath('/avatar-studio')
  return updated
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function deleteAvatar(id: string) {
  const user = await getAuthUser()

  const [avatar] = await db
    .select({ user_id: avatars.user_id })
    .from(avatars)
    .where(eq(avatars.id, id))

  if (!avatar || avatar.user_id !== user.id) {
    throw new Error('Avatar introuvable ou accès refusé')
  }

  await db.delete(avatars).where(eq(avatars.id, id))
  revalidatePath('/galerie')
}
