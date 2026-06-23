/**
 * Research Agent — Perplexity Sonar
 *
 * Fait de la veille web en temps réel pour enrichir la génération de scripts.
 * Perplexity cherche sur le web et retourne des infos sourcées et à jour.
 *
 * Utilisé AVANT la génération de script pour :
 *   1. Trouver les tendances actuelles dans le secteur/niche de la campagne
 *   2. Identifier les formats viraux du moment (TikTok, IG Reels...)
 *   3. Adapter le contenu au profil culturel de l'avatar
 *   4. Sourcer des hooks et angles narratifs populaires maintenant
 */

import { createAimlClient, MODELS } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchContext {
  // Tendances générales du secteur
  trends:          TrendItem[]
  // Formats viraux actuels sur les plateformes cibles
  viralFormats:    ViralFormat[]
  // Actualités récentes liées au produit/secteur
  recentNews:      NewsItem[]
  // Angles narratifs populaires en ce moment
  popularAngles:   string[]
  // Expressions / mots-clés dans l'air du temps
  trendingKeywords: string[]
  // Contexte culturel pour l'avatar
  avatarContext?:  AvatarCulturalContext
  // Sources citées par Perplexity
  sources:         string[]
  // Timestamp de la recherche
  researchedAt:    string
}

export interface TrendItem {
  topic:       string
  why:         string      // pourquoi c'est tendance maintenant
  relevance:   'high' | 'medium' | 'low'
  platform:    string[]    // ['TikTok', 'Instagram', ...]
}

export interface ViralFormat {
  format:       string     // ex: "POV vidéo", "Day in my life", "Storytime"
  description:  string
  example:      string     // exemple de hook
  platform:     string
  engagementTip: string
}

export interface NewsItem {
  headline:    string
  summary:     string
  relevance:   string      // en quoi ça impacte le sujet de la campagne
  date:        string
}

export interface AvatarCulturalContext {
  currentSlang:   string[]    // expressions trendy actuelles
  culturalRefs:   string[]    // références culturelles (séries, events, memes)
  audienceMood:   string      // quel est l'état d'esprit de l'audience cible
  doAvoid:        string[]    // à éviter (dépassé, problématique)
}

export interface ResearchParams {
  // Sujet principal de la campagne
  campaignTopic:   string
  // Secteur / niche (ex: "beauté", "tech", "fitness", "food")
  industry:        string
  // Plateforme cible
  platform:        'tiktok' | 'instagram' | 'youtube' | 'all'
  // Pays / langue cible
  locale?:         string           // 'fr' (défaut), 'en', 'es'...
  // Profil de l'avatar pour contextualiser
  avatarProfile?: {
    style:         string           // ex: "casual chic", "gen-z streetwear"
    age?:          number
    niche:         string           // ex: "lifestyle", "fitness", "gaming"
  }
  // Niveau de profondeur de la recherche
  depth?:          'quick' | 'deep' // quick = Sonar, deep = Sonar Pro
}

// ─── Agent principal ──────────────────────────────────────────────────────────

/**
 * Lance une recherche web via Perplexity et retourne un contexte structuré
 * prêt à être injecté dans la génération de scripts.
 */
export async function runResearchAgent(params: ResearchParams): Promise<ResearchContext> {
  const client  = createAimlClient()
  // Une seule variante Sonar sur la clé (10 modèles max) — `depth` n'influe plus sur le modèle
  const modelId = MODELS.research.sonar

  const locale   = params.locale ?? 'fr'
  const platform = params.platform === 'all'
    ? 'TikTok, Instagram Reels et YouTube Shorts'
    : params.platform === 'tiktok' ? 'TikTok'
    : params.platform === 'instagram' ? 'Instagram Reels'
    : 'YouTube Shorts'

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const systemPrompt = `Tu es un agent de veille marketing spécialisé en contenu viral et tendances digitales.
Tu fais des recherches web précises et retournes des informations actuelles et sourcées.
Nous sommes le ${today}.
Réponds UNIQUEMENT en JSON valide, sans markdown.
Langue de réponse : ${locale === 'fr' ? 'français' : locale}.`

  const userPrompt = `Fais une recherche approfondie sur les tendances actuelles pour cette campagne marketing.

SUJET : ${params.campaignTopic}
SECTEUR : ${params.industry}
PLATEFORME : ${platform}
${params.avatarProfile ? `
PROFIL AVATAR :
- Style : ${params.avatarProfile.style}
- Âge : ${params.avatarProfile.age ?? 'non spécifié'}
- Niche : ${params.avatarProfile.niche}
` : ''}

Recherche et retourne EXACTEMENT ce JSON :
{
  "trends": [
    {
      "topic": "sujet tendance actuel lié au secteur",
      "why": "pourquoi c'est viral maintenant (événement, mouvement, saison...)",
      "relevance": "high",
      "platform": ["TikTok", "Instagram"]
    }
  ],
  "viralFormats": [
    {
      "format": "format vidéo viral actuel",
      "description": "description du format",
      "example": "exemple de hook d'accroche pour ce format",
      "platform": "TikTok",
      "engagementTip": "conseil pour maximiser l'engagement"
    }
  ],
  "recentNews": [
    {
      "headline": "actualité récente liée au secteur",
      "summary": "résumé en 1 phrase",
      "relevance": "en quoi ça impacte notre campagne",
      "date": "date approximative"
    }
  ],
  "popularAngles": [
    "angle narratif populaire 1 (ex: transformation, before/after, behind-the-scenes...)",
    "angle narratif populaire 2",
    "angle narratif populaire 3"
  ],
  "trendingKeywords": ["mot-clé1", "mot-clé2", "mot-clé3", "mot-clé4", "mot-clé5"],
  ${params.avatarProfile ? `"avatarContext": {
    "currentSlang": ["expression trendy 1", "expression 2"],
    "culturalRefs": ["référence culturelle actuelle 1", "série/event/meme 2"],
    "audienceMood": "quel est l'état d'esprit de l'audience cible en ce moment",
    "doAvoid": ["chose dépassée 1", "expression qui ne se dit plus 2"]
  },` : ''}
  "sources": ["source1", "source2"]
}

Assure-toi que les informations sont ACTUELLES (${today}) et PERTINENTES pour le secteur ${params.industry}.`

  const response = await client.chat.completions.create({
    model:    modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    // Perplexity supporte response_format JSON
    temperature: 0.3,    // précision > créativité pour la recherche
    max_tokens:  2000,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'

  // Extraire le JSON (Perplexity peut retourner du texte avant/après)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

  return {
    trends:           parsed.trends           ?? [],
    viralFormats:     parsed.viralFormats      ?? [],
    recentNews:       parsed.recentNews        ?? [],
    popularAngles:    parsed.popularAngles     ?? [],
    trendingKeywords: parsed.trendingKeywords  ?? [],
    avatarContext:    parsed.avatarContext,
    sources:          parsed.sources           ?? [],
    researchedAt:     new Date().toISOString(),
  }
}

// ─── Recherche rapide — juste les tendances + formats viraux ─────────────────

/**
 * Version légère : recherche rapide avant génération de script.
 * Utilise Sonar (pas Pro) pour la rapidité.
 */
export async function quickTrendResearch(options: {
  topic:    string
  platform: 'tiktok' | 'instagram' | 'youtube'
  locale?:  string
}): Promise<{
  trends:         string[]
  viralFormats:   string[]
  trendingKeywords: string[]
  sources:        string[]
}> {
  const client = createAimlClient()
  const today  = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const response = await client.chat.completions.create({
    model:    MODELS.research.sonar,
    messages: [
      {
        role:    'system',
        content: `Tu es un agent de veille digitale. Nous sommes le ${today}. Réponds en JSON uniquement.`,
      },
      {
        role:    'user',
        content: `Tendances actuelles sur ${options.platform} pour : "${options.topic}".

JSON : {
  "trends": ["tendance1", "tendance2", "tendance3"],
  "viralFormats": ["format1 + exemple de hook", "format2 + exemple"],
  "trendingKeywords": ["mot1", "mot2", "mot3", "mot4"],
  "sources": ["source1"]
}`,
      },
    ],
    temperature: 0.2,
    max_tokens:  500,
  })

  const raw       = response.choices[0]?.message?.content ?? '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

  return {
    trends:           parsed.trends           ?? [],
    viralFormats:     parsed.viralFormats      ?? [],
    trendingKeywords: parsed.trendingKeywords  ?? [],
    sources:          parsed.sources           ?? [],
  }
}

// ─── Découverte de concurrents (veille) — Perplexity Sonar ───────────────────

export interface CompetitorInsight {
  name:        string
  description: string
  positioning: string
  adAngles:    string[]   // angles / stratégies publicitaires observés
  website?:    string
  scale?:      string     // ampleur e-commerce : « Grand » | « Moyen » | « Émergent »
}

/**
 * Trouve (recherche web réelle) les concurrents d'une marque et analyse leur stratégie
 * publicitaire. Si `query` est fourni, analyse cette marque précise au lieu de découvrir.
 */
export async function discoverCompetitors(input: {
  brandName?:   string
  category?:    string
  description?: string
  audience?:    string
  query?:       string
}): Promise<{ competitors: CompetitorInsight[]; sources: string[] }> {
  const client = createAimlClient()
  const today  = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const task = input.query?.trim()
    ? `Analyse la marque e-commerce concurrente « ${input.query.trim()} » : positionnement, cible, ses promos/offres et ses angles/stratégies publicitaires (carrousels, créatives, UGC). Renvoie 1 entrée.`
    : `Trouve 6 à 8 véritables marques E-COMMERCE / DTC (vente en ligne directe, type Shopify) concurrentes de « ${input.brandName || 'cette marque'} »${input.category ? ` (secteur : ${input.category})` : ''}.
${input.description ? `Description de la marque : ${input.description}` : ''}
${input.audience ? `Audience : ${input.audience}` : ''}
Pour chacune, analyse son positionnement, ses promos/offres et ses angles publicitaires (carrousels, créatives, UGC).`

  const response = await client.chat.completions.create({
    model:    MODELS.research.sonar,
    messages: [
      { role: 'system', content: `Tu es un analyste en veille concurrentielle e-commerce (DTC). Nous sommes le ${today}. Base-toi sur des informations réelles et récentes (recherche web).
RÈGLES STRICTES :
- UNIQUEMENT des marques E-COMMERCE / DTC (boutiques en ligne, souvent Shopify), pas des places de marché.
- EXCLURE absolument les grandes marques legacy / déjà très établies (ex. Nike, Adidas, Marni, Coca-Cola, Nestlé, Louis Vuitton, Zara, H&M…) — on veut des concurrents réalistes pour une marque e-commerce.
- Privilégier les concurrents SÉRIEUX qui RÉUSSISSENT (forte traction, bonnes pubs).
- CLASSER du plus grand / établi au plus petit / émergent (ordre = importance e-commerce).
Réponds en JSON valide uniquement, en français.` },
      { role: 'user', content: `${task}

JSON exact (déjà classé du plus grand au plus petit) : {
  "competitors": [
    {
      "name": "Nom de la marque e-commerce",
      "scale": "Grand" | "Moyen" | "Émergent",
      "description": "ce qu'elle vend (1 phrase)",
      "positioning": "positionnement / proposition de valeur (1 phrase)",
      "adAngles": ["angle/créa pub 1", "angle 2", "angle 3"],
      "website": "domaine.com"
    }
  ],
  "sources": ["url1", "url2"]
}` },
    ],
    temperature: 0.3,
    max_tokens:  1600,
  })

  const raw       = response.choices[0]?.message?.content ?? '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  return {
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    sources:     Array.isArray(parsed.sources) ? parsed.sources : [],
  }
}

// ─── Analyse profonde d'un concurrent + playbook adapté à NOTRE marque ───────

export interface CompetitorStrategy {
  strengths:       string[]   // ce qu'ils font bien / mieux que nous
  winningAngles:   string[]   // angles / messages publicitaires qui performent
  contentFormats:  string[]   // formats de contenu qui marchent
  offers:          string[]   // offres / promos / leviers d'acquisition
  channels:        string[]   // canaux principaux
  weaknesses:      string[]   // failles exploitables
  recommendations: string[]   // playbook adapté à NOTRE marque (équilibré avec notre ADN)
  sources:         string[]
}

/**
 * Espionne en profondeur la stratégie d'un concurrent (recherche web réelle) puis génère
 * un plan d'action ÉQUILIBRÉ pour notre marque : s'inspirer de ce qui marche, exploiter
 * leurs failles, sans copier bêtement — adapté à notre ADN / ton / audience / produit.
 */
export async function analyzeCompetitorStrategy(input: {
  competitor:   string
  brandName?:   string
  description?: string
  tone?:        string
  audience?:    string
  product?:     string
  dna?:         string
}): Promise<CompetitorStrategy> {
  const client = createAimlClient()
  const today  = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const response = await client.chat.completions.create({
    model:    MODELS.research.sonar,
    messages: [
      { role: 'system', content: `Tu es un stratège e-commerce / DTC senior spécialisé en intelligence concurrentielle (acquisition payante, CRO, créatives social ads). Nous sommes le ${today}. Base-toi sur des informations réelles et récentes (recherche web). Réponds en JSON valide uniquement, en français, sans blabla.` },
      { role: 'user', content: `Analyse en profondeur la stratégie E-COMMERCE de la marque « ${input.competitor} » : ce qu'ils font MIEUX, leurs PROMOS/offres (bundles, réductions, livraison, garanties), leurs CRÉATIVES qui performent (carrousels, UGC, avant/après, vidéos), leurs angles/messages, leurs canaux d'acquisition (Meta/TikTok ads, email, influence), et leurs failles exploitables.

Puis, en tenant compte de NOTRE marque ci-dessous, produis un PLAYBOOK d'actions concrètes : comment s'inspirer de ce qui marche chez eux, exploiter leurs failles, et l'OPTIMISER/ADAPTER à notre identité (sans copier bêtement — trouver le bon équilibre).

NOTRE MARQUE :
Nom : ${input.brandName || '—'}
Description : ${input.description || '—'}
Ton : ${input.tone || '—'}
Audience : ${input.audience || '—'}
Produit phare : ${input.product || '—'}
${input.dna ? `ADN (extrait) : ${input.dna.slice(0, 800)}` : ''}

JSON exact : {
  "strengths": ["force/atout 1", "force 2", "force 3"],
  "winningAngles": ["angle qui marche 1", "angle 2"],
  "contentFormats": ["format 1", "format 2"],
  "offers": ["offre/levier 1", "levier 2"],
  "channels": ["canal 1", "canal 2"],
  "weaknesses": ["faille exploitable 1", "faille 2"],
  "recommendations": ["action concrète adaptée à notre marque 1", "action 2", "action 3", "action 4"],
  "sources": ["url1", "url2"]
}` },
    ],
    temperature: 0.4,
    max_tokens:  1500,
  })

  const raw       = response.choices[0]?.message?.content ?? '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const p         = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  const arr = (x: unknown) => (Array.isArray(x) ? x as string[] : [])
  return {
    strengths:       arr(p.strengths),
    winningAngles:   arr(p.winningAngles),
    contentFormats:  arr(p.contentFormats),
    offers:          arr(p.offers),
    channels:        arr(p.channels),
    weaknesses:      arr(p.weaknesses),
    recommendations: arr(p.recommendations),
    sources:         arr(p.sources),
  }
}

// ─── Formateur de contexte pour injection dans les prompts ───────────────────

/**
 * Convertit un ResearchContext en bloc texte injectible dans un prompt IA.
 * Utilisé par text.ts pour enrichir les prompts Claude/ChatGPT.
 */
export function formatResearchForPrompt(ctx: ResearchContext): string {
  const lines: string[] = [
    `=== CONTEXTE TEMPS RÉEL (Perplexity — ${new Date(ctx.researchedAt).toLocaleDateString('fr-FR')}) ===`,
  ]

  if (ctx.trends.length > 0) {
    lines.push('\nTENDANCES ACTUELLES :')
    ctx.trends.slice(0, 3).forEach((t) =>
      lines.push(`• ${t.topic} [${t.platform.join('/')}] — ${t.why}`)
    )
  }

  if (ctx.viralFormats.length > 0) {
    lines.push('\nFORMATS VIRAUX DU MOMENT :')
    ctx.viralFormats.slice(0, 3).forEach((f) =>
      lines.push(`• ${f.format} (${f.platform}) — Hook : "${f.example}"`)
    )
  }

  if (ctx.popularAngles.length > 0) {
    lines.push('\nANGLES NARRATIFS POPULAIRES :')
    ctx.popularAngles.slice(0, 3).forEach((a) => lines.push(`• ${a}`))
  }

  if (ctx.trendingKeywords.length > 0) {
    lines.push(`\nMOTS-CLÉS TRENDING : ${ctx.trendingKeywords.join(', ')}`)
  }

  if (ctx.recentNews.length > 0) {
    lines.push('\nACTUALITÉS RÉCENTES :')
    ctx.recentNews.slice(0, 2).forEach((n) =>
      lines.push(`• ${n.headline} — ${n.summary}`)
    )
  }

  if (ctx.avatarContext) {
    const av = ctx.avatarContext
    lines.push('\nCONTEXTE AVATAR :')
    if (av.currentSlang.length > 0)
      lines.push(`• Expressions trendy : ${av.currentSlang.join(', ')}`)
    if (av.culturalRefs.length > 0)
      lines.push(`• Références culturelles : ${av.culturalRefs.join(', ')}`)
    if (av.audienceMood)
      lines.push(`• Mood de l'audience : ${av.audienceMood}`)
    if (av.doAvoid.length > 0)
      lines.push(`• À éviter : ${av.doAvoid.join(', ')}`)
  }

  if (ctx.sources.length > 0) {
    lines.push(`\nSources : ${ctx.sources.join(' · ')}`)
  }

  lines.push('=== FIN DU CONTEXTE ===')
  return lines.join('\n')
}
