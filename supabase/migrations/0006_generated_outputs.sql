-- Migration: contenus générés (outputs) persistés 48h puis supprimés définitivement.
--
--   - Fichiers dans le bucket `outputs` (privé, policies RLS déjà posées en 0004).
--   - Métadonnées + expiration dans `generated_outputs`.
--   - Purge automatique via pg_cron toutes les heures (fichiers + lignes expirés).

-- ── Bucket outputs (idempotent) ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('outputs', 'outputs', false)
on conflict (id) do nothing;

-- ── Table generated_outputs ──────────────────────────────────────────────────
create table if not exists generated_outputs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  campaign_id  uuid references campaigns(id) on delete set null,
  type         text not null,            -- image | video | audio
  engine       text,
  title        text,
  prompt       text,
  format       text,
  storage_path text not null,            -- chemin dans le bucket outputs
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);

create index if not exists outputs_user_id_idx    on generated_outputs (user_id);
create index if not exists outputs_expires_at_idx on generated_outputs (expires_at);

-- ── RLS : chaque utilisateur ne voit que ses propres outputs ────────────────
alter table generated_outputs enable row level security;

drop policy if exists "outputs_select_own" on generated_outputs;
create policy "outputs_select_own" on generated_outputs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "outputs_insert_own" on generated_outputs;
create policy "outputs_insert_own" on generated_outputs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "outputs_delete_own" on generated_outputs;
create policy "outputs_delete_own" on generated_outputs
  for delete to authenticated using (user_id = auth.uid());

-- ── Purge : supprime fichiers (storage.objects) + lignes expirés ─────────────
-- SECURITY DEFINER → tourne avec les droits du propriétaire (accès storage.objects).
create or replace function purge_expired_outputs()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  -- 1. Supprime les objets storage des outputs expirés (rend le fichier inaccessible)
  delete from storage.objects o
   using generated_outputs g
   where g.expires_at < now()
     and o.bucket_id = 'outputs'
     and o.name = g.storage_path;

  -- 2. Supprime les métadonnées expirées
  delete from generated_outputs where expires_at < now();
end;
$$;

-- ── pg_cron : purge toutes les heures ────────────────────────────────────────
-- Nécessite l'extension pg_cron (Dashboard → Database → Extensions si non activée).
create extension if not exists pg_cron;

select cron.unschedule('purge-expired-outputs')
  where exists (select 1 from cron.job where jobname = 'purge-expired-outputs');

select cron.schedule('purge-expired-outputs', '0 * * * *', $$ select purge_expired_outputs(); $$);
