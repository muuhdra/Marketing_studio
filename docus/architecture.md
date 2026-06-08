---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/product-brief-content-ugc.md
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/product-brief-content-ugc-distillate.md
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/prd.md
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-28'
project_name: 'content-ugc'
user_name: 'JD'
date: '2026-04-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Le produit porte actuellement `71` exigences fonctionnelles, structurées autour de quelques blocs architecturaux majeurs:

- gestion du workspace, des projets et des campagnes
- ADN de campagne comme source de vérité versionnée
- création de contenu multimodale pilotée par campagne
- gestion avancée des avatars, groupes d’avatars, rôles, garde-robes et continuité visuelle
- orchestration de workflows semi-automatiques avec validations humaines
- gestion d’assets, historique, traçabilité et réutilisation
- reprise sur erreur, fallback fournisseur et gouvernance des accès

Architecturalement, cela implique un système centré sur la campagne comme agrégat métier principal, avec des sous-domaines distincts mais reliés:

- `Campaign & DNA`
- `Content Jobs`
- `Avatar & Continuity`
- `Workflow Orchestration`
- `Assets & Outputs`
- `Access Control & Governance`

Le produit a aussi une complexité fonctionnelle supplémentaire liée à la taxonomie des productions:

- plusieurs familles de contenus (`vidéo`, `shooting photo`, `poster`, `illustration`, autres assets visuels)
- plusieurs sous-types vidéo (`UGC`, `Hyper/Motion`, `Unboxing`, `UGC Virtual Try On`, `TV Spot`, `Tutorial`, `Pro Virtual Try On`)
- direction artistique explicite pour certains jobs
- groupes d’agents spécialisés variant selon la famille de production et le sous-type demandé

Cela pousse l’architecture vers un modèle de jobs typés, configurés par capacité plutôt que par simple prompt libre.

**Non-Functional Requirements:**

Le produit porte `27` exigences non fonctionnelles. Les plus structurantes pour l’architecture sont:

- modularité des intégrations fournisseurs IA
- résilience avec checkpoint, suspension et reprise
- protection stricte des secrets et paramètres sensibles
- traçabilité des décisions, validations, outputs et fournisseurs utilisés
- montée en charge progressive du nombre de campagnes, avatars, assets et jobs
- support d’un usage `desktop-first` avec UX riche et état de workflow lisible
- accessibilité ciblée `WCAG 2.2 AA`
- séparation claire entre actions interactives immédiates et traitements asynchrones longs

Ces NFR orientent fortement vers:

- une architecture événementielle ou orientée jobs pour l’exécution
- une séparation nette entre couche applicative, orchestration et connecteurs
- une persistance robuste de l’état métier et de l’état d’exécution
- une stratégie sérieuse d’observabilité et de reprise

**Scale & Complexity:**

Le produit relève d’un SaaS interne `full-stack` à dominante `orchestration créative multimodale`.

- Primary domain: `web application + orchestration backend + media pipeline`
- Complexity level: `medium-high`
- Estimated architectural components: `8 à 12` blocs principaux

Les principaux indicateurs de complexité sont:

- orchestration multi-agents
- pipeline multimodal vidéo + image
- gestion de la continuité avatar sur la durée
- forte dépendance à des fournisseurs externes hétérogènes
- importance métier de la cohérence ADN / DA / sorties
- validations humaines à plusieurs points du pipeline
- UX cockpit riche avec état d’exécution visible

### Technical Constraints & Dependencies

Contraintes déjà identifiées:

- le produit est un `mini-SaaS web` dès le MVP
- usage principal `desktop-first`
- les fournisseurs IA externes sont indispensables au fonctionnement réel
- les secrets/API keys ne doivent jamais être exposés
- le produit doit rester exploitable en mode solo comme en collaboration légère
- l’ADN de campagne est un référentiel vivant mais contrôlé
- l’ADN de campagne doit exister sous une forme humaine lisible et une forme machine exécutable structurée, avec validation et score de santé
- la direction artistique ne peut pas rester une simple note libre; elle doit devenir un input opérable du pipeline
- la stratégie marketing sélectionnée avant lancement doit devenir un input opérable du pipeline, distinct de l’ADN et validé humainement avant application
- les références marketing et les profils de prompts système doivent être traités comme des inputs opérables et versionnables du pipeline, pas comme de simples notes; la bibliothèque doit pouvoir stocker des références indexées par `genre marketing` puis par `type de contenu`, avec une ou deux références vidéo par sous-type quand c’est pertinent
- la `Creative Reference Intelligence Library` doit rester un sous-domaine distinct des simples assets, avec analyses, tags, reverse prompts, breakdowns et scores de compatibilité campagne
- le `Marketing Studio` doit porter un choix initial de groupe marketing (`Product`, `App`, `Shooting/Photo`), un filtrage des types de contenus autorisés, une zone centrale de script généré/éditable/régénérable, et deux cartes latérales `Avatar/Model` et `Produit`
- le `Marketing Strategy` workspace doit lire des stratégies éditables en Markdown, générer une overview compréhensible et persister la sélection par campagne avec la version d’ADN concernée
- tout objet éditable exposé sous forme de carte ou de bibliothèque doit supporter un CRUD complet proportionné au MVP (`add`, `edit`, `delete`) avec permissions `admin/editor`, lecture seule `viewer`, confirmation des suppressions sensibles et trace journal lorsque l’objet influence une campagne
- les jobs doivent pouvoir porter des références typées (`structure`, `pacing`, `visual style`, `script`, `negative`) ainsi qu’un `Production Readiness Check`
- les campagnes et pré-campagnes doivent porter un cycle de vie temporel explicite (dates, durée, statut, prolongation) exploitable par l’orchestration
- les campagnes post-lancement doivent pouvoir recevoir des snapshots de performance et déclencher une optimization/scaling strategy sans confondre ces données avec les assets créatifs
- l’architecture doit permettre d’ajouter ou remplacer des fournisseurs sans refonte du coeur
- les agents et leurs skills doivent pouvoir évoluer sans casser le modèle métier
- les contrats d’agents doivent être versionnés et déclarer explicitement entrées, sorties, skills utilisables, providers autorisés, garde-fous, coût attendu et exigences de validation humaine
- les jobs médias doivent pouvoir porter des paramètres de sortie explicites avant génération: format, ratio, résolution, durée, plateforme cible, nombre de variantes et contraintes de livraison
- les adaptations post-génération doivent être modélisées comme dérivés d’un média source, pas comme sorties isolées, afin de préserver coût, parent asset, provider, ratio/résolution cible et rétention
- les vidéos UGC doivent pouvoir recevoir un lieu/scène fourni par l’utilisateur ou déterminé par le système; toute décision automatique de lieu doit être explicable et traçable
- la continuité avatar doit pouvoir s’appuyer sur un sous-groupe d’agents dédié à l’analyse des looks, environnements et historiques avant toute évolution visible
- le modèle avatar doit porter une politique explicite d’évolution d’environnement (`évolutif` vs `verrouillé`) consommable par les agents de continuité
- le modèle avatar MVP doit éviter un builder paramétrique lourd; l’identité du modèle/avatar doit être capturée par un prompt JSON détaillé, une reference sheet d’identité et quelques métadonnées physiques essentielles

Dépendances implicites majeures:

- fournisseur(s) vidéo
- fournisseur(s) image / avatar / rendu visuel
- fournisseur(s) voix
- stockage des assets et outputs
- base de données applicative
- moteur de jobs / orchestration asynchrone
- mécanisme de suivi d’état et de reprise

### Cross-Cutting Concerns Identified

Plusieurs préoccupations traversent presque tous les composants:

- **Cohérence métier:** alignement systématique entre ADN de campagne, direction artistique, avatars, outputs et validations
- **ADN exécutable:** transformation de l’ADN en objet structuré versionné, slices par agent et score de santé avant exécution
- **Continuité avatar:** analyse dédiée de l’historique avatar, des looks, des environnements et des règles de campagne avant application d’une évolution
- **Politique d’environnement avatar:** prise en compte d’un mode d’environnement autorisé (`évolutif` dans un périmètre cohérent ou `verrouillé` dans une catégorie de lieux)
- **Cohérence des références marketing:** alignement entre ADN, genre marketing, type de contenu, références créatives, scripts de référence et sorties générées
- **Cohérence stratégique:** alignement entre ADN actif, stratégie marketing sélectionnée, content jobs, journal de campagne et décisions humaines
- **Optimisation post-lancement:** ingestion légère de captures/signaux de performance, synthèse agentique et recommandations de scaling sans moteur analytique lourd au MVP
- **Contrats agents & skills:** versionnement des rôles IA, entrées/sorties, skills autorisés, providers utilisables, règles métier, budget estimé et points de validation humaine
- **Media output contract:** persistance des paramètres média avant génération ou adaptation, notamment format, ratio, résolution, durée, plateforme cible, parent asset et rétention
- **Scene intelligence UGC:** choix explicite ou assisté du lieu de scène UGC à partir de l’ADN, stratégie, avatar, produit, références et règles de cohérence
- **Références typées:** séparation explicite entre références de structure, rythme, style visuel, script et références négatives à éviter
- **Cohérence créative UGC:** alignement entre ADN, références UGC, structure de script, ton, rythme de montage et sorties vidéo, avec séparation explicite entre références de structure et références de rythme si nécessaire
- **Workflow orchestration:** exécution séquencée, statuts, agent actif, fallback, reprise
- **Production readiness:** vérification explicite ADN / DA / références / assets / avatar / plateforme avant lancement d’un workflow
- **Lifecycle orchestration:** prise en compte de la période active d’une campagne ou pré-campagne, alertes d’échéance, prolongation et bascule automatique de mode si requis
- **Provider abstraction:** encapsulation des fournisseurs externes derrière des interfaces stables
- **State persistence:** conservation de l’état des campagnes, jobs, checkpoints, variantes et historiques
- **Traceability & auditability:** lien entre chaque sortie, son contexte, ses décisions, ses fournisseurs et ses validations
- **Access control:** séparation des permissions projet et protection des actions sensibles
- **Media asset lifecycle:** ingestion, transformation, versionnage, enrichissement, export
- **Storage efficiency:** privilégier des journaux de campagne indexés en `markdown` pour l’historique textuel et analytique, tout en laissant les médias lourds dans le stockage d’assets
- **UX feedback loop:** remontée en temps réel ou quasi temps réel de l’état des jobs vers l’interface
- **Extensibility:** capacité à ajouter de nouveaux types de productions, nouveaux agents, nouveaux sous-types vidéo et nouvelles règles de DA

### Architectural Reading

Ce projet n’est pas un simple générateur de contenus. C’est un système d’orchestration créative piloté par campagne, avec:

- un coeur métier fort
- une couche de configuration riche
- une exécution asynchrone multi-capacités
- une interface de supervision active

La conséquence architecturale principale est qu’il faudra probablement éviter un backend monolithique trop couplé aux fournisseurs. Le modèle cible devra isoler:

- le domaine métier campagne / ADN / avatars
- la planification et l’exécution des jobs
- les capacités de production spécialisées
- les connecteurs fournisseurs
- les mécanismes transverses de validation, état, reprise et observabilité

## Starter Template Evaluation

### Primary Technology Domain

`full-stack web application` based on project requirements analysis.

Le produit a besoin d’une fondation web capable de porter:

- une interface `desktop-first` riche
- une authentification applicative
- une base de données transactionnelle
- du stockage d’assets
- une orchestration backend de jobs
- des intégrations tierces IA
- une montée en complexité progressive sans refonte rapide

Le domaine principal retenu pour la fondation est donc:
`Next.js full-stack application with typed backend integrations and external service orchestration`.

### Starter Options Considered

**Option 1 — `create-next-app` officiel**

- Source officielle: `create-next-app`
- Commande de base actuelle:
  - `pnpm create next-app [project-name] [options]`
- Ce starter fournit une base propre, standard et très peu opinionnée.
- Avantages:
  - alignement direct avec l’écosystème Next.js
  - contrôle maximal sur les décisions backend
  - peu de dette de starter
- Limites:
  - il faut ajouter soi-même l’auth, la base, le stockage, les conventions de structure et les patterns d’intégration
  - bon point de départ “neutre”, mais moins efficace si l’objectif est de monter vite un mini-SaaS avec base de données et auth

**Option 2 — `create-next-app` avec l’exemple officiel `with-supabase`**

- Source officielle Supabase:
  - `npx create-next-app -e with-supabase`
- La documentation Supabase indique que ce template est préconfiguré avec:
  - auth par cookies
  - TypeScript
  - Tailwind CSS
- Avantages:
  - très bon alignement avec un mini-SaaS web
  - auth + base + stockage + patterns Supabase accélèrent fortement le MVP
  - reste plus souple qu’un starter très opinionné full-stack
  - bonne base pour rattacher ensuite le moteur d’orchestration de jobs et les connecteurs IA
- Limites:
  - ne résout pas à lui seul l’architecture d’orchestration
  - impose implicitement Supabase comme socle principal de persistance/app services

**Option 3 — `create-t3-app`**

- Source officielle:
  - `npm create t3-app@latest`
- Le starter permet actuellement d’inclure selon les flags:
  - Next.js
  - Tailwind
  - Drizzle ou Prisma
  - PostgreSQL
  - NextAuth/Auth stack selon options
  - tRPC selon options
- Avantages:
  - très bonne expérience TypeScript
  - stack cohérente pour une équipe orientée full-stack TS
  - conventions déjà utiles pour un produit sérieux
- Limites:
  - peut introduire des choix plus opinionnés que nécessaire au stade actuel
  - tRPC n’apporte pas forcément une valeur immédiate pour un produit déjà fortement structuré autour de jobs, providers et orchestration
  - moins directement aligné qu’un socle Next.js + Supabase si l’objectif est de démarrer vite avec auth/db/storage intégrés

### Selected Starter: `create-next-app` with official `with-supabase` example

**Rationale for Selection:**

Ce starter est le meilleur compromis pour ce projet à ce stade.

Il donne immédiatement:

- une fondation `Next.js` moderne et standard
- `TypeScript`
- `Tailwind CSS`
- une base `Supabase` cohérente pour auth, base et stockage

Il évite deux extrêmes:

- partir d’un starter trop nu, qui ralentirait le cadrage du MVP
- partir d’un starter trop opinionné, qui brouillerait les futurs choix d’orchestration

Pour `Studio UGC IA`, le vrai différenciateur n’est pas le starter frontend lui-même, mais:

- le modèle métier campagne / ADN / avatars
- le modèle métier campagne / ADN / références marketing / avatars
- le moteur de jobs typés
- l’abstraction des agents et fournisseurs
- la reprise sur checkpoint
- la cohérence DA / outputs

Le meilleur choix est donc une fondation standard, maintenue, productive, mais pas surchargée de décisions structurelles inutiles.

### Initialization Command

```bash
npx create-next-app -e with-supabase
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**

- `TypeScript` par défaut dans le template retenu
- runtime web full-stack basé sur `Next.js`

**Styling Solution:**

- `Tailwind CSS` préconfiguré dans l’exemple officiel Supabase

**Build Tooling:**

- build pipeline standard `Next.js`
- conventions de projet alignées avec l’App Router moderne

**Testing Framework:**

- non imposé fortement par ce starter
- décision à prendre ensuite selon les besoins d’architecture et de quality gates

**Code Organization:**

- structure Next.js standard, plus facile à faire évoluer vers une organisation par domaines métier
- base suffisamment neutre pour séparer ensuite:
  - `campaign domain`
  - `avatar domain`
  - `content jobs`
  - `provider connectors`
  - `orchestration engine`

**Development Experience:**

- fondation bien documentée
- faible surprise pour l’équipe
- bonne compatibilité avec une mise en place incrémentale de composants plus spécifiques

**Architectural Implication:**
Ce starter doit être traité comme une fondation d’application, pas comme l’architecture métier finale. Le moteur d’orchestration, les jobs typés, la couche providers et les services de continuité avatar devront être ajoutés explicitement au-dessus de cette base.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Base de données principale: `Supabase Postgres`
- Modèle d’autorisation: `Supabase Auth + rôles projet applicatifs + RLS`
- Moteur d’orchestration asynchrone: `Trigger.dev v4`
- Pattern d’API: `hybrid Server Actions + Route Handlers + background tasks`
- Modèle de persistance des jobs: `job state mirrored in app database`
- Stockage média: `Supabase Storage`
- Validation des entrées: `schema-first validation at boundaries`

**Important Decisions (Shape Architecture):**

- Approche data: `SQL-first, domain-oriented schema`
- Cache strategy: `minimal MVP caching, no external cache initially`
- Frontend state model: `server-first, client state only where interaction demands it`
- Observabilité: `platform-native first, app-level structured logging`
- Déploiement: `Vercel + Supabase + Trigger.dev`

**Deferred Decisions (Post-MVP):**

- cache distribué dédié (`Redis` ou équivalent)
- séparation éventuelle en services indépendants
- moteur analytique avancé pour performance créative
- event bus interne plus sophistiqué
- data warehouse / BI pipeline
- search/indexing avancés à grande échelle

### Data Architecture

**Primary database:** `Supabase Postgres`

**Decision:**
Le système utilise `Supabase Postgres` comme base de données principale pour:

- campagnes
- ADN de campagne
- avatars
- groupes d’avatars
- rôles
- content jobs
- checkpoints
- validations
- outputs
- historique
- permissions projet

**Version / Platform Status:**

- PostgreSQL managé via Supabase
- configuration exacte portée par la plateforme Supabase plutôt que figée dans l’application

**Rationale:**

- cohérence avec le starter sélectionné
- auth, DB, storage et RLS bien alignés
- très bon fit pour un mini-SaaS internal tool
- suffisamment solide pour modéliser des agrégats métier riches
- réduit le coût de démarrage sans sacrifier l’évolutivité du MVP

**Modeling approach:**

- approche `SQL-first`
- schéma organisé par domaines métier, pas par écrans UI
- séparation claire entre:
  - `campaign core`
  - `campaign DNA`
  - `marketing references & script profiles`
  - `content jobs`
  - `avatar continuity`
  - `workflow runs`
  - `review & validation`
  - `assets & outputs`

**Data validation strategy:**

- validation applicative par schémas à toutes les frontières d’entrée
- validation base via contraintes SQL, clés étrangères, enums et checks
- l’ADN, la DA et les jobs doivent être validés avant exécution, pas seulement avant persistence

**Migration approach:**

- migrations versionnées côté base
- évolution incrémentale du schéma
- aucun changement manuel non tracé en production

**Caching strategy:**

- pas de cache distribué dédié au MVP
- usage prioritaire de:
  - cache applicatif Next.js quand pertinent
  - états persistés en base
  - résultats de jobs et métadonnées d’outputs
- cette stratégie limite la complexité prématurée sur un produit dont le coeur est déjà riche

### Authentication & Security

**Authentication method:** `Supabase Auth with SSR-compatible session handling`

**Decision:**
L’authentification s’appuie sur `Supabase Auth`, avec gestion de session adaptée à Next.js et au starter `with-supabase`.

**Authorization pattern:**
Modèle en deux couches:

- identité utilisateur gérée par Supabase Auth
- autorisation métier gérée par:
  - rôles projet
  - ownership du projet
  - règles RLS sur les tables sensibles
  - contrôles applicatifs complémentaires sur les actions critiques

**Security middleware:**

- contrôles d’accès sur Route Handlers et Server Actions
- garde-fous sur:
  - modification ADN
  - reprise de workflow
  - gestion avatars
  - accès aux assets sensibles
  - configuration fournisseurs

**Data encryption approach:**

- chiffrement en transit via HTTPS/TLS
- chiffrement au repos délégué aux plateformes managées
- secrets applicatifs stockés uniquement dans les gestionnaires d’environnement des plateformes concernées

**API security strategy:**

- aucune clé fournisseur exposée côté client
- les appels sensibles aux providers passent uniquement côté serveur / tâche background
- séparation stricte entre clés publiques, publishable keys, service keys et secrets providers

### API & Communication Patterns

**Application API pattern:** `Hybrid Next.js architecture`

**Decision:**
Le produit utilise trois modes de communication complémentaires:

1. `Server Actions`
- pour les mutations utilisateur authentifiées depuis l’interface
- ex: création campagne, mise à jour ADN, assignation avatar, validation

2. `Route Handlers`
- pour les endpoints machine-oriented
- ex: webhooks, callbacks providers, endpoints techniques, exports, health endpoints

3. `Trigger.dev tasks`
- pour les traitements longs, orchestrés, rejouables et observables
- ex: génération vidéo, génération image, post-traitement, upscaling, analyse rétention, pipeline multi-agents
- les tâches vidéo UGC doivent pouvoir consommer une bibliothèque de références et des profils d’instructions agent versionnables

**Background orchestration engine:** `Trigger.dev v4`

**Version verified:**

- `Trigger.dev v4` est documenté comme GA
- documentation officielle Next.js disponible
- support explicite des long-running tasks, retries, monitoring et React hooks temps réel

**Rationale:**

- très bon fit pour des workflows IA longs
- monitoring natif des runs
- bonne compatibilité avec Next.js
- temps réel utile pour le cockpit de supervision
- réduit le besoin de construire trop tôt une couche de queue / worker custom

**Communication standard:**

- interactions UI → mutation/app actions
- mutation métier → event or task trigger
- task → provider connectors
- provider result → persisted run state + output artifacts
- persisted run state → UI feedback loop

**Error handling standard:**

- erreurs synchrones: validation claire côté app
- erreurs asynchrones: checkpoint + état de run + action de reprise
- aucun provider ne doit dicter directement le modèle d’erreur métier

### Frontend Architecture

**Frontend pattern:** `Server-first App Router architecture`

**Decision:**
L’interface privilégie:

- Server Components pour lecture et composition initiale
- Client Components uniquement pour:
  - éditeurs riches
  - review interactive
  - timeline workflow
  - polling / subscription de statut
  - interactions locales complexes

**State management approach:**

- pas de global state library systématique au départ
- priorité à:
  - URL state
  - server state
  - state local composant
- introduction d’un store client léger seulement pour les surfaces cockpit qui le nécessitent réellement

**Component architecture:**

- composants fondation via design system themeable
- surfaces métier distinctes pour:
  - `Campaign DNA Editor`
  - `Production Type & Creative Direction Configurator`
  - `Workflow Timeline & Agent Status Panel`
  - `Avatar Group & Role Assigner`
  - `Output Review Surface`
  - `Checkpoint Recovery Panel`

**Performance optimization approach:**

- chargement serveur par défaut
- découpage des surfaces riches
- streaming / progressive rendering quand utile
- refresh ciblé des zones de statut plutôt que refetch massif d’écran

### Infrastructure & Deployment

**Hosting strategy:** `Vercel + Supabase + Trigger.dev`

**Decision:**

- `Vercel` pour l’application Next.js
- `Supabase` pour Postgres/Auth/Storage
- `Trigger.dev` pour les jobs longs et l’orchestration asynchrone

**Environment configuration:**

- secrets séparés par plateforme
- aucun secret provider dans le frontend
- variables d’environnement distinctes pour:
  - app runtime
  - background tasks
  - database/admin access
  - AI providers

**Monitoring and logging:**

- Vercel logs pour la couche app
- Supabase logs pour DB/auth/storage
- Trigger.dev observability pour runs et tasks
- structured application logs pour relier campagne, job, provider et décision utilisateur

**Scaling strategy:**

- scale vertical/platform-managed au MVP
- scale logique par:
  - séparation des jobs longs hors request cycle
  - provider abstraction
  - persistence d’état indépendante de l’UI
- évolution ultérieure possible vers composants plus découplés sans réécriture du coeur métier

### Decision Impact Analysis

**Implementation Sequence:**

1. Initialiser l’application avec le starter retenu
2. Poser la modélisation domaine en base
3. Mettre en place auth + rôles projet + RLS
4. Poser les abstractions provider
5. Mettre en place le moteur Trigger.dev
6. Implémenter les content jobs typés et checkpoints
7. Connecter les surfaces cockpit et review à l’état des runs
8. Ajouter les spécialisations de production par type de contenu

**Cross-Component Dependencies:**

- `Campaign & DNA` conditionne tous les jobs
- `Campaign lifecycle` conditionne les comportements des agents marketing, notamment le passage pré-campagne → campagne
- `Marketing references & script profiles` conditionnent les jobs vidéo et visuels, influencent script, hook, rythme et review, et doivent être indexés par genre marketing puis type de contenu
- `Avatar & Continuity` dépend du modèle campagne mais influence fortement outputs et review
- `Avatar continuity agents` dépendent du contexte campagne et de l’historique avatar, puis influencent les décisions d’évolution avant génération
- `Trigger.dev orchestration` dépend des abstractions providers et du stockage d’état
- `UI cockpit` dépend d’un modèle de run persistant et observable
- `Security model` traverse base, app, providers et tâches background
- `Direction artistique exécutable` fait le lien entre ADN, job typing, agents spécialisés et review

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
`10` zones principales où plusieurs agents pourraient diverger et produire du code incompatible:

- nommage SQL et relations
- nommage API et actions
- organisation par domaine
- séparation `UI / app mutations / background tasks`
- structure des jobs et checkpoints
- formats de réponse et d’erreur
- conventions de validation
- conventions d’événements métier
- stratégie de loading/status
- journalisation et traçabilité

### Naming Patterns

**Database Naming Conventions:**

- tables en `snake_case` pluriel
  - exemples: `campaigns`, `campaign_dna_versions`, `content_jobs`, `avatar_groups`
- colonnes en `snake_case`
  - exemples: `project_id`, `created_at`, `production_type`, `video_subtype`
- clés primaires par défaut: `id`
- clés étrangères au format `<target>_id`
  - exemples: `campaign_id`, `avatar_id`, `content_job_id`
- tables de jonction au format explicite
  - exemples: `campaign_avatars`, `avatar_group_members`
- enums nommés selon le domaine métier
  - exemples: `content_type`, `video_subtype`, `job_status`

**API Naming Conventions:**

- ressources HTTP en `kebab-case` pluriel si exposées par Route Handlers
  - exemples: `/api/content-jobs`, `/api/provider-webhooks`
- paramètres d’URL en style Next.js standard
  - exemples: `/api/content-jobs/[jobId]`
- query params en `camelCase` côté app web
  - exemples: `campaignId`, `jobStatus`, `contentType`
- webhooks nommés par fournisseur ou fonction métier
  - exemples: `/api/webhooks/trigger`, `/api/webhooks/provider-fal`

**Code Naming Conventions:**

- fichiers React en `kebab-case`
  - exemples: `campaign-dna-editor.tsx`, `output-review-surface.tsx`
- composants React exportés en `PascalCase`
  - exemples: `CampaignDnaEditor`, `OutputReviewSurface`
- fonctions et variables TypeScript en `camelCase`
  - exemples: `createContentJob`, `loadCampaignContext`
- types, interfaces et schémas en `PascalCase`
  - exemples: `ContentJob`, `CampaignDnaVersion`, `CreateContentJobInput`
- constantes globales en `SCREAMING_SNAKE_CASE`
  - exemples: `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`

### Structure Patterns

**Project Organization:**

Le code doit être organisé par domaine métier, pas par type technique global.

Structure logique attendue:

- `src/app` pour routes, layouts et surfaces Next.js
- `src/features/campaigns`
- `src/features/avatars`
- `src/features/content-jobs`
- `src/features/agent-contracts`
- `src/features/media-output-settings`
- `src/features/review`
- `src/features/auth`
- `src/lib/providers`
- `src/lib/workflows`
- `src/lib/db`
- `src/lib/validation`
- `src/lib/observability`

Chaque domaine doit regrouper autant que possible:

- types métier
- validation
- logique serveur
- mapping DB
- helpers spécifiques
- composants UI propres au domaine si pertinents

**File Structure Patterns:**

- tests co-localisés si unitaires et ciblés
- tests transverses dans des dossiers dédiés si intégration ou e2e
- schémas Zod ou équivalent près des frontières d’entrée
- code provider séparé par fournisseur
  - exemples: `src/lib/providers/fal`, `src/lib/providers/heygen`
- tâches Trigger.dev séparées par domaine métier, pas par fournisseur seul
- aucun composant métier critique dans `src/components` générique sans raison claire

### Format Patterns

**API Response Formats:**

Pour les `Route Handlers`, utiliser une enveloppe cohérente:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

En cas d’erreur:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "JOB_VALIDATION_FAILED",
    "message": "The content job configuration is invalid."
  },
  "meta": {}
}
```

Règles:

- `success` toujours présent
- `data` présent même si `null`
- `error` structuré avec `code` + `message`
- `meta` réservé pagination, tracing, version ou contexte léger

**Data Exchange Formats:**

- JSON côté API en `camelCase`
- persistance SQL en `snake_case`
- dates en ISO 8601
- booléens en vrais booléens JSON
- statuts et types sous forme de chaînes explicites, pas de codes numériques implicites
- aucune charge utile provider brute ne doit devenir le contrat métier public sans mapping

### Communication Patterns

**Event System Patterns:**

Les événements métier internes doivent suivre:

- format: `<domain>.<entity>.<action>`
- exemples:
  - `campaign.dna.updated`
  - `content_job.created`
  - `content_job.checkpoint_created`
  - `output.validated`

Les payloads doivent inclure au minimum:

- `eventId`
- `occurredAt`
- `projectId`
- `campaignId` si applicable
- `jobId` si applicable
- identifiants métier utiles, pas tout le contexte brut

Les événements provider-specific doivent être traduits en événements métier applicatifs avant propagation large.

Les événements de génération ou d’adaptation média doivent inclure les paramètres qui influencent coût et review:

- `agentContractId` et `agentContractVersion` si un agent est impliqué
- `skillIds` utilisés
- `providerCapability` (`script`, `image`, `video`, `voice`, `sound_effect`, `orchestration`, `media_adaptation`)
- `outputFormat`, `aspectRatio`, `resolution`, `durationSeconds` si applicable
- `sourceAssetId` lorsqu’il s’agit d’une adaptation ou d’un changement de ratio/résolution
- `sceneLocation` et `sceneLocationDecisionSource` pour les vidéos UGC lorsque pertinent

**State Management Patterns:**

- état serveur comme source de vérité pour campagnes, jobs, outputs et validations
- état client réservé aux interactions locales, filtres, toggles, drafts UI et surfaces riches
- toute mutation importante doit produire un nouvel état persistant observable
- aucune logique critique de workflow ne doit dépendre exclusivement d’un store client

### Process Patterns

**Error Handling Patterns:**

- distinguer clairement:
  - erreur de validation
  - erreur provider
  - erreur d’orchestration
  - erreur d’autorisation
  - erreur inattendue
- toute erreur de job longue doit produire:
  - statut
  - checkpoint éventuel
  - contexte minimal
  - action de reprise possible
- les messages utilisateur restent compréhensibles
- les logs conservent le détail technique

**Loading State Patterns:**

- `isLoading` pour actions immédiates UI
- `status` explicite pour entités persistées
  - exemples: `draft`, `queued`, `running`, `waiting_for_review`, `failed`, `completed`
- ne pas mélanger loading local et état métier du job
- les écrans riches doivent refléter l’état persistant du workflow, pas seulement un spinner local

**Validation Patterns:**

- valider à toutes les frontières d’entrée
- valider avant persistence et avant déclenchement de task
- l’ADN, la DA de production, le type de contenu et les avatars assignés doivent être validés ensemble quand ils participent au même job
- toute validation bloquante doit retourner un code d’erreur métier stable

### Enforcement Guidelines

**All AI Agents MUST:**

- respecter l’organisation par domaine métier
- utiliser `snake_case` en base et `camelCase` dans les contrats JSON/TS
- séparer clairement UI, mutations synchrones et tâches asynchrones
- encapsuler chaque fournisseur derrière une interface applicative
- mapper toute réponse provider vers un modèle métier interne
- persister l’état métier des jobs et checkpoints
- utiliser des validations de schéma aux frontières
- ne jamais introduire de logique critique seulement côté client
- journaliser avec les identifiants métier nécessaires (`projectId`, `campaignId`, `jobId`)

**Pattern Enforcement:**

- revues de code ciblant conventions de nommage, frontière de responsabilité et formats de réponse
- tests d’intégration sur jobs, checkpoints, auth et mapping provider
- lint/typecheck pour conventions automatisables
- toute divergence de pattern doit être corrigée dans l’implémentation, pas documentée comme exception implicite

### Pattern Examples

**Good Examples:**

- table `content_jobs` avec colonne `production_type`
- type TS `ContentJobStatus`
- composant `OutputReviewSurface` dans un domaine `review`
- Route Handler retournant une enveloppe cohérente
- tâche Trigger.dev `generate-campaign-output`
- provider wrapper `generateImageWithFal()`

**Anti-Patterns:**

- table SQL `ContentJobs`
- réponses API parfois enveloppées, parfois non
- logique de reprise stockée seulement dans le frontend
- appels directs à un provider depuis un composant React
- logique métier partagée dans un dossier `utils` fourre-tout
- payload provider stocké comme unique vérité métier sans mapping intermédiaire

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
content-ugc/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.js
├── components.json
├── .env.local
├── .env.example
├── .gitignore
├── middleware.ts
├── trigger.config.ts
├── drizzle.config.ts
├── public/
│   ├── icons/
│   ├── images/
│   └── placeholders/
├── supabase/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   └── page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── campaigns/
│   │   │   │       │   ├── new/
│   │   │   │       │   │   └── page.tsx
│   │   │   │       │   └── [campaignId]/
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       ├── dna/
│   │   │   │       │       │   └── page.tsx
│   │   │   │       │       ├── jobs/
│   │   │   │       │       │   ├── page.tsx
│   │   │   │       │       │   └── [jobId]/
│   │   │   │       │       │       └── page.tsx
│   │   │   │       │       ├── outputs/
│   │   │   │       │       │   └── page.tsx
│   │   │   │       │       ├── avatars/
│   │   │   │       │       │   └── page.tsx
│   │   │   │       │       ├── agents/
│   │   │   │       │       │   └── page.tsx
│   │   │   │       │       ├── skills/
│   │   │   │       │       │   └── page.tsx
│   │   │   │       │       └── prelaunch/
│   │   │   │       │           └── page.tsx
│   │   │   │       ├── assets/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── settings/
│   │   │   │           └── page.tsx
│   │   │   ├── avatars/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [avatarId]/
│   │   │   │       └── page.tsx
│   │   │   ├── agents/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [agentId]/
│   │   │   │       └── page.tsx
│   │   │   ├── skills/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [skillId]/
│   │   │   │       └── page.tsx
│   │   │   └── review/
│   │   │       └── [jobId]/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── content-jobs/
│   │   │   │   ├── route.ts
│   │   │   │   └── [jobId]/
│   │   │   │       ├── route.ts
│   │   │   │       └── resume/
│   │   │   │           └── route.ts
│   │   │   ├── outputs/
│   │   │   │   └── [outputId]/
│   │   │   │       └── route.ts
│   │   │   ├── provider-webhooks/
│   │   │   │   ├── fal/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── heygen/
│   │   │   │   │   └── route.ts
│   │   │   │   └── trigger/
│   │   │   │       └── route.ts
│   │   │   └── uploads/
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── error/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── actions/
│   │   ├── campaigns/
│   │   ├── avatars/
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── content-jobs/
│   │   └── review/
│   ├── features/
│   │   ├── campaigns/
│   │   ├── campaign-dna/
│   │   ├── content-jobs/
│   │   ├── outputs/
│   │   ├── avatars/
│   │   ├── ugc-references/
│   │   │   ├── components/
│   │   │   ├── server/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── profiles/
│   │   ├── review/
│   │   ├── prelaunch/
│   │   ├── assets/
│   │   ├── auth/
│   │   ├── agents/
│   │   │   ├── components/
│   │   │   ├── server/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── catalog/
│   │   │   ├── profiles/
│   │   │   ├── assignments/
│   │   │   └── quality/
│   │   ├── skills/
│   │   │   ├── components/
│   │   │   ├── server/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── catalog/
│   │   │   ├── mappings/
│   │   │   ├── execution/
│   │   │   └── evaluation/
│   │   ├── workflows/
│   │   │   ├── components/
│   │   │   ├── server/
│   │   │   ├── repositories/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── orchestration/
│   │   │   ├── checkpoints/
│   │   │   └── runs/
│   │   └── production/
│   │       ├── video/
│   │       │   ├── ugc/
│   │       │   ├── hyper-motion/
│   │       │   ├── unboxing/
│   │       │   ├── ugc-virtual-try-on/
│   │       │   ├── tv-spot/
│   │       │   ├── tutorial/
│   │       │   └── pro-virtual-try-on/
│   │       └── visual/
│   │           ├── shooting/
│   │           ├── posters/
│   │           ├── illustrations/
│   │           └── ecommerce-contexts/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── schema/
│   │   │   └── migrations/
│   │   ├── supabase/
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   ├── middleware.ts
│   │   │   └── admin.ts
│   │   ├── providers/
│   │   │   ├── contracts/
│   │   │   ├── fal/
│   │   │   ├── heygen/
│   │   │   ├── elevenlabs/
│   │   │   ├── openai/
│   │   │   └── shared/
│   │   ├── agents/
│   │   │   ├── contracts/
│   │   │   ├── registry/
│   │   │   ├── planner/
│   │   │   └── execution/
│   │   ├── skills/
│   │   │   ├── contracts/
│   │   │   ├── registry/
│   │   │   ├── adapters/
│   │   │   └── scoring/
│   │   ├── prompt-profiles/
│   │   │   ├── contracts/
│   │   │   ├── registry/
│   │   │   └── versioning/
│   │   ├── workflows/
│   │   │   ├── trigger/
│   │   │   │   ├── index.ts
│   │   │   │   ├── content-jobs/
│   │   │   │   ├── outputs/
│   │   │   │   └── prelaunch/
│   │   │   ├── events/
│   │   │   └── mappers/
│   │   ├── validation/
│   │   │   ├── common/
│   │   │   ├── campaigns/
│   │   │   ├── avatars/
│   │   │   ├── jobs/
│   │   │   ├── agents/
│   │   │   └── skills/
│   │   ├── observability/
│   │   │   ├── logger.ts
│   │   │   ├── tracing.ts
│   │   │   └── metrics.ts
│   │   ├── auth/
│   │   │   ├── require-auth.ts
│   │   │   ├── require-project-role.ts
│   │   │   └── session.ts
│   │   ├── api/
│   │   │   ├── responses.ts
│   │   │   ├── errors.ts
│   │   │   └── route-helpers.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── app-config.ts
│   │   │   └── feature-flags.ts
│   │   └── utils/
│   │       ├── dates.ts
│   │       ├── ids.ts
│   │       └── strings.ts
│   ├── trigger/
│   │   └── index.ts
│   ├── types/
│   └── middleware/
│       └── request-context.ts
├── tests/
│   ├── integration/
│   │   ├── campaigns/
│   │   ├── avatars/
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── content-jobs/
│   │   ├── review/
│   │   └── providers/
│   ├── e2e/
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── jobs/
│   │   ├── review/
│   │   └── agents/
│   ├── fixtures/
│   └── utils/
├── docs/
│   └── project-context.md
└── _bmad-output/
    ├── planning-artifacts/
    ├── implementation-artifacts/
    └── test-artifacts/
```

### Architectural Boundaries

**API Boundaries:**

- `Server Actions` pour mutations authentifiées pilotées par UI
- `Route Handlers` pour endpoints techniques, webhooks, uploads, resume
- `Trigger.dev` pour traitements longs et orchestration
- aucun appel provider sensible depuis le client

**Component Boundaries:**

- `src/components/ui` seulement pour primitives partagées
- les composants métier vivent dans `src/features/*/components`
- les pages Next.js composent les surfaces, elles ne portent pas la logique métier profonde
- les composants de review, DNA editor, workflow panel et DA configurator restent dans leurs domaines

**Service Boundaries:**

- `features/*/server` porte la logique métier de domaine
- `features/*/repositories` encapsule l’accès DB spécifique au domaine
- `lib/providers/*` encapsule chaque fournisseur externe
- `lib/workflows/*` orchestre sans contenir la logique métier profonde du domaine
- `actions/*` sert de façade d’entrée pour les mutations UI

**Data Boundaries:**

- la base applicative est la source de vérité pour campagnes, jobs, outputs, checkpoints, validations
- les payloads bruts fournisseurs restent en bordure ou en stockage technique
- `campaign-dna` et `avatars` restent des sous-domaines distincts
- `outputs` ne doit pas absorber la logique `jobs`
- `review` ne doit pas absorber la logique `generation`

**Agent Boundaries:**

- `features/agents` = agents comme objets métier
- `lib/agents` = runtime, registry, planification et exécution
- un agent ne contient pas directement le code provider
- un agent référence des `skills` et participe à des workflows
- un agent doit être versionné avec un contrat d’entrée/sortie et des critères de qualité explicitables

**Skill Boundaries:**

- `features/skills` = catalogue métier des skills, mapping, version logique, évaluation
- `lib/skills` = contrats techniques, registry, adapters, scoring
- un skill est une capacité réutilisable, versionnable, assignable à plusieurs agents
- les skills ne doivent pas être enfouis dans les workflows ou dans les providers

**Workflow Boundaries:**

- `features/workflows` = runs, checkpoints, orchestration métier
- `lib/workflows` = primitives d’exécution Trigger.dev, événements, mapping
- les workflows consomment des agents et skills, mais ne définissent pas leur catalogue

**Production Boundaries:**

- `features/production/video/*` = logique métier par type vidéo
- `features/production/visual/*` = logique métier par famille de visuel
- cette couche mappe `content type + subtype + DA` vers capacités nécessaires

**Creative Library Boundaries:**

- `features/creative-library` = références créatives analysées, tags, scores, links campagne, reverse engineering
- `features/assets` = fichiers de travail, visuels source, uploads et médias opérationnels
- un asset peut devenir une référence, mais le modèle métier et la persistance doivent rester distincts

### Requirements to Structure Mapping

**Feature Mapping:**

- `Workspace / Projects` → `src/app/(app)/projects`, `src/features/campaigns`, `src/features/auth`
- `Campaign DNA` → `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/dna`, `src/features/campaign-dna`
- `Creative Direction` → `src/features/creative-direction`
- `Creative Library` → `src/app/(app)/creative-library`, `src/features/creative-library`
- `Marketing references & script profiles` → `src/features/marketing-references`, `src/lib/prompt-profiles`
- `Marketing Strategy Library` → `content/marketing-strategies`, `src/features/marketing-strategies`
- `Campaign Optimization` → `content/scaling-strategies`, `src/features/campaign-optimization`
- `Content Jobs` → `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/jobs`, `src/features/content-jobs`
- `Outputs & Review` → `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/outputs`, `src/app/(app)/review/[jobId]`, `src/features/outputs`, `src/features/review`
- `Avatars & Continuity` → `src/app/(app)/avatars`, `src/features/avatars`
- `Prelaunch` → `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/prelaunch`, `src/features/prelaunch`
- `Assets` → `src/app/(app)/projects/[projectId]/assets`, `src/features/assets`
- `Campaign Memory` → `src/features/campaign-memory`, `src/lib/markdown-journals`
- `Provider Integrations` → `src/lib/providers/*`
- `Workflow Orchestration` → `src/lib/workflows`, `src/trigger`, `src/features/content-jobs/orchestration`
- `Agents catalog & assignments` → `src/features/agents`, `src/app/(app)/agents`, `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/agents`
- `Skills catalog & mappings` → `src/features/skills`, `src/app/(app)/skills`, `src/app/(app)/projects/[projectId]/campaigns/[campaignId]/skills`
- `Workflow runtime` → `src/features/workflows`, `src/lib/workflows`, `src/lib/agents`, `src/lib/skills`
- `Production specialization` → `src/features/production/video/*`, `src/features/production/visual/*`

**Cross-Cutting Concerns:**

- `Auth & Roles` → `src/lib/auth`, `src/features/auth`, `middleware.ts`, `supabase/policies`
- `Validation` → `src/lib/validation`, plus schémas locaux par feature
- `Observability` → `src/lib/observability`
- `API response standards` → `src/lib/api`
- `Environment & config` → `src/lib/config`
- `Request context and tracing` → `src/middleware`, `src/lib/observability`

### Integration Points

**Internal Communication:**

- page/app → server action
- server action → domain service
- domain service → repository / workflow trigger
- workflow trigger → provider adapter
- provider result → persisted state update → UI refresh / review
- `campaign/job config` → `workflow planner`
- `campaign dna` → `dna slicer`
- `dna slicer` → `agent-specific input contract`
- `workflow planner` → sélection `agents`
- `agents` → résolution `skills`
- `skills` → appels `providers`
- `providers` → outputs + run state + checkpoints
- `review` → feedback vers jobs / agents / futures décisions

**External Integrations:**

- `Supabase Auth`
- `Supabase Postgres`
- `Supabase Storage`
- `Trigger.dev`
- `Anthropic/Claude` pour l’orchestration, le raisonnement et le cerveau des agents IA
- `OpenAI` pour la génération de scripts
- `Gemini Nano Banana` comme provider visuel par défaut pour images, posters et illustrations
- `OpenAI` comme provider visuel alternatif lorsque la complexité de la tâche, le prompt ou les contraintes de rendu le justifient
- `Kling AI` et `Seedance` pour la génération vidéo
- `ElevenLabs` pour la génération voix et sound effects
- media / voice / avatar providers via `src/lib/providers/*`
- `AI Usage Governance` côté serveur/background avant les appels provider: estimation tokens/coût, quota hebdomadaire par utilisateur, plafond mensuel global `50 USD`, journalisation et blocage avant dépassement

**Data Flow:**

- campagne + ADN + avatars + DA → création de `content_job`
- campagne + ADN actif + stratégie marketing sélectionnée → contexte stratégique de pré-lancement / production
- `content_job` → orchestration Trigger.dev
- orchestration → budget/usage guard → appels providers
- providers → outputs + états + checkpoints
- provider usage → usage ledger durable → budget dashboard / blocage quota si nécessaire
- outputs persistés → review / validation / export
- production finale → `campaign memory journal` + learnings réutilisables
- snapshots de performance post-lancement → optimization workspace → scaling strategy validée → `campaign memory journal`

### File Organization Patterns

**Configuration Files:**

- config racine pour app/build/tooling
- config métier dans `src/lib/config`
- secrets hors repo, variables d’environnement validées dans `src/lib/config/env.ts`

**Source Organization:**

- `src/app` pour le routage
- `src/features` pour les domaines métier
- `src/lib` pour les briques transverses et intégrations
- `src/actions` comme façade de mutations UI
- `src/trigger` comme point d’entrée jobs
- les `agents` sont des entités métier explicites
- les `skills` sont des capacités explicites
- les `mappings` agent-skill et workflow-skill sont des modules dédiés
- aucun agent ou skill critique ne doit être caché dans un simple dossier `utils` ou uniquement dans `workflows`

**Test Organization:**

- tests unitaires co-localisés quand ils sont très ciblés
- tests d’intégration dans `tests/integration`
- tests e2e dans `tests/e2e`
- fixtures et utilitaires centralisés dans `tests/fixtures` et `tests/utils`

**Asset Organization:**

- assets statiques UI dans `public/`
- assets dynamiques campagne dans `Supabase Storage`
- métadonnées et relations d’assets en base via `features/assets`
- journaux de campagne et index d’historique en `markdown` structuré, avec références vers assets médias et éventuellement quelques aperçus légers
- objets durables conservés dans Supabase: fichiers Markdown métier, fiches avatars et données associées, ADN de campagne, DA, cartes/infos de stratégies marketing ou scaling, journaux, préférences providers, checkpoints et décisions validées
- médias générés lourds dans Supabase Storage avec rétention opérationnelle par défaut de `3 jours`: vidéos, images, illustrations, posters, voix et sound effects téléchargés/exportés après génération
- nettoyage automatique attendu via job planifié ou lifecycle dédié: la suppression d’un média temporaire ne doit pas supprimer les métadonnées, traces provider, prompts/scripts validés, journaux ou décisions de campagne
- promotion explicite requise pour conserver durablement un média généré au-delà de `3 jours`

### Development Workflow Integration

**Development Server Structure:**

- Next.js sert l’app shell, les routes et les Server Actions
- Supabase sert auth/db/storage
- Trigger.dev exécute les jobs longs
- la structure permet de développer chaque domaine sans toucher toute l’application

**Build Process Structure:**

- build web via Next.js
- tâches longues séparées de la request lifecycle
- providers et workflows isolés pour faciliter les tests et changements de fournisseur

**Deployment Structure:**

- application déployée sur `Vercel`
- services de données sur `Supabase`
- orchestration sur `Trigger.dev`
- structure compatible avec une évolution progressive sans re-découpage majeur du code

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Les décisions principales sont compatibles entre elles:

- `Next.js` comme shell full-stack applicatif
- `Supabase` pour auth, base et storage
- `Trigger.dev v4` pour l’orchestration asynchrone
- modèle métier centré sur `campaign`, `DNA`, `content jobs`, `avatars`, `agents` et `skills`
- séparation claire entre domaine métier, exécution des jobs, providers et review

Le système cible est cohérent avec la nature du produit: un orchestrateur créatif multimodal, et non un simple générateur isolé.

**Pattern Consistency:**
Les patterns définis soutiennent correctement les décisions d’architecture:

- `snake_case` en base et `camelCase` dans les contrats applicatifs
- organisation par domaines métier
- providers encapsulés
- état métier persistant pour jobs, checkpoints et outputs
- distinction claire entre erreurs synchrones et asynchrones

Les patterns limitent bien les conflits potentiels entre agents d’implémentation.

**Structure Alignment:**
La structure projet est alignée avec les décisions prises:

- domaines métier visibles et séparés
- agents et skills traités comme modules de premier rang
- workflows et providers séparés
- UI structurée autour des surfaces métier critiques
- limites claires entre routage, actions, logique serveur, orchestration et intégrations

### Requirements Coverage Validation ✅

**Feature Coverage:**
Les grands blocs fonctionnels sont couverts architecturalement:

- workspace / projets / campagnes
- ADN de campagne versionné
- content jobs multimodaux
- typologies vidéo spécialisées
- outputs et review
- avatars, groupes, rôles, continuité
- agents, skills et orchestration
- pré-lancement narratif
- assets et stockage
- reprise sur checkpoint et fallback fournisseur

**Functional Requirements Coverage:**
Les `71` exigences fonctionnelles ont un support architectural identifiable.

Les exigences les plus structurantes sont bien couvertes:

- jobs typés par contenu
- DA exécutable
- groupes d’agents spécialisés visuels et vidéo
- checkpoints et reprise
- provider abstraction
- validation humaine
- traçabilité

**Non-Functional Requirements Coverage:**
Les `27` exigences non fonctionnelles sont couvertes dans l’ensemble:

- sécurité
- modularité
- résilience
- observabilité
- extensibilité
- desktop-first UX support
- accessibilité cible `WCAG 2.2 AA`

### Implementation Readiness Validation ✅

**Decision Completeness:**
Les décisions structurantes sont suffisamment documentées pour guider l’implémentation:

- fondation applicative
- moteur d’orchestration
- modèle de sécurité
- patterns d’API
- conventions de validation
- structure modulaire du système

**Structure Completeness:**
La structure projet est suffisamment détaillée pour guider plusieurs agents sans ambiguïté majeure:

- arborescence concrète
- frontières explicites
- domaines identifiables
- intégrations externes localisées
- agents et skills visibles architecturalement

**Pattern Completeness:**
Les patterns sont assez précis pour éviter les divergences classiques:

- nommage
- structure
- formats de réponse
- événements
- loading / status
- erreurs / reprise
- séparation provider / domaine / workflow

### Gap Analysis Results

**Important Gap:**
Une ambiguïté subsiste sur la couche d’accès base de données:

- la structure mentionne `drizzle.config.ts`
- mais le document ne fixe pas encore explicitement `Drizzle` comme choix officiel

**Resolution Proposed:**
Choisir explicitement l’une des deux voies:

- `Drizzle` comme couche SQL typée officielle
- ou structure ORM-agnostic sans référence Drizzle pour l’instant

**Minor Gaps:**

- mécanisme exact de refresh UI des runs à figer plus tard
- `project-context.md` encore absent

Aucun de ces points mineurs ne bloque la suite.

### Validation Issues Addressed

Les points suivants ont été corrigés pendant la validation:

- la structure projet rend désormais `agents` explicites
- la structure projet rend désormais `skills` explicites
- les frontières entre `agents`, `skills`, `workflows` et `providers` sont maintenant clarifiées

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** `medium-high`

**Key Strengths:**

- bon alignement produit / architecture
- séparation claire du domaine métier et des intégrations
- modèle solide pour jobs, agents, skills et checkpoints
- structure projet exploitable par plusieurs agents
- couverture correcte des exigences multimodales

**Areas for Future Enhancement:**

- clarifier officiellement la couche d’accès DB (`Drizzle` ou non)
- préciser la stratégie exacte de realtime UI
- générer un `project-context.md` avant la phase d’implémentation si souhaité

### Implementation Handoff

**AI Agent Guidelines:**

- suivre strictement les décisions d’architecture documentées
- ne pas fusionner `agents`, `skills`, `workflows` et `providers`
- respecter la structure par domaine
- conserver l’état métier persistant des jobs
- traiter la DA et l’ADN comme des inputs métier de premier rang

**First Implementation Priority:**
Initialiser le projet avec le starter retenu, puis fixer immédiatement la couche d’accès DB avant de démarrer les premiers modules métier.
