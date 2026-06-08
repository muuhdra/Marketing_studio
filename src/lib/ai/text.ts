/**
 * AIML API — Génération de texte
 *
 * ChatGPT (GPT-4o)     → scripts UGC, copy, hooks  — rapide & créatif
 * Claude (Opus 4)      → stratégie, orchestration   — raisonnement profond
 *
 * Les deux sont accessibles avec la même clé AIMLAPI_KEY via AIML API.
 */

import { createAimlClient, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateScriptParams {
  campaignName:   string
  campaignDna:    string
  contentType:    'ugc' | 'commercial' | 'shooting' | 'visuel'
  avatarName?:    string
  avatarStyle?:   string
  format?:        'social' | 'tutorial' | 'unboxing' | 'review' | 'tv-spot'
  duration?:      number
  platform?:      'tiktok' | 'instagram' | 'youtube' | 'generic'
  language?:      string
  model?:         'chatgpt' | 'claude'   // choix explicite du modèle
}

export interface ScriptResult {
  hook:        string
  script:      string
  voiceover:   string
  cta:         string
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

/** Résout le model ID AIML depuis le choix 'chatgpt' | 'claude' */
function resolveModel(choice?: 'chatgpt' | 'claude', fast = false): string {
  if (choice === 'claude') return fast ? MODELS.text.claudeFast : MODELS.text.claude
  // Par défaut : ChatGPT
  return fast ? MODELS.text.chatgptFast : MODELS.text.chatgpt
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

  const userPrompt = `Crée un script ${params.contentType} pour la campagne "${params.campaignName}".

ADN Campagne : ${params.campaignDna}
${params.avatarName ? `Avatar : ${params.avatarName}${params.avatarStyle ? ` (style: ${params.avatarStyle})` : ''}` : ''}
Format : ${params.format ?? 'social'}
Durée : ${params.duration ?? 30}s
Plateforme : ${params.platform ?? 'generic'}

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
  return { ...JSON.parse(raw), model: modelId }
}

// ─── generateCopy — ChatGPT (créativité copy) ───────────────────────────────

export async function generateCopy(params: GenerateCopyParams): Promise<CopyResult> {
  const client  = createAimlClient()
  const modelId = resolveModel(params.model, true)   // fast par défaut pour le copy

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
  return { ...JSON.parse(raw), model: modelId }
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
  return { ...JSON.parse(raw), model: modelId }
}

// ─── generateHooks — ChatGPT (créativité max) ───────────────────────────────

export async function generateHooks(
  campaignDna: string,
  count:  number = 5,
  model?: 'chatgpt' | 'claude',
): Promise<string[]> {
  const client  = createAimlClient()
  const modelId = resolveModel(model, true)

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
  const parsed = JSON.parse(raw) as { hooks: string[] }
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

JSON exact :
{
  "hook": "accroche dans le style du persona (max 12 mots)",
  "script": "script complet reproduisant fidèlement le style, les tics de langage, le rythme",
  "voiceover": "narration dans le style du persona",
  "cta": "call-to-action authentique au persona",
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
  return { ...JSON.parse(raw), model: MODELS.text.claude }
}
