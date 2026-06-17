-- Migration: conserver les métadonnées des outputs au-delà de 48h (pour Analytics/Dashboard).
--
-- Le FICHIER reste éphémère (supprimé à 48h), mais la LIGNE (métadonnée) est conservée.
--   - Galerie : lignes `purged_at IS NULL` (fichier dispo, téléchargeable).
--   - Analytics/Dashboard : toutes les lignes → historique illimité.

alter table generated_outputs add column if not exists purged_at timestamptz;

-- Purge : supprime le fichier storage + marque la ligne purgée (sans la supprimer).
create or replace function purge_expired_outputs()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  -- 1. Supprime les objets storage des outputs expirés non encore purgés
  delete from storage.objects o
   using generated_outputs g
   where g.expires_at < now()
     and g.purged_at is null
     and o.bucket_id = 'outputs'
     and o.name = g.storage_path;

  -- 2. Marque les lignes comme purgées (métadonnée conservée pour les stats)
  update generated_outputs
     set purged_at = now()
   where expires_at < now()
     and purged_at is null;
end;
$$;

-- Le job pg_cron 'purge-expired-outputs' appelle déjà purge_expired_outputs() → rien à replanifier.
