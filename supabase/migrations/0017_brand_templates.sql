-- 0017_brand_templates.sql
-- Templates publicitaires de la marque (Brand › Templates), réutilisés à la création de pubs statiques.
-- Images dans le bucket `assets` (policies storage posées en 0004), chemin {userId}/brand-templates/...

create table if not exists brand_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  prompt      text,                   -- prompt si généré par IA
  path        text not null,          -- chemin image dans le bucket assets
  created_at  timestamptz not null default now()
);

create index if not exists brand_templates_user_id_idx on brand_templates (user_id);

alter table brand_templates enable row level security;

drop policy if exists "brand_templates_select_own" on brand_templates;
create policy "brand_templates_select_own" on brand_templates
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "brand_templates_insert_own" on brand_templates;
create policy "brand_templates_insert_own" on brand_templates
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "brand_templates_update_own" on brand_templates;
create policy "brand_templates_update_own" on brand_templates
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "brand_templates_delete_own" on brand_templates;
create policy "brand_templates_delete_own" on brand_templates
  for delete to authenticated using (user_id = auth.uid());
