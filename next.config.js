/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Uploads lourds (avatar, templates vidéo) — pas de limite pratique.
      // Next n'offre pas d'illimité réel : valeur très haute (le corps est tamponné en mémoire).
      bodySizeLimit: '1gb',
    },
  },
}
module.exports = nextConfig
