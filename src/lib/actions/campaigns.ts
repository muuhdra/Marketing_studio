'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import {
  campaign_dna,
  campaign_content_types,
  campaign_avatar_assignments,
  avatars,
} from '@/lib/db/schema'
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
  preCampaignEnd?:     string
  preCampaignDna?:     string
  postCampaignEnabled?: boolean
  postCampaignDelayWeeks?: number | null
  monthlyContentTarget?: number | null
  assetsUrl?:          string
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
      pre_campaign_end:     data.preCampaignEnd      || null,
      pre_campaign_dna:     data.preCampaignDna?.trim() || null,
      post_campaign_enabled: data.postCampaignEnabled ?? false,
      post_campaign_delay_weeks: data.postCampaignDelayWeeks ?? null,
      monthly_content_target: data.monthlyContentTarget ?? null,
      assets_url:           data.assetsUrl?.trim()   || null,
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

// ─── GET WITH DETAILS — campagne + contenus + avatars assignés ────────────────

export async function getCampaignWithDetails(id: string) {
  const user = await getAuthUser()

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.user_id, user.id)))

  if (!campaign) throw new Error('Campagne introuvable')

  // ADN — dernière version (le CŒUR injecté dans les prompts IA)
  const [dna] = await db
    .select()
    .from(campaign_dna)
    .where(eq(campaign_dna.campaign_id, id))
    .orderBy(desc(campaign_dna.version))
    .limit(1)

  // Contenus sélectionnés
  const contentTypes = await db
    .select()
    .from(campaign_content_types)
    .where(eq(campaign_content_types.campaign_id, id))

  // Avatars assignés avec leur nom
  const assignments = await db
    .select({
      id:          campaign_avatar_assignments.id,
      role:        campaign_avatar_assignments.role,
      config:      campaign_avatar_assignments.config_snapshot,
      avatarId:    avatars.id,
      avatarName:  avatars.name,
      avatarAge:   avatars.age,
      styleTags:   avatars.style_tags,
    })
    .from(campaign_avatar_assignments)
    .leftJoin(avatars, eq(campaign_avatar_assignments.avatar_id, avatars.id))
    .where(eq(campaign_avatar_assignments.campaign_id, id))

  return { campaign, dna: dna ?? null, contentTypes, assignments }
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
    preCampaignEnd:       string
    preCampaignDna:       string
    postCampaignEnabled:  boolean
    postCampaignDelayWeeks: number | null
    postCampaignResults:  unknown
    monthlyContentTarget: number | null
    assetsUrl:            string
  }>
) {
  const user = await getAuthUser()

  const [updated] = await db
    .update(campaigns)
    .set({
      ...(data.name                  !== undefined && { name: data.name }),
      ...(data.status                !== undefined && { status: data.status }),
      ...(data.startDate             !== undefined && { start_date: data.startDate || null }),
      ...(data.endDate               !== undefined && { end_date: data.endDate || null }),
      ...(data.preCampaignEnabled    !== undefined && { pre_campaign_enabled: data.preCampaignEnabled }),
      ...(data.preCampaignStart      !== undefined && { pre_campaign_start: data.preCampaignStart || null }),
      ...(data.preCampaignEnd        !== undefined && { pre_campaign_end: data.preCampaignEnd || null }),
      ...(data.preCampaignDna        !== undefined && { pre_campaign_dna: data.preCampaignDna.trim() || null }),
      ...(data.postCampaignEnabled   !== undefined && { post_campaign_enabled: data.postCampaignEnabled }),
      ...(data.postCampaignDelayWeeks !== undefined && { post_campaign_delay_weeks: data.postCampaignDelayWeeks }),
      ...(data.postCampaignResults   !== undefined && { post_campaign_results: data.postCampaignResults }),
      ...(data.monthlyContentTarget  !== undefined && { monthly_content_target: data.monthlyContentTarget }),
      ...(data.assetsUrl             !== undefined && { assets_url: data.assetsUrl.trim() || null }),
      updated_at: new Date(),
    })
    // user_id dans le WHERE — l'UPDATE ne touche jamais la campagne d'un autre utilisateur
    // (la connexion Drizzle bypasse la RLS, le filtre doit être applicatif)
    .where(and(eq(campaigns.id, id), eq(campaigns.user_id, user.id)))
    .returning()

  if (!updated) {
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
