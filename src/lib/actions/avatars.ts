'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { avatars } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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

// ─── Voix des avatars (pour verrouiller la voix en génération) ───────────────

export async function listAvatarVoices() {
  const user = await getAuthUser()
  const rows = await db
    .select({
      id:             avatars.id,
      name:           avatars.name,
      voice_engine:   avatars.voice_engine,
      voice_id:       avatars.voice_id,
      voice_mode:     avatars.voice_mode,
      voice_settings: avatars.voice_settings,
      voice_label:    avatars.voice_label,
    })
    .from(avatars)
    .where(eq(avatars.user_id, user.id))
    .orderBy(avatars.created_at)
  // Seuls les avatars dont la voix est configurée
  return rows.filter((r) => !!r.voice_id)
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createAvatar(data: {
  name:             string
  age?:             number | null
  ethnicity?:       string | null
  style_tags?:      string[]
  continuity_mode?: 'evolutif' | 'verrouille'
  morphology?:      Record<string, string> | null
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
      morphology:       data.morphology      ?? null,
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
    morphology:       Record<string, string> | null
    source_photo_url: string | null
    // ── Voix ──
    voice_engine:      string | null
    voice_id:          string | null
    voice_mode:        string | null
    voice_description: string | null
    voice_settings:    { emotion?: string; speed?: number; pitch?: number } | null
    voice_label:       string | null
    // ── Clonage (Campagne Spéciale) ──
    voice_provider:    string | null
    voice_provider_id: string | null
    voice_sample_url:  string | null
  }>
) {
  const user = await getAuthUser()

  const [updated] = await db
    .update(avatars)
    .set({
      ...data,
      updated_at: new Date(),
    })
    // user_id dans le WHERE — la mutation ne touche jamais l'avatar d'un autre utilisateur
    .where(and(eq(avatars.id, id), eq(avatars.user_id, user.id)))
    .returning()

  if (!updated) {
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
