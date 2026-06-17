-- Migration: add assets_url to campaigns
-- Ajout d'une colonne optionnelle pour stocker l'URL des assets visuels
-- (Notion, Google Drive, Dropbox, etc.)

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS assets_url text;
