-- Phase 3 : scoping par marque. Ajout de brand_id (nullable, backfill négligeable)
-- aux tables de contenu propres à une marque.
alter table products          add column if not exists brand_id uuid;
alter table brand_folders     add column if not exists brand_id uuid;
alter table brand_assets      add column if not exists brand_id uuid;
alter table brand_templates   add column if not exists brand_id uuid;
alter table campaigns         add column if not exists brand_id uuid;
alter table generated_outputs add column if not exists brand_id uuid;

create index if not exists products_brand_id_idx          on products(brand_id);
create index if not exists brand_folders_brand_id_idx     on brand_folders(brand_id);
create index if not exists brand_assets_brand_id_idx      on brand_assets(brand_id);
create index if not exists brand_templates_brand_id_idx   on brand_templates(brand_id);
create index if not exists campaigns_brand_id_idx         on campaigns(brand_id);
create index if not exists generated_outputs_brand_id_idx on generated_outputs(brand_id);
