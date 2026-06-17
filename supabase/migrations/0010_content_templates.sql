-- Migration: bibliothèque de templates de contenu (vidéos/images + prompt source).
--
--   - Fichiers dans le bucket `templates` (public — previews globales, pas de données user).
--   - Métadonnées + prompt dans `content_templates`.
--   - Gérés via l'écran /templates (tout utilisateur authentifié = admin).

-- ── Bucket templates (public, idempotent) ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

-- ── Table content_templates ──────────────────────────────────────────────────
create table if not exists content_templates (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,             -- video | image
  category     text not null,             -- ugc | commercial | shooting | visuel | autre
  label        text not null,
  description  text,
  prompt       text,                      -- prompt ayant servi à générer le contenu
  storage_path text not null,
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists templates_category_idx on content_templates (category);
create index if not exists templates_sort_idx     on content_templates (sort_order);

-- ── RLS : lecture/écriture pour tout utilisateur authentifié (= admin) ───────
alter table content_templates enable row level security;

drop policy if exists "tpl_select" on content_templates;
create policy "tpl_select" on content_templates for select to authenticated using (true);
drop policy if exists "tpl_insert" on content_templates;
create policy "tpl_insert" on content_templates for insert to authenticated with check (true);
drop policy if exists "tpl_update" on content_templates;
create policy "tpl_update" on content_templates for update to authenticated using (true);
drop policy if exists "tpl_delete" on content_templates;
create policy "tpl_delete" on content_templates for delete to authenticated using (true);

-- ── Storage policies pour le bucket templates ────────────────────────────────
drop policy if exists "templates_public_select" on storage.objects;
create policy "templates_public_select" on storage.objects
  for select using (bucket_id = 'templates');

drop policy if exists "templates_auth_insert" on storage.objects;
create policy "templates_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'templates');

drop policy if exists "templates_auth_update" on storage.objects;
create policy "templates_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'templates');

drop policy if exists "templates_auth_delete" on storage.objects;
create policy "templates_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'templates');
