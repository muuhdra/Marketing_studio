-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY — Studio UGC IA
-- Chaque utilisateur ne voit QUE ses propres données
-- ─────────────────────────────────────────────

-- Activer RLS sur toutes les tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_avatar_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_assignment_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_usage ENABLE ROW LEVEL SECURITY;

-- ─── CAMPAIGNS ───
CREATE POLICY "users_own_campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id);

-- ─── CAMPAIGN DNA (accès via campagne parente) ───
CREATE POLICY "users_own_campaign_dna" ON campaign_dna
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ─── CAMPAIGN CONTENT TYPES ───
CREATE POLICY "users_own_campaign_content_types" ON campaign_content_types
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ─── CAMPAIGN AVATAR ASSIGNMENTS ───
CREATE POLICY "users_own_campaign_assignments" ON campaign_avatar_assignments
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ─── CAMPAIGN STRATEGIES ───
CREATE POLICY "users_own_campaign_strategies" ON campaign_strategies
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ─── AVATARS ───
CREATE POLICY "users_own_avatars" ON avatars
  FOR ALL USING (auth.uid() = user_id);

-- ─── AVATAR OUTFITS (accès via avatar parent) ───
CREATE POLICY "users_own_avatar_outfits" ON avatar_outfits
  FOR ALL USING (
    avatar_id IN (
      SELECT id FROM avatars WHERE user_id = auth.uid()
    )
  );

-- ─── AVATAR ENVIRONMENTS ───
CREATE POLICY "users_own_avatar_environments" ON avatar_environments
  FOR ALL USING (
    avatar_id IN (
      SELECT id FROM avatars WHERE user_id = auth.uid()
    )
  );

-- ─── AVATAR ASSIGNMENT PRESETS ───
CREATE POLICY "users_own_assignment_presets" ON avatar_assignment_presets
  FOR ALL USING (auth.uid() = user_id);

-- ─── CLONE MODELS ───
CREATE POLICY "users_own_clone_models" ON clone_models
  FOR ALL USING (
    avatar_id IN (
      SELECT id FROM avatars WHERE user_id = auth.uid()
    )
  );

-- ─── STRATEGIES ───
CREATE POLICY "users_own_strategies" ON strategies
  FOR ALL USING (auth.uid() = user_id);

-- ─── CONTENT JOBS ───
CREATE POLICY "users_own_content_jobs" ON content_jobs
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- ─── BUDGET USAGE ───
CREATE POLICY "users_own_budget_usage" ON budget_usage
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- STORAGE POLICIES
-- À appliquer dans Supabase Dashboard > Storage > Policies
-- Ou via l'API Supabase Storage
-- ─────────────────────────────────────────────

-- Bucket : assets (persistent - backbone)
-- INSERT : user authentifié peut uploader dans son propre dossier
-- SELECT : user authentifié peut lire ses propres fichiers
-- DELETE : user authentifié peut supprimer ses propres fichiers

-- Bucket : outputs (éphémère - 24h TTL)
-- INSERT : service role uniquement (les jobs IA uploadent les résultats)
-- SELECT : user authentifié peut télécharger ses propres outputs
-- DELETE : service role + cron job auto-delete après expiration
