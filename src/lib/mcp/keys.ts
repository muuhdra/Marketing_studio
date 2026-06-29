/**
 * Clés API MCP — génération, hachage, résolution utilisateur.
 * La clé en clair n'est montrée qu'une fois à la création ; on ne stocke que son SHA-256.
 */
import { createHash, randomBytes } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { api_keys } from '@/lib/db/schema'

const PREFIX = 'ms_live_'

export function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext.trim()).digest('hex')
}

/** Génère une nouvelle clé : { plaintext (à montrer 1 fois), prefix (affichage), hash (stocké) }. */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const plaintext = PREFIX + randomBytes(24).toString('hex')
  return { plaintext, prefix: plaintext.slice(0, 12) + '…', hash: hashKey(plaintext) }
}

/** Résout l'utilisateur depuis une clé en clair (Bearer). Met à jour last_used_at. null si invalide. */
export async function resolveUserIdFromKey(plaintext: string | null | undefined): Promise<string | null> {
  if (!plaintext) return null
  const token = plaintext.replace(/^Bearer\s+/i, '').trim()
  if (!token.startsWith(PREFIX)) return null
  const hash = hashKey(token)
  const [row] = await db.select({ id: api_keys.id, user_id: api_keys.user_id }).from(api_keys).where(eq(api_keys.key_hash, hash)).limit(1)
  if (!row) return null
  // Best-effort : trace de dernière utilisation.
  db.update(api_keys).set({ last_used_at: new Date() }).where(eq(api_keys.id, row.id)).catch(() => {})
  return row.user_id
}
