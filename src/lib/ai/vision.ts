/**
 * Vision — reverse-engineering d'un prompt de génération à partir d'un visuel.
 *
 * Modèle : Gemini (via AIML) — meilleur pour l'analyse vision et surtout la
 * décomposition d'une vidéo frame par frame.
 *   - Image : on envoie l'image (URL publique ou data URL).
 *   - Vidéo : on envoie PLUSIEURS frames réparties sur la timeline (capturées
 *     côté client) → Gemini reconstitue l'action/le mouvement et en déduit un prompt.
 */

import { createAimlClient, MODELS } from './client'

export async function reverseEngineerPrompt(input: {
  imageUrl?: string       // URL publique (template image)
  imageData?: string      // data:...;base64,... (image unique / frame)
  frames?: string[]       // plusieurs data URLs (frames d'une vidéo, ordonnées)
  hint?: string           // contexte optionnel (catégorie, libellé, format)
}): Promise<string> {
  // Rassemble tous les visuels à analyser (image unique OU séquence de frames)
  const visuals = [
    input.imageData,
    input.imageUrl,
    ...(input.frames ?? []),
  ].filter((v): v is string => !!v)

  if (visuals.length === 0) throw new Error('Aucun visuel à analyser')

  const isSequence = visuals.length > 1

  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.gemini,   // Gemini — fort en analyse vidéo/vision
    messages: [
      {
        role: 'system',
        content:
          "Tu es directeur artistique et prompt engineer. À partir d'un visuel, tu rédiges UN SEUL prompt de génération, en français, détaillé et créatif, prêt à régénérer un contenu similaire (sans le copier servilement). " +
          (isSequence
            ? "Les images fournies sont des FRAMES ORDONNÉES d'une même vidéo : analyse-les comme une séquence pour reconstituer l'action, le mouvement de caméra, le rythme et l'évolution de la scène, puis décris la vidéo à générer (mouvement inclus). "
            : "") +
          "Couvre : sujet & action, style visuel, cadrage/plan, lumière, palette de couleurs, ambiance/émotion, contexte/décor" +
          (isSequence ? ", mouvement & transitions" : "") +
          ", et le format si pertinent. " +
          "Réponds uniquement par le prompt — aucune introduction, aucun méta-commentaire, aucune liste à puces.",
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              (isSequence
                ? `Reverse-engineer le prompt de génération de cette vidéo (${visuals.length} frames ordonnées).`
                : `Reverse-engineer le prompt de génération de ce visuel.`) +
              (input.hint ? ` Contexte : ${input.hint}.` : ''),
          },
          ...visuals.map((url) => ({ type: 'image_url', image_url: { url } })),
        ] as never,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  return (response.choices[0]?.message?.content ?? '').trim()
}

/**
 * Reverse-engineering d'un PORTRAIT : à partir d'une photo de personne, Gemini rédige
 * un prompt de génération de portrait d'avatar fidèle (genre, âge, ethnicité, traits…).
 * Sert au mode « créer un avatar à partir d'une image » d'Avatar Studio.
 */
export async function describeAvatarFromImage(imageData: string): Promise<string> {
  if (!imageData) throw new Error('Aucune image à analyser')
  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.gemini,
    messages: [
      {
        role: 'system',
        content:
          "Tu es directeur de casting et prompt engineer. À partir d'une photo de personne, tu rédiges UN SEUL prompt de génération d'un portrait d'avatar fidèle, en français, détaillé : genre, tranche d'âge, ethnicité/carnation, coiffure et couleur de cheveux, traits du visage marquants, expression, style vestimentaire, ambiance et lumière. " +
          "Réponds uniquement par le prompt — aucune introduction, aucun méta-commentaire.",
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: "Décris cette personne sous forme d'un prompt de portrait d'avatar fidèle." },
          { type: 'image_url', image_url: { url: imageData } },
        ] as never,
      },
    ],
    temperature: 0.5,
    max_tokens: 400,
  })
  return (response.choices[0]?.message?.content ?? '').trim()
}
