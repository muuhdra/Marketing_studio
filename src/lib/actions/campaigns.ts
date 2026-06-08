'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ─── Helper : récupère l'user authentifié côté serveur ───────────────────────

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

// ─── LIST — toutes les campagnes de l'utilisateur ────────────────────────────

export async function listCampaigns() {
  const user = await getAuthUser()

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.user_id, user.id))
    .orderBy(desc(campaigns.created_at))

  return rows
}

// ─── CREATE — étape 1 du wizard ──────────────────────────────────────────────

export async function createCampaign(data: {
  name:                string
  campaignType:        'generale' | 'speciale'
  startDate?:          string
  endDate?:            string
  preCampaignEnabled?: boolean
  preCampaignStart?:   string
  postCampaignEnabled?: boolean
}) {
  const user = await getAuthUser()

  const [campaign] = await db
    .insert(campaigns)
    .values({
      user_id:              user.id,
      name:                 data.name,
      campaign_type:        data.campaignType,
      status:               'draft',
      start_date:           data.startDate   || null,
      end_date:             data.endDate     || null,
      pre_campaign_enabled: data.preCampaignEnabled  ?? false,
      pre_campaign_start:   data.preCampaignStart    || null,
      post_campaign_enabled: data.postCampaignEnabled ?? false,
    })
    .returning()

  revalidatePath('/campagnes')
  return campaign
}

// ─── GET — une campagne par ID ────────────────────────────────────────────────

export async function getCampaign(id: string) {
  const user = await getAuthUser()

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))

  if (!campaign || campaign.user_id !== user.id) {
    throw new Error('Campagne introuvable')
  }

  return campaign
}

// ─── UPDATE — modifier une campagne existante ────────────────────────────────

export async function updateCampaign(
  id: string,
  data: Partial<{
    name:                 string
    status:               'draft' | 'pre_campaign' | 'active' | 'post_campaign' | 'archived'
    startDate:            string
    endDate:              string
    preCampaignEnabled:   boolean
    preCampaignStart:     string
    postCampaignEnabled:  boolean
  }>
) {
  const user = await getAuthUser()

  const [updated] = await db
    .update(campaigns)
    .set({
      ...(data.name               !== undefined && { name: data.name }),
      ...(data.status             !== undefined && { status: data.status }),
      ...(data.startDate          !== undefined && { start_date: data.startDate }),
      ...(data.endDate            !== undefined && { end_date: data.endDate }),
      ...(data.preCampaignEnabled !== undefined && { pre_campaign_enabled: data.preCampaignEnabled }),
      ...(data.preCampaignStart   !== undefined && { pre_campaign_start: data.preCampaignStart }),
      ...(data.postCampaignEnabled !== undefined && { post_campaign_enabled: data.postCampaignEnabled }),
      updated_at: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated || updated.user_id !== user.id) {
    throw new Error('Campagne introuvable ou accès refusé')
  }

  revalidatePath('/campagnes')
  revalidatePath(`/campagne/${id}`)
  return updated
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteCampaign(id: string) {
  const user = await getAuthUser()

  // Vérifier ownership avant suppression
  const [campaign] = await db
    .select({ user_id: campaigns.user_id })
    .from(campaigns)
    .where(eq(campaigns.id, id))

  if (!campaign || campaign.user_id !== user.id) {
    throw new Error('Campagne introuvable ou accès refusé')
  }

  await db.delete(campaigns).where(eq(campaigns.id, id))

  revalidatePath('/campagnes')
}
