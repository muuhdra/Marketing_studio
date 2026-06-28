// ─────────────────────────────────────────────
// SUPABASE STORAGE — Helpers
// 2 buckets : assets (persistent) + outputs (éphémère 48h)
// ─────────────────────────────────────────────

// Noms des buckets
export const BUCKETS = {
  ASSETS: 'assets',        // Backbone : avatars, ADN, tenues, environments, voix
  OUTPUTS: 'outputs',      // Éphémère : vidéos/images/audio générés (48h TTL)
  TEMPLATES: 'templates',  // Public : templates de contenu (vidéos/images + prompt)
} as const

// Chemins dans le bucket ASSETS
// ⚠️ userId en 1er dossier → conforme à la policy RLS (storage.foldername(name))[1] = auth.uid()
export const ASSET_PATHS = {
  // Chemin fixe (sans extension) → un ré-upload écrase toujours le même objet,
  // pas d'orphelin si l'extension change. Le content-type est stocké à l'upload.
  avatarPhoto: (userId: string, avatarId: string) =>
    `${userId}/avatars/${avatarId}/photo`,
  avatarVoice: (userId: string, avatarId: string, ext: string = 'mp3') =>
    `${userId}/avatars/${avatarId}/voice.${ext}`,
  avatarOutfit: (userId: string, avatarId: string, outfitId: string, ext: string = 'png') =>
    `${userId}/avatars/${avatarId}/outfits/${outfitId}.${ext}`,
  avatarEnvironment: (userId: string, avatarId: string, envId: string, ext: string = 'png') =>
    `${userId}/avatars/${avatarId}/environments/${envId}.${ext}`,
  avatarCloneSource: (userId: string, avatarId: string, ext: string = 'mp4') =>
    `${userId}/avatars/${avatarId}/clone_source.${ext}`,
  campaignDna: (campaignId: string, version: number) =>
    `campaigns/${campaignId}/dna/v${version}`,
  // Upload ADN avant que la campagne ne soit créée (rattaché à l'user).
  // userId en 1er dossier → la policy RLS (storage.foldername(name))[1] = auth.uid() s'applique.
  campaignDnaDraft: (userId: string, fileId: string, ext: string) =>
    `${userId}/campaigns/dna-drafts/${fileId}.${ext}`,
  // Image de produit (persistante) — userId en 1er dossier (RLS)
  productImage: (userId: string, fileId: string, ext: string = 'png') =>
    `${userId}/products/${fileId}.${ext}`,
  // Asset de marque (image/vidéo/audio) — userId en 1er dossier (RLS)
  brandAsset: (userId: string, fileId: string, ext: string) =>
    `${userId}/brand-assets/${fileId}.${ext}`,
  // Template publicitaire de la marque (image) — userId en 1er dossier (RLS)
  brandTemplate: (userId: string, fileId: string, ext: string = 'png') =>
    `${userId}/brand-templates/${fileId}.${ext}`,
  // Mannequin « Shooting Mode » généré (image) — userId en 1er dossier (RLS)
  shootingModel: (userId: string, fileId: string, ext: string = 'png') =>
    `${userId}/shooting-models/${fileId}.${ext}`,
  // Acteur / main « Shooting Produit » (image) — userId en 1er dossier (RLS)
  productModel: (userId: string, fileId: string, ext: string = 'png') =>
    `${userId}/product-models/${fileId}.${ext}`,
} as const

// Chemins dans le bucket OUTPUTS (éphémère)
export const OUTPUT_PATHS = {
  job: (jobId: string, ext: string = 'mp4') => `jobs/${jobId}/output.${ext}`,
} as const

// TTL output en heures (contenus générés supprimés définitivement après ce délai)
export const OUTPUT_TTL_HOURS = 48

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
