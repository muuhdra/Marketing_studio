import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'pre_campaign',
  'active',
  'post_campaign',
  'archived',
])

export const campaignTypeEnum = pgEnum('campaign_type', [
  'generale',
  'speciale',
])

export const productCategoryEnum = pgEnum('product_category', [
  'produit',
  'app',
])

export const contentTypeEnum = pgEnum('content_type_kind', [
  'ugc',
  'commercial',
  'shooting',
  'visuel',
])

export const avatarStatusEnum = pgEnum('avatar_status', [
  'draft',
  'active',
  'archived',
])

export const continuityModeEnum = pgEnum('continuity_mode', [
  'evolutif',
  'verrouille',
])

export const assignmentRoleEnum = pgEnum('assignment_role', [
  'primary',
  'secondary',
])

export const cloneStatusEnum = pgEnum('clone_status', [
  'pending',
  'processing',
  'ready',
  'failed',
])

export const jobStatusEnum = pgEnum('job_status', [
  'queued',
  'processing',
  'done',
  'failed',
  'expired',
])

export const outfitStyleEnum = pgEnum('outfit_style', [
  'casual',
  'smart',
  'sport',
  'formal',
  'streetwear',
  'custom',
])

// ─────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  name: text('name').notNull(),
  status: campaignStatusEnum('status').notNull().default('draft'),
  campaign_type: campaignTypeEnum('campaign_type').notNull().default('generale'),

  start_date: date('start_date'),
  end_date: date('end_date'),
  frequency: text('frequency'), // weekly, biweekly, monthly
  monthly_content_target: integer('monthly_content_target'), // objectif de contenus à générer par mois

  pre_campaign_enabled: boolean('pre_campaign_enabled').notNull().default(false),
  pre_campaign_start: date('pre_campaign_start'),
  pre_campaign_end: date('pre_campaign_end'),
  pre_campaign_dna: text('pre_campaign_dna'),   // DA/direction de la pré-campagne

  post_campaign_enabled: boolean('post_campaign_enabled').notNull().default(false),
  post_campaign_end: date('post_campaign_end'),
  post_campaign_delay_weeks: integer('post_campaign_delay_weeks'), // 2 | 3 | 4 | 6 semaines après la fin
  post_campaign_results: jsonb('post_campaign_results'),           // données de bilan (saisies plus tard)

  dna_version: integer('dna_version').notNull().default(0),

  assets_url: text('assets_url'),              // URL externe assets visuels (Notion, Drive, Dropbox…)

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('campaigns_user_id_idx').on(t.user_id),
  index('campaigns_status_idx').on(t.status),
])

// ─────────────────────────────────────────────
// CAMPAIGN DNA
// ─────────────────────────────────────────────

export const campaign_dna = pgTable('campaign_dna', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),

  raw_content: text('raw_content'),            // Contenu brut du doc ADN
  structured_data: jsonb('structured_data'),   // ADN parsé et structuré
  health_score: integer('health_score'),       // 0-100 DNA Health Score

  file_url: text('file_url'),                  // Supabase Storage /assets/campaigns/{id}/dna/

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('campaign_dna_campaign_id_idx').on(t.campaign_id),
])

// ─────────────────────────────────────────────
// CAMPAIGN CONTENT TYPES
// Types de contenus sélectionnés pour une campagne (étape 2)
// ─────────────────────────────────────────────

export const campaign_content_types = pgTable('campaign_content_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  content_type: contentTypeEnum('content_type').notNull(),
  product_category: productCategoryEnum('product_category').notNull(),
  quantity: integer('quantity').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cct_campaign_id_idx').on(t.campaign_id),
])

// ─────────────────────────────────────────────
// AVATARS — Colonne vertébrale
// ─────────────────────────────────────────────

export const avatars = pgTable('avatars', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  age: integer('age'),
  ethnicity: text('ethnicity'),
  style_tags: text('style_tags').array(),

  // Fichiers sources — Storage /assets/avatars/{id}/
  source_photo_url: text('source_photo_url'),
  reference_sheet_url: text('reference_sheet_url'),   // planche de référence personnage (multi-poses)
  source_video_url: text('source_video_url'),

  // Choix morphologiques du moteur de création (genre, peau, cheveux, yeux, physique…)
  // → réhydratés à l'édition, et réutilisés pour orienter la voix et les régénérations
  morphology: jsonb('morphology').$type<Record<string, string>>(),

  // Voix — persistante, cohérence cross-campagnes
  // ── Voix de synthèse (catalogue MiniMax/ElevenLabs via AIML) ──
  voice_engine: text('voice_engine'),                 // 'minimax' | 'elevenlabs'
  voice_id: text('voice_id'),                         // voix de base du catalogue (ex. 'Wise_Woman')
  voice_mode: text('voice_mode'),                     // 'description' | 'manual' | 'clone'
  voice_description: text('voice_description'),        // texte libre saisi pour la personnalisation
  voice_settings: jsonb('voice_settings').$type<{ emotion?: string; speed?: number; pitch?: number }>(), // { emotion, speed, pitch }
  voice_label: text('voice_label'),                   // libellé d'affichage
  // ── Clonage ElevenLabs (Campagne Spéciale — API dédiée à venir) ──
  voice_sample_url: text('voice_sample_url'),         // Extrait audio 30s min → Storage
  voice_provider_id: text('voice_provider_id'),       // ID voix clonée (ElevenLabs)
  voice_provider: text('voice_provider').default('elevenlabs'),

  // Comportement dans les campagnes
  continuity_mode: continuityModeEnum('continuity_mode').notNull().default('evolutif'),
  status: avatarStatusEnum('status').notNull().default('draft'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('avatars_user_id_idx').on(t.user_id),
  index('avatars_status_idx').on(t.status),
])

// ─────────────────────────────────────────────
// AVATAR OUTFITS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// PRODUITS — bibliothèque de marque
// ─────────────────────────────────────────────

// ── Marques (multi-marques) ──
export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').default('#ea580c'),
  logo_url: text('logo_url'),
  category: text('category'),
  profile: jsonb('profile').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('brands_user_id_idx').on(t.user_id),
])

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  name: text('name').notNull(),
  description: text('description'),
  currency: text('currency').default('USD'),
  price: decimal('price', { precision: 12, scale: 2 }),
  benefits: text('benefits').array(),
  image_url: text('image_url'),                  // chemin dans le bucket assets
  additional_images: text('additional_images').array(),
  source_url: text('source_url'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('products_user_id_idx').on(t.user_id),
])

// ── Brand Assets (bibliothèque média de la marque) ──
export const brand_folders = pgTable('brand_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  name: text('name').notNull(),
  color: text('color'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('brand_folders_user_id_idx').on(t.user_id),
])

export const brand_assets = pgTable('brand_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  folder_id: uuid('folder_id'),
  type: text('type').notNull(),            // 'image' | 'video' | 'audio'
  name: text('name').notNull(),
  path: text('path').notNull(),            // chemin dans le bucket assets
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('brand_assets_user_id_idx').on(t.user_id),
])

// Templates publicitaires de la marque (réutilisés à la création de pubs statiques)
export const brand_templates = pgTable('brand_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  name: text('name').notNull(),
  prompt: text('prompt'),                  // prompt si généré par IA
  path: text('path').notNull(),            // chemin image dans le bucket assets
  active: boolean('active').notNull().default(false), // template « actif » (sélectionné par l'utilisateur)
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('brand_templates_user_id_idx').on(t.user_id),
])

export const shooting_models = pgTable('shooting_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  shot_type: text('shot_type').notNull(),               // UPPER BODY | LOWER BODY | FULL BODY
  background_color: text('background_color').notNull(),  // BEIGE | LIGHT GREY | OFF WHITE | CREAM | ...
  nationality: text('nationality'),                      // nationalité du mannequin (diversité)
  prompt: text('prompt'),                                // prompt de génération
  path: text('path').notNull(),                          // chemin image dans le bucket assets
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shooting_models_user_id_idx').on(t.user_id),
])

export const product_models = pgTable('product_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  kind: text('kind').notNull(),              // actor | hand
  category: text('category'),                // verticale (acteurs) ; null pour les mains
  nationality: text('nationality'),          // nationalité de l'acteur (diversité)
  prompt: text('prompt'),
  path: text('path').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('product_models_user_id_idx').on(t.user_id),
])

export const avatar_outfits = pgTable('avatar_outfits', {
  id: uuid('id').primaryKey().defaultRandom(),
  avatar_id: uuid('avatar_id').notNull().references(() => avatars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  style_type: outfitStyleEnum('style_type').notNull().default('casual'),
  reference_photo_url: text('reference_photo_url'), // Storage /assets/avatars/{id}/outfits/
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('outfits_avatar_id_idx').on(t.avatar_id),
])

// ─────────────────────────────────────────────
// AVATAR ENVIRONMENTS
// ─────────────────────────────────────────────

export const avatar_environments = pgTable('avatar_environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  avatar_id: uuid('avatar_id').notNull().references(() => avatars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  location_type: text('location_type'),
  reference_photo_url: text('reference_photo_url'), // Storage /assets/avatars/{id}/environments/
  description: text('description'),
  prompt_override: text('prompt_override'), // Prompt IA custom pour ce décor
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('environments_avatar_id_idx').on(t.avatar_id),
])

// ─────────────────────────────────────────────
// AVATAR ASSIGNMENT PRESETS
// Configurations nommées et réutilisables entre campagnes
// ─────────────────────────────────────────────

export const avatar_assignment_presets = pgTable('avatar_assignment_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  avatar_id: uuid('avatar_id').notNull().references(() => avatars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // ex: "Karim · UGC · Casual · Boutique"

  outfit_id: uuid('outfit_id').references(() => avatar_outfits.id, { onDelete: 'set null' }),
  environment_id: uuid('environment_id').references(() => avatar_environments.id, { onDelete: 'set null' }),
  default_role: assignmentRoleEnum('default_role').notNull().default('primary'),
  default_content_types: text('default_content_types').array(), // ['ugc', 'commercial']

  times_used: integer('times_used').notNull().default(0),
  last_campaign_id: uuid('last_campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('presets_avatar_id_idx').on(t.avatar_id),
  index('presets_user_id_idx').on(t.user_id),
])

// ─────────────────────────────────────────────
// CAMPAIGN AVATAR ASSIGNMENTS
// Historique immuable — snapshot au moment de l'assignation
// ─────────────────────────────────────────────

export const campaign_avatar_assignments = pgTable('campaign_avatar_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  avatar_id: uuid('avatar_id').notNull().references(() => avatars.id, { onDelete: 'cascade' }),
  content_type_id: uuid('content_type_id').references(() => campaign_content_types.id, { onDelete: 'set null' }),

  role: assignmentRoleEnum('role').notNull().default('primary'),
  outfit_id: uuid('outfit_id').references(() => avatar_outfits.id, { onDelete: 'set null' }),
  environment_id: uuid('environment_id').references(() => avatar_environments.id, { onDelete: 'set null' }),

  // Snapshot immuable de l'état exact au moment de l'assignation
  // Garantit la cohérence historique même si l'avatar est modifié après
  config_snapshot: jsonb('config_snapshot'), // { avatar, outfit, environment, voice }

  // Si cette assignation est basée sur un preset sauvegardé
  preset_id: uuid('preset_id').references(() => avatar_assignment_presets.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('assignments_campaign_id_idx').on(t.campaign_id),
  index('assignments_avatar_id_idx').on(t.avatar_id),
])

// ─────────────────────────────────────────────
// STRATEGIES
// ─────────────────────────────────────────────

export const strategies = pgTable('strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  phases: jsonb('phases'), // [{ phase: 'pre', actions: [...] }]
  campaign_type: campaignTypeEnum('campaign_type'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const campaign_strategies = pgTable('campaign_strategies', {
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  strategy_id: uuid('strategy_id').notNull().references(() => strategies.id, { onDelete: 'cascade' }),
  applied_at: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// CLONE MODELS — Pont vers la Partie 2 (Campagne Spéciale)
// ─────────────────────────────────────────────

export const clone_models = pgTable('clone_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  avatar_id: uuid('avatar_id').notNull().references(() => avatars.id, { onDelete: 'cascade' }),
  source_type: text('source_type').notNull(), // 'video' | 'photo'
  source_url: text('source_url').notNull(),   // Storage /assets/avatars/{id}/clone_source/

  // Voix du clone — séparée car peut différer de l'avatar principal
  voice_sample_url: text('voice_sample_url'), // Storage persistent
  voice_provider_id: text('voice_provider_id'),

  clone_status: cloneStatusEnum('clone_status').notNull().default('pending'),
  provider: text('provider'),                // Connecté via MCP (Partie 2)

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('clone_models_avatar_id_idx').on(t.avatar_id),
])

// ─────────────────────────────────────────────
// CONTENT JOBS — Éphémères (outputs 24h TTL)
// On stocke les métadonnées indéfiniment, pas les fichiers
// ─────────────────────────────────────────────

export const content_jobs = pgTable('content_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  avatar_assignment_id: uuid('avatar_assignment_id').references(() => campaign_avatar_assignments.id, { onDelete: 'set null' }),

  content_type: contentTypeEnum('content_type').notNull(),
  status: jobStatusEnum('status').notNull().default('queued'),

  provider: text('provider').notNull(),        // kling | seedance | elevenlabs | openai | gemini
  provider_job_id: text('provider_job_id'),    // ID externe du provider
  trigger_job_id: text('trigger_job_id'),      // Trigger.dev job ID

  prompt_used: text('prompt_used'),
  format: text('format'),                      // 9:16 | 16:9 | 1:1 | 4:5
  duration_seconds: integer('duration_seconds'),
  quality: text('quality'),                    // draft | standard | premium

  // Output éphémère — fichier supprimé après 24h, URL conservée pour historique
  output_url: text('output_url'),
  output_expires_at: timestamp('output_expires_at', { withTimezone: true }),

  cost_usd: decimal('cost_usd', { precision: 10, scale: 4 }),
  error_message: text('error_message'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('jobs_campaign_id_idx').on(t.campaign_id),
  index('jobs_status_idx').on(t.status),
  index('jobs_expires_at_idx').on(t.output_expires_at),
])

// ─────────────────────────────────────────────
// GENERATED OUTPUTS — Contenus générés (image/vidéo/voix)
// Stockés dans le bucket `outputs` + métadonnées ici.
// Supprimés définitivement après 48h (purge pg_cron sur expires_at).
// ─────────────────────────────────────────────

export const generated_outputs = pgTable('generated_outputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  brand_id: uuid('brand_id'),
  campaign_id: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),

  type: text('type').notNull(),          // image | video | audio
  engine: text('engine'),                // kling-v2.1-pro | nano-banana | minimax | ...
  title: text('title'),
  prompt: text('prompt'),
  format: text('format'),                // 9:16 | 16:9 | 1:1 | ...
  duration_seconds: integer('duration_seconds'),  // vidéos : coût au prorata (facturation/s)
  avatar_name: text('avatar_name'),      // avatar/persona associé (badge galerie)

  storage_path: text('storage_path').notNull(),  // chemin dans le bucket OUTPUTS

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  // Fichier purgé après 48h, mais la ligne (métadonnée) est conservée pour les stats.
  purged_at:  timestamp('purged_at', { withTimezone: true }),
}, (t) => [
  index('outputs_user_id_idx').on(t.user_id),
  index('outputs_expires_at_idx').on(t.expires_at),
])

export type GeneratedOutput = typeof generated_outputs.$inferSelect

// ─────────────────────────────────────────────
// CONTENT TEMPLATES — Bibliothèque de templates (vidéos/images + prompt source)
// Globaux (pas per-user) · fichiers dans le bucket public `templates`.
// ─────────────────────────────────────────────

export const content_templates = pgTable('content_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),          // video | image
  category: text('category').notNull(),  // ugc | commercial | shooting | visuel | autre
  label: text('label').notNull(),
  description: text('description'),
  prompt: text('prompt'),                // prompt ayant servi à générer le contenu
  storage_path: text('storage_path').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('templates_category_idx').on(t.category),
  index('templates_sort_idx').on(t.sort_order),
])

export type ContentTemplate = typeof content_templates.$inferSelect

// ─────────────────────────────────────────────
// BUDGET USAGE — Tracking financier
// ─────────────────────────────────────────────

export const budget_usage = pgTable('budget_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  campaign_id: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  content_job_id: uuid('content_job_id').references(() => content_jobs.id, { onDelete: 'set null' }),

  provider: text('provider').notNull(),
  amount_usd: decimal('amount_usd', { precision: 10, scale: 4 }).notNull(),
  month: date('month').notNull(), // Premier jour du mois (2026-06-01) pour agréger facilement

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('budget_user_id_idx').on(t.user_id),
  index('budget_month_idx').on(t.month),
  index('budget_provider_idx').on(t.provider),
])

// ─────────────────────────────────────────────
// RELATIONS (Drizzle query builder)
// ─────────────────────────────────────────────

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  dna: many(campaign_dna),
  content_types: many(campaign_content_types),
  avatar_assignments: many(campaign_avatar_assignments),
  strategies: many(campaign_strategies),
  content_jobs: many(content_jobs),
}))

export const campaignDnaRelations = relations(campaign_dna, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaign_dna.campaign_id], references: [campaigns.id] }),
}))

export const campaignContentTypesRelations = relations(campaign_content_types, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaign_content_types.campaign_id], references: [campaigns.id] }),
}))

export const avatarsRelations = relations(avatars, ({ many }) => ({
  outfits: many(avatar_outfits),
  environments: many(avatar_environments),
  assignments: many(campaign_avatar_assignments),
  presets: many(avatar_assignment_presets),
  clone_models: many(clone_models),
}))

export const avatarOutfitsRelations = relations(avatar_outfits, ({ one }) => ({
  avatar: one(avatars, { fields: [avatar_outfits.avatar_id], references: [avatars.id] }),
}))

export const avatarEnvironmentsRelations = relations(avatar_environments, ({ one }) => ({
  avatar: one(avatars, { fields: [avatar_environments.avatar_id], references: [avatars.id] }),
}))

export const assignmentPresetsRelations = relations(avatar_assignment_presets, ({ one }) => ({
  avatar: one(avatars, { fields: [avatar_assignment_presets.avatar_id], references: [avatars.id] }),
  outfit: one(avatar_outfits, { fields: [avatar_assignment_presets.outfit_id], references: [avatar_outfits.id] }),
  environment: one(avatar_environments, { fields: [avatar_assignment_presets.environment_id], references: [avatar_environments.id] }),
  last_campaign: one(campaigns, { fields: [avatar_assignment_presets.last_campaign_id], references: [campaigns.id] }),
}))

export const campaignAvatarAssignmentsRelations = relations(campaign_avatar_assignments, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaign_avatar_assignments.campaign_id], references: [campaigns.id] }),
  avatar: one(avatars, { fields: [campaign_avatar_assignments.avatar_id], references: [avatars.id] }),
  content_type: one(campaign_content_types, { fields: [campaign_avatar_assignments.content_type_id], references: [campaign_content_types.id] }),
  outfit: one(avatar_outfits, { fields: [campaign_avatar_assignments.outfit_id], references: [avatar_outfits.id] }),
  environment: one(avatar_environments, { fields: [campaign_avatar_assignments.environment_id], references: [avatar_environments.id] }),
  preset: one(avatar_assignment_presets, { fields: [campaign_avatar_assignments.preset_id], references: [avatar_assignment_presets.id] }),
}))

export const contentJobsRelations = relations(content_jobs, ({ one }) => ({
  campaign: one(campaigns, { fields: [content_jobs.campaign_id], references: [campaigns.id] }),
  assignment: one(campaign_avatar_assignments, { fields: [content_jobs.avatar_assignment_id], references: [campaign_avatar_assignments.id] }),
}))

export const budgetUsageRelations = relations(budget_usage, ({ one }) => ({
  campaign: one(campaigns, { fields: [budget_usage.campaign_id], references: [campaigns.id] }),
  job: one(content_jobs, { fields: [budget_usage.content_job_id], references: [content_jobs.id] }),
}))

// ─────────────────────────────────────────────
// TYPES TYPESCRIPT INFÉRÉS
// ─────────────────────────────────────────────

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert

export type CampaignDna = typeof campaign_dna.$inferSelect
export type NewCampaignDna = typeof campaign_dna.$inferInsert

export type CampaignContentType = typeof campaign_content_types.$inferSelect
export type NewCampaignContentType = typeof campaign_content_types.$inferInsert

export type Avatar = typeof avatars.$inferSelect
export type NewAvatar = typeof avatars.$inferInsert

export type AvatarOutfit = typeof avatar_outfits.$inferSelect
export type NewAvatarOutfit = typeof avatar_outfits.$inferInsert

export type AvatarEnvironment = typeof avatar_environments.$inferSelect
export type NewAvatarEnvironment = typeof avatar_environments.$inferInsert

export type AvatarAssignmentPreset = typeof avatar_assignment_presets.$inferSelect
export type NewAvatarAssignmentPreset = typeof avatar_assignment_presets.$inferInsert

export type CampaignAvatarAssignment = typeof campaign_avatar_assignments.$inferSelect
export type NewCampaignAvatarAssignment = typeof campaign_avatar_assignments.$inferInsert

export type Strategy = typeof strategies.$inferSelect
export type NewStrategy = typeof strategies.$inferInsert

export type CloneModel = typeof clone_models.$inferSelect
export type NewCloneModel = typeof clone_models.$inferInsert

export type ContentJob = typeof content_jobs.$inferSelect
export type NewContentJob = typeof content_jobs.$inferInsert

export type BudgetUsage = typeof budget_usage.$inferSelect
export type NewBudgetUsage = typeof budget_usage.$inferInsert
