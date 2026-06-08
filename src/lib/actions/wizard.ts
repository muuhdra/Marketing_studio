'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  campaigns,
  campaign_content_types,
  campaign_avatar_assignments,
} from '@/lib/db/schema'
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

async function assertCampaignOwner(campaignId: string, userId: string) {
  const [c] = await db
    .select({ user_id: campaigns.user_id })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
  if (!c || c.user_id !== userId) throw new Error('Campagne introuvable')
}

// ─── ÉTAPE 2 — Sauvegarde des types de contenus ──────────────────────────────
// Mappe les IDs du wizard (ex: 'ugc-social') vers les enums Drizzle

type ContentTypeEnum = 'ugc' | 'commercial' | 'shooting' | 'visuel'
type ProductCatEnum  = 'produit' | 'app'

function mapContentId(id: string): { content_type: ContentTypeEnum; product_category: ProductCatEnum } {
  const cat: ProductCatEnum = id.startsWith('app-') ? 'app' : 'produit'

  let type: ContentTypeEnum = 'ugc'
  if (id.includes('ugc'))                      type = 'ugc'
  else if (id.includes('commercial') || id.includes('hypermotion') || id.includes('tvspot') || id.includes('tryon')) type = 'commercial'
  else if (id.includes('shooting'))            type = 'shooting'
  else if (id.includes('visuel') || id.includes('poster') || id.includes('illus')) type = 'visuel'

  return { content_type: type, product_category: cat }
}

export async function saveContentTypes(campaignId: string, contentIds: string[]) {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

  // Remplace toutes les lignes existantes (delete + insert)
  await db.delete(campaign_content_types).where(eq(campaign_content_types.campaign_id, campaignId))

  if (contentIds.length > 0) {
    // Déduplique les (type, category) — plusieurs IDs peuvent mapper vers le même enum
    const seen = new Set<string>()
    const rows = contentIds.reduce<{ campaign_id: string; content_type: ContentTypeEnum; product_category: ProductCatEnum; quantity: number }[]>(
      (acc, id) => {
        const mapped = mapContentId(id)
        const key = `${mapped.content_type}:${mapped.product_category}`
        if (!seen.has(key)) {
          seen.add(key)
          acc.push({ campaign_id: campaignId, ...mapped, quantity: 1 })
        }
        return acc
      },
      []
    )
    await db.insert(campaign_content_types).values(rows)
  }

  revalidatePath(`/campagne/${campaignId}`)
  revalidatePath('/campagnes')
}

// ─── ÉTAPE 3 — Sauvegarde des assignements d'avatars ─────────────────────────

export async function saveAvatarAssignments(
  campaignId: string,
  assignments: {
    avatarId:   string
    role:       string | null
    format:     string | null
  }[]
) {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

  // Remplace toutes les assignations existantes
  await db
    .delete(campaign_avatar_assignments)
    .where(eq(campaign_avatar_assignments.campaign_id, campaignId))

  if (assignments.length > 0) {
    await db.insert(campaign_avatar_assignments).values(
      assignments.map((a) => ({
        campaign_id: campaignId,
        avatar_id:   a.avatarId,
        role:        (a.role?.includes('secondary') ? 'secondary' : 'primary') as 'primary' | 'secondary',
        // Snapshot minimal de la config au moment de l'assignation
        config_snapshot: { role: a.role, format: a.format },
      }))
    )
  }

  revalidatePath(`/campagne/${campaignId}`)
}

// ─── FINALISER — Passe le statut de draft → actif ────────────────────────────

export async function finalizeCampaign(campaignId: string) {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

  const [c] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId))
  if (!c) throw new Error('Campagne introuvable')

  // Détermine le nouveau statut selon les phases activées
  const newStatus = c.pre_campaign_enabled ? 'pre_campaign' : 'active'

  const [updated] = await db
    .update(campaigns)
    .set({ status: newStatus, updated_at: new Date() })
    .where(eq(campaigns.id, campaignId))
    .returning()

  revalidatePath('/campagnes')
  revalidatePath(`/campagne/${campaignId}`)
  return updated
}
