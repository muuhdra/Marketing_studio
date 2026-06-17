-- 0011_tmp_assets_cleanup.sql
-- Nettoyage des fichiers temporaires d'upload (avatar Creative Studio).
--   - Les fichiers vivent sous {userId}/tmp/ dans le bucket privé `assets`.
--   - Suppression principale = "après usage" côté app (actionDeleteTempImage).
--   - Ce cron est un FILET DE SÉCURITÉ : purge les orphelins de plus de 24h
--     (ex. upload puis fermeture d'onglet sans nettoyage).

-- ── Purge : supprime les objets tmp de plus de 24h ──────────────────────────
-- SECURITY DEFINER → droits du propriétaire (accès storage.objects).
create or replace function purge_tmp_assets()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
   where bucket_id = 'assets'
     and name like '%/tmp/%'
     and created_at < now() - interval '24 hours';
end;
$$;

-- ── pg_cron : purge toutes les heures ───────────────────────────────────────
create extension if not exists pg_cron;

select cron.unschedule('purge-tmp-assets')
  where exists (select 1 from cron.job where jobname = 'purge-tmp-assets');

select cron.schedule('purge-tmp-assets', '15 * * * *', $$ select purge_tmp_assets(); $$);
