-- Migration: phases pré/post-campagne + ADN enrichi
--
-- Pré-campagne : date de fin + description (DA/ADN spécifique de la pré-campagne)
-- Post-campagne : délai de déclenchement (semaines après la fin) + données de résultats
--
-- campaign_dna possède déjà raw_content, structured_data (jsonb), health_score, file_url
-- (migration 0000) — aucune modification nécessaire de cette table.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS pre_campaign_end          date,
  ADD COLUMN IF NOT EXISTS pre_campaign_dna          text,
  ADD COLUMN IF NOT EXISTS post_campaign_delay_weeks integer,
  ADD COLUMN IF NOT EXISTS post_campaign_results     jsonb;
