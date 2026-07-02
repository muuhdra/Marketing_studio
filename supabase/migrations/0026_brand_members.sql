-- Collaboration multi-utilisateurs : membres d'une marque
CREATE TABLE IF NOT EXISTS brand_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  email      text,
  role       text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brand_members_brand_user_idx ON brand_members (brand_id, user_id);
CREATE INDEX IF NOT EXISTS brand_members_user_idx ON brand_members (user_id);

-- Backfill : le créateur de chaque marque devient propriétaire ('owner').
INSERT INTO brand_members (brand_id, user_id, role)
SELECT id, user_id, 'owner' FROM brands
ON CONFLICT (brand_id, user_id) DO NOTHING;
