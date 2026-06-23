-- Marques (multi-marques) : entité de base par utilisateur.
-- Le profil complet (Identité/Ton/Audience/competitors…) est stocké en JSONB `profile`.
create table if not exists brands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  name       text not null,
  color      text default '#ea580c',
  logo_url   text,
  category   text,
  profile    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_user_id_idx on brands(user_id);
