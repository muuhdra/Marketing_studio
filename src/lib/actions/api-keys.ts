'use server'

/**
 * Server Actions — gestion des clés API MCP de l'utilisateur (création / liste / révocation).
 * La clé en clair n'est renvoyée qu'à la création (createApiKey).
 */
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from './auth'
import { db } from '@/lib/db'
import { api_keys } from '@/lib/db/schema'
import { generateApiKey } from '@/lib/mcp/keys'

export interface ApiKeyDTO {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

export async function listApiKeys(): Promise<ApiKeyDTO[]> {
  const user = await requireAuth()
  const rows = await db.select().from(api_keys).where(eq(api_keys.user_id, user.id)).orderBy(desc(api_keys.created_at))
  return rows.map((r) => ({
    id: r.id, name: r.name, prefix: r.key_prefix,
    lastUsedAt: r.last_used_at ? r.last_used_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  }))
}

/** Crée une clé et renvoie la valeur EN CLAIR (à afficher une seule fois). */
export async function createApiKey(name: string): Promise<{ key: string; dto: ApiKeyDTO }> {
  const user = await requireAuth()
  const label = (name ?? '').trim() || 'Clé MCP'
  const { plaintext, prefix, hash } = generateApiKey()
  const [row] = await db.insert(api_keys).values({
    user_id: user.id, name: label, key_prefix: prefix, key_hash: hash,
  }).returning()
  return {
    key: plaintext,
    dto: { id: row.id, name: row.name, prefix: row.key_prefix, lastUsedAt: null, createdAt: row.created_at.toISOString() },
  }
}

export async function revokeApiKey(id: string): Promise<void> {
  const user = await requireAuth()
  await db.delete(api_keys).where(and(eq(api_keys.id, id), eq(api_keys.user_id, user.id)))
}
