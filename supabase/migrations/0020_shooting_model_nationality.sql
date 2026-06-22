-- 0020_shooting_model_nationality.sql
-- Ajoute la nationalité des mannequins « Shooting Mode » (diversité ethnique/carnation),
-- affichée avec son drapeau dans le catalogue et utilisée pour le filtrage.

alter table shooting_models add column if not exists nationality text;
