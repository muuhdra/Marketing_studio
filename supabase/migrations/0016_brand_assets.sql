-- 0016_brand_assets.sql
-- Bibliothèque média de la marque (Brand › Assets).
-- Fichiers stockés dans le bucket `assets` (policies storage posées en 0004), chemin {userId}/brand-assets/...

create table if not exists brand_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now()
);

create index if not exists brand_folders_user_id_idx on brand_folders (user_id);

create table if not exists brand_assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  folder_id   uuid references brand_folders (id) on delete set null,
  type        text not null,          -- 'image' | 'video' | 'audio'
  name        text not null,
  path        text not null,          -- chemin dans le bucket assets
  created_at  timestamptz not null default now()
);

create index if not exists brand_assets_user_id_idx on brand_assets (user_id);

-- RLS : chacun ne voit/édite que ses propres dossiers et assets
alter table brand_folders enable row level security;
alter table brand_assets  enable row level security;

drop policy if exists "brand_folders_select_own" on brand_folders;
create policy "brand_folders_select_own" on brand_folders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "brand_folders_insert_own" on brand_folders;
create policy "brand_folders_insert_own" on brand_folders
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "brand_folders_update_own" on brand_folders;
create policy "brand_folders_update_own" on brand_folders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "brand_folders_delete_own" on brand_folders;
create policy "brand_folders_delete_own" on brand_folders
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "brand_assets_select_own" on brand_assets;
create policy "brand_assets_select_own" on brand_assets
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "brand_assets_insert_own" on brand_assets;
create policy "brand_assets_insert_own" on brand_assets
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "brand_assets_update_own" on brand_assets;
create policy "brand_assets_update_own" on brand_assets
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "brand_assets_delete_own" on brand_assets;
create policy "brand_assets_delete_own" on brand_assets
  for delete to authenticated using (user_id = auth.uid());
