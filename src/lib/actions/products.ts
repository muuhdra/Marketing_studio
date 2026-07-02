'use server'

/**
 * Server Actions — Produits de la marque (persistés, RLS par user).
 * Images dans le bucket `assets` sous {userId}/products/... (lecture via URL signée).
 */

import { randomUUID } from 'crypto'
import { and, eq, desc, inArray } from 'drizzle-orm'
import { requireAuth, getActiveBrandId, accessibleBrandIds } from './auth'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { BUCKETS, ASSET_PATHS } from '@/lib/supabase/storage'
import { createAimlClient, MODELS } from '@/lib/ai/client'
import { parseJsonLoose } from '@/lib/ai/json'

const MAX_PRODUCT_IMG = 20 * 1024 * 1024   // 20 MB

function extFromType(type: string): string {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  return 'png'
}

async function uploadBufferToAssets(userId: string, buffer: Buffer, contentType: string): Promise<{ path: string; signedUrl: string | null }> {
  const path = ASSET_PATHS.productImage(userId, randomUUID(), extFromType(contentType))
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKETS.ASSETS).upload(path, buffer, { contentType, upsert: true })
  if (error) throw error
  const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
  return { path, signedUrl: data?.signedUrl ?? null }
}

// ── Upload d'une image produit (persistante) ──
export async function actionUploadProductImage(formData: FormData): Promise<{ path: string; signedUrl: string | null }> {
  const user = await requireAuth()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('Aucune image fournie')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > MAX_PRODUCT_IMG) throw new Error('Image trop lourde (max 20 MB)')
  const buffer = Buffer.from(await file.arrayBuffer())
  return uploadBufferToAssets(user.id, buffer, file.type)
}

// ── Création ──
export interface ProductInput {
  name:            string
  description?:    string | null
  currency?:       string | null
  price?:          string | null
  benefits?:       string[]
  imagePath?:      string | null
  additionalPaths?: string[]
  sourceUrl?:      string | null
}

export async function actionCreateProduct(input: ProductInput): Promise<{ id: string }> {
  const user = await requireAuth()
  if (!input.name?.trim()) throw new Error('Nom requis')
  const brandId = await getActiveBrandId()
  const [row] = await db.insert(products).values({
    user_id:           user.id,
    brand_id:          brandId,
    name:              input.name.trim(),
    description:       input.description ?? null,
    currency:          input.currency ?? 'USD',
    price:             input.price && input.price.trim() ? input.price : null,
    benefits:          input.benefits ?? [],
    image_url:         input.imagePath ?? null,
    additional_images: input.additionalPaths ?? [],
    source_url:        input.sourceUrl ?? null,
  }).returning()
  return { id: row.id }
}

// ── Liste (avec URL signée de l'image principale) ──
export interface ProductDTO {
  id:          string
  name:        string
  description: string | null
  currency:    string | null
  price:       string | null
  benefits:    string[]
  imageUrl:    string | null   // signée (lecture)
  imagePath:   string | null
}

export async function actionListProducts(): Promise<ProductDTO[]> {
  const brandId = await getActiveBrandId()   // marque active vérifiée par membership
  if (!brandId) return []
  const rows = await db.select().from(products)
    .where(eq(products.brand_id, brandId))   // partagé entre tous les membres de la marque
    .orderBy(desc(products.created_at))
  const supabase = await createClient()
  const out: ProductDTO[] = []
  for (const r of rows) {
    let imageUrl: string | null = null
    if (r.image_url) {
      const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(r.image_url, 60 * 60)
      imageUrl = data?.signedUrl ?? null
    }
    out.push({ id: r.id, name: r.name, description: r.description, currency: r.currency, price: r.price, benefits: r.benefits ?? [], imageUrl, imagePath: r.image_url })
  }
  return out
}

export async function actionDeleteProduct(id: string): Promise<void> {
  const user = await requireAuth()
  const ids = await accessibleBrandIds(user.id)
  if (ids.length === 0) return
  // Un membre peut supprimer un produit de toute marque qu'il partage.
  await db.delete(products).where(and(eq(products.id, id), inArray(products.brand_id, ids)))
}

// ── Analyse d'une URL produit → auto-remplissage du formulaire ──
export interface ProductAnalysis {
  name?:        string
  description?: string
  price?:       string
  currency?:    string
  benefits?:    string[]
  image?:       { path: string; signedUrl: string | null } | null
}

export async function actionAnalyzeProductUrl(url: string): Promise<ProductAnalysis> {
  const user = await requireAuth()
  let u: URL
  try { u = new URL(url) } catch { throw new Error('URL invalide') }
  if (!/^https?:$/.test(u.protocol)) throw new Error('URL invalide')

  // 1. Récupère le HTML de la page
  const res = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingStudioBot/1.0)' } })
  if (!res.ok) throw new Error(`Page inaccessible (${res.status})`)
  const html = await res.text()

  // 2. Extrait og:image, titre, texte visible
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)

  // 3. Claude → JSON structuré
  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.claude,
    messages: [
      { role: 'system', content: 'Tu extrais les informations d\'un produit depuis une page web. Réponds UNIQUEMENT en JSON.' },
      { role: 'user', content: `À partir de cette page produit, extrais en JSON exact : {"name": string, "description": string (1-2 phrases), "price": string (nombre seul ex "29.99"), "currency": string (ex "USD","EUR"), "benefits": string[] (3 à 5 atouts courts)}.\n\nTITRE: ${title ?? ''}\n\nCONTENU: ${text}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 400,
  })
  let parsed: ProductAnalysis = {}
  try { parsed = parseJsonLoose<ProductAnalysis>(response.choices[0]?.message?.content) } catch { /* repli vide */ }

  // 4. Télécharge l'og:image → upload persistant
  let image: { path: string; signedUrl: string | null } | null = null
  if (og) {
    try {
      const imgUrl = og.startsWith('http') ? og : new URL(og, u.origin).toString()
      const imgRes = await fetch(imgUrl)
      if (imgRes.ok) {
        const ct = imgRes.headers.get('content-type') ?? 'image/png'
        if (ct.startsWith('image/')) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          if (buf.length <= MAX_PRODUCT_IMG) image = await uploadBufferToAssets(user.id, buf, ct)
        }
      }
    } catch { /* image facultative */ }
  }

  return {
    name:        parsed.name,
    description: parsed.description,
    price:       parsed.price,
    currency:    parsed.currency,
    benefits:    Array.isArray(parsed.benefits) ? parsed.benefits.slice(0, 6) : [],
    image,
  }
}
