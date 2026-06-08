CREATE TYPE "public"."assignment_role" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TYPE "public"."avatar_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pre_campaign', 'active', 'post_campaign', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('generale', 'speciale');--> statement-breakpoint
CREATE TYPE "public"."clone_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type_kind" AS ENUM('ugc', 'commercial', 'shooting', 'visuel');--> statement-breakpoint
CREATE TYPE "public"."continuity_mode" AS ENUM('evolutif', 'verrouille');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'done', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."outfit_style" AS ENUM('casual', 'smart', 'sport', 'formal', 'streetwear', 'custom');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('produit', 'app');--> statement-breakpoint
CREATE TABLE "avatar_assignment_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"avatar_id" uuid NOT NULL,
	"name" text NOT NULL,
	"outfit_id" uuid,
	"environment_id" uuid,
	"default_role" "assignment_role" DEFAULT 'primary' NOT NULL,
	"default_content_types" text[],
	"times_used" integer DEFAULT 0 NOT NULL,
	"last_campaign_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar_environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avatar_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location_type" text,
	"reference_photo_url" text,
	"description" text,
	"prompt_override" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar_outfits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avatar_id" uuid NOT NULL,
	"name" text NOT NULL,
	"style_type" "outfit_style" DEFAULT 'casual' NOT NULL,
	"reference_photo_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"ethnicity" text,
	"style_tags" text[],
	"source_photo_url" text,
	"source_video_url" text,
	"voice_sample_url" text,
	"voice_provider_id" text,
	"voice_provider" text DEFAULT 'elevenlabs',
	"continuity_mode" "continuity_mode" DEFAULT 'evolutif' NOT NULL,
	"status" "avatar_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid,
	"content_job_id" uuid,
	"provider" text NOT NULL,
	"amount_usd" numeric(10, 4) NOT NULL,
	"month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_avatar_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"avatar_id" uuid NOT NULL,
	"content_type_id" uuid,
	"role" "assignment_role" DEFAULT 'primary' NOT NULL,
	"outfit_id" uuid,
	"environment_id" uuid,
	"config_snapshot" jsonb,
	"preset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_content_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"content_type" "content_type_kind" NOT NULL,
	"product_category" "product_category" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_dna" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"raw_content" text,
	"structured_data" jsonb,
	"health_score" integer,
	"file_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_strategies" (
	"campaign_id" uuid NOT NULL,
	"strategy_id" uuid NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"campaign_type" "campaign_type" DEFAULT 'generale' NOT NULL,
	"start_date" date,
	"end_date" date,
	"frequency" text,
	"pre_campaign_enabled" boolean DEFAULT false NOT NULL,
	"pre_campaign_start" date,
	"post_campaign_enabled" boolean DEFAULT false NOT NULL,
	"post_campaign_end" date,
	"dna_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clone_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avatar_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"voice_sample_url" text,
	"voice_provider_id" text,
	"clone_status" "clone_status" DEFAULT 'pending' NOT NULL,
	"provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"avatar_assignment_id" uuid,
	"content_type" "content_type_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"provider" text NOT NULL,
	"provider_job_id" text,
	"trigger_job_id" text,
	"prompt_used" text,
	"format" text,
	"duration_seconds" integer,
	"quality" text,
	"output_url" text,
	"output_expires_at" timestamp with time zone,
	"cost_usd" numeric(10, 4),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"phases" jsonb,
	"campaign_type" "campaign_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avatar_assignment_presets" ADD CONSTRAINT "avatar_assignment_presets_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_assignment_presets" ADD CONSTRAINT "avatar_assignment_presets_outfit_id_avatar_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."avatar_outfits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_assignment_presets" ADD CONSTRAINT "avatar_assignment_presets_environment_id_avatar_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."avatar_environments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_assignment_presets" ADD CONSTRAINT "avatar_assignment_presets_last_campaign_id_campaigns_id_fk" FOREIGN KEY ("last_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_environments" ADD CONSTRAINT "avatar_environments_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_outfits" ADD CONSTRAINT "avatar_outfits_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_usage" ADD CONSTRAINT "budget_usage_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_usage" ADD CONSTRAINT "budget_usage_content_job_id_content_jobs_id_fk" FOREIGN KEY ("content_job_id") REFERENCES "public"."content_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_content_type_id_campaign_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."campaign_content_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_outfit_id_avatar_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."avatar_outfits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_environment_id_avatar_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."avatar_environments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_avatar_assignments" ADD CONSTRAINT "campaign_avatar_assignments_preset_id_avatar_assignment_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."avatar_assignment_presets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content_types" ADD CONSTRAINT "campaign_content_types_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_dna" ADD CONSTRAINT "campaign_dna_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_strategies" ADD CONSTRAINT "campaign_strategies_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_strategies" ADD CONSTRAINT "campaign_strategies_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clone_models" ADD CONSTRAINT "clone_models_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_avatar_assignment_id_campaign_avatar_assignments_id_fk" FOREIGN KEY ("avatar_assignment_id") REFERENCES "public"."campaign_avatar_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presets_avatar_id_idx" ON "avatar_assignment_presets" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX "presets_user_id_idx" ON "avatar_assignment_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "environments_avatar_id_idx" ON "avatar_environments" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX "outfits_avatar_id_idx" ON "avatar_outfits" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX "avatars_user_id_idx" ON "avatars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "avatars_status_idx" ON "avatars" USING btree ("status");--> statement-breakpoint
CREATE INDEX "budget_user_id_idx" ON "budget_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budget_month_idx" ON "budget_usage" USING btree ("month");--> statement-breakpoint
CREATE INDEX "budget_provider_idx" ON "budget_usage" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "assignments_campaign_id_idx" ON "campaign_avatar_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "assignments_avatar_id_idx" ON "campaign_avatar_assignments" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX "cct_campaign_id_idx" ON "campaign_content_types" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_dna_campaign_id_idx" ON "campaign_dna" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clone_models_avatar_id_idx" ON "clone_models" USING btree ("avatar_id");--> statement-breakpoint
CREATE INDEX "jobs_campaign_id_idx" ON "content_jobs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "content_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_expires_at_idx" ON "content_jobs" USING btree ("output_expires_at");