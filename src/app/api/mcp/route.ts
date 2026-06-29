import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { z } from 'zod'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { brands, products, avatars, generated_outputs } from '@/lib/db/schema'
import { resolveUserIdFromKey } from '@/lib/mcp/keys'
import { generateImage } from '@/lib/ai/image'
import { submitVideoGeneration, getVideoStatus } from '@/lib/ai/video'

// Récupère l'userId injecté par withMcpAuth (clé API → compte Supabase).
function uid(extra: unknown): string {
  const u = (extra as { authInfo?: { extra?: { userId?: string } } })?.authInfo?.extra?.userId
  if (!u) throw new Error('Non authentifié')
  return u
}
const text = (data: unknown) => ({ content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] })

// Résout une marque par nom (sinon la 1ʳᵉ marque de l'utilisateur). null si aucune.
async function resolveBrandId(userId: string, name?: string): Promise<string | null> {
  const rows = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.user_id, userId)).orderBy(desc(brands.created_at))
  if (!rows.length) return null
  if (name) {
    const m = rows.find((b) => b.name.toLowerCase() === name.trim().toLowerCase())
    if (m) return m.id
  }
  return rows[rows.length - 1].id // la première créée
}

const RATIO_SIZE: Record<string, '1024x1024' | '1024x1792' | '1792x1024'> = {
  '1:1': '1024x1024', '9:16': '1024x1792', '16:9': '1792x1024',
}

const handler = createMcpHandler((server) => {
  // ── Lecture ──────────────────────────────────────────────────────────────
  server.tool('list_brands', 'Liste les marques du compte.', {}, async (_a, extra) => {
    const userId = uid(extra)
    const rows = await db.select({ id: brands.id, name: brands.name, category: brands.category }).from(brands).where(eq(brands.user_id, userId)).orderBy(desc(brands.created_at))
    return text(rows)
  })

  server.tool('list_products', 'Liste les produits (optionnellement filtrés par marque).', { brand: z.string().optional() }, async ({ brand }, extra) => {
    const userId = uid(extra)
    const brandId = brand ? await resolveBrandId(userId, brand) : null
    const where = brandId ? and(eq(products.user_id, userId), eq(products.brand_id, brandId)) : eq(products.user_id, userId)
    const rows = await db.select({ id: products.id, name: products.name, price: products.price, currency: products.currency, description: products.description }).from(products).where(where).orderBy(desc(products.created_at))
    return text(rows)
  })

  server.tool('list_characters', 'Liste les personnages / avatars (partagés entre marques).', {}, async (_a, extra) => {
    const userId = uid(extra)
    const rows = await db.select({ id: avatars.id, name: avatars.name, age: avatars.age, ethnicity: avatars.ethnicity }).from(avatars).where(and(eq(avatars.user_id, userId), eq(avatars.status, 'active'))).orderBy(desc(avatars.created_at))
    return text(rows)
  })

  server.tool('list_creations', 'Liste les contenus générés récents (images/vidéos/audio).', { limit: z.number().min(1).max(50).optional() }, async ({ limit }, extra) => {
    const userId = uid(extra)
    const rows = await db.select({ id: generated_outputs.id, type: generated_outputs.type, title: generated_outputs.title, engine: generated_outputs.engine, createdAt: generated_outputs.created_at })
      .from(generated_outputs).where(eq(generated_outputs.user_id, userId)).orderBy(desc(generated_outputs.created_at)).limit(limit ?? 20)
    return text(rows)
  })

  // ── Écriture ─────────────────────────────────────────────────────────────
  server.tool('create_brand', 'Crée une nouvelle marque.', { name: z.string(), category: z.string().optional(), color: z.string().optional() }, async ({ name, category, color }, extra) => {
    const userId = uid(extra)
    const [row] = await db.insert(brands).values({ user_id: userId, name: name.trim(), category: category ?? null, color: color ?? '#ea580c', profile: { name: name.trim(), ...(category ? { category } : {}) } }).returning()
    return text({ id: row.id, name: row.name, created: true })
  })

  server.tool('create_product', 'Crée un produit dans une marque (la 1ʳᵉ marque par défaut).', { name: z.string(), brand: z.string().optional(), description: z.string().optional(), price: z.string().optional(), currency: z.string().optional() }, async ({ name, brand, description, price, currency }, extra) => {
    const userId = uid(extra)
    const brandId = await resolveBrandId(userId, brand)
    if (!brandId) throw new Error('Aucune marque — crée d’abord une marque (create_brand).')
    const [row] = await db.insert(products).values({ user_id: userId, brand_id: brandId, name: name.trim(), description: description ?? null, price: price ?? null, currency: currency ?? 'USD', benefits: [] }).returning()
    return text({ id: row.id, name: row.name, created: true })
  })

  // ── Génération ───────────────────────────────────────────────────────────
  server.tool('generate_image', 'Génère une ou plusieurs images (Nano Banana). Renvoie les URLs.', { prompt: z.string(), aspect: z.enum(['1:1', '9:16', '16:9']).optional(), count: z.number().min(1).max(4).optional() }, async ({ prompt, aspect, count }, extra) => {
    uid(extra)
    const results = await generateImage({ prompt, model: 'nano-banana', size: RATIO_SIZE[aspect ?? '1:1'], n: count ?? 1 })
    return text({ images: results.map((r) => r.url) })
  })

  server.tool('generate_video', 'Génère une vidéo (Kling ou Seedance) à partir d’un prompt (et image optionnelle). Attente jusqu’à ~4 min.', { prompt: z.string(), engine: z.enum(['kling', 'seedance']).optional(), imageUrl: z.string().optional(), aspect: z.enum(['1:1', '9:16', '16:9']).optional() }, async ({ prompt, engine, imageUrl, aspect }, extra) => {
    uid(extra)
    const eng = engine ?? 'kling'
    const job = await submitVideoGeneration({ prompt, engine: eng, imageUrl, aspectRatio: aspect ?? '9:16', duration: 5 })
    for (let i = 0; i < 48; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      const s = await getVideoStatus(job.generationId, eng)
      if (s.status === 'completed' && s.videoUrl) return text({ video: s.videoUrl })
      if (s.status === 'failed') throw new Error(s.error || 'Génération vidéo échouée')
    }
    return text({ status: 'processing', generationId: job.generationId, note: 'Encore en cours — réessaie plus tard.' })
  })
}, {}, { basePath: '/api/mcp' })

// Auth : Bearer = clé API MCP de l'utilisateur → résout le compte Supabase.
const verifyToken = async (_req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
  const userId = await resolveUserIdFromKey(bearer)
  if (!userId) return undefined
  return { token: bearer as string, clientId: 'marketing-studio-mcp', scopes: [], extra: { userId } }
}

const authed = withMcpAuth(handler, verifyToken, { required: true })

export { authed as GET, authed as POST }
