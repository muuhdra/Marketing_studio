// Coûts ESTIMÉS par génération (USD) — basés sur les tarifs AIML réels.
// Source unique partagée (Analytics + indicateur Topbar + estimation serveur).
//
// Vidéo = facturée À LA SECONDE → coût au prorata de la durée (PER_SECOND_COST).
// Le reste = forfait par génération (UNIT_COST).
//
// Bases AIML (vérifiées) :
//   Kling v2.1 Pro : $0.1029 / seconde de vidéo
//   Nano Banana    : $0.039 / image
//   MiniMax 2.6 HD : $0.10 / 1000 caractères → ~$0.05 pour ~500 car. (notre limite)
//   Texte (GPT-4o / Claude) : au token → estimés sur un usage typique par appel

export const PER_SECOND_COST: Record<string, number> = {
  'kling-v2.1-pro': 0.1029,   // tarif AIML réel
  'kling':          0.1029,   // alias (engine utilisé par les wizards)
  'seedance-pro':   0.067,    // Seedance 2.0 (~$0.067/s, tarif marché)
  'seedance':       0.067,    // alias
}

export const UNIT_COST: Record<string, number> = {
  'nano-banana': 0.04,   // image ($0.039)
  'elevenlabs':  0.10,   // voix (estimé, non utilisé en synthèse)
  'minimax':     0.05,   // voix ~500 car. @ $0.10/1k
  'claude':      0.15,   // Claude Opus — stratégie/script (~2k tokens out, estimé)
  'chatgpt':     0.01,   // GPT-4o — script (~600 tokens out, estimé)
}

const DEFAULT_VIDEO_SECONDS = 5

/** Coût estimé d'une génération. Pour la vidéo : tarif/s × durée (défaut 5s). */
export function estimateCost(engine: string | null | undefined, durationSeconds?: number | null): number {
  if (!engine) return 0
  const perSec = PER_SECOND_COST[engine]
  if (perSec != null) {
    const secs = durationSeconds && durationSeconds > 0 ? durationSeconds : DEFAULT_VIDEO_SECONDS
    return perSec * secs
  }
  return UNIT_COST[engine] ?? 0
}

/** Formatage USD compact pour l'indicateur de coût (ex. $0.04, $0.51). */
export function formatCost(usd: number): string {
  if (usd <= 0) return '$0'
  return usd < 1 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(2)}`
}
