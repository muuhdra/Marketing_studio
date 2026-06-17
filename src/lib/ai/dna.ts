/**
 * ADN de campagne — Extraction & Analyse
 *
 * Permet d'uploader un document (Word / PDF / Markdown / texte) décrivant
 * la Direction Artistique d'une campagne, d'en extraire le texte, puis de
 * le faire analyser par Claude (le « cerveau » du système).
 *
 * Server-only — appelé uniquement depuis les Server Actions.
 */

import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { createAimlClient, MODELS } from './client'
import { parseJsonLoose } from './json'

// ─── Types ──────────────────────────────────────────────────────────────────

export type DnaFileKind = 'docx' | 'pdf' | 'md' | 'txt'

export interface DnaAnalysis {
  productType:     string          // produit e-commerce, app mobile, concept, etc.
  brandEssence:    string          // essence de la marque en 1-2 phrases
  tone:            string[]        // adjectifs de ton (max 5)
  targetAudience:  string          // audience cible
  colorPalette:    string[]        // couleurs mentionnées / déduites (hex ou noms)
  visualDirection: string          // direction visuelle / DA
  keyMessages:     string[]        // messages clés
  objectives:      string[]        // objectifs de campagne
  healthScore:     number          // 0-100 : complétude / clarté de l'ADN
  summary:         string          // résumé exploitable injecté dans les prompts
}

// ─── Extraction de texte selon le format ──────────────────────────────────────

export function detectFileKind(fileName: string, mimeType: string): DnaFileKind | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'docx' || mimeType.includes('officedocument.wordprocessingml')) return 'docx'
  if (ext === 'pdf'  || mimeType === 'application/pdf')                       return 'pdf'
  if (ext === 'md'   || ext === 'markdown')                                  return 'md'
  if (ext === 'txt'  || mimeType.startsWith('text/'))                        return 'txt'
  return null
}

export async function extractDnaText(
  buffer: Buffer,
  kind:   DnaFileKind,
): Promise<string> {
  switch (kind) {
    case 'docx': {
      const { value } = await mammoth.extractRawText({ buffer })
      return value.trim()
    }
    case 'pdf': {
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: true })
      return (Array.isArray(text) ? text.join('\n') : text).trim()
    }
    case 'md':
    case 'txt':
      return buffer.toString('utf-8').trim()
  }
}

// ─── Analyse par Claude (cerveau du système) ──────────────────────────────────

/**
 * Envoie le texte ADN à Claude pour structurer la Direction Artistique.
 * Retourne un objet exploitable + un health score.
 */
export async function analyzeDna(rawText: string): Promise<DnaAnalysis> {
  const client = createAimlClient()

  const trimmed = rawText.slice(0, 24_000) // garde-fou tokens

  const response = await client.chat.completions.create({
    model:    MODELS.text.claude,   // claude-opus — raisonnement profond
    messages: [
      {
        role:    'system',
        content: `Tu es un directeur de création senior. Tu analyses l'ADN (Direction Artistique)
d'une campagne marketing et tu le structures pour qu'il guide toutes les générations IA.
La campagne peut concerner un produit e-commerce (alimentaire, vêtement, etc.), une application
mobile, un concept, un service... Identifie précisément la nature du projet.
Réponds UNIQUEMENT en JSON valide, en français.`,
      },
      {
        role:    'user',
        content: `Analyse cet ADN de campagne et structure-le.

ADN BRUT :
"""
${trimmed}
"""

JSON exact :
{
  "productType":     "nature du projet (ex: produit cosmétique e-commerce, app mobile fitness, concept événementiel)",
  "brandEssence":    "essence de la marque en 1-2 phrases",
  "tone":            ["adjectif1", "adjectif2", "adjectif3"],
  "targetAudience":  "description de l'audience cible",
  "colorPalette":    ["#hex ou nom de couleur", "..."],
  "visualDirection": "direction visuelle et artistique (style, ambiance, références)",
  "keyMessages":     ["message clé 1", "message clé 2"],
  "objectives":      ["objectif 1", "objectif 2"],
  "healthScore":     0,
  "summary":         "résumé dense et exploitable (3-5 phrases) à injecter dans les prompts de génération"
}

Le healthScore (0-100) évalue la complétude et la clarté de l'ADN fourni :
plus le document est riche (cible, ton, DA visuelle, objectifs, couleurs), plus le score est élevé.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.4,
    max_tokens:      1500,
  })

  // Parse tolérant ; en cas d'échec on garde {} → la normalisation défensive ci-dessous applique les valeurs par défaut
  let parsed: Partial<DnaAnalysis> = {}
  try { parsed = parseJsonLoose<Partial<DnaAnalysis>>(response.choices[0]?.message?.content) } catch { /* normalisation défensive */ }

  // Normalisation défensive
  return {
    productType:     parsed.productType     ?? '',
    brandEssence:    parsed.brandEssence    ?? '',
    tone:            Array.isArray(parsed.tone)         ? parsed.tone         : [],
    targetAudience:  parsed.targetAudience  ?? '',
    colorPalette:    Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
    visualDirection: parsed.visualDirection ?? '',
    keyMessages:     Array.isArray(parsed.keyMessages)  ? parsed.keyMessages  : [],
    objectives:      Array.isArray(parsed.objectives)   ? parsed.objectives   : [],
    healthScore:     typeof parsed.healthScore === 'number'
      ? Math.round(Math.max(0, Math.min(100, parsed.healthScore))) // colonne integer — jamais de décimal
      : 0,
    summary:         parsed.summary ?? '',
  }
}
