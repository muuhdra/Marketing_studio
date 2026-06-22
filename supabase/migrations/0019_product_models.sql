-- 0019_product_models.sql
-- Acteurs & mains « Shooting Produit » générés par IA (onglet Acteurs HeyOz + sélecteur de mains).
-- kind = 'actor' | 'hand'. Pour les acteurs, `category` décrit la verticale (BEAUTÉ, MODE, …).
-- Images dans le bucket `assets` (policies storage posées en 0004), chemin {userId}/product-models/...

create table if not exists product_models (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  kind        text not null,          -- actor | hand
  category    text,                   -- verticale (acteurs) ; null pour les mains
  prompt      text,                   -- prompt de génération
  path        text not null,          -- chemin image dans le bucket assets
  created_at  timestamptz not null default now()
);

create index if not exists product_models_user_id_idx on product_models (user_id);

alter table product_models enable row level security;

drop policy if exists "product_models_select_own" on product_models;
create policy "product_models_select_own" on product_models
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "product_models_insert_own" on product_models;
create policy "product_models_insert_own" on product_models
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "product_models_update_own" on product_models;
create policy "product_models_update_own" on product_models
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "product_models_delete_own" on product_models;
create policy "product_models_delete_own" on product_models
  for delete to authenticated using (user_id = auth.uid());
