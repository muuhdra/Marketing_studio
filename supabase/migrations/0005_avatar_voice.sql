-- Migration: voix d'avatar (personnalisation par description + clonage)
--
-- Chaque avatar porte une voix unique et persistante.
--   - Synthèse catalogue (MiniMax/ElevenLabs via AIML) : voice_engine/voice_id/voice_settings
--   - Personnalisation par description simple (mappée par Claude) : voice_mode='description'
--   - Clonage ElevenLabs (Campagne Spéciale, API dédiée à venir) : voice_provider_id + voice_sample_url
--
-- Colonnes additives, nullables — aucun impact sur l'existant ni sur les RLS.

ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS voice_engine      text,
  ADD COLUMN IF NOT EXISTS voice_id          text,
  ADD COLUMN IF NOT EXISTS voice_mode        text,
  ADD COLUMN IF NOT EXISTS voice_description text,
  ADD COLUMN IF NOT EXISTS voice_settings    jsonb,
  ADD COLUMN IF NOT EXISTS voice_label       text;

-- voice_sample_url / voice_provider_id / voice_provider existent déjà (migration 0000).
