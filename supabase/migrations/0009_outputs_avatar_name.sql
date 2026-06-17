-- Migration: nom d'avatar/persona sur les outputs → badge dans la galerie.

alter table generated_outputs add column if not exists avatar_name text;
