/**
 * AIML API — Génération de texte
 *
 * Usages : scripts UGC, copy publicitaire, stratégie campagne,
 *          hooks TikTok, briefings créatifs
 */

import { createAimlClient, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateScriptParams {
  campaignName:   string
  campaignDna:    string           // ADN / brief de la campagne
  contentType:    'ugc' | 'commercial' | 'shooting' | 'visuel'
  avatarName?:    string
  avatarStyle?:   string
  format?:        'social' | 'tutorial' | 'unboxing' | 'review' | 'tv-spot'
  duration?:      number           // secondes
  platform?:      'tiktok' | 'instagram' | 'youtube' | 'generic'
  language?:      string           // 'fr' par défaut
}

export interface ScriptResult {
  hook:        string              // 3 premières secondes — accroche
  script:      string              // texte complet
  voiceover:   string              // narration / voix off
  cta:         string              // call-to-action
  hashtags:    string[]
  duration:    number              // durée estimée (secondes)
}

export interface GenerateCopyParams {
  campaignName:  string
  product:       string
  tone:          'professionnel' | 'fun' | 'luxe' | 'minimaliste' | 'gen-z'
  formats:       ('caption' | 'headline' | 'email-subject' | 'push-notif')[]
  language?:     string
}

export interface CopyResult {
  captions:       string[]
  headlines:      string[]
  emailSubjects:  string[]
  pushNotifs:     string[]
}

export interface GenerateStrategyParams {
  campaignName: string
  campaignDna:  string
  contentTypes: string[]
  avatarCount:  number
  duration:     number     // jours
  budget?:      number
}

export interface StrategyResult {
  summary:      string
  phases:       { name: string; duration: string; actions: string[] }[]
  kpis:         { metric: string; target: string }[]
  contentPlan:  { week: number; type: string; quantity: number; platform: string }[]
  tips:         string[]
}

// ─── Génération de script UGC / Commercial ───────────────────────────────────

export async function generateScript(params: GenerateScriptParams): Promise<ScriptResult> {
  const client = createAimlClient()
  const lang = params.language ?? 'fr'

  const systemPrompt = `Tu es un expert en création de contenu vidéo marketing viral.
Tu rédiges des scripts percutants pour des campagnes publicitaires.
Réponds UNIQUEMENT en JSON valide selon le format demandé.
Langue de sortie : ${lang === 'fr' ? 'français' : lang}.`

  const userPrompt = `Crée un script ${params.contentType} pour la campagne "${params.campaignName}".

ADN Campagne : ${params.campaignDna}
${params.avatarName ? `Avatar/Créateur : ${params.avatarName}${params.avatarStyle ? ` (style: ${params.avatarStyle})` : ''}` : ''}
Format : ${params.format ?? 'social'}
Durée cible : ${params.duration ?? 30} secondes
Plateforme : ${params.platform ?? 'generic'}

Retourne ce JSON exact :
{
  "hook": "accroche des 3 premières secondes (max 15 mots, percutant)",
  "script": "script complet avec indications [ACTION], [GROS PLAN], etc.",
  "voiceover": "texte de narration / voix off uniquement",
  "cta": "call-to-action final (max 10 mots)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "duration": 30
}`

  const response = await client.chat.completions.create({
    model:    MODELS.text.smart,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens:  1000,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as ScriptResult
}

// ─── Génération de copy multi-format ─────────────────────────────────────────

export async function generateCopy(params: GenerateCopyParams): Promise<CopyResult> {
  const client = createAimlClient()

  const response = await client.chat.completions.create({
    model:    MODELS.text.fast,
    messages: [
      {
        role: 'system',
        content: 'Tu es un copywriter expert en marketing digital. Réponds uniquement en JSON.',
      },
      {
        role: 'user',
        content: `Génère du copy marketing pour "${params.campaignName}".
Produit : ${params.product}
Ton : ${params.tone}
Formats demandés : ${params.formats.join(', ')}

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
    temperature: 0.9,
    max_tokens:  600,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as CopyResult
}

// ─── Génération de stratégie campagne ────────────────────────────────────────

export async function generateStrategy(params: GenerateStrategyParams): Promise<StrategyResult> {
  const client = createAimlClient()

  const response = await client.chat.completions.create({
    model:    MODELS.text.pro,    // Claude Opus pour la stratégie
    messages: [
      {
        role: 'system',
        content: `Tu es un stratégiste marketing senior spécialisé en campagnes vidéo IA.
Tu analyses les briefs et construis des plans de campagne détaillés.
Réponds uniquement en JSON valide.`,
      },
      {
        role: 'user',
        content: `Construis une stratégie complète pour : "${params.campaignName}".

ADN : ${params.campaignDna}
Types de contenus : ${params.contentTypes.join(', ')}
Nombre d'avatars : ${params.avatarCount}
Durée campagne : ${params.duration} jours
${params.budget ? `Budget : ${params.budget}€` : ''}

JSON exact :
{
  "summary": "résumé stratégique (2-3 phrases)",
  "phases": [
    { "name": "Phase 1", "duration": "J1-J7", "actions": ["action1", "action2"] }
  ],
  "kpis": [
    { "metric": "Taux d'engagement", "target": ">5%" }
  ],
  "contentPlan": [
    { "week": 1, "type": "ugc", "quantity": 3, "platform": "TikTok" }
  ],
  "tips": ["conseil1", "conseil2", "conseil3"]
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens:  2000,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(raw) as StrategyResult
}

// ─── Génération de hook rapide ────────────────────────────────────────────────

export async function generateHooks(
  campaignDna: string,
  count: number = 5,
): Promise<string[]> {
  const client = createAimlClient()

  const response = await client.chat.completions.create({
    model:    MODELS.text.fast,
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert en hooks viraux TikTok/Instagram. Réponds en JSON uniquement.',
      },
      {
        role: 'user',
        content: `Génère ${count} hooks ultra-percutants basés sur ce brief :
${campaignDna}

JSON : { "hooks": ["hook1", "hook2", ...] }
Chaque hook : max 10 mots, commence par un verbe d'action ou une question choc.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 1.0,
    max_tokens:  300,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as { hooks: string[] }
  return parsed.hooks ?? []
}
