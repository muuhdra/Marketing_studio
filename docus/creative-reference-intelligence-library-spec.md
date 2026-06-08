---
project_name: 'content-ugc'
document_type: 'module-spec'
module: 'creative-reference-intelligence-library'
status: 'draft'
date: '2026-04-29'
---

# Creative Reference Intelligence Library Spec

## 1. Objective

La `Creative Reference Intelligence Library` est le module qui permet de stocker, analyser, comparer, sélectionner et réutiliser des références créatives servant d’inputs opérables aux agents et workflows.

Le module ne remplace pas les `assets`. Il sert à transformer des références en objets métier riches:

- analysés
- tagués
- scorés
- reliés aux campagnes
- réutilisables par groupe marketing et type de contenu

## 2. Supported Reference Types

Le MVP doit supporter:

- `video`
- `image`
- `poster`
- `illustration`
- `shooting_photo`
- `script`
- `storyboard`
- `prompt`

Sources supportées:

- `uploaded`
- `url`
- `manual`
- `competitor`
- `internal_campaign_output`

## 3. Core Data Model

```ts
type CreativeReference = {
  id: string
  projectId: string
  campaignId?: string
  title: string
  description?: string
  assetType:
    | "video"
    | "image"
    | "poster"
    | "illustration"
    | "shooting_photo"
    | "script"
    | "storyboard"
    | "prompt"
  sourceType: "uploaded" | "url" | "manual" | "competitor" | "internal_campaign_output"
  sourceUrl?: string
  storagePath?: string
  thumbnailPath?: string
  marketingGroup: "Product" | "App" | "Shooting/Photo"
  contentType: string
  platform?: string
  objective?: string
  tags: string[]
  analysisStatus: "pending" | "analyzed" | "needs_review" | "approved" | "archived"
  qualityScore?: number
  usefulnessScore?: number
  creativeAnalysis?: object
  marketingAnalysis?: object
  technicalBreakdown?: object
  reverseEngineeredPrompt?: string
  shortPrompt?: string
  negativePrompt?: string
  reusablePatterns?: object[]
  createdAt: string
  updatedAt: string
}
```

## 4. Reference Roles in Production

Quand un job de production sélectionne des références, le système doit pouvoir distinguer:

- `structureReferenceId`
- `pacingReferenceId`
- `visualStyleReferenceId`
- `scriptReferenceId`
- `negativeReferenceId`

Ces rôles doivent rester persistés et traçables dans le job et dans les outputs.

## 5. UX

### Main Surfaces

- `Creative Library` page
- `Reference Detail` page
- `Compare References` mode
- `Select for Campaign` mode
- `Select for Marketing Studio` mode

### Grid View

Chaque carte affiche au minimum:

- thumbnail
- asset type
- marketing group
- content type
- quality score
- analysis status
- key tags

### Detail View

Sections minimales:

1. Preview
2. Metadata
3. Marketing Analysis
4. Creative Analysis
5. Shot Breakdown
6. Reverse Prompt
7. Reusable Patterns
8. Linked Campaigns
9. Human Notes
10. History

### Comparison Mode

Le mode comparaison doit permettre de comparer `2` à `4` références selon:

- style
- structure
- rythme
- hook
- CTA
- campaign fit
- usages recommandés

## 6. Ingestion Workflow

```text
1. Upload or link reference
2. Detect asset type
3. Extract metadata
4. Generate thumbnail / keyframes when relevant
5. Create initial reference record
6. Run analysis tasks
7. Attach tags and scores
8. Human review if needed
9. Approve for campaign reuse
```

## 7. Analysis Workflow

Le MVP doit supporter une analyse manuelle ou semi-automatique de:

- style visuel
- tonalité émotionnelle
- objectif marketing
- hook / mécanisme de persuasion
- structure narrative
- rythme / montage
- patterns réutilisables

Pour les vidéos, le système doit pouvoir conserver un breakdown temporel des scènes.

## 8. Campaign Selection Workflow

```text
1. User opens campaign or Marketing Studio
2. System filters references by marketing group and content type
3. User selects one or more references
4. User assigns reference roles if needed
5. System stores selection in campaign/job context
6. Agents consume typed references during execution
```

## 9. Reverse Engineering

Pour les références importantes, le système doit pouvoir stocker:

- full prompt
- short prompt
- negative prompt
- shotlist
- extracted style guide
- reusable prompt fragments

## 10. Retrieval

Le MVP doit prioriser un retrieval simple et fiable:

- filtres structurés
- tags
- marketing group
- content type
- objective
- platform
- approved references only when requested

La recherche sémantique avancée peut venir après le MVP.

## 11. Scoring

Le module doit prévoir:

- `qualityScore`
- `usefulnessScore`
- `ReferenceCampaignFitScore`

```ts
type ReferenceCampaignFitScore = {
  referenceId: string
  campaignId: string
  overallFit: number
  audienceFit: number
  visualFit: number
  messagingFit: number
  platformFit: number
  objectiveFit: number
  risks: string[]
  recommendedUsage:
    | "use_as_main_reference"
    | "use_for_structure_only"
    | "use_for_visual_style_only"
    | "use_for_pacing_only"
    | "avoid"
}
```

## 12. Human Validation

Validation humaine recommandée pour:

- références utilisées comme source principale de campagne
- references competitor sensibles
- reverse prompts importants
- tags/analysis jugés ambigus
- usages négatifs à éviter

## 13. Supabase Tables

Tables MVP recommandées:

- `creative_references`
- `creative_reference_assets`
- `creative_reference_analysis`
- `creative_reference_video_scenes`
- `creative_reference_tags`
- `creative_reference_campaign_links`
- `reference_scripts`
- `reference_prompt_profiles`

Règle critique:

- ne pas confondre `asset` et `creative reference`

## 14. API Contracts

Endpoints / actions MVP à prévoir:

- create reference
- update reference metadata
- attach analysis
- link reference to campaign
- list references with filters
- get reference detail
- compare selected references
- select typed references for job/campaign

Réponse standard:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

## 15. Trigger.dev Tasks

Tâches MVP recommandées:

- `analyze-reference`
- `extract-video-keyframes`
- `breakdown-video-reference`
- `reverse-engineer-reference-prompt`
- `score-reference-campaign-fit`
- `refresh-reference-tags`

## 16. Agents Associated

Agents minimaux recommandés:

- `Reference Intake Agent`
- `Creative Analyst Agent`
- `Marketing Analyst Agent`
- `Video Breakdown Agent`
- `Reverse Prompt Engineer Agent`
- `Reference Librarian Agent`
- `Reference QA Agent`

## 17. Tests

Le module doit avoir:

### Unit Tests

- validation des schémas
- typing des références
- mapping asset/reference
- scoring inputs/outputs

### Integration Tests

- création de référence
- filtrage par groupe/type
- persistance des rôles de référence
- liaison campagne/référence

### E2E Tests

- upload d’une référence
- sélection dans une campagne
- sélection dans `Marketing Studio`
- comparaison de références

## 18. MVP Boundary

À faire maintenant:

- upload vidéo/image/script
- metadata
- tags
- analyse manuelle + semi-automatique
- reverse prompt field
- sélection de `1` ou `2` références selon le type
- typed reference roles
- lien campagne / job

À repousser:

- retrieval sémantique avancé
- détection automatique parfaite de tous les patterns
- scoring prédictif complexe
- boucle de performance ads avancée
