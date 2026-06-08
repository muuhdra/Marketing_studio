# Sprint Change Proposal - Marketing Strategy & Optimization

**Date:** 2026-05-05  
**Project:** content-ugc  
**Trigger:** ajout produit demandé pendant l’exécution du sprint, avant reprise de `Story 6.2`

## 1. Issue Summary

Le produit doit intégrer deux nouvelles capacités:

- une surface `Marketing Strategy` avant lancement de campagne, avec bibliothèque de stratégies éditables en Markdown, cartes, overview et application contrôlée à la campagne;
- une surface `Campaign Optimization` après lancement, avec captures/signaux de performance, analyse d’optimisation et scaling strategy validée humainement.
- une règle de stockage Supabase sobre: objets métier durables conservés, médias générés lourds temporaires avec rétention par défaut de `3 jours`;
- une politique de routage IA explicite: Claude pour le cerveau des agents, OpenAI pour scripts, Gemini Nano Banana par défaut pour visuels, OpenAI visuel selon complexité, Kling/Seedance pour vidéo, ElevenLabs pour voix et sound effects.

Ces capacités renforcent l’intention produit existante: ne pas seulement produire des contenus, mais piloter une campagne avec une stratégie avant et après lancement.

## 2. Impact Analysis

### Epic Impact

- `Epic 6` est impacté parce que le journal de campagne doit tracer les stratégies, overviews, applications, snapshots et décisions d’optimisation.
- `Epic 7` n’est pas fonctionnellement changé, mais son statut sprint devait être corrigé en `in-progress`.
- Un nouvel `Epic 8` est ajouté pour porter la bibliothèque de stratégies, l’application campagne, les snapshots de performance et l’optimization workspace.

### Story Impact

- `Story 6.2` est enrichie pour tracer les événements stratégiques dans le journal markdown.
- `Story 6.3` est enrichie pour tenir compte d’un état d’optimisation post-lancement.
- `Story 6.4` est enrichie pour inclure stratégie et learnings validés dans les templates sans copier les performances brutes.
- `Story 8.1` à `Story 8.4` sont créées en `ready-for-dev`.

### Artifact Impact

- `prd.md`: ajout des capacités au MVP, des FR64-FR74 et des NFR de rétention/provider routing.
- `epics.md`: ajout de l’Epic 8, FR coverage et stories.
- `architecture.md`: ajout des frontières `marketing-strategies` et `campaign-optimization`, de la politique durable/temporaire Supabase et de la matrice providers.
- `ux-design-specification.md`: ajout des composants `Marketing Strategy Library` et `Campaign Optimization Workspace`.
- `project-context.md`: ajout des règles de domaine et garde-fous.
- `sprint-status.yaml`: ajout de l’Epic 8 et correction des statuts Epic 6 / Epic 7.

## 3. Recommended Approach

Approche recommandée: **Direct Adjustment**.

On garde `Story 6.2` comme prochaine story logique, car le journal devient la fondation de traçabilité pour les stratégies. Ensuite, on peut soit finir `Epic 6`, soit attaquer `Epic 8.1` si la priorité produit devient la bibliothèque de stratégies.

## 4. Guardrails

- L’ADN reste la source de vérité.
- Une stratégie peut guider les agents, mais ne modifie jamais l’ADN en silence.
- Les stratégies restent séparées des assets et des références créatives.
- Les cartes et objets éditables liés aux stratégies, snapshots, templates et optimisations doivent supporter ajout, modification et suppression par utilisateur autorisé, avec confirmation des suppressions sensibles et traçabilité lorsqu’ils ont influencé une campagne.
- Les performances post-lancement restent liées à la campagne et au journal, sans devenir un moteur analytics lourd au MVP.
- Supabase Storage ne doit pas devenir un entrepôt permanent de médias générés: vidéos, images, illustrations, posters, voix et sound effects sont supprimables automatiquement après `3 jours`, sauf promotion explicite.
- Les métadonnées durables, journaux, ADN, DA, fiches avatars, stratégies, traces provider et décisions validées restent consultables même si le fichier média temporaire a expiré.
