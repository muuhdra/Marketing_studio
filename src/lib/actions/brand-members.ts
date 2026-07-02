'use server'

/**
 * Server Actions — Membres d'une marque (collaboration).
 *
 * Une marque peut être partagée entre plusieurs utilisateurs (table `brand_members`).
 * - Rôle `owner` : le créateur. Peut inviter/retirer des membres et supprimer la marque.
 * - Rôle `member` : accès complet à la marque (campagnes, produits, assets, créations, avatars
 *   des collaborateurs), mais ne gère pas l'équipe ni la suppression de la marque.
 *
 * Modèle d'accès sur invitation : on ne peut ajouter qu'un utilisateur DÉJÀ inscrit
 * (le compte est créé manuellement côté Supabase). On le résout par e-mail via le service-role.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { brand_members } from '@/lib/db/schema'
import { requireAuth, isBrandMember } from './auth'
import { revalidatePath } from 'next/cache'

export interface BrandMemberDTO {
  userId: string
  email:  string | null
  role:   'owner' | 'member'
  isYou:  boolean
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Config Supabase service-role manquante')
  return createServiceClient(url, serviceKey, { auth: { persistSession: false } })
}

/** Trouve un utilisateur inscrit par e-mail (pagination, base de petite taille). */
async function findUserByEmail(email: string): Promise<{ id: string; email: string | null } | null> {
  const supabase = serviceClient()
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === target)
    if (match) return { id: match.id, email: match.email ?? null }
    if (data.users.length < 200) break
  }
  return null
}

/** Liste les membres d'une marque (réservée aux membres de cette marque). */
export async function listBrandMembers(brandId: string): Promise<BrandMemberDTO[]> {
  const user = await requireAuth()
  if (!(await isBrandMember(user.id, brandId))) throw new Error('Marque introuvable ou accès refusé')

  const rows = await db
    .select({ user_id: brand_members.user_id, email: brand_members.email, role: brand_members.role })
    .from(brand_members)
    .where(eq(brand_members.brand_id, brandId))
    .orderBy(brand_members.created_at)

  return rows.map((r) => ({
    userId: r.user_id,
    email:  r.email,
    role:   (r.role === 'owner' ? 'owner' : 'member'),
    isYou:  r.user_id === user.id,
  }))
}

/** Indique si l'utilisateur courant est propriétaire de la marque. */
export async function isBrandOwner(brandId: string): Promise<boolean> {
  const user = await requireAuth()
  const [m] = await db
    .select({ role: brand_members.role })
    .from(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, user.id)))
  return m?.role === 'owner'
}

/** Ajoute un membre par e-mail (propriétaire uniquement). L'utilisateur doit déjà être inscrit. */
export async function addBrandMember(brandId: string, email: string): Promise<BrandMemberDTO> {
  const user = await requireAuth()
  const [me] = await db
    .select({ role: brand_members.role })
    .from(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, user.id)))
  if (!me) throw new Error('Marque introuvable ou accès refusé')
  if (me.role !== 'owner') throw new Error('Seul le propriétaire peut inviter des membres')

  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('Adresse e-mail invalide')

  const found = await findUserByEmail(clean)
  if (!found) throw new Error("Aucun compte n'existe pour cette adresse. L'utilisateur doit d'abord être invité au projet.")

  const [already] = await db
    .select({ id: brand_members.id })
    .from(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, found.id)))
  if (already) throw new Error('Cet utilisateur est déjà membre de la marque')

  await db.insert(brand_members).values({
    brand_id: brandId,
    user_id:  found.id,
    email:    found.email,
    role:     'member',
  })

  revalidatePath('/parametres')
  return { userId: found.id, email: found.email, role: 'member', isYou: false }
}

/** Retire un membre (propriétaire uniquement ; ne peut pas se retirer lui-même). */
export async function removeBrandMember(brandId: string, memberUserId: string): Promise<void> {
  const user = await requireAuth()
  const [me] = await db
    .select({ role: brand_members.role })
    .from(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, user.id)))
  if (!me) throw new Error('Marque introuvable ou accès refusé')
  if (me.role !== 'owner') throw new Error('Seul le propriétaire peut retirer des membres')
  if (memberUserId === user.id) throw new Error('Le propriétaire ne peut pas se retirer lui-même')

  await db
    .delete(brand_members)
    .where(and(eq(brand_members.brand_id, brandId), eq(brand_members.user_id, memberUserId)))

  revalidatePath('/parametres')
}
