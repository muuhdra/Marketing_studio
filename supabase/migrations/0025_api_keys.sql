-- Clés API pour l'accès MCP (Model Context Protocol)
CREATE TABLE IF NOT EXISTS api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  key_prefix   text NOT NULL,
  key_hash     text NOT NULL,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
