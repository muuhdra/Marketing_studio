-- 0018_shooting_models.sql
-- Mannequins « Shooting Mode » générés par IA (onglet HeyOz Models de la fashion-photoshoot).
-- Chaque modèle est décrit par son cadrage (shot_type) et sa couleur de fond (background_color),
-- ce qui permet de filtrer la galerie et de générer à la demande les combinaisons manquantes.
-- Images dans le bucket `assets` (policies storage posées en 0004), chemin {userId}/shooting-models/...

create table if not exists shooting_models (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  shot_type         text not null,          -- UPPER BODY | LOWER BODY | FULL BODY
  background_color  text not null,          -- BEIGE | LIGHT GREY | OFF WHITE | CREAM | ...
  prompt            text,                   -- prompt de génération
  path              text not null,          -- chemin image dans le bucket assets
  created_at        timestamptz not null default now()
);

create index if not exists shooting_models_user_id_idx on shooting_models (user_id);

alter table shooting_models enable row level security;

drop policy if exists "shooting_models_select_own" on shooting_models;
create policy "shooting_models_select_own" on shooting_models
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "shooting_models_insert_own" on shooting_models;
create policy "shooting_models_insert_own" on shooting_models
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "shooting_models_update_own" on shooting_models;
create policy "shooting_models_update_own" on shooting_models
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "shooting_models_delete_own" on shooting_models;
create policy "shooting_models_delete_own" on shooting_models
  for delete to authenticated using (user_id = auth.uid());
