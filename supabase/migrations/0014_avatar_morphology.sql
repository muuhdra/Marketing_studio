-- 0014_avatar_morphology.sql
-- Choix morphologiques du moteur de création (genre, peau, cheveux, yeux, physique…).
-- Réhydratés à l'édition de l'avatar et réutilisés pour orienter la voix et les régénérations.
alter table avatars
  add column if not exists morphology jsonb;
