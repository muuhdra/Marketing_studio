'use server'

/**
 * Server Actions — AIML API
 *
 * AIMLAPI_KEY n'est jamais exposée côté client.
 * Tous les appels IA passent par ces actions serveur.
 *
 * Modèles disponibles :
 *   Texte  → Claude (Anthropic) + ChatGPT (OpenAI)
 *   Image  → Nano Banana (seul modèle image)
 *   Vidéo  → Kling AI + Seedance
 *   TTS    → ElevenLabs + MiniMax
 */

import { requireAuth } from './auth'
import {
  runResearchAgent,
  quickTrendResearch,
  discoverCompetitors,
  analyzeCompetitorStrategy,
  type ResearchParams,
} from '@/lib/ai/research'
import {
  generateScript,
  generateCopy,
  generateStrategy,
  generateHooks,
  generateCloneScript,
  generateProductionPrompt,
  type GenerateScriptParams,
  type GenerateCopyParams,
  type GenerateStrategyParams,
  type ProductionPromptParams,
  type ChatMessage,
  type ChatAction,
} from '@/lib/ai/text'
import { createAimlClient, MODELS } from '@/lib/ai/client'
import { parseJsonLoose } from '@/lib/ai/json'
import { getActiveBrandId } from './auth'
import { persistOutput } from './outputs'
import { actionCreateProduct, actionListProducts } from './products'
import { listBrands, updateBrand, actionAnalyzeBrandUrl } from './brands'
import {
  generateImage,
  generateCampaignVisual,
  generateAvatarPhoto,
  generateMoodboard,
  generateVideoThumbnail,
  type GenerateImageParams,
} from '@/lib/ai/image'
import {
  submitVideoGeneration,
  getVideoStatus,
  type GenerateVideoParams,
  type VideoEngine,
} from '@/lib/ai/video'
import {
  generateSpeech,
  type GenerateSpeechParams,
} from '@/lib/ai/tts'
import {
  designVoiceFromDescription,
} from '@/lib/ai/voice-design'
import {
  cloneVoiceElevenLabs,
  isVoiceCloneEnabled,
} from '@/lib/ai/voice-clone'
import { reverseEngineerPrompt, describeAvatarFromImage, describeProductScene, suggestFashionScene } from '@/lib/ai/vision'

// ─── Research Agent : Perplexity ─────────────────────────────────────────────

/**
 * Recherche approfondie — Perplexity Sonar Pro
 * Tendances + formats viraux + actualités + contexte avatar
 */
export async function actionRunResearch(params: ResearchParams) {
  await requireAuth()
  return runResearchAgent(params)
}

/**
 * Recherche rapide — Perplexity Sonar
 * Juste les tendances et formats viraux (avant génération script)
 */
export async function actionQuickTrendResearch(options: {
  topic:    string
  platform: 'tiktok' | 'instagram' | 'youtube'
  locale?:  string
}) {
  await requireAuth()
  return quickTrendResearch(options)
}

/** Veille concurrentielle — découverte + analyse des stratégies pub (Perplexity). */
export async function actionDiscoverCompetitors(input: {
  brandName?: string; category?: string; description?: string; audience?: string; query?: string
}) {
  await requireAuth()
  return discoverCompetitors(input)
}

/** Analyse profonde d'un concurrent + playbook adapté à notre marque (Perplexity). */
export async function actionAnalyzeCompetitorStrategy(input: {
  competitor: string; brandName?: string; description?: string; tone?: string; audience?: string; product?: string; dna?: string
}) {
  await requireAuth()
  return analyzeCompetitorStrategy(input)
}

/**
 * Pipeline complet : Research → Script
 * Perplexity cherche les tendances → Claude/ChatGPT génère le script enrichi
 */
export async function actionResearchThenScript(
  researchParams: Omit<ResearchParams, 'depth'>,
  scriptParams:   Omit<GenerateScriptParams, 'researchContext'>,
) {
  await requireAuth()

  // Étape 1 : Research Agent (Perplexity)
  const researchContext = await runResearchAgent({
    ...researchParams,
    depth: 'quick',  // rapide pour ne pas bloquer l'UX
  })

  // Étape 2 : Génération du script enrichi (Claude ou ChatGPT)
  const script = await generateScript({
    ...scriptParams,
    researchContext,
  })

  return { researchContext, script }
}

// ─── Texte : Claude + ChatGPT ────────────────────────────────────────────────

export async function actionGenerateScript(params: GenerateScriptParams) {
  await requireAuth()
  return generateScript(params)
}

export async function actionGenerateCopy(params: GenerateCopyParams) {
  await requireAuth()
  return generateCopy(params)
}

/** Brief de génération créatif (Production) : analyse produit + ADN marque → prompt sur-mesure. */
// ─── Agent à outils (façon MCP) : l'assistant exécute vraiment des actions ────

export interface ChatAgentResult { reply: string; images?: string[]; action?: ChatAction | null; link?: { label: string; path: string } | null }

// Outils exécutés côté client (navigation, bascule de marque…) → renvoyés pour exécution.
const CLIENT_TOOLS = new Set(['navigate', 'create_image', 'create_video', 'switch_brand', 'create_brand'])

function toClientAction(name: string, args: Record<string, unknown>): ChatAction | null {
  switch (name) {
    case 'navigate':      return { type: 'navigate', path: String(args.path ?? '/dashboard') }
    case 'create_image':  return { type: 'create_image', prompt: args.prompt ? String(args.prompt) : undefined }
    case 'create_video':  return { type: 'create_video', mode: args.mode === 'broll-voiceover' ? 'broll-voiceover' : 'realistic-actor' }
    case 'switch_brand':  return { type: 'switch_brand', name: String(args.name ?? '') }
    case 'create_brand':  return { type: 'create_brand', name: String(args.name ?? ''), color: args.color ? String(args.color) : undefined, category: args.category ? String(args.category) : undefined }
    default: return null
  }
}

export async function actionChatAgent(
  messages: ChatMessage[],
  context?: { studioName?: string; brand?: string; brands?: string[]; freeCreation?: boolean; refImageUrl?: string },
): Promise<ChatAgentResult> {
  await requireAuth()
  const client = createAimlClient()

  const system = `Tu es l'assistant-AGENT de « ${context?.studioName || 'le studio'} », un studio de création publicitaire IA. Tu PILOTES l'app via des OUTILS, et tu es un EXPERT créatif complet.

EXPERTISE (mobilise-la pleinement) : directeur créatif + copywriter + stratège social/DTC de classe mondiale.
- Copywriting & accroches : hooks scroll-stopping (5 variantes), structures AIDA / PAS / BAB / 4U, angles publicitaires, CTA.
- Scripts : UGC, voix off B-roll, talking-head, storyboards, beats narratifs, rythme.
- Psychologie d'achat : désir, douleur, preuve sociale, autorité, urgence, rareté, objections.
- Direction artistique : concept, mise en scène, décor, lumière, cadrage, palette, mood.
- Stratégie : positionnement, ADN/ton de marque, personas, calendriers éditoriaux, funnels (TOFU/MOFU/BOFU), formats viraux par plateforme (TikTok/Reels/Shorts), tendances.
- Réflexion : raisonne étape par étape avant de proposer ; structure tes réponses (puces, sections) ; sois concret et actionnable.
Tu PRODUIS directement dans ta réponse (sans outil) : concepts, hooks, scripts, légendes, hashtags, plans de campagne, briefs créatifs, analyses. Utilise l'outil research/research_competitors pour t'appuyer sur des données RÉELLES avant de créer quand c'est pertinent.

CONTEXTE — Marque active : ${context?.brand || '(aucune)'} · Marques : ${context?.brands?.length ? context.brands.join(', ') : '(aucune)'}

À CHAQUE TOUR tu réponds en JSON STRICT :
{ "tool": { "name": string, "args": object } }  pour appeler un outil, OU  { "reply": string, "link"?: { "label": string, "path": string } }  pour répondre/terminer (en français, concis).
Quand tu AS ACCOMPLI une tâche qui produit un résultat, ajoute "link" vers la page où le voir : images → { "label": "Voir mes créations", "path": "/galerie" } · produit créé → { "label": "Voir mes produits", "path": "/parametres?section=products" } · marque → { "label": "Voir le profil", "path": "/parametres?section=profile" }.

OUTILS qui s'exécutent et te RENVOIENT un résultat (tu peux en enchaîner) :
- list_brands {} · list_products {} · create_product { "name": string, "description"?: string }
- generate_image { "prompt": string, "n"?: 1-3 } — génère VRAIMENT des images (montrées à l'utilisateur)
- research { "topic": string, "platform"?: "tiktok"|"instagram"|"youtube" } — tendances, formats viraux et mots-clés RÉELS (utilise-les avant de proposer des concepts)
- research_competitors { "query"?: string } — découvre des concurrents e-commerce de la niche et leurs angles gagnants
- import_site { "url": string } — importe le profil de la marque active depuis un site

OUTILS qui agissent côté interface (l'action s'arrête là) :
- navigate { "path": string } — "/dashboard","/creer/image/creator","/creer/image/statics","/galerie","/templates","/avatar-studio","/calendrier","/campaigns","/parametres?section=profile|products|assets|templates|production|competitors","/reglages"
- create_image { "prompt"?: string } — ouvre le créateur d'image
- create_video { "mode": "realistic-actor" | "broll-voiceover" }
- switch_brand { "name": string } · create_brand { "name": string, "color"?: hex, "category"?: string }

RÈGLES : agis seulement si l'utilisateur le demande. Après un generate_image / create_product réussi, termine par un { "reply" } qui confirme. Une seule clé par tour (tool OU reply).${context?.refImageUrl ? "\nUne IMAGE DE RÉFÉRENCE est jointe : utilise-la comme base (image-to-image) pour generate_image." : ''}${context?.freeCreation ? "\nMode CRÉATION RAPIDE : les images générées ne sont rattachées à aucune marque." : ''}`

  const convo: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ]
  const images: string[] = []

  for (let step = 0; step < 5; step++) {
    const res = await client.chat.completions.create({
      model: MODELS.text.chatgpt,
      messages: convo,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 700,
    })
    const out = parseJsonLoose<{ reply?: string; tool?: { name?: string; args?: Record<string, unknown> } | null; link?: { label: string; path: string } | null }>(res.choices[0]?.message?.content)
    const tool = out.tool
    if (!tool?.name) {
      // Si des images ont été générées sans lien explicite → pointe vers les Créations.
      const link = out.link ?? (images.length ? { label: 'Voir mes créations', path: '/galerie' } : null)
      return { reply: out.reply || 'OK', images: images.length ? images : undefined, action: null, link }
    }
    const args = tool.args ?? {}

    if (CLIENT_TOOLS.has(tool.name)) {
      return { reply: out.reply || '', images: images.length ? images : undefined, action: toClientAction(tool.name, args) }
    }

    // Outils serveur : exécuter puis reboucler avec le résultat.
    let result = ''
    try {
      if (tool.name === 'list_brands') {
        result = (await listBrands()).map((b) => b.name).join(', ') || '(aucune)'
      } else if (tool.name === 'list_products') {
        result = (await actionListProducts()).map((p) => p.name).join(', ') || '(aucun)'
      } else if (tool.name === 'create_product') {
        const name = String(args.name ?? '').trim()
        if (!name) { result = 'Erreur: nom requis' }
        else { await actionCreateProduct({ name, description: args.description ? String(args.description) : null, currency: 'USD', price: null, benefits: [], imagePath: null, additionalPaths: [], sourceUrl: null }); result = `Produit « ${name} » créé` }
      } else if (tool.name === 'generate_image') {
        const prompt = String(args.prompt ?? '').trim()
        const n = Math.max(1, Math.min(3, Number(args.n) || 1))
        if (!prompt) { result = 'Erreur: prompt requis' }
        else {
          const imgs = await generateImage({ prompt, model: 'nano-banana', size: '1024x1024', n, ...(context?.refImageUrl ? { imageUrl: [context.refImageUrl] } : {}) })
          for (const im of imgs) {
            if (!im.url) continue
            images.push(im.url)
            // freeCreation → output non rattaché à une marque (création rapide).
            persistOutput({ type: 'image', sourceUrl: im.url, title: 'Assistant', engine: 'nano-banana', prompt: prompt.slice(0, 200), brandId: context?.freeCreation ? null : undefined }).catch(() => {})
          }
          result = `${images.length} image(s) générée(s)`
        }
      } else if (tool.name === 'research') {
        const topic = String(args.topic ?? '').trim()
        const platform = (['tiktok', 'instagram', 'youtube'].includes(String(args.platform)) ? String(args.platform) : 'tiktok') as 'tiktok' | 'instagram' | 'youtube'
        if (!topic) { result = 'Erreur: sujet requis' }
        else {
          const r = await quickTrendResearch({ topic, platform })
          result = `Tendances: ${r.trends.slice(0, 6).join(' | ')} · Formats viraux: ${r.viralFormats.slice(0, 5).join(' | ')} · Mots-clés: ${r.trendingKeywords.slice(0, 8).join(', ')}`
        }
      } else if (tool.name === 'research_competitors') {
        const r = await discoverCompetitors({ brandName: context?.brand, query: args.query ? String(args.query) : undefined })
        result = r.competitors.slice(0, 5).map((c) => `${c.name} — ${c.adAngles?.slice(0, 2).join(', ') ?? c.positioning ?? ''}`).join(' ; ') || '(aucun concurrent trouvé)'
      } else if (tool.name === 'import_site') {
        const url = String(args.url ?? '').trim()
        const brandId = await getActiveBrandId()
        if (!url) { result = 'Erreur: URL requise' }
        else if (!brandId) { result = 'Erreur: aucune marque active' }
        else {
          const a = await actionAnalyzeBrandUrl(url)
          await updateBrand(brandId, { profile: { ...a, website: url } as Record<string, unknown> })
          result = `Profil importé depuis ${url}`
        }
      } else {
        result = `Outil inconnu: ${tool.name}`
      }
    } catch (e) {
      result = 'Erreur: ' + (e instanceof Error ? e.message : 'inconnue')
    }

    convo.push({ role: 'assistant', content: JSON.stringify({ tool }) })
    convo.push({ role: 'system', content: `Résultat de ${tool.name} : ${result}` })
  }

  return { reply: "J'ai atteint la limite d'étapes — reformule ou découpe ta demande.", images: images.length ? images : undefined, action: null }
}

export async function actionGenerateProductionPrompt(params: ProductionPromptParams) {
  await requireAuth()
  return generateProductionPrompt(params)
}

/** Stratégie — Claude par défaut (raisonnement profond) */
export async function actionGenerateStrategy(params: GenerateStrategyParams) {
  await requireAuth()
  return generateStrategy({ ...params, model: params.model ?? 'claude' })
}

export async function actionGenerateHooks(
  campaignDna: string,
  count?: number,
  model?: 'chatgpt' | 'claude',
) {
  await requireAuth()
  return generateHooks(campaignDna, count, model)
}

/** Clone Lab — Claude génère un script dans le style d'un persona */
export async function actionGenerateCloneScript(options: {
  personaDescription: string
  product:            string
  platform:           'tiktok' | 'instagram' | 'youtube'
  duration?:          number
}) {
  await requireAuth()
  return generateCloneScript(options)
}

// ─── Image : Nano Banana ─────────────────────────────────────────────────────

export async function actionGenerateImage(params: GenerateImageParams) {
  await requireAuth()
  return generateImage(params)
}

/** Visuel campagne HD — Nano Banana (image-to-image si `imageUrl`) */
export async function actionGenerateCampaignVisual(options: {
  campaignName: string
  dna:          string
  style?:       string
  format?:      '16:9' | '9:16' | '1:1'
  imageUrl?:    string
}) {
  await requireAuth()
  return generateCampaignVisual(options)
}

/** Photo avatar — Nano Banana (depuis le profil, ou depuis un prompt dérivé d'une image) */
export async function actionGenerateAvatarPhoto(options: {
  name:       string
  age?:       number
  ethnicity?: string
  style?:     string
  setting?:   string
  traits?:    string
  descriptionPrompt?: string   // prompt issu du reverse-engineering d'une photo
  imageUrl?:  string           // photo de référence (flux clone) → image-to-image
}) {
  await requireAuth()
  return generateAvatarPhoto(options)
}

/** Reverse-engineering d'une photo → prompt de portrait d'avatar (Gemini vision) */
export async function actionDescribeAvatarFromImage(input: { dataUrl: string }): Promise<string> {
  await requireAuth()
  return describeAvatarFromImage(input.dataUrl)
}

/** Analyse une image produit → { product, background } pour un décor cohérent (Gemini vision) */
export async function actionDescribeProductScene(input: { imageUrl?: string; imageData?: string }) {
  await requireAuth()
  return describeProductScene(input)
}

/** Suggère une scène de shooting mode à partir du vêtement + mannequin (Gemini vision) */
export async function actionSuggestFashionScene(input: { clothingUrl?: string; modelUrl?: string; garmentType?: string; modelHint?: string; description?: string }) {
  await requireAuth()
  return suggestFashionScene(input)
}

/** Moodboard 4 images — Nano Banana (rapide & créatif ; image-to-image si `imageUrl`) */
export async function actionGenerateMoodboard(campaignDna: string, count?: number, imageUrl?: string) {
  await requireAuth()
  return generateMoodboard(campaignDna, count, imageUrl)
}

/**
 * Inspiration : reverse-engineer un prompt depuis un média de référence
 * (image ou frame de vidéo, en data URL côté client, ou URL publique).
 */
export async function actionInspireFromMedia(input: {
  dataUrl?:  string
  imageUrl?: string
  frames?:   string[]   // vidéo : frames ordonnées (décomposition Gemini)
  hint?:     string
}): Promise<string> {
  await requireAuth()
  return reverseEngineerPrompt({ imageData: input.dataUrl, imageUrl: input.imageUrl, frames: input.frames, hint: input.hint })
}

/** Thumbnail vidéo — Nano Banana */
export async function actionGenerateVideoThumbnail(options: {
  title:   string
  style?:  string
  format?: '16:9' | '9:16' | '1:1'
}) {
  await requireAuth()
  return generateVideoThumbnail(options)
}

// ─── Vidéo : Kling AI + Seedance ────────────────────────────────────────────

/** Soumet un job vidéo (Kling ou Seedance) — retourne immédiatement */
export async function actionSubmitVideo(params: GenerateVideoParams) {
  await requireAuth()
  return submitVideoGeneration(params)
}

/** Récupère le statut d'un job vidéo en cours */
export async function actionGetVideoStatus(generationId: string, engine?: VideoEngine) {
  await requireAuth()
  return getVideoStatus(generationId, engine)
}

// ─── TTS : ElevenLabs + MiniMax ─────────────────────────────────────────────

export async function actionGenerateSpeech(params: GenerateSpeechParams) {
  await requireAuth()
  return generateSpeech(params)
}

// ─── Voice Design : description simple → config voix MiniMax ─────────────────

export async function actionDesignVoiceFromDescription(input: {
  description: string
  avatarName?: string | null
  age?:        number | null
  styleTags?:  string[] | null
}) {
  await requireAuth()
  if (!input.description?.trim()) throw new Error('Description vide')
  return designVoiceFromDescription(input)
}

// ─── Clonage de voix — Campagne Spéciale uniquement (ElevenLabs, API dédiée) ──

/** Indique au client si le clonage est activé (sinon l'UI le présente comme « bientôt »). */
export async function actionIsVoiceCloneEnabled() {
  await requireAuth()
  return isVoiceCloneEnabled()
}

export async function actionCloneVoice(params: { name: string; sampleUrl: string }) {
  await requireAuth()
  // Gated : tant que l'API dédiée n'est pas configurée, renvoie une erreur claire.
  return cloneVoiceElevenLabs(params)
}
