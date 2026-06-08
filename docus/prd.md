---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/product-brief-content-ugc.md
  - /Users/mac/Downloads/Projets/content-ugc/_bmad-output/planning-artifacts/product-brief-content-ugc-distillate.md
workflowType: 'prd'
releaseMode: single-release
documentCounts:
  productBriefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: saas_b2b
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - content-ugc

**Author:** JD
**Date:** 2026-04-27

## Executive Summary

`Studio UGC IA` est un mini-SaaS interne conçu pour permettre à une petite équipe de créer, piloter et industrialiser la production de vidéos publicitaires UGC et d’assets visuels de campagne assistés par IA. Le produit vise un usage opérationnel immédiat pour des campagnes liées à des produits e-commerce, applications mobiles et services SaaS, avec une logique de campagnes séparées, chacune disposant de son propre contexte, de ses assets, de ses personnages et de son ADN créatif.

Le système est pensé comme un environnement de production contrôlé, où la création de contenu ne part pas d’un prompt isolé, mais d’une campagne structurée. Chaque campagne centralise ses informations stratégiques dans un fichier ADN, ses visuels, ses références, ses avatars assignés et ses paramètres de production. À partir de cette base, le produit orchestre un pipeline semi-automatique de création de contenu allant de la réflexion marketing et du script jusqu’à la génération d’une vidéo ads complète déjà assemblée ou d’assets visuels de campagne exploitables.

Le problème principal adressé par le produit est triple: le manque de cohérence créative entre campagnes et contenus, la difficulté à scaler la production de créas publicitaires, et le coût humain nécessaire pour produire, vérifier et itérer rapidement. Le produit répond à ce problème en combinant orchestration d’agents IA spécialisés, cohérence forte entre campagne et avatar, et validation humaine aux étapes critiques, afin de conserver un contrôle de A à Z sur la qualité finale.

Le résultat attendu est une nouvelle manière de produire des publicités: plus rapide, plus structurée, moins stressante, et mieux adaptée à une logique de test d’idées et d’itération marketing continue.

### Différenciation

Ce produit se distingue par le fait qu’il ne se limite pas à générer des vidéos ou des visuels isolés. Il structure l’ensemble du processus de création publicitaire comme un système cohérent, piloté par une hiérarchie d’agents IA jouant des rôles marketing complémentaires, tout en laissant l’humain garder la décision finale.

Sa proposition de valeur repose sur quatre différenciateurs majeurs. D’abord, une logique de campagne comme unité centrale de travail, avec un ADN de campagne qui sert de source de vérité pour toutes les créations associées. Ensuite, une gestion de personnages et avatars réutilisables afin de maintenir une continuité forte entre les contenus et les campagnes. Troisièmement, une orchestration d’agents spécialisés capables d’intervenir à chaque étape clé de la production de contenu. Enfin, un contrôle humain intégré dans le workflow, car la vitesse n’a de valeur que si elle reste compatible avec la maîtrise, la cohérence et le niveau d’exigence attendu pour des campagnes publicitaires réelles.

L’insight central du produit est que le vrai problème de la création publicitaire assistée par IA n’est pas uniquement la génération de contenu, mais l’orchestration fiable d’un système créatif complet. Les utilisateurs n’ont pas seulement besoin d’un outil qui produit; ils ont besoin d’un environnement qui coordonne, structure, maintient la cohérence et permet de scaler sans perdre en contrôle.

## Project Classification

- Type de projet: mini-SaaS web interne orienté opérations marketing et production créative
- Domaine: marketing digital, production de contenus publicitaires multimodaux, avec coeur UGC vidéo et assets visuels de campagne, orchestration créative assistée par IA
- Niveau de complexité: moyen
- Contexte projet: greenfield

## Success Criteria

### User Success

L’utilisateur réussit lorsqu’il peut créer une campagne structurée, définir ou compléter son ADN de campagne, assigner un ou plusieurs avatars cohérents, y compris un groupe d’avatars avec des rôles distincts lorsque la campagne l’exige, puis lancer un workflow de production qui aboutit à une sortie publicitaire exploitable, qu’il s’agisse d’une vidéo UGC complète ou d’un asset visuel de campagne, sans dépendre d’un assemblage manuel d’outils externes.

Le produit doit permettre à l’utilisateur de produire plusieurs contenus ou variantes à partir d’une même campagne tout en conservant une cohérence forte entre le narratif, le ton, les personnages, les assets et l’intention marketing. Dans le cas d’une campagne de pré-lancement, l’utilisateur réussit lorsqu’il peut générer une storyline, un narratif de campagne et des premières ads avant même le lancement du produit, tout en restant aligné avec l’ADN de la campagne.

L’utilisateur réussit également lorsque les avatars ne restent pas figés, mais évoluent de manière naturelle et cohérente dans le temps. Leur apparence, leurs tenues et certains éléments de leur environnement doivent pouvoir varier au fil des contenus, sans rupture d’identité. Cette évolution doit rester contrôlée, lisible et compatible avec le contexte de campagne.

Le moment de réussite utilisateur est atteint lorsque la création de campagne et de contenu devient plus fluide, plus rassurante et moins stressante, et que l’équipe peut tester des idées plus rapidement sans perdre le contrôle sur la qualité finale.

### Business Success

À court terme, le MVP est considéré comme réussi s’il permet à l’équipe de produire des contenus publicitaires en interne plus rapidement qu’avec un workflow fragmenté entre plusieurs outils, avec une meilleure cohérence de sortie et moins de dépendance au travail manuel dispersé.

À horizon 3 mois, la valeur business du MVP sera démontrée si:

- l’outil est suffisamment fiable pour être utilisé comme workflow principal de création pour les campagnes internes prioritaires
- l’équipe peut lancer plus rapidement de nouvelles campagnes ou variantes créatives
- le coût humain de coordination, correction et assemblage manuel diminue
- les campagnes, avatars et schémas efficaces deviennent réutilisables au lieu d’être recréés à chaque fois

### Technical Success

Le système doit être suffisamment stable pour un usage réel en mode solo et en collaboration légère, avec une orchestration fiable des fournisseurs IA externes et une gestion claire des erreurs, statuts et relances de génération.

Le MVP doit garantir:

- une séparation claire entre campagnes, assets, ADN, avatars et jobs de génération
- une traçabilité minimale des campagnes et des contenus produits
- une qualité d’export compatible avec un usage publicitaire réel
- un pipeline semi-automatique avec validation humaine moyenne sur les points les plus critiques du process
- une architecture modulaire permettant de remplacer ou ajouter des fournisseurs IA sans refonte majeure
- une gestion de profil avatar capable de mémoriser l’historique visuel, les looks disponibles, les lieux utilisés et les règles d’évolution dans le temps

Les validations humaines clés du MVP doivent au minimum couvrir:

- la validation du contexte de campagne et de son ADN
- la validation du narratif, de la storyline ou du script aux étapes importantes
- la validation finale avant export et usage publicitaire

### Measurable Outcomes

Les indicateurs initiaux à suivre sont:

- capacité à produire une première sortie exploitable dans la même session de travail après création et paramétrage de la campagne
- capacité à générer des contenus jugés propres, cohérents et directement utilisables comme base réelle de campagne
- nombre de vidéos complètes ou variantes produites par campagne
- volume de corrections manuelles nécessaires avant validation finale
- taux de réutilisation des avatars, campagnes ou schémas performants
- capacité à produire des campagnes de pré-lancement avec storyline, narratif et ads avant sortie produit
- capacité à maintenir une continuité évolutive des avatars entre plusieurs vidéos d’une même campagne
- capacité à sélectionner une stratégie marketing avant lancement et à tracer son application dans la campagne
- capacité à importer des signaux de performance post-lancement pour déclencher une optimisation/scaling strategy par campagne

## Product Scope

### MVP - Minimum Viable Product

Le MVP inclut:

- création de campagnes/projets séparés
- gestion d’un ADN de campagne sous double forme: version humaine lisible en `markdown` et version machine exécutable structurée
- validation de l’ADN avec `DNA Health Score`, champs critiques manquants et historique de version
- création de contenu guidée par le contexte de campagne
- sélection du format de contenu selon le besoin marketing
- sélection d’un groupe marketing parmi `Product`, `App` et `Shooting/Photo`
- sélection d’un sous-type de vidéo parmi `UGC`, `Hyper/Motion`, `Unboxing`, `UGC Virtual Try On`, `TV Spot`, `Tutorial` et `Pro Virtual Try On`
- filtrage des types de contenus possibles selon le groupe marketing sélectionné
- définition d’une direction artistique de campagne et d’une direction artistique de production, notamment pour les shootings photo, posters et illustrations
- `Creative Reference Intelligence Library` réutilisable par campagne, genre marketing et type de contenu pour guider structure, ton, rythme, style et exécution, avec une ou deux références vidéo et des scripts de référence lorsqu’ils sont pertinents
- distinction explicite entre références de structure, rythme, style visuel, script et références négatives à éviter
- bibliothèque d’avatars/personnages réutilisables
- profil avatar éditable avec identité IA légère: prompt JSON détaillé, `Character Identity Reference Sheet` ou `Multi-Angle Character Reference Sheet`, taille, poids/corpulence et traits physiques clés
- collection visuelle avatar orientée références exploitables, sans builder paramétrique lourd au MVP
- assignation d’avatars à une campagne
- gestion de groupes d’avatars assignables à une campagne avec rôles distincts, notamment pour la photographie produit et campagne
- règles de continuité et d’évolution visuelle des avatars selon le temps, le contexte, le lieu et l’historique de campagne
- paramétrage explicite du mode d’évolution d’environnement d’un avatar, avec possibilité de laisser évoluer ses lieux dans un cadre autorisé ou de verrouiller son univers dans une catégorie cohérente
- sous-groupe d’agents dédié à l’analyse et à l’évolution cohérente des looks et environnements avatars dans le temps
- équipe d’agents IA marketing pour piloter le workflow
- agents spécialisés pour les étapes de création de contenu
- sous-groupe d’agents visuels spécialisés pour la création d’assets de campagne, notamment affiches, photographie produit/avatar et illustration
- sous-groupe d’agents visuels couvrant au minimum `Direction Artistique & Prompt Engineering`, `Post-Production & Upscaling`, `SEO Visuel & Asset Management`, `E-commerce & Mise en situation` et `Superviseur & Qualité`
- sous-groupe d’agents vidéo couvrant au minimum `Scénariste & Copywriter Hook`, `Directeur de Casting Virtuel & Avatar`, `Monteur Rythmique & Dynamique` et `Analyste de Rétention`
- profils d’agents vidéo configurables avec règles de ton, vocabulaire interdit, structure de script et rythme de montage pour les contenus UGC
- agents versionnés avec contrats d’entrée/sortie et runs traçables
- surface `Marketing Studio` avec rail gauche de groupes marketing, zone centrale de script/storyboard/prompt généré/éditable/régénérable, et cartes droites `Avatar/Model`, `Produit`, `References`, `DNA Alignment` et `Workflow`
- surface `Marketing Strategy` permettant de choisir une stratégie depuis une bibliothèque Markdown, de consulter une overview claire et de l’appliquer à la campagne avant lancement
- carte produit capable d’accepter un nombre défini d’images pour un ou plusieurs produits de campagne, afin de laisser l’équipe d’agents choisir les bons inputs selon le contenu demandé
- `Production Readiness Check` avant tout lancement de workflow
- pipeline semi-automatique avec validations humaines
- vidéos UGC complètes déjà assemblées et assets visuels de campagne
- support du français et de l’anglais
- mode campagne de pré-lancement
- paramétrage temporel des pré-campagnes et campagnes avec dates, durée, statut visible et prolongation
- sous-groupe d’agents dédié à la storyline et au narratif de pré-lancement
- espace `Optimization / Scaling Strategy` par campagne pour importer des captures ou signaux de performance post-lancement, synthétiser les constats et recommander une stratégie de scale validée humainement

### Growth Features (Post-MVP)

Après validation du MVP, le produit pourra évoluer avec:

- amélioration de la hiérarchie et de la coordination multi-agents
- templates de campagnes plus intelligents et réutilisation assistée des schémas gagnants
- enrichissement avancé de la bibliothèque avatar
- analyse avancée des performances créatives, au-delà du workspace MVP de captures et recommandations structurées
- amélioration du mode pré-lancement avec narratifs plus profonds et davantage d’angles proposés
- cellule de veille web pour enrichir certaines campagnes avec des signaux actuels

### Vision (Future)

À terme, le produit doit devenir:

- une infrastructure créative marketing propriétaire
- un moteur de campagnes capable de produire, maintenir et faire évoluer des personnages cohérents dans le temps
- une couche de production reliée à un écosystème plus large d’orchestration marketing
- un système permettant de tester rapidement des idées, scaler les créas et réduire fortement la friction humaine

## User Journeys

### Parcours 1 - Utilisateur principal en mode solo (parcours nominal)

Le fondateur-opérateur ouvre l’outil avec une intention claire: lancer rapidement une nouvelle campagne publicitaire sans dépendre d’un empilement d’outils externes. Il crée une nouvelle campagne, renseigne le contexte du produit, ajoute ou complète l’ADN de campagne, charge les visuels utiles et sélectionne le type de contenu à produire.

Dans le `Marketing Studio`, il choisit ensuite un groupe marketing (`Product`, `App` ou `Shooting/Photo`). Le système ne lui présente alors que les types de contenus compatibles avec ce groupe. À droite, il peut associer un avatar ou modèle, ainsi qu’un nombre défini d’images du ou des produits de la campagne, afin de laisser l’équipe d’agents IA choisir les bons inputs au moment de la génération. Il sélectionne aussi ses références de structure, rythme, style visuel, script ou références négatives à éviter selon le format.

Au centre, le système génère automatiquement un script initial à partir de l’ADN, du groupe marketing, du type de contenu, des références et du contexte campagne. L’utilisateur peut modifier ce script manuellement, le régénérer avec les mêmes références ou demander un nouvel angle si le résultat proposé ne lui convient pas.

Pour une vidéo UGC, il peut aussi rattacher une ou plusieurs références issues d’une bibliothèque marketing afin de cadrer la structure, le ton et le rythme attendus. Le système utilise alors ces références et les scripts de référence pour guider l’écriture du script, les interruptions de motif et les indications de montage.

Avant lancement, un `Production Readiness Check` confirme que l’ADN, les références, le produit, l’avatar, la DA et les contraintes plateforme sont suffisamment prêts. À mesure que le pipeline avance, l’utilisateur valide les points critiques: ADN campagne, narratif ou storyline, script, cohérence avatar/campagne, puis sortie finale. Le moment de valeur arrive lorsqu’il obtient une vidéo publicitaire UGC complète ou un ensemble de visuels de campagne cohérents et exploitables dans la même session de travail, avec un niveau de stress et de friction nettement inférieur à son workflow manuel précédent.

Ce parcours révèle le besoin de capacités de création de campagne, gestion d’ADN, sélection et évolution d’avatars, orchestration visible des agents, validations humaines et export final.

### Parcours 2 - Utilisateur principal en mode solo avec campagne de pré-lancement

L’utilisateur ne part pas d’un produit déjà lancé, mais d’une intention de marché ou d’un futur produit à préparer. Il crée une campagne de pré-lancement, définit les premières hypothèses, le positionnement, les promesses, le ton et les contraintes dans l’ADN de campagne.

Il active ensuite le sous-groupe d’agents dédié à la pré-campagne. Ces agents travaillent en arrière-plan pour proposer une storyline produit, un narratif de campagne, des angles créatifs et des premières idées d’ads. L’utilisateur suit leur progression via l’interface, compare les propositions, en rejette certaines, en valide d’autres, puis transforme les meilleures pistes en contenus exploitables.

Il peut aussi définir la durée de cette pré-campagne, ses dates clés, sa date de fin prévue et son statut courant. Si la période de pré-campagne approche de sa fin ou se termine, le système doit le signaler clairement. Si le produit n’est pas encore prêt, l’utilisateur peut prolonger la pré-campagne. Si la pré-campagne arrive à son terme sans prolongation, les agents marketing peuvent basculer automatiquement en mode campagne, tout en ajustant scripts, angles et comportements dans le respect de l’ADN de base.

Le moment de valeur est atteint lorsque l’utilisateur peut préparer le récit marketing et produire des premières ads avant même le lancement du produit, tout en gardant une ligne créative cohérente. Ce parcours révèle le besoin d’un mode pré-lancement, d’agents de narration spécialisés, de gestion d’hypothèses créatives et de validations intermédiaires sur la storyline et le narratif.

### Parcours 3 - Mode collaboratif à 2 avec chef d’orchestre et second

Dans ce mode, une personne joue le rôle de chef d’orchestre: elle cadre la campagne, valide les grandes décisions, arbitre les sorties et garde la responsabilité finale. La seconde personne intervient comme soutien opérationnel sur la préparation des assets, la structuration de l’ADN, la revue intermédiaire, les ajustements de contenu ou la gestion d’avatars.

Le chef d’orchestre lance la campagne et suit l’avancement global, tandis que le second traite certaines tâches assignées ou implicites dans le workflow. Le système doit permettre cette collaboration sans rendre l’équipe de deux obligatoire. Si une seule personne est disponible, elle doit pouvoir faire exactement le même parcours sans blocage.

Le moment de valeur est atteint lorsque le travail peut être partagé naturellement sans confusion sur les responsabilités ni perte de cohérence. Ce parcours révèle le besoin d’une répartition souple des tâches, d’une visibilité claire sur l’état du workflow, d’un historique des validations et d’une logique de responsabilité principale / soutien secondaire.

### Parcours 4 - Gestionnaire opérationnel des avatars, ADN et cohérence

Avant ou après une génération, l’utilisateur revient sur la fiche d’un avatar pour l’enrichir. Au lieu de manipuler un builder visuel complexe avec de nombreux contrôles, il maintient une identité IA lisible: un prompt JSON détaillé du modèle, une `Character Identity Reference Sheet` ou `Multi-Angle Character Reference Sheet`, puis quelques attributs physiques simples comme taille, poids/corpulence et traits distinctifs. Il peut aussi ajouter de nouveaux vêtements, looks, accessoires ou contextes visuels dans sa collection, désactiver certains éléments devenus incohérents, puis ajuster les règles d’évolution du personnage selon le temps, le lieu ou la campagne.

De la même manière, il peut mettre à jour l’ADN d’une campagne après avoir appris quelque chose sur l’angle, le ton ou la promesse produit. Il peut aussi constituer un petit groupe d’avatars affectés à une campagne et attribuer à chacun un rôle précis, par exemple visage principal, mannequin produit, personnage lifestyle ou soutien visuel pour la photographie. Lors d’une future génération, le système doit se référer à ces mises à jour et produire un rendu qui respecte l’historique du personnage, son rôle dans la campagne et le contexte.

Le moment de valeur est atteint lorsque l’utilisateur constate que le système ne répète pas mécaniquement les mêmes rendus, mais fait évoluer les personnages et environnements avec cohérence. Ce parcours révèle le besoin de profils avatars éditables, d’identité IA structurée, de reference sheets, de mémoire d’historique par campagne et de règles de continuité évolutive.

### Parcours 5 - Supervision, erreur et relance de génération

Pendant l’exécution d’un workflow, un fournisseur IA externe échoue, une sortie est incohérente, ou une étape produit un résultat insuffisant. L’utilisateur ne doit pas perdre le fil. Il doit voir immédiatement où le problème s’est produit, quel agent ou quelle étape est concerné, et quelle action est possible: relancer, corriger un input, revenir à une validation précédente ou remplacer un paramètre.

Le système doit conserver l’historique des statuts, éviter la perte de contexte de campagne et permettre une reprise propre plutôt qu’un redémarrage complet. Le moment de valeur est atteint lorsque l’utilisateur garde la maîtrise même en cas d’échec partiel du pipeline.

Ce parcours révèle le besoin d’un suivi d’état détaillé, d’une gestion des erreurs par étape, de relances contrôlées, d’une traçabilité des jobs de génération et d’une reprise sans perte d’information.

### Journey Requirements Summary

Ces parcours révèlent les capacités essentielles suivantes:

- création et gestion de campagnes avec ADN versionnable
- fonctionnement complet en mode solo, avec collaboration optionnelle à 2
- orchestration d’agents IA en arrière-plan, visible via indicateurs d’état et agent actif
- pipeline semi-automatique avec validations humaines sur les points critiques
- mode de pré-lancement avec génération de storyline, narratif et ads en amont
- sous-groupe d’agents visuels spécialisés pour produire des assets de campagne avec un niveau studio
- bibliothèque d’avatars avec profils éditables, garde-robes et règles d’évolution
- continuité visuelle et contextuelle des avatars et environnements dans le temps
- supervision des jobs, gestion des erreurs, relances et reprise propre du workflow

## Domain-Specific Requirements

### Gouvernance de l’ADN de campagne

L’ADN de campagne constitue la source de vérité principale du système. Aucun contenu, narratif, script, variation visuelle, évolution d’avatar ou sortie finale ne doit s’écarter de cet ADN, sauf si celui-ci a été explicitement modifié ou mis à jour par l’utilisateur.

Le système doit donc considérer l’ADN comme un référentiel vivant mais contrôlé. Toute évolution stratégique importante doit passer par une mise à jour explicite de l’ADN afin que les workflows, les agents et les futures générations prennent en compte la nouvelle direction.

Le produit doit inclure un mécanisme permettant de gérer l’évolution de l’ADN dans le temps. Une approche attendue pour le MVP est d’ajouter une logique d’options ou d’onglets dans l’ADN de produit ou de campagne, afin de distinguer clairement:

- l’ADN de référence actuel
- les nouvelles variantes, hypothèses ou modifications stratégiques en préparation

Cela permet à l’équipe de faire évoluer la campagne sans casser la continuité, et donne aux agents un cadre clair pour adapter leur stratégie lorsque de nouvelles valeurs ou orientations sont validées.

### Cohérence créative et continuité

Le système doit préserver une cohérence forte entre l’ADN de campagne, le ton, la promesse marketing, les assets, les avatars, les lieux, les looks et l’historique des contenus déjà produits.

Les avatars ne doivent pas évoluer de manière arbitraire. Leurs changements de vêtements, de style ou d’environnement doivent rester compatibles avec:

- l’ADN de la campagne
- le contexte narratif
- l’historique des vidéos déjà générées
- les règles d’évolution définies dans leur profil

Aucune rupture brutale de cohérence ne doit être autorisée sans validation humaine explicite.

Le profil avatar doit aussi permettre de préciser si son environnement peut évoluer librement dans un périmètre cohérent, ou s’il doit rester verrouillé dans un type d’univers donné. Par exemple, un avatar lifestyle peut évoluer entre plusieurs pièces d’une maison ou d’autres contextes compatibles, tandis qu’un avatar orienté usage professionnel peut être limité à des lieux cohérents comme bureau, salle de réunion ou café de travail.

Pour soutenir cette exigence, le produit doit pouvoir mobiliser un petit sous-groupe d’agents spécialisé dans la continuité avatar. Ce sous-groupe doit comprendre les besoins de la campagne, analyser l’historique visuel, les looks déjà utilisés, les environnements déjà vus et les règles d’évolution autorisées, puis proposer ou appliquer des changements cohérents.

### Versionnage et gestion des artefacts

Le produit doit permettre de versionner ou mettre à jour proprement les éléments structurants du workflow, notamment:

- ADN de campagne
- scripts
- storyline et narratif
- looks et garde-robes d’avatars
- contextes visuels et lieux
- assets de campagne
- sorties intermédiaires et vidéos finales

Le système doit conserver une traçabilité suffisante pour savoir quelle version de l’ADN, quels assets et quelles règles d’avatar ont servi à produire un contenu donné.

Pour limiter la charge de stockage, l’historique détaillé d’une campagne peut être conservé sous forme de fichiers `markdown` indexés, servant de journal structuré et consultable. Ces fichiers doivent pouvoir documenter l’évolution de la campagne, les éléments appliqués aux avatars, le nombre de contenus produits, les décisions importantes et les liens vers les assets ou sorties associés.

Les médias lourds ne doivent pas être dupliqués dans ces journaux sous forme de blobs complets. En revanche, le système peut y rattacher quelques visuels représentatifs, aperçus légers ou références utiles lorsque cela améliore la lecture de l’historique sans dégrader inutilement le stockage.

### Gestion des erreurs fournisseurs et reprise de workflow

Le système doit gérer les erreurs des fournisseurs IA externes sans casser l’ensemble du workflow. Lorsqu’une erreur survient, il doit créer un checkpoint au niveau de l’étape concernée, suspendre l’exécution et conserver l’état complet du contexte.

Si un fournisseur secondaire prédéfini existe pour cette tâche spécifique, le système peut proposer une alternative. Sinon, il doit attendre une correction manuelle ou une décision utilisateur.

L’utilisateur doit pouvoir reprendre explicitement le workflow via une action claire dans l’interface, par exemple un bouton de continuation ou de reprise, afin d’éviter les redémarrages complets et la perte d’informations.

### Garde-fous produit

Le MVP doit imposer des garde-fous stricts pour maintenir la qualité et la cohérence:

- pas de sortie finale sans validation humaine
- pas de changement brutal d’apparence ou de contexte d’un avatar sans justification ou validation
- pas de génération hors ADN de campagne actif
- pas de poursuite silencieuse du workflow après une erreur critique fournisseur
- pas d’écrasement implicite des versions stratégiques de campagne ou d’ADN

### Risques métier et mitigations

Les risques métier principaux sont:

- dérive créative par rapport à l’ADN de campagne
- incohérences visuelles entre les vidéos d’un même avatar
- perte de contexte lors d’un échec fournisseur
- confusion stratégique si l’ADN change sans être clairement versionné
- accumulation d’outputs difficilement réutilisables si la traçabilité est faible

Les mitigations attendues sont:

- ADN traité comme source de vérité versionnée
- validations humaines aux points de rupture potentiels
- checkpoints de reprise à chaque étape critique
- mémoire de continuité pour les avatars et les campagnes
- traçabilité des décisions, versions et sorties

## Innovation & Novel Patterns

### Detected Innovation Areas

L’innovation principale du produit ne repose pas sur un modèle IA inédit, mais sur une nouvelle manière d’orchestrer la création publicitaire assistée par IA. Là où les outils actuels tendent vers une automatisation de bout en bout avec peu de contrôle humain et peu de profondeur stratégique, `Studio UGC IA` introduit une logique de studio marketing structuré, gouverné par un ADN de campagne explicite et durable.

Les zones d’innovation détectées sont les suivantes:

- orchestration d’un workflow publicitaire complet plutôt qu’une simple génération de contenu
- conservation d’un contrôle humain aux étapes critiques au lieu d’une automatisation aveugle
- utilisation d’un ADN de campagne comme source de vérité opérationnelle
- gestion de campagnes de pré-lancement capables de produire storyline, narratif et ads avant la sortie d’un produit
- système de continuité évolutive des avatars, avec mémoire visuelle, garde-robe administrable et évolution contextuelle dans le temps
- hiérarchie fonctionnelle d’agents IA en arrière-plan, visible par état d’avancement, mais pilotée par l’utilisateur

L’innovation du produit vient donc de la combinaison de plusieurs capacités rarement pensées ensemble: gouvernance créative, automatisation assistée, continuité marketing, et production vidéo exploitable.

### Market Context & Competitive Landscape

Le marché actuel des outils de création vidéo IA pour ads semble orienté vers des promesses de génération rapide et automatisée, souvent centrées sur la vitesse de sortie plus que sur la cohérence stratégique de campagne. Ces outils paraissent limités sur plusieurs dimensions essentielles pour un usage studio ou marketing sérieux:

- faible profondeur autour de l’ADN de campagne
- absence de logique de pré-campagne et de construction narrative en amont
- continuité faible ou inexistante des avatars dans le temps
- peu de mécanismes explicites pour faire évoluer looks, lieux et contexte sans casser l’identité
- faible place donnée au contrôle humain structuré dans le workflow

Le produit se positionne donc moins comme un “générateur IA de plus” que comme un système de production marketing cohérent, pensé pour une exploitation réelle et répétée.

### Validation Approach

L’innovation sera considérée comme validée si le produit démontre qu’il peut produire des contenus plus cohérents, plus réutilisables et plus exploitables qu’un workflow fragmenté ou qu’un outil 100 % automatisé.

Les signaux de validation attendus sont:

- amélioration perceptible de la cohérence entre campagne, narratif, avatar et outputs
- réduction du travail humain manuel dispersé entre plusieurs outils
- maintien d’un haut niveau de maîtrise malgré l’automatisation du pipeline
- capacité à préparer des campagnes de pré-lancement de façon structurée
- qualité des réactions observées après publication, notamment dans les commentaires ou retours du public, comme signal indirect de crédibilité et de cohérence

### Risk Mitigation

Le principal risque d’innovation est que certaines capacités avancées rendent le MVP trop lourd ou trop ambitieux au départ. Le plan de mitigation n’est pas d’abandonner la vision, mais d’alléger certaines fonctionnalités secondaires si nécessaire tout en préservant le coeur différenciateur du produit.

Les garde-fous de cette innovation sont:

- préserver le triptyque non négociable `ADN de campagne + contrôle humain + cohérence évolutive`
- simplifier si besoin certaines couches autour des agents ou de l’interface, sans casser la logique produit
- maintenir la priorité sur les usages réellement exploitables en campagne
- éviter qu’une sophistication technique masque la valeur opérationnelle réelle

## SaaS B2B Specific Requirements

### Project-Type Overview

`Studio UGC IA` doit être conçu comme un mini-SaaS web interne orienté production créative et orchestration marketing. Même si le produit est initialement pensé pour un usage personnel ou une petite collaboration, sa structure doit rester suffisamment solide pour supporter plusieurs utilisateurs, plusieurs projets, des responsabilités différenciées et un pilotage centralisé.

Le produit n’est pas conçu comme une plateforme publique multi-clients au MVP. Il doit d’abord fonctionner comme un environnement de travail maîtrisé, avec un workspace global, des projets collaboratifs, et une gouvernance claire des accès, des campagnes, des avatars, des assets et des workflows IA.

### Technical Architecture Considerations

L’architecture doit séparer clairement:

- le workspace global du produit
- les workspaces ou espaces d’action liés aux projets et à leurs collaborateurs
- les campagnes et leur ADN
- les profils avatars et leurs ressources associées
- les jobs de génération et leur état d’avancement
- les intégrations fournisseurs IA externes
- la couche de gestion sécurisée des secrets et de la configuration

Le système doit être conçu pour supporter un fonctionnement synchrone côté pilotage utilisateur et asynchrone côté exécution des workflows. L’utilisateur doit pouvoir lancer une tâche, suivre son état, voir l’agent ou l’étape active, puis intervenir aux checkpoints sans perdre le contexte global.

### Tenant Model

Le MVP repose sur une logique de workspace global plutôt que sur un vrai modèle multi-tenant commercial. Pour un utilisateur seul, ce workspace global est l’espace principal d’orchestration.

En mode collaboratif, plusieurs utilisateurs peuvent contribuer à un même projet, mais la gouvernance reste organisée autour du projet lui-même. Le système doit donc permettre:

- un espace global de pilotage
- des projets distincts avec leurs propres campagnes, assets, ADN et historiques
- une collaboration autour d’un projet partagé sans casser la cohérence du workspace principal

Le multi-tenant SaaS complet, orienté organisation / client / abonnement, est hors scope MVP.

### RBAC Matrix

Le modèle de permissions du MVP doit rester simple mais strict:

- le créateur d’un projet devient automatiquement `admin du projet`
- l’admin du projet peut piloter les campagnes, configurer les ressources du projet, gérer les collaborateurs et valider les sorties critiques
- les collaborateurs peuvent intervenir sur les tâches autorisées dans le projet, selon le cadre défini par l’admin du projet
- certaines actions sensibles doivent rester restreintes et traçables

Les permissions critiques à protéger incluent au minimum:

- modification de l’ADN de campagne
- validation finale de contenus
- gestion des avatars et de leurs règles d’évolution
- gestion des intégrations et paramètres sensibles
- reprise d’un workflow après erreur critique

### Integration List

Le MVP doit intégrer uniquement les fournisseurs et services indispensables au fonctionnement complet du produit. Les intégrations prioritaires sont:

- un ou plusieurs fournisseurs de génération vidéo
- un ou plusieurs fournisseurs de voix
- un ou plusieurs fournisseurs d’image / avatar / rendu visuel
- un système de stockage des assets, sorties intermédiaires et vidéos finales
- une couche d’authentification utilisateur
- une base de données pour les campagnes, ADN, avatars, jobs, états, historiques et permissions
- une gestion sécurisée de la configuration et des secrets

Les intégrations doivent être abstraites derrière une couche modulaire afin de permettre le remplacement d’un fournisseur sans réécriture majeure du système.

### Compliance & Security Requirements

Même sans exigence réglementaire lourde, le MVP doit imposer des standards de sécurité stricts pour protéger le produit et ses ressources:

- les secrets et clés API ne doivent jamais être exposés publiquement
- les clés doivent être stockées dans un mécanisme sécurisé de configuration, non versionné
- les accès utilisateurs doivent être contrôlés selon le rôle projet
- les actions sensibles doivent être protégées et idéalement journalisées
- les workflows ne doivent pas continuer silencieusement après une erreur critique
- l’accès aux ressources critiques du projet doit être limité aux utilisateurs autorisés

La logique `.env` et exclusion via `.gitignore` peut servir de base locale de développement, mais le produit doit être conçu en anticipant une gestion sécurisée des secrets en environnement déployé.

### Implementation Considerations

Le MVP doit privilégier une implémentation simple, robuste et extensible:

- permissions projet avant permissions organisation complexes
- intégrations minimales mais fiables
- visibilité claire sur l’état des workflows
- checkpoints de reprise explicites
- séparation nette entre logique métier, orchestration IA, stockage et sécurité

Les éléments explicitement hors scope à ce stade sont:

- gestion des abonnements
- paliers tarifaires
- facturation
- organisations multi-tenant avancées
- contrôle d’accès ultra-fin par matrice complexe d’entreprise

## Project Scoping

### Strategy & Philosophy

**Approche:** single release structurée autour d’un MVP ambitieux mais cohérent, sans découpage artificiel en phases produit séparées.

La stratégie de cette release est de livrer un système déjà réellement exploitable pour la création et le pilotage de campagnes créatives assistées par IA, avec une orientation vidéo UGC forte complétée par des assets visuels de campagne. La priorité n’est pas de sortir un prototype minimal vide de sens, mais une première version suffisamment solide pour valider le coeur du modèle: ADN de campagne gouvernant le workflow, orchestration d’agents IA en arrière-plan, création de contenus complets, cohérence évolutive des avatars, campagnes de pré-lancement, validations humaines et reprise sur erreur.

Le principe directeur est donc le suivant: conserver toutes les briques explicitement jugées essentielles par le produit, tout en simplifiant leur implémentation initiale si nécessaire. La réduction de scope ne doit pas toucher l’ossature du système, mais uniquement la profondeur ou le raffinement de certaines fonctions.

**Resource Requirements:** le produit doit pouvoir être utilisé en mode solo de bout en bout, tout en supportant une collaboration légère à 2 personnes. La release doit donc être conçue pour un usage principal par un opérateur unique, avec un mode collaboratif simple et non bloquant.

### Complete Feature Set

**Core User Journeys Supported:**

- création et pilotage complet d’une campagne en mode solo
- création d’une campagne de pré-lancement avec storyline, narratif et ads amont
- collaboration simple sur un projet avec admin de projet et collaborateurs
- gestion éditable des avatars, de leur garde-robe et de leur évolution cohérente
- supervision des workflows, erreurs, checkpoints et reprise manuelle

**Must-Have Capabilities:**

- workspace global produit
- projets collaboratifs avec admin de projet
- campagnes séparées avec contexte propre
- ADN de campagne comme source de vérité
- mécanisme d’évolution/version de l’ADN de campagne
- création de contenu guidée par campagne
- sélection du format de contenu selon le besoin marketing
- bibliothèque d’avatars réutilisables
- profils avatars éditables
- collection de vêtements / looks / style par avatar
- règles de continuité et d’évolution visuelle des avatars
- prise en compte de l’historique visuel et contextuel d’un avatar
- pipeline semi-automatique avec validations humaines
- orchestration d’agents IA en arrière-plan
- orchestration d’agents visuels spécialisés selon le type d’asset à produire
- visibilité de l’étape en cours et de l’agent actif dans l’interface
- campagne de pré-lancement
- sous-groupe d’agents pour storyline et narratif
- génération de vidéos UGC complètes et d’assets visuels de campagne
- support français / anglais
- gestion des erreurs fournisseurs avec checkpoint
- bouton de reprise manuelle du workflow
- stockage et traçabilité des assets, sorties et décisions
- protection stricte des secrets et des accès sensibles

**Nice-to-Have Capabilities:**

- enrichissement plus poussé des indicateurs d’avancement
- plus grande finesse dans la coordination multi-agents
- sophistication accrue des règles d’évolution avatar
- variation plus riche des environnements et lieux
- analyses plus avancées sur la qualité des créas
- optimisation plus poussée de la réutilisation des schémas gagnants

### Risk Mitigation Strategy

**Technical Risks:** la combinaison ADN + orchestration IA + continuité avatar + génération vidéo complète représente le principal risque technique. La mitigation consiste à garder toutes les briques, mais à simplifier leur première implémentation, à modulariser les fournisseurs IA, et à imposer des checkpoints explicites entre les étapes critiques.

**Market Risks:** le principal risque marché est que le produit soit perçu comme trop complexe ou que la valeur perçue ne dépasse pas celle d’un assemblage d’outils existants. La mitigation consiste à concentrer l’expérience sur un bénéfice clair: produire des ads plus cohérentes, plus pilotables et plus réutilisables avec moins de friction humaine.

**Resource Risks:** le risque principal est la charge de construction d’une single release riche. La mitigation n’est pas de retirer les éléments coeur demandés par le produit, mais d’en réduire la sophistication initiale, de prioriser le mode solo, et de traiter les raffinements d’ergonomie, de profondeur analytique et de coordination avancée comme secondaires dans cette release.

## Functional Requirements

### Workspace & Project Management

- FR1: un utilisateur peut accéder à un workspace global servant de point d’entrée principal du produit
- FR2: un utilisateur peut créer un projet depuis le workspace global
- FR3: un utilisateur peut consulter la liste des projets existants
- FR4: le créateur d’un projet devient automatiquement administrateur de ce projet
- FR5: l’administrateur d’un projet peut inviter des collaborateurs à rejoindre ce projet
- FR6: l’administrateur d’un projet peut gérer les droits opérationnels des collaborateurs dans le périmètre du projet
- FR7: un utilisateur autorisé peut consulter l’état global d’un projet, y compris ses campagnes, avatars, assets et workflows associés
- FR8: un utilisateur autorisé peut organiser le travail d’un projet sans que la présence de plusieurs collaborateurs soit obligatoire

### Campaign Management & Campaign DNA

- FR9: un utilisateur autorisé peut créer une campagne distincte au sein d’un projet
- FR10: un utilisateur autorisé peut définir et modifier l’ADN d’une campagne
- FR10a: le système peut persister une version machine exécutable de l’ADN d’une campagne en plus de sa représentation humaine lisible
- FR10b: le système peut calculer et afficher un `DNA Health Score` avec champs critiques manquants et niveau de risque
- FR11: un utilisateur autorisé peut rattacher des assets, références et éléments de contexte à une campagne
- FR11a: un utilisateur autorisé peut rattacher à une campagne une bibliothèque de références marketing exploitables pour guider de futures productions
- FR11b: pour chaque type de contenu ou sous-type vidéo pertinent, un utilisateur autorisé peut sélectionner une ou deux références servant de base d’inspiration aux agents de production
- FR11c: pour chaque genre marketing et type de contenu, un utilisateur autorisé peut rattacher des scripts de référence exploitables par les agents IA
- FR11d: le système peut distinguer explicitement références de structure, de rythme, de style visuel, de script et références négatives à éviter
- FR12: le système peut utiliser l’ADN de campagne comme référence active pour la création de contenu
- FR13: le système peut empêcher qu’un workflow actif s’écarte de l’ADN de campagne sans intervention autorisée
- FR14: un utilisateur autorisé peut faire évoluer l’ADN d’une campagne via une logique de version, option ou variante stratégique
- FR15: le système peut conserver l’historique des évolutions de l’ADN de campagne
- FR16: un utilisateur autorisé peut choisir le format de contenu à produire pour une campagne donnée
- FR16a: un utilisateur autorisé peut choisir un sous-type de vidéo parmi `UGC`, `Hyper/Motion`, `Unboxing`, `UGC Virtual Try On`, `TV Spot`, `Tutorial` et `Pro Virtual Try On`
- FR16c: un utilisateur autorisé peut choisir un groupe marketing parmi `Product`, `App` et `Shooting/Photo`
- FR16d: le système peut limiter les types de contenus proposés selon le groupe marketing sélectionné
- FR16b: un utilisateur autorisé peut définir des paramètres de cycle de vie pour une campagne, notamment sa période active, son statut et sa fin prévue

### Content Creation & Pre-Launch Campaigns

- FR17: un utilisateur autorisé peut lancer un workflow de création de contenu à partir d’une campagne existante
- FR17a: dans le `Marketing Studio`, un utilisateur autorisé peut configurer une carte `Avatar/Model` et une carte `Produit` avant lancement
- FR17b: la carte `Produit` peut accepter un nombre défini d’images pour le ou les produits de campagne
- FR17c: avant lancement, le système peut exécuter un `Production Readiness Check` couvrant ADN, références, produit, avatar, DA et contraintes plateforme
- FR18: le système peut générer du contenu en tenant compte du contexte campagne, de la langue, de l’angle marketing et des ressources associées
- FR18a: le système peut intégrer une direction artistique explicite de production, notamment pour les shootings photo, posters, illustrations et autres assets visuels, tout en restant aligné avec l’ADN de campagne
- FR18b: le système peut adapter l’orchestration des agents, prompts et étapes de production selon la famille de contenu et le sous-type demandé
- FR18c: pour une vidéo UGC, le système peut exploiter des références UGC sélectionnées pour guider la structure narrative, le ton conversationnel et le rythme de montage
- FR18d: pour chaque sous-type vidéo, le système peut transmettre une ou deux références distinctes à l’agent scénariste pour la structure et à l’agent monteur pour le rythme
- FR18e: le système peut générer automatiquement un script initial dans le `Marketing Studio` à partir de l’ADN, du groupe marketing, du type de contenu, des références et des assets fournis
- FR18f: un utilisateur autorisé peut modifier ou régénérer ce script avant le lancement du workflow
- FR18g: le système peut générer un script ou storyboard enrichi avec `Camera / Motion` et `Intention marketing` lorsque le type de production l’exige
- FR19: le système peut produire une vidéo UGC complète et exploitable comme sortie finale d’un workflow
- FR19a: pour une vidéo UGC, le système peut produire un script structuré avec au minimum `Temps (sec)`, `Audio`, `Visuel` et `Texte à l’écran`
- FR19b: le système peut imposer, pour un profil d’agent UGC donné, des règles explicites de ton brut, vocabulaire interdit, phrases courtes et interruptions de motif toutes les `2.5` secondes maximum
- FR20: un utilisateur autorisé peut produire plusieurs variantes créatives à partir d’une même campagne
- FR21: le système peut produire des assets visuels de campagne exploitables, notamment illustrations, affiches, posters, visuels produit et shootings photo d’avatar avec produit
- FR21a: le système peut orchestrer pour les assets visuels un ensemble spécialisé d’agents couvrant au minimum la direction artistique/prompt engineering, la post-production/upscaling, le SEO visuel/asset management, la mise en situation e-commerce et la supervision qualité
- FR21b: le système peut orchestrer pour les vidéos un ensemble spécialisé d’agents couvrant au minimum l’écriture du hook et du script, le casting/avatar, le montage rythmique et l’analyse de rétention
- FR21c: le système peut permettre de faire évoluer les profils système, instructions techniques et règles métier des agents UGC sans casser la structure globale du workflow
- FR22: un utilisateur autorisé peut créer une campagne de pré-lancement
- FR22a: un utilisateur autorisé peut définir la durée, les dates clés et le statut d’une campagne de pré-lancement
- FR23: le système peut assister la création d’une storyline de produit ou de campagne en mode pré-lancement
- FR24: le système peut assister la création d’un narratif de campagne en mode pré-lancement
- FR25: le système peut transformer un narratif ou une storyline validée en ads exploitables dans le cadre d’une campagne de pré-lancement
- FR26: un utilisateur autorisé peut valider, rejeter ou ajuster les propositions narratives produites dans le cadre d’une pré-campagne
- FR26a: un utilisateur autorisé peut prolonger explicitement une campagne de pré-lancement avant son terme prévu
- FR26b: le système peut signaler qu’une pré-campagne arrive à son terme ou l’a atteint
- FR26c: lorsque la période d’une pré-campagne prend fin, le système peut faire basculer automatiquement les agents marketing vers un mode campagne tout en conservant la cohérence avec l’ADN de base

### Avatar & Continuity Management

- FR27: un utilisateur autorisé peut créer un avatar réutilisable
- FR28: un utilisateur autorisé peut éditer le profil d’un avatar
- FR28a: un utilisateur autorisé peut définir l’identité IA d’un avatar via un prompt JSON détaillé, une reference sheet et quelques attributs physiques simples
- FR28b: le système doit éviter au MVP un builder avatar paramétrique lourd; les traits structurants doivent rester capturés sous forme de JSON, référence visuelle et métadonnées physiques essentielles
- FR29: un utilisateur autorisé peut assigner un avatar à une ou plusieurs campagnes
- FR29a: un utilisateur autorisé peut constituer un groupe d’avatars assigné à une campagne
- FR29b: un utilisateur autorisé peut attribuer un rôle de campagne à un avatar, notamment pour les usages photographiques et visuels
- FR30: un utilisateur autorisé peut gérer une collection de vêtements, looks, styles et éléments visuels associés à un avatar
- FR31: un utilisateur autorisé peut mettre à jour la collection visuelle d’un avatar dans le temps
- FR32: le système peut utiliser l’historique d’un avatar pour maintenir une continuité visuelle entre plusieurs contenus
- FR33: le système peut faire évoluer l’apparence d’un avatar selon des règles définies par le contexte, le temps, le lieu ou la campagne
- FR33a: le système peut orchestrer un sous-groupe d’agents spécialisé dans l’analyse et l’évolution cohérente de l’apparence d’un avatar à partir du contexte actif et de son historique
- FR34: le système peut faire varier l’environnement ou le lieu d’un avatar tout en conservant une cohérence avec l’historique et le contexte actif
- FR34a: le système peut faire analyser par des agents dédiés l’évolution du look et de l’environnement d’un avatar avant d’appliquer une variation significative
- FR34b: un utilisateur autorisé peut définir pour un avatar si son environnement doit évoluer dans un périmètre cohérent ou rester verrouillé dans une catégorie de lieux donnée
- FR35: le système peut empêcher une rupture brutale de cohérence visuelle d’un avatar sans validation autorisée

### Workflow Orchestration & Human Validation

- FR36: un utilisateur autorisé peut lancer un workflow semi-automatique de création
- FR37: le système peut orchestrer plusieurs agents IA en arrière-plan pour exécuter différentes étapes d’un workflow
- FR37a: le système peut distribuer à chaque agent un `DNA Slice` adapté à son rôle plutôt qu’un ADN brut complet
- FR38: le système peut indiquer à l’utilisateur l’étape en cours d’un workflow
- FR39: le système peut indiquer quel agent ou quelle fonction active traite actuellement le workflow
- FR40: un utilisateur autorisé peut intervenir aux étapes critiques d’un workflow pour valider, corriger ou poursuivre le processus
- FR41: le système peut imposer une validation humaine avant les décisions ou sorties jugées critiques
- FR42: le système peut conserver la traçabilité des validations réalisées dans un workflow
- FR43: un utilisateur autorisé peut relancer une étape d’un workflow après correction ou validation complémentaire
- FR44: un utilisateur autorisé peut ajouter un commentaire de validation ou de rejet à une étape du workflow
- FR45: un utilisateur autorisé peut prévisualiser et comparer plusieurs sorties avant validation finale
- FR45a: un utilisateur autorisé peut comparer plusieurs variantes de direction artistique ou de traitement visuel pour un même shooting, poster, illustration ou autre asset image

### Assets, History & Traceability

- FR46: un utilisateur autorisé peut gérer les assets associés à un projet, une campagne ou un avatar
- FR47: le système peut conserver l’historique des contenus, sorties intermédiaires et sorties finales produits pour une campagne, quel que soit leur format
- FR47a: le système peut maintenir pour une campagne un historique indexé en fichiers `markdown` structurés décrivant événements, contenus, décisions et contexte de production
- FR47b: le journal de campagne peut enregistrer ADN utilisé, références utilisées, versions d’agents, prompts/scripts validés, scores qualité et learnings réutilisables
- FR48: le système peut associer chaque contenu généré à la campagne, à l’ADN, à l’avatar et au contexte utilisés lors de sa production
- FR49: le système peut permettre la réutilisation de schémas, campagnes, contextes ou éléments performants dans de nouveaux workflows
- FR50: un utilisateur autorisé peut consulter les éléments ayant servi à produire une sortie donnée
- FR50a: un utilisateur autorisé peut consulter un journal de campagne indexé résumant l’historique, les avatars impliqués, les contenus générés et quelques visuels représentatifs liés à la campagne
- FR51: un utilisateur autorisé peut attribuer un statut de cycle de vie à une campagne ou à un contenu
- FR51a: un utilisateur autorisé peut consulter l’état temporel d’une campagne ou d’une pré-campagne, y compris progression, fin prévue et prolongation éventuelle
- FR52: un utilisateur autorisé peut enregistrer une campagne performante comme template réutilisable
- FR53: un utilisateur autorisé peut restaurer une version précédente de l’ADN de campagne ou d’un profil avatar

### Error Handling, Security & Governance

- FR54: le système peut détecter une erreur critique provenant d’un fournisseur ou d’une étape du workflow
- FR55: le système peut créer un checkpoint exploitable lorsqu’un workflow est interrompu par une erreur
- FR56: le système peut suspendre un workflow en erreur sans perte du contexte déjà établi
- FR57: un utilisateur autorisé peut reprendre explicitement un workflow interrompu depuis un checkpoint
- FR58: le système peut utiliser un fournisseur alternatif prédéfini lorsqu’une tâche autorisée le permet
- FR59: le système peut limiter l’accès aux fonctions sensibles selon le rôle détenu dans le projet
- FR59a: le système peut supporter des rôles projet explicites au minimum `project_admin`, `campaign_manager`, `creative_reviewer`, `operator` et `viewer`
- FR60: le système peut protéger les secrets et paramètres sensibles contre toute exposition publique
- FR61: le système peut empêcher la poursuite silencieuse d’un workflow après une erreur critique ou une incohérence majeure
- FR62: un utilisateur autorisé peut assigner la responsabilité d’une campagne ou d’une tâche à un collaborateur
- FR63: un utilisateur autorisé peut définir un fournisseur préféré ou alternatif pour une tâche donnée
- FR64: un utilisateur autorisé peut consulter une bibliothèque de stratégies marketing éditables en fichiers `markdown`
- FR65: un utilisateur autorisé peut sélectionner une stratégie marketing avant le lancement d’une campagne
- FR66: le système peut produire une overview claire et exploitable d’une stratégie marketing en tenant compte de l’ADN actif de campagne
- FR67: un utilisateur autorisé peut appliquer une stratégie marketing à une campagne sans modifier silencieusement l’ADN actif
- FR68: un utilisateur autorisé peut ajouter des captures ou signaux de performance post-lancement à une campagne active ou terminée
- FR69: le système peut générer une synthèse d’optimisation/scaling strategy à partir des performances importées et du contexte de campagne
- FR70: le journal de campagne peut tracer les stratégies sélectionnées, les overviews générées, les applications validées et les décisions d’optimisation post-lancement
- FR71: un utilisateur autorisé peut ajouter, modifier et supprimer les éléments éditables du produit, notamment cartes de stratégies, stratégies marketing/scaling, snapshots de performance, templates et autres objets de bibliothèque, avec permissions, confirmation des suppressions sensibles et traçabilité lorsqu’un élément influence une campagne
- FR72: le système peut distinguer les objets métier durables des médias générés temporaires afin de limiter les coûts de stockage Supabase
- FR73: les médias générés lourds, notamment vidéos, images, illustrations, posters, voix et sound effects, peuvent être supprimés automatiquement de Supabase Storage après `3 jours` de rétention par défaut, sans perte de métadonnées métier, journal ou traçabilité
- FR74: le système peut router les tâches IA selon une politique fournisseur explicite: `Anthropic/Claude` pour l’orchestration et le cerveau des agents, `OpenAI` pour les scripts, `Gemini Nano Banana` par défaut pour les visuels, `OpenAI` comme option visuelle selon complexité, `Kling AI` et `Seedance` pour la vidéo, `ElevenLabs` pour les voix et sound effects
- FR75: le système peut suivre l’usage IA par utilisateur, provider, projet, campagne/job, période hebdomadaire et période mensuelle avant ou après chaque appel provider
- FR76: le système peut appliquer une limite hebdomadaire d’usage par utilisateur, exprimée en tokens estimés lorsque le provider facture aux tokens et en coût estimé lorsque le provider facture autrement
- FR77: le système peut appliquer un plafond de dépense IA mensuel global de `50 USD` pour le MVP et bloquer ou demander validation admin avant tout dépassement
- FR78: un utilisateur autorisé peut consulter l’état du budget IA, notamment consommation mensuelle, consommation hebdomadaire par utilisateur, budget restant et workflows bloqués pour raison de quota
- FR79: le système peut définir des contrats d’agents IA versionnés, incluant rôle, responsabilités, entrées attendues, sorties attendues, skills autorisés, providers utilisables, règles métier et garde-fous
- FR80: chaque appel agent ou provider peut être rattaché au contrat d’agent et aux skills utilisés afin de comprendre quelle capacité a consommé le budget IA et produit une sortie
- FR81: avant une génération média, un utilisateur autorisé peut définir les paramètres de sortie attendus, notamment format, résolution, ratio, durée cible lorsque pertinent, plateforme cible et contraintes de livraison
- FR82: après génération, un utilisateur autorisé peut demander une dérivation ou adaptation d’un média existant, par exemple passer une vidéo de `9:16` à `16:9`, changer la résolution ou préparer une variante plateforme, sans perdre le lien avec l’asset source
- FR83: pour les vidéos UGC, l’utilisateur peut indiquer le lieu ou environnement de scène souhaité, et le système peut proposer ou décider un lieu cohérent à partir de l’ADN, de la stratégie, de l’avatar, du produit et des références, avec trace de la décision

## Non-Functional Requirements

### Performance

- NFR1: le système doit permettre à un utilisateur de naviguer entre workspace, projets, campagnes et profils avatars avec une latence perçue compatible avec un usage fluide en session de travail
- NFR2: les actions utilisateur de consultation, édition et validation sur les objets principaux du produit doivent répondre dans un délai cohérent avec un usage quotidien non bloquant
- NFR3: le système doit distinguer clairement les actions interactives immédiates et les traitements asynchrones longs liés à la génération de contenu
- NFR4: l’état d’un workflow de génération doit être actualisable sans obliger l’utilisateur à perdre son contexte de travail
- NFR5: le produit doit permettre de lancer et suivre plusieurs jobs de génération sans dégrader fortement l’expérience de pilotage du projet

### Security

- NFR6: les secrets, clés API et paramètres sensibles ne doivent jamais être exposés dans l’interface publique, le code versionné ou les sorties utilisateur
- NFR7: les accès aux projets, campagnes, avatars, assets et fonctions sensibles doivent être contrôlés selon les rôles autorisés
- NFR8: toute action critique liée à l’ADN de campagne, aux validations finales, aux intégrations sensibles ou à la reprise de workflow doit être restreinte aux utilisateurs autorisés
- NFR9: les données sensibles doivent être protégées en transit et au repos selon un niveau de sécurité adapté à un produit SaaS privé
- NFR10: le système doit limiter le risque de fuite ou d’usage non autorisé des intégrations tierces et de leurs identifiants

### Reliability

- NFR11: le système doit être capable de suspendre proprement un workflow lorsqu’une erreur critique se produit
- NFR12: aucun workflow ne doit perdre son contexte essentiel après une erreur fournisseur ou une interruption contrôlée
- NFR13: le système doit permettre une reprise explicite depuis un checkpoint sans redémarrage complet du travail déjà validé
- NFR14: les statuts de workflow, validations, erreurs et relances doivent rester cohérents et consultables pendant tout le cycle de vie d’une campagne
- NFR15: le produit doit réduire les points de défaillance silencieuse et signaler clairement les blocages importants à l’utilisateur

### Integration

- NFR16: le système doit pouvoir intégrer plusieurs fournisseurs externes sans coupler le produit à un seul prestataire
- NFR17: les défaillances d’un fournisseur doivent être isolées autant que possible pour éviter qu’elles compromettent l’ensemble du système
- NFR18: le produit doit pouvoir associer chaque sortie générée au fournisseur, au contexte et aux paramètres utilisés
- NFR19: les intégrations critiques doivent être configurables de manière sécurisée et administrable
- NFR20: le système doit permettre le remplacement ou l’ajout d’un fournisseur avec un impact limité sur les autres capacités métier
- NFR20a: la sélection d’un provider visuel doit être déterministe et explicable à partir de la complexité de la tâche, du prompt, du type de sortie attendu et des fallbacks autorisés, avec `Gemini Nano Banana` comme modèle visuel de base
- NFR20b: aucun appel provider coûteux ne doit contourner la couche de budget/usage; les estimations de coût doivent rester côté serveur/background et ne jamais dépendre uniquement de l’UI
- NFR20c: lorsqu’un quota hebdomadaire utilisateur ou le plafond mensuel `50 USD` est atteint, le système doit bloquer la dépense supplémentaire avant exécution et produire un message clair, sans erreur silencieuse
- NFR20d: les estimations de coût provider doivent inclure la capacité demandée, le contrat d’agent, les skills utilisés et les paramètres média influençant le prix, notamment ratio, résolution, durée, nombre de variantes et type de transformation
- NFR20e: les décisions automatiques d’un agent, notamment choix de lieu/scène UGC ou sélection de provider visuel, doivent rester explicables et journalisables

### Scalability

- NFR21: l’architecture doit pouvoir évoluer d’un usage solo vers un usage collaboratif léger sans refonte structurelle
- NFR22: le système doit pouvoir supporter une croissance progressive du nombre de projets, campagnes, avatars, assets et jobs de génération
- NFR23: le produit doit séparer suffisamment les responsabilités métier, stockage, orchestration et intégration pour permettre une montée en charge future
- NFR24: l’ajout futur de nouvelles langues, nouveaux fournisseurs ou nouvelles catégories de campagnes ne doit pas remettre en cause l’architecture coeur
- NFR24a: l’usage de Supabase Storage doit éviter la conservation indéfinie des médias lourds générés; la rétention par défaut des médias opérationnels est limitée à `3 jours`, sauf promotion explicite en objet durable
- NFR24b: les adaptations média post-génération doivent préserver la trace de l’asset source, des paramètres de sortie, du coût estimé, du provider utilisé et de la règle de rétention applicable

### Accessibility

- NFR25: l’interface doit rester exploitable et compréhensible pour des utilisateurs travaillant longtemps sur des workflows complexes
- NFR26: les informations critiques de statut, d’erreur, de validation et d’avancement doivent être présentées de manière claire et non ambiguë
- NFR27: les éléments de pilotage essentiels du produit doivent rester utilisables sur des tailles d’écran de travail standard sans perte de lisibilité majeure
