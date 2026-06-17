-- 0015_products.sql
-- Produits de la marque — réutilisables dans la création de contenu.
-- Images stockées dans le bucket `assets` (policies RLS posées en 0004), chemin {userId}/products/...

create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  name              text not null,
  description       text,
  currency          text default 'USD',
  price             numeric(12,2),
  benefits          text[],
  image_url         text,           -- chemin dans le bucket assets
  additional_images text[],
  source_url        text,           -- URL d'origine (auto-remplissage)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_user_id_idx on products (user_id);

-- RLS : chaque utilisateur ne voit/édite que ses propres produits
alter table products enable row level security;

drop policy if exists "products_select_own" on products;
create policy "products_select_own" on products
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "products_insert_own" on products;
create policy "products_insert_own" on products
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "products_update_own" on products;
create policy "products_update_own" on products
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "products_delete_own" on products;
create policy "products_delete_own" on products
  for delete to authenticated using (user_id = auth.uid());
