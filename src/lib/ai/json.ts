/**
 * Parsing tolérant du JSON renvoyé par un LLM.
 * Gère les cas réels : fences markdown (```json … ```), texte autour du JSON,
 * réponse vide. Lève une erreur claire si rien d'exploitable.
 */
export function parseJsonLoose<T = unknown>(raw: string | null | undefined): T {
  const input = (raw ?? '').trim()
  if (!input) throw new Error('Réponse IA vide')

  // 1) Retire d'éventuelles fences markdown
  const unfenced = input
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(unfenced) as T
  } catch {
    // 2) Repli : extrait le 1er bloc { … } ou [ … ] présent dans le texte
    const match = unfenced.match(/[{[][\s\S]*[}\]]/)
    if (match) {
      try { return JSON.parse(match[0]) as T } catch { /* échec final ci-dessous */ }
    }
    throw new Error('Réponse IA non parsable en JSON')
  }
}
