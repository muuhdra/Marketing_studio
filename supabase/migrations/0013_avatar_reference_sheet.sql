-- 0013_avatar_reference_sheet.sql
-- Fiche de référence personnage (planche multi-poses) — pour la cohérence de l'avatar.
alter table avatars
  add column if not exists reference_sheet_url text;
