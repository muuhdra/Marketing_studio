// ─────────────────────────────────────────────
// SUPABASE STORAGE — Helpers
// 2 buckets : assets (persistent) + outputs (éphémère 24h)
// ─────────────────────────────────────────────

// Noms des buckets
export const BUCKETS = {
  ASSETS: 'assets',    // Backbone : avatars, ADN, tenues, environments, voix
  OUTPUTS: 'outputs',  // Éphémère : vidéos/images/audio générés (24h TTL)
} as const

// Chemins dans le bucket ASSETS
export const ASSET_PATHS = {
  avatarPhoto: (avatarId: string) => `avatars/${avatarId}/photo`,
  avatarVideo: (avatarId: string) => `avatars/${avatarId}/video`,
  avatarVoice: (avatarId: string) => `avatars/${avatarId}/voice`,        // ← Voix persistante
  avatarOutfit: (avatarId: string, outfitId: string) =>
    `avatars/${avatarId}/outfits/${outfitId}`,
  avatarEnvironment: (avatarId: string, envId: string) =>
    `avatars/${avatarId}/environments/${envId}`,
  avatarCloneSource: (avatarId: string) =>
    `avatars/${avatarId}/clone_source`,
  campaignDna: (campaignId: string, version: number) =>
    `campaigns/${campaignId}/dna/v${version}`,
} as const

// Chemins dans le bucket OUTPUTS (éphémère)
export const OUTPUT_PATHS = {
  job: (jobId: string, ext: string = 'mp4') => `jobs/${jobId}/output.${ext}`,
} as const

// TTL output en heures
export const OUTPUT_TTL_HOURS = 24

// Génère une signed URL pour un output (expire après OUTPUT_TTL_HOURS)
export function getOutputExpiresAt(): Date {
  const d = new Date()
  d.setHours(d.getHours() + OUTPUT_TTL_HOURS)
  return d
}

// Extensions acceptées par type de fichier
export const ACCEPTED_TYPES = {
  avatar_source: ['mp4', 'mov', 'jpg', 'jpeg', 'png', 'webp'],
  voice_sample: ['wav', 'mp3', 'aac', 'm4a', 'ogg'],
  outfit_ref: ['jpg', 'jpeg', 'png', 'webp'],
  env_ref: ['jpg', 'jpeg', 'png', 'webp'],
  dna_doc: ['pdf', 'md', 'txt', 'docx'],
} as const

// Taille max par type (en bytes)
export const MAX_FILE_SIZES = {
  avatar_source_video: 500 * 1024 * 1024,  // 500 MB
  avatar_source_photo: 20 * 1024 * 1024,   // 20 MB
  voice_sample: 50 * 1024 * 1024,          // 50 MB
  outfit_ref: 10 * 1024 * 1024,            // 10 MB
  env_ref: 10 * 1024 * 1024,              // 10 MB
  dna_doc: 10 * 1024 * 1024,             // 10 MB
} as const
