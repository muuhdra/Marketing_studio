-- Migration: Supabase Storage — buckets privés + RLS
--
-- Buckets (à créer via Dashboard ou API, non gérés en SQL) :
--   - assets  (privé) : backbone — avatars, ADN, tenues, environnements, voix
--   - outputs (privé) : médias générés éphémères (TTL 24h géré applicativement)
--
-- Isolation par utilisateur : chaque fichier est rangé sous {userId}/...
-- La policy vérifie que le 1er dossier du chemin = l'id de l'utilisateur authentifié.
-- Accès en lecture via URL signée (createSignedUrl) — jamais d'URL publique.

-- ── Bucket ASSETS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "assets_user_insert" ON storage.objects;
CREATE POLICY "assets_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "assets_user_select" ON storage.objects;
CREATE POLICY "assets_user_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "assets_user_update" ON storage.objects;
CREATE POLICY "assets_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "assets_user_delete" ON storage.objects;
CREATE POLICY "assets_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- ── Bucket OUTPUTS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "outputs_user_insert" ON storage.objects;
CREATE POLICY "outputs_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outputs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "outputs_user_select" ON storage.objects;
CREATE POLICY "outputs_user_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'outputs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "outputs_user_update" ON storage.objects;
CREATE POLICY "outputs_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'outputs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "outputs_user_delete" ON storage.objects;
CREATE POLICY "outputs_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'outputs' AND (storage.foldername(name))[1] = (auth.uid())::text);
