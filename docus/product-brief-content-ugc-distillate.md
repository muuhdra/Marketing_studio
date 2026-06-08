---
title: "Product Brief Distillate: content-ugc"
type: llm-distillate
source: "product-brief-content-ugc.md"
created: "2026-04-27"
purpose: "Token-efficient context for downstream PRD creation"
---

# Detail Pack PRD - Studio UGC IA

## Requirements Hints

- Le MVP doit permettre la creation de `campagnes/projets` separes, avec une logique de dossier ou workspace par campagne.
- Chaque campagne doit contenir ses propres artefacts de contexte: story, visuels, references, assets, consignes de marque, et un fichier `ADN` en markdown qui centralise tout ce qu'il faut savoir sur la campagne.
- L'historique detaille d'une campagne peut etre stocke sous forme de journaux `markdown` indexes afin de limiter la charge de stockage, avec liens vers les medias et seulement quelques visuels representatifs si necessaire.
- Le fichier `ADN` doit servir de source de verite pour guider la creation de contenu au sein de la campagne.
- L'utilisateur veut pouvoir creer du contenu dans une campagne tout en respectant automatiquement l'ADN de cette campagne.
- Le produit doit inclure des agents specialises avec des skills dedies a chaque etape de creation de contenu, notamment script, ideation, angle, structure, adaptation de message et autres etapes du workflow.
- Le produit doit proposer une page ou un espace dedie a la creation de `modeles`/avatars IA, puis permettre d'assigner ces avatars a une ou plusieurs campagnes.
- Le MVP doit inclure un systeme hierarchique d'agents marketing simulant une equipe complete de pilotage de campagne.
- La veille externe est optionnelle pour le MVP, mais souhaitee si elle reste raisonnable en complexite.

## Product Structure Signals

- Entite probable `Campaign`: nom, objectif, type de produit, langues, ADN, assets, avatars assignes, templates associes, historique des contenus.
- Entite probable `Campaign DNA`: document markdown versionne contenant positionnement, ton, angles, promesses, audience, contraintes et references creatrices.
- Entite probable `Content Job`: demande de creation liee a une campagne, avec type de video, angle, avatar, langue, inputs, statut, validations et sorties.
- Entite probable `Avatar Model`: personnage synthétique reutilisable avec identite visuelle, voix, style, contraintes d'usage et campagnes associees.
- Entite probable `Agent Role`: fonction logique dans le pipeline, soit pour orchestration, soit pour production d'un livrable intermediaire.
- Entite probable `Template/Schema`: schema de campagne reutilisable lorsqu'une campagne performe bien, sans imposer un systeme rigide pour tous les cas.

## Agent Hierarchy Intent

- Le systeme d'agents ne doit pas seulement executer des taches techniques; il doit refleter une organisation marketing.
- Roles mentionnes par l'utilisateur:
- `Responsable / Directeur Marketing Digital`
- `Chef de Projet Digital`
- `Directeur de la Strategie Digitale`
- `Content Manager`
- `Copywriter`
- `Architecte de Systemes de Contenu IA`
- Interpretation probable: certains agents sont `strategiques` (pilotage, arbitrage, cohérence), d'autres sont `operationnels` (script, contenus, execution), et d'autres `systemiques` (orchestration, structure, maintenance du workflow).
- Point PRD important: clarifier si ces agents sont visibles dans l'interface comme des "membres d'equipe IA", ou s'ils restent une logique interne d'orchestration.

## Content Workflow Signals

- Le workflow de creation doit partir de la campagne, pas d'un simple prompt libre.
- Une pre-campagne comme une campagne standard doit porter des parametres temporels explicites: duree, dates cles, statut, fin prevue et prolongation eventuelle.
- La creation de contenu doit heriter du contexte campagne: produit, audience, angle, ton, langue, assets et avatar.
- La creation doit aussi heriter d'une `direction artistique` exploitable, en particulier pour la photographie, les shootings, les posters et les illustrations.
- Le produit doit porter une `bibliotheque de references marketing` indexee par `genre marketing` puis par `type de contenu`, afin de rattacher des videos, scripts et references creatives reutilisables a chaque mode de production.
- Les videos UGC doivent pouvoir s'appuyer sur cette bibliotheque pour guider structure, ton conversationnel et rythme de montage, avec une ou deux references rattachees a chaque sous-type video du MVP.
- Les autres genres (`Product`, `App`, `Shooting/Photo`, `image`, `poster`, `illustration`) doivent aussi pouvoir consommer des references et scripts adaptes a leur type de production.
- Chaque etape critique du pipeline doit pouvoir etre validee humainement pour conserver un mode semi-automatique.
- Le rendu final attendu reste une `video complete deja assemblee`, pas seulement un script ou des clips separes.
- Les skills de contenu doivent couvrir au minimum: choix d'angle, hook, script, adaptation linguistique, coherence avec l'ADN, validation qualitative et preparation de la sortie finale.
- Les videos doivent etre produites selon une typologie explicite au MVP:
  - `UGC`
  - `Hyper/Motion`
  - `Unboxing`
  - `UGC Virtual Try On`
  - `TV Spot`
  - `Tutorial`
  - `Pro Virtual Try On`
- Le systeme doit choisir et orchestrer des agents differents selon la famille de production (`video`, `shooting photo`, `poster`, `illustration`) et selon le sous-type de sortie.
- Le `Marketing Studio` doit presenter un choix initial de `genre marketing` a gauche (`Product`, `App`, `Shooting/Photo`), puis n'afficher que les types de contenus compatibles avec ce genre.
- Le `Marketing Studio` doit aussi exposer au centre un script genere automatiquement par les agents marketing, editable ou regenerable par l'humain avant lancement.
- Le `Marketing Studio` doit exposer a droite une carte `Avatar/Model` et une carte `Produit`, cette derniere devant accepter un nombre defini d'images produit parmi lesquelles les agents pourront choisir.
- Le passage `pre-campagne -> campagne` doit pouvoir etre pilote par le temps: alerte d'echeance, prolongation possible, et bascule automatique des agents marketing si la periode prend fin sans prolongation.
- Pour les scripts UGC, le systeme doit pouvoir imposer une structure de sortie explicite au minimum avec `Temps (sec)`, `Audio`, `Visuel` et `Texte a l'ecran`.
- Les agents video UGC doivent pouvoir embarquer des profils d'instructions ou system prompts versionnables, incluant ton brut, vocabulaire interdit, phrases courtes et interruptions de motif toutes les `2.5` secondes maximum.

## Avatar System Signals

- Le besoin principal n'est pas un generateur de visage isole, mais une gestion de `personnages` reutilisables dans le temps.
- La constance des personnages entre plusieurs campagnes ou variantes est importante.
- L'evolution des looks et environnements avatars doit pouvoir etre analysee par un petit sous-groupe d'agents specialise avant application, afin de conserver une coherence impeccable.
- Le profil avatar doit pouvoir definir si son environnement est `evolutif` dans un perimetre coherent ou `verrouille` dans une categorie de lieux compatible avec son role.
- La page avatar doit probablement couvrir: creation, edition, bibliotheque, statut, assignation a campagne et regles d'usage.
- Question PRD a trancher: quelle est la frontiere entre `avatar`, `personnage`, `voix`, `style visuel` et `presentateur` dans le modele de donnees.

## Technical Context

- Le produit doit etre un mini-SaaS web des le MVP, et non un simple outil local ou une console technique.
- L'orchestration doit reposer sur des fournisseurs IA externes via cles API.
- L'architecture doit rester extensible pour accueillir plus tard un second projet plus large de gestion/orchestration marketing.
- Le systeme devra probablement separer:
- UI applicative
- moteur d'orchestration des campagnes
- moteur d'orchestration des agents
- connecteurs fournisseurs externes
- stockage des artefacts de campagne
- stockage/versionnage du fichier ADN campagne

## Production Agent Specialization Signals

- Pour les assets visuels, le produit doit prevoir au minimum les familles d'agents suivantes:
  - `Direction Artistique & Prompt Engineering`
  - `Post-Production & Upscaling`
  - `SEO Visuel & Asset Management`
  - `E-commerce & Mise en situation`
  - `Superviseur & Qualite`
- Pour les videos UGC et video ads, le produit doit prevoir au minimum les familles d'agents suivantes:
  - `Scenariste & Copywriter Hook`
  - `Directeur de Casting Virtuel & Avatar`
  - `Monteur Rythmique & Dynamique`
  - `Analyste de Retention`
- Ces agents et leurs skills doivent etre ameliorables dans le temps; le modele produit ne doit pas figer les capacites comme une liste closee.

## Optional Research Cell

- Option souhaitee: un petit groupe d'agents de veille qui scrutent internet pour apporter des informations actuelles utiles aux campagnes.
- Usage attendu: enrichir les angles de campagne, le contexte marche, les signaux culturels ou tendances recentes.
- Point de vigilance produit: la veille doit rester support d'analyse et de recommendation, pas bloquer la creation de contenu quand elle est absente.
- Point de vigilance technique: la couche recherche web est temporellement instable et devra etre isolee du coeur du pipeline creatif.

## Scope Signals

- In scope MVP probable:
- campagnes/projets separes
- ADN campagne en markdown
- creation de contenu guidee par campagne
- avatars assignables
- systeme d'agents de production
- hierarchy d'agents marketing si representation simple
- Out ou maybe pour v1 selon effort:
- veille web automatisee
- hierarchy tres avancee avec arbitrage complexe multi-agents
- systeme de distribution ou publication sociale
- automatisation totalement autonome sans validation humaine

## Rejected Or Deferred Ideas

- Pas de plateforme publique multi-clients au MVP.
- Pas de fusion immediate avec le second grand projet de presence massive d'agents IA.
- Pas de pipeline totalement automatique sans controle humain.

## Open Questions For PRD

- Comment representer concretement une `campagne`: dossier conceptuel, espace de travail visuel, ou les deux.
- Quelles sections exactes doit contenir le fichier `ADN` campagne.
- Quels roles d'agents doivent etre reels au MVP versus symboliques dans l'interface.
- Quel est le niveau minimal de parametrage avant lancement d'un `content job`.
- Quelles etapes du pipeline necessitent obligatoirement une validation humaine.
- Comment mesurer qu'une campagne ou un schema de contenu est un succes et merite d'etre reutilise.
- Quelle est la premiere pile de fournisseurs IA a brancher pour avatar, voix, generation video et assemblage.
