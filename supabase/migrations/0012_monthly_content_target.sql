-- 0012_monthly_content_target.sql
-- Objectif de volume : nombre de contenus à générer par mois pour la campagne.
alter table campaigns
  add column if not exists monthly_content_target integer;
