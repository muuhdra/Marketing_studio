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
import { parseJsonLoose } from './json'

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
/**
 * Analyse l'image d'un PRODUIT (uploadée) → identifie le produit ET propose un décor/contexte
 * réaliste qui lui correspond. Sert à générer un shooting cohérent (au lieu d'un fond fake).
 * Retourne { product, background } — phrases courtes en anglais (meilleur pour Nano Banana).
 */
export interface ProductScene {
  product:    string   // identification du produit
  background: string   // décor/contexte cohérent
  holding:    string   // geste/posture pour tenir/présenter CE produit
  styling:    string   // styling/tenue/ambiance du modèle adaptés au produit
}
export async function describeProductScene(input: { imageUrl?: string; imageData?: string }): Promise<ProductScene> {
  const visual = input.imageData || input.imageUrl
  if (!visual) throw new Error('Aucune image produit à analyser')
  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.gemini,
    messages: [
      {
        role: 'system',
        content:
          'You are a product photographer and art director directing a lifestyle product shoot. From a product photo, return a coherent creative direction for a shot of a person (or hand) holding/using THIS product. Produce four short English fields:\n' +
          '- product: concise identification of the product.\n' +
          '- background: a realistic environment that MATCHES the product (skincare → soft bathroom vanity / spa; food → kitchen / cozy table; tech gadget → modern desk; jewelry → elegant boutique; sportswear → gym / outdoor; etc.).\n' +
          '- holding: a short verb phrase for a natural, professional gesture that puts THE PRODUCT FRONT AND CENTER as the hero — product fully visible, unobstructed and clearly presented toward the camera, hand relaxed and elegant, fingers NOT covering the label or brand (e.g. "holding the bottle upright presented toward camera, label facing forward", "raising the watch on the wrist toward camera to showcase the dial", "gently presenting the jar on an open palm", "holding the phone up displaying its screen"). Avoid hiding or gripping the product awkwardly.\n' +
          '- styling: the talent\'s wardrobe and vibe that suit the product category (e.g. "cozy robe, fresh dewy skin" for skincare, "activewear, athletic" for sports, "elegant evening outfit" for jewelry).\n' +
          'Reply ONLY with strict minified JSON: {"product":"...","background":"...","holding":"...","styling":"..."}. No extra text.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Direct a lifestyle shot for this product: identify it, and give a matching background, holding gesture and talent styling.' },
          { type: 'image_url', image_url: { url: visual } },
        ] as never,
      },
    ],
    temperature: 0.6,
    max_tokens: 260,
  })
  const parsed = parseJsonLoose<Partial<ProductScene>>(response.choices[0]?.message?.content)
  return {
    product:    (parsed.product    ?? 'the product').toString().trim(),
    background: (parsed.background ?? 'a styled environment that matches the product').toString().trim(),
    holding:    (parsed.holding    ?? 'naturally holding the product toward the camera').toString().trim(),
    styling:    (parsed.styling    ?? 'styled to suit the product').toString().trim(),
  }
}

/**
 * Suggère une SCÈNE/décor d'arrière-plan pour un shooting mode, à partir de l'image du
 * vêtement/accessoire (+ image du mannequin et ses paramètres) → description prête pour le champ.
 */
export async function suggestFashionScene(input: {
  clothingUrl?: string
  modelUrl?: string
  garmentType?: string   // apparel | accessory
  modelHint?: string     // ex. "Japanese male, athletic, upper body shot"
  description?: string   // description produit saisie par l'utilisateur
}): Promise<string> {
  const visuals = [input.clothingUrl, input.modelUrl].filter((v): v is string => !!v)
  if (visuals.length === 0) throw new Error('Aucun visuel à analyser')
  const client = createAimlClient()
  const response = await client.chat.completions.create({
    model: MODELS.text.gemini,
    messages: [
      {
        role: 'system',
        content:
          'You are a fashion art director. From the garment/accessory photo (and the model context), write ONE vivid background scene for an editorial fashion photoshoot that complements the product and the model. ' +
          'Describe ONLY the environment: location, lighting, mood, time of day, optional props — never the person or the garment itself. 1 to 2 sentences, English, evocative and shoot-ready. ' +
          'Reply with the scene description only — no quotes, no preamble, no bullet points.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Garment type: ${input.garmentType ?? 'apparel'}. Model: ${input.modelHint ?? 'a fashion model'}.${input.description ? ` Product description: ${input.description}.` : ''} Suggest a matching background scene.` },
          ...visuals.map((url) => ({ type: 'image_url', image_url: { url } })),
        ] as never,
      },
    ],
    temperature: 0.8,
    max_tokens: 160,
  })
  return (response.choices[0]?.message?.content ?? '').trim()
}

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
