/**
 * AIML API — Génération de texte
 *
 * ChatGPT (GPT-4o)     → scripts UGC, copy, hooks  — rapide & créatif
 * Claude (Opus 4)      → stratégie, orchestration   — raisonnement profond
 *
 * Les deux sont accessibles avec la même clé AIMLAPI_KEY via AIML API.
 */

import { createAimlClient, MODELS } from './client'
import { type ResearchContext, formatResearchForPrompt } from './research'
import { parseJsonLoose } from './json'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateScriptParams {
  campaignName:    string
  campaignDna:     string
  contentType:     'ugc' | 'commercial' | 'shooting' | 'visuel'
  avatarName?:     string
  avatarStyle?:    string
  avatarAge?:      number
  avatarNiche?:    string
  format?:         'social' | 'tutorial' | 'unboxing' | 'review' | 'tv-spot'
  duration?:       number
  platform?:       'tiktok' | 'instagram' | 'youtube' | 'generic'
  language?:       string
  model?:          'chatgpt' | 'claude'
  // Contexte de recherche Perplexity (optionnel — enrichit le script)
  researchContext?: ResearchContext
  // Structure d'inspiration : prompt ayant produit un template existant. On en
  // reprend la structure / le rythme / le style, mais on l'adapte au produit.
  templateStructure?: string
}

export interface ScriptResult {
  hook:        string
  hooks?:      string[]                  // variantes de hooks (Clone Lab)
  script:      string
  voiceover:   string
  cta:         string
  tone?:       string                    // ton global du script (Clone Lab)
  hashtags:    string[]
  duration:    number
  model:       string                    // modèle utilisé
}

export interface GenerateCopyParams {
  campaignName:  string
  product:       string
  tone:          'professionnel' | 'fun' | 'luxe' | 'minimaliste' | 'gen-z'
  formats:       ('caption' | 'headline' | 'email-subject' | 'push-notif')[]
  language?:     string
  model?:        'chatgpt' | 'claude'
}

export interface CopyResult {
  captions:      string[]
  headlines:     string[]
  emailSubjects: string[]
  pushNotifs:    string[]
  model:         string
}

export interface GenerateStrategyParams {
  campaignName:  string
  campaignDna:   string
  contentTypes:  string[]
  avatarCount:   number
  duration:      number
  budget?:       number
  model?:        'chatgpt' | 'claude'
}

export interface StrategyResult {
  summary:     string
  phases:      { name: string; duration: string; actions: string[] }[]
  kpis:        { metric: string; target: string }[]
  contentPlan: { week: number; type: string; quantity: number; platform: string }[]
  tips:        string[]
  model:       string
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/** Résout le model ID AIML depuis le choix 'chatgpt' | 'claude' (pas de variante "fast" : 10 modèles max sur la clé) */
function resolveModel(choice?: 'chatgpt' | 'claude'): string {
  return choice === 'claude' ? MODELS.text.claude : MODELS.text.chatgpt
}

// ─── generateScript — ChatGPT par défaut ─────────────────────────────────────

export async function generateScript(params: GenerateScriptParams): Promise<ScriptResult> {
  const client    = createAimlClient()
  const modelId   = resolveModel(params.model)          // ChatGPT = créativité
  const lang      = params.language ?? 'fr'

  const systemPrompt = `Tu es un expert en création de contenu vidéo marketing viral.
Tu rédiges des scripts percutants pour des campagnes publicitaires.
Réponds UNIQUEMENT en JSON valide selon le format demandé.
Langue de sortie : ${lang === 'fr' ? 'français' : lang}.`

  // Injecter le contexte de recherche Perplexity si disponible
  const researchBlock = params.researchContext
    ? `\n${formatResearchForPrompt(params.researchContext)}\n`
    : ''

  // Structure de référence (template existant) → on en reprend l'ossature, pas le sujet.
  const templateBlock = params.templateStructure?.trim()
    ? `\nSTRUCTURE DE RÉFÉRENCE (issue d'un template qui a fait ses preuves) :
"""${params.templateStructure.trim()}"""
Inspire-toi STRICTEMENT de cette structure : même enchaînement de plans/beats, même rythme, même type d'accroche et de chute, même style de réalisation. MAIS remplace entièrement le sujet par le produit de la campagne ci-dessus — ne recopie jamais le contenu, les marques ou les exemples d'origine.\n`
    : ''

  const userPrompt = `Crée un script ${params.contentType} pour la campagne "${params.campaignName}".

ADN Campagne : ${params.campaignDna}
${templateBlock}
${params.avatarName ? `Avatar : ${params.avatarName}${params.avatarStyle ? ` (style: ${params.avatarStyle})` : ''}${params.avatarAge ? ` · ${params.avatarAge} ans` : ''}${params.avatarNiche ? ` · niche: ${params.avatarNiche}` : ''}` : ''}
Format : ${params.format ?? 'social'}
Durée : ${params.duration ?? 30}s
Plateforme : ${params.platform ?? 'generic'}
${researchBlock}
INSTRUCTIONS : Utilise impérativement les tendances et formats viraux du contexte ci-dessus pour rendre le script actuel et pertinent. Adapte le ton et les références culturelles au profil de l'avatar.

JSON exact :
{
  "hook": "accroche des 3 premières secondes (max 15 mots, ultra-percutant)",
  "script": "script complet avec indications [ACTION], [GROS PLAN]...",
  "voiceover": "texte narration / voix off uniquement",
  "cta": "call-to-action final (max 10 mots)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "duration": ${params.duration ?? 30}
}`

  const response = await client.chat.completions.create({
    model:           modelId,
    messages:        [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.85,
    max_tokens:      1000,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return { ...parseJsonLoose<ScriptResult>(raw), model: modelId }
}

// ─── generateProductionPrompt — brief créatif de génération (image/vidéo) ────

export interface ProductionPromptParams {
  contentType: string                 // libellé du type (Pub statique, Carrousel, Vidéo acteur…)
  brand: {
    name?: string
    description?: string
    tone?: string
    audience?: string
    keyFeatures?: string[]
    preferredWords?: string[]
    wordsToAvoid?: string[]
    audienceDesires?: string[]
    audienceProblems?: string[]
    dna?: string                      // texte ADN importé (extrait)
  }
  product?: {
    name?: string
    description?: string
    benefits?: string[]
    price?: string
  }
  inspiredBy?: {                      // OPTIONNEL : s'inspirer d'un concurrent suivi
    name: string
    positioning?: string
    angles?: string[]
  }
  language?: string
}

/**
 * Compose un brief de génération ULTRA créatif et sur-mesure : le modèle analyse le produit
 * et l'ADN de marque (description, ton, audience, désirs/problèmes, mots clés), applique les
 * meilleures pratiques publicitaires et met le produit en avant. Retourne { prompt }.
 */
export async function generateProductionPrompt(params: ProductionPromptParams): Promise<{ prompt: string }> {
  const client  = createAimlClient()
  const modelId = resolveModel('chatgpt')
  const lang    = params.language ?? 'fr'
  const b = params.brand
  const p = params.product

  const list = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : '—')

  const systemPrompt = `Tu es un directeur artistique publicitaire de classe mondiale, expert en performance créative (DTC, social ads).
Ta mission : à partir de l'ADN de la marque et du produit, concevoir UN brief de génération visuelle (pour un modèle d'image/vidéo) ultra créatif, concret et orienté conversion, qui MET LE PRODUIT EN AVANT de façon mémorable.
Analyse en profondeur : le produit (usage, bénéfices, différenciation), l'audience (désirs, problèmes), le ton de marque. Choisis une idée créative forte (concept, mise en scène, décor, lumière, composition, émotion) adaptée à la plateforme et au type de contenu demandé.
Le brief doit : être fidèle au produit, parler à l'audience, respecter le ton, et appliquer les codes des pubs qui convertissent (accroche visuelle, hiérarchie, contraste, désir).
Réponds UNIQUEMENT en JSON valide. Langue de sortie : ${lang === 'fr' ? 'français' : lang}.`

  const userPrompt = `Type de contenu : ${params.contentType}

— MARQUE —
Nom : ${b.name ?? '—'}
Description : ${b.description ?? '—'}
Ton de communication : ${b.tone ?? '—'}
Audience cible : ${b.audience ?? '—'}
Désirs de l'audience : ${list(b.audienceDesires)}
Problèmes de l'audience : ${list(b.audienceProblems)}
Points clés / différenciateurs : ${list(b.keyFeatures)}
Mots à privilégier : ${list(b.preferredWords)}
Mots à éviter : ${list(b.wordsToAvoid)}
${b.dna ? `ADN (extrait) : ${b.dna.slice(0, 1200)}` : ''}

— PRODUIT —
${p ? `Nom : ${p.name ?? '—'}
Description : ${p.description ?? '—'}
Bénéfices : ${list(p.benefits)}
Prix : ${p.price ?? '—'}` : 'Aucun produit attaché — reste générique mais cohérent avec la marque.'}

${params.inspiredBy ? `— INSPIRATION CONCURRENT (optionnel) —
S'inspirer de l'approche qui marche chez « ${params.inspiredBy.name} »${params.inspiredBy.positioning ? ` (positionnement : ${params.inspiredBy.positioning})` : ''}${params.inspiredBy.angles?.length ? ` · angles gagnants : ${params.inspiredBy.angles.join(', ')}` : ''}.
IMPORTANT : ne copie PAS — reprends ce qui fonctionne et ADAPTE-le à notre identité (ton, audience, produit), trouve le bon équilibre, garde une signature propre à notre marque.
` : ''}
INSTRUCTIONS : Sois audacieux et spécifique. Décris la scène, le décor, la lumière, la composition, l'émotion et la façon dont le produit est sublimé. Pas de blabla générique. 3 à 5 phrases denses, exploitables directement par un modèle de génération.

JSON exact :
{
  "prompt": "le brief de génération créatif, détaillé, en ${lang === 'fr' ? 'français' : lang}"
}`

  const response = await client.chat.completions.create({
    model:           modelId,
    messages:        [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.95,
    max_tokens:      700,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = parseJsonLoose<{ prompt?: string }>(raw)
  return { prompt: (parsed.prompt ?? '').trim() }
}

// ─── generateCopy — ChatGPT (créativité copy) ───────────────────────────────

export async function generateCopy(params: GenerateCopyParams): Promise<CopyResult> {
  const client  = createAimlClient()
  const modelId = resolveModel(params.model)   // copy

  const response = await client.chat.completions.create({
    model:    modelId,
    messages: [
      {
        role:    'system',
        content: 'Tu es un copywriter expert en marketing digital. Réponds uniquement en JSON.',
      },
      {
        role:    'user',
        content: `Génère du copy marketing pour "${params.campaignName}".
Produit : ${params.product}
Ton : ${params.tone}
Formats : ${params.formats.join(', ')}

JSON exact :
{
  "captions":      ["caption1 (max 150 chars)", "caption2", "caption3"],
  "headlines":     ["headline1 (max 60 chars)", "headline2"],
  "emailSubjects": ["objet1 (max 50 chars)", "objet2"],
  "pushNotifs":    ["notif1 (max 40 chars)", "notif2"]
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.9,
    max_tokens:      600,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return { ...parseJsonLoose<CopyResult>(raw), model: modelId }
}

// ─── generateStrategy — Claude (raisonnement profond) ──────────────────────

export async function generateStrategy(params: GenerateStrategyParams): Promise<StrategyResult> {
  const client  = createAimlClient()
  const modelId = params.model === 'chatgpt'
    ? MODELS.text.chatgpt
    : MODELS.text.claude   // Claude par défaut pour la stratégie

  const response = await client.chat.completions.create({
    model:    modelId,
    messages: [
      {
        role:    'system',
        content: `Tu es un stratégiste marketing senior spécialisé en campagnes vidéo IA.
Tu analyses les briefs et construis des plans de campagne détaillés et actionnables.
Réponds uniquement en JSON valide.`,
      },
      {
        role:    'user',
        content: `Construis une stratégie complète pour : "${params.campaignName}".

ADN : ${params.campaignDna}
Contenus : ${params.contentTypes.join(', ')}
Avatars : ${params.avatarCount}
Durée : ${params.duration} jours
${params.budget ? `Budget : ${params.budget}€` : ''}

JSON exact :
{
  "summary": "résumé stratégique (2-3 phrases)",
  "phases": [
    { "name": "Phase 1 — Pré-lancement", "duration": "J1-J7", "actions": ["action1", "action2", "action3"] }
  ],
  "kpis": [
    { "metric": "Taux d'engagement", "target": ">5%" }
  ],
  "contentPlan": [
    { "week": 1, "type": "ugc", "quantity": 3, "platform": "TikTok" }
  ],
  "tips": ["conseil1 actionnable", "conseil2", "conseil3"]
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.7,
    max_tokens:      2000,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return { ...parseJsonLoose<StrategyResult>(raw), model: modelId }
}

// ─── generateHooks — ChatGPT (créativité max) ───────────────────────────────

export async function generateHooks(
  campaignDna: string,
  count:  number = 5,
  model?: 'chatgpt' | 'claude',
): Promise<string[]> {
  const client  = createAimlClient()
  const modelId = resolveModel(model)

  const response = await client.chat.completions.create({
    model:    modelId,
    messages: [
      {
        role:    'system',
        content: 'Tu es un expert en hooks viraux TikTok/Instagram. Réponds en JSON uniquement.',
      },
      {
        role:    'user',
        content: `Génère ${count} hooks ultra-percutants basés sur ce brief :
${campaignDna}

JSON : { "hooks": ["hook1", "hook2", ...] }
Règles : max 10 mots, commence par un verbe d'action ou une question choc, impact immédiat.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature:     1.0,
    max_tokens:      400,
  })

  const raw    = response.choices[0]?.message?.content ?? '{}'
  const parsed = parseJsonLoose<{ hooks: string[] }>(raw)
  return parsed.hooks ?? []
}

// ─── generateCloneScript — Claude (analyse persona profonde) ─────────────────

/**
 * Pour la Campagne Spéciale — Clone Lab.
 * Claude analyse un persona source et génère des scripts dans son style exact.
 */
export async function generateCloneScript(options: {
  personaDescription: string   // traits, style, manière de parler
  product:            string
  platform:           'tiktok' | 'instagram' | 'youtube'
  duration?:          number
}): Promise<ScriptResult> {
  const client = createAimlClient()

  const response = await client.chat.completions.create({
    model:    MODELS.text.claude,
    messages: [
      {
        role:    'system',
        content: `Tu es un expert en clonage de style de communication.
Tu analyses un persona et génères du contenu qui reproduit fidèlement son style, son ton, ses expressions.
Réponds uniquement en JSON.`,
      },
      {
        role:    'user',
        content: `Génère un script ${options.platform} dans le style exact de ce persona.

PERSONA : ${options.personaDescription}
PRODUIT : ${options.product}
DURÉE : ${options.duration ?? 30}s

JSON exact (respecte scrupuleusement ce schéma) :
{
  "hook": "accroche principale dans le style du persona (max 12 mots)",
  "hooks": ["hook variante 1", "hook variante 2", "hook variante 3"],
  "script": "script complet reproduisant fidèlement le style, les tics de langage, le rythme",
  "voiceover": "narration dans le style du persona",
  "cta": "call-to-action authentique au persona (max 8 mots)",
  "tone": "un seul adjectif décrivant le ton global (ex: chaleureux, espiègle, confiant)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "duration": ${options.duration ?? 30}
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature:     0.8,
    max_tokens:      900,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return { ...parseJsonLoose<ScriptResult>(raw), model: MODELS.text.claude }
}
