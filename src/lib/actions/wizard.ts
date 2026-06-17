'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  campaigns,
  campaign_dna,
  campaign_content_types,
  campaign_avatar_assignments,
  avatars,
} from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { analyzeDna } from '@/lib/ai/dna'

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

// ─── ÉTAPE 1 — Sauvegarde de l'ADN (le « CŒUR » de la campagne) ──────────────
// Persiste le texte ADN dans campaign_dna avec versioning, et met à jour
// campaigns.dna_version. C'est ce texte qui est injecté dans tous les prompts IA.

export async function saveCampaignDna(
  campaignId: string,
  dnaText:    string,
  opts?: { filePath?: string | null },
): Promise<number | null> {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

  const content = dnaText.trim()
  if (!content) return null

  // Dernière version existante
  const [latest] = await db
    .select()
    .from(campaign_dna)
    .where(eq(campaign_dna.campaign_id, campaignId))
    .orderBy(desc(campaign_dna.version))
    .limit(1)

  // Contenu inchangé → pas de nouvelle version (évite le bloat)
  if (latest && latest.raw_content === content) return latest.version

  const newVersion = (latest?.version ?? 0) + 1

  // Analyse Claude (best-effort — un échec ou un timeout ne bloque pas la sauvegarde du texte)
  let structured: unknown = null
  let health: number | null = null
  try {
    const analysis = await Promise.race([
      analyzeDna(content),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('analyse timeout')), 20_000)
      ),
    ])
    structured = analysis
    health     = analysis.healthScore
  } catch {
    structured = null
    health     = null
  }

  await db.insert(campaign_dna).values({
    campaign_id:     campaignId,
    version:         newVersion,
    raw_content:     content,
    structured_data: structured,
    health_score:    health,
    file_url:        opts?.filePath ?? null,   // chemin Storage (bucket privé)
  })

  await db
    .update(campaigns)
    .set({ dna_version: newVersion, updated_at: new Date() })
    .where(eq(campaigns.id, campaignId))

  revalidatePath(`/campagne/${campaignId}`)
  revalidatePath('/campagnes')
  return newVersion
}

// ─── ÉTAPE 2 — Sauvegarde des types de contenus ──────────────────────────────
// Mappe les IDs du wizard (ex: 'ugc-social') vers les enums Drizzle

type ContentTypeEnum = 'ugc' | 'commercial' | 'shooting' | 'visuel'
type ProductCatEnum  = 'produit' | 'app'

function mapContentId(id: string): { content_type: ContentTypeEnum; product_category: ProductCatEnum } {
  const cat: ProductCatEnum = id.startsWith('app-') ? 'app' : 'produit'

  // Ordre important : du plus spécifique au plus général
  let type: ContentTypeEnum = 'ugc'
  if      (id.startsWith('shoot-'))                                  type = 'shooting'   // shoot-packshot, shoot-lifestyle, etc.
  else if (id.startsWith('app-vis-'))                                type = 'visuel'     // app-vis-screenshots, app-vis-mockup, etc.
  else if (id.startsWith('com-') || id.startsWith('app-com-'))      type = 'commercial' // com-hypermotion, com-tvspot, app-com-*
  else if (id.startsWith('ugc-') || id.startsWith('app-ugc-'))      type = 'ugc'        // ugc-social, ugc-tryon, app-ugc-*, etc.

  return { content_type: type, product_category: cat }
}

export async function saveContentTypes(campaignId: string, contentIds: string[]) {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

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

  // Remplacement atomique — si l'insert échoue, le delete est annulé (pas de perte)
  await db.transaction(async (tx) => {
    await tx.delete(campaign_content_types).where(eq(campaign_content_types.campaign_id, campaignId))
    if (rows.length > 0) {
      await tx.insert(campaign_content_types).values(rows)
    }
  })

  revalidatePath(`/campagne/${campaignId}`)
  revalidatePath('/campagnes')
}

// ─── ÉTAPE 3 — Sauvegarde des assignements d'avatars ─────────────────────────

export async function saveAvatarAssignments(
  campaignId: string,
  assignments: {
    avatarId:      string
    role:          string | null
    format:        string | null
    wardrobeMode?: 'auto' | 'manual'
    outfits?:      { id: string; name: string; description: string | null }[]
    environments?: { id: string; name: string; description: string | null }[]
  }[]
) {
  const user = await getAuthUser()
  await assertCampaignOwner(campaignId, user.id)

  // Sécurité : tous les avatars assignés doivent appartenir à l'utilisateur.
  // Sans ce check, un appel forgé pourrait attacher l'avatar d'un autre compte
  // (et getCampaignWithDetails fuiterait ensuite ses infos via le join).
  if (assignments.length > 0) {
    const ids = assignments.map((a) => a.avatarId)
    const owned = await db
      .select({ id: avatars.id })
      .from(avatars)
      .where(and(inArray(avatars.id, ids), eq(avatars.user_id, user.id)))
    if (owned.length !== new Set(ids).size) {
      throw new Error('Un ou plusieurs avatars sont introuvables ou ne vous appartiennent pas')
    }
  }

  // Remplacement atomique — si l'insert échoue, le delete est annulé (pas de perte)
  await db.transaction(async (tx) => {
    await tx
      .delete(campaign_avatar_assignments)
      .where(eq(campaign_avatar_assignments.campaign_id, campaignId))

    if (assignments.length > 0) {
      await tx.insert(campaign_avatar_assignments).values(
        assignments.map((a) => ({
          campaign_id: campaignId,
          avatar_id:   a.avatarId,
          // « Visage principal » = rôle porteur de la campagne ; tout le reste est secondaire.
          // (Les rôles UI sont des labels français — l'ancien test `includes('secondary')` ne matchait jamais.)
          role:        (a.role === 'Visage principal' ? 'primary' : 'secondary') as 'primary' | 'secondary',
          // Colonnes « primaire » : 1ère tenue / 1er décor du pool (référence rapide)
          outfit_id:      a.outfits?.[0]?.id      ?? null,
          environment_id: a.environments?.[0]?.id ?? null,
          // Snapshot complet de la config au moment de l'assignation (garde-robe incluse)
          config_snapshot: {
            role:         a.role,
            format:       a.format,
            wardrobeMode: a.wardrobeMode ?? 'auto',
            outfits:      a.outfits ?? [],
            environments: a.environments ?? [],
          },
        }))
      )
    }
  })

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
