-- 0021_product_model_nationality.sql
-- Ajoute la nationalité des acteurs « Shooting Produit » (diversité ethnique/carnation),
-- affichée avec son drapeau dans le catalogue et utilisée pour le filtrage.

alter table product_models add column if not exists nationality text;
