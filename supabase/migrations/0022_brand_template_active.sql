-- Templates de marque : marqueur « actif » (sélectionné par l'utilisateur pour la création de pubs statiques).
-- Défaut false : un nouveau template (upload/IA) n'est pas actif tant qu'il n'a pas été validé.
alter table brand_templates add column if not exists active boolean not null default false;
