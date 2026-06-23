// Config partagée des options d'apparence (étape « Apparence du personnage »).
// Utilisée à la fois par l'UI (vignettes) et par le générateur d'illustrations serveur.
// Les illustrations sont des photos générées (modèle Black / afro-américain), déclinées
// par genre (homme/femme) et stockées dans le bucket public `templates` :
//   appearance/{category}/{gender}/{slug}.png

export type AppearanceGender = 'male' | 'female'

export type AppearanceOptionDef = {
  label:    string          // libellé FR affiché
  slug?:    string          // identifiant fichier (absent pour « Personnalisé »)
  promptEn?: string         // descripteur EN pour la génération d'image
  gradient?: string         // placeholder avant génération
  custom?:  boolean
}

export type AppearanceCategoryDef = {
  key:     string
  slug:    string           // dossier de stockage
  title:   string           // titre FR
  framing: string           // cadrage du portrait pour la génération
  objectPosition?: string   // classe object-position pour l'affichage de la vignette
  options: AppearanceOptionDef[]
}

// URL publique stable d'une illustration (bucket public → pas de signature).
export function appearanceImg(categorySlug: string, gender: AppearanceGender, optionSlug: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/templates/appearance/${categorySlug}/${gender}/${optionSlug}.png`
}

const hairStyle: AppearanceCategoryDef = {
  key: 'hairStyle',
  slug: 'hair-style',
  title: 'Coiffure',
  framing: 'ID-style headshot portrait, head and shoulders, facing the camera',
  options: [
    { label: 'Longs ondulés',    slug: 'long-wavy',       promptEn: 'long wavy hair',                  gradient: 'linear-gradient(180deg, #b9b0a8 0%, #7e7169 56%, #171717 100%)' },
    { label: 'Coupe rasée',      slug: 'buzz-cut',        promptEn: 'very short buzz cut hair',         gradient: 'linear-gradient(180deg, #d1d1d1 0%, #9d9d9d 56%, #252525 100%)' },
    { label: 'Chignon décoiffé', slug: 'messy-bun',       promptEn: 'messy bun hairstyle',              gradient: 'linear-gradient(180deg, #b8b2aa 0%, #867568 56%, #1f1b19 100%)' },
    { label: 'Nuque longue',     slug: 'mullet',          promptEn: 'mullet hairstyle',                 gradient: 'linear-gradient(180deg, #c4beb5 0%, #847767 56%, #22201d 100%)' },
    { label: 'Mèches rideau',    slug: 'curtain-layers',  promptEn: 'curtain bangs layered hairstyle',  gradient: 'linear-gradient(180deg, #c6beb4 0%, #8a7c71 56%, #202020 100%)' },
    { label: 'Chauve',           slug: 'bald',            promptEn: 'completely bald shaved head, no hair', gradient: 'linear-gradient(180deg, #ddd8d2 0%, #ad9a8c 56%, #232323 100%)' },
    { label: 'Dreadlocks',       slug: 'dreadlocks',      promptEn: 'dreadlocks hairstyle',             gradient: 'linear-gradient(180deg, #b2aea7 0%, #6b5a4a 56%, #1a1613 100%)' },
    { label: 'Personnalisé', custom: true },
  ],
}

const hairColor: AppearanceCategoryDef = {
  key: 'hairColor',
  slug: 'hair-color',
  title: 'Couleur des cheveux',
  framing: 'ID-style headshot portrait, head and shoulders, facing the camera',
  options: [
    { label: 'Noir',  slug: 'black',  promptEn: 'jet black hair',     gradient: 'linear-gradient(180deg, #c9c9c9 0%, #747474 56%, #050505 100%)' },
    { label: 'Blond', slug: 'blonde', promptEn: 'blonde dyed hair',   gradient: 'linear-gradient(180deg, #ded8c9 0%, #c5a66f 56%, #33271b 100%)' },
    { label: 'Roux',  slug: 'red',    promptEn: 'red ginger dyed hair', gradient: 'linear-gradient(180deg, #cfc5b9 0%, #a95b29 56%, #2b1510 100%)' },
    { label: 'Brun',  slug: 'brown',  promptEn: 'dark brown hair',    gradient: 'linear-gradient(180deg, #cac4bb 0%, #6d5541 56%, #1c1510 100%)' },
    { label: 'Gris',  slug: 'gray',   promptEn: 'gray silver hair',   gradient: 'linear-gradient(180deg, #dbdbdb 0%, #9c9c9c 56%, #292929 100%)' },
    { label: 'Personnalisé', custom: true },
  ],
}

const eyes: AppearanceCategoryDef = {
  key: 'eyes',
  slug: 'eyes',
  title: 'Yeux',
  framing: 'close-up crop of ONE HALF of the face only — showing a single eye wide open, the eyebrow above it, the side of the nose and the cheek, framed from mid-forehead down to mid-cheek — the eye and its iris in sharp focus and clearly visible',
  objectPosition: 'object-center',
  options: [
    { label: 'Bleus',    slug: 'blue',  promptEn: 'bright blue eyes' },
    { label: 'Noirs',    slug: 'black', promptEn: 'very dark brown almost black eyes' },
    { label: 'Marron',   slug: 'brown', promptEn: 'warm brown eyes' },
    { label: 'Noisette', slug: 'hazel', promptEn: 'hazel eyes' },
    { label: 'Personnalisé', custom: true },
  ],
}

const facialHair: AppearanceCategoryDef = {
  key: 'facialHair',
  slug: 'facial-hair',
  title: 'Pilosité faciale',
  framing: 'close-up crop on the lower face (mouth, chin and jaw)',
  options: [
    { label: 'Barbe de 3 jours', slug: 'stubble',      promptEn: 'light stubble beard' },
    { label: 'Bouc',             slug: 'goatee',       promptEn: 'goatee beard' },
    { label: 'Moustache',        slug: 'mustache',     promptEn: 'handlebar mustache' },
    { label: 'Barbe fournie',    slug: 'full-beard',   promptEn: 'full thick beard' },
    { label: 'Barbe clairsemée', slug: 'patchy-beard', promptEn: 'patchy uneven beard' },
    { label: 'Personnalisé', custom: true },
  ],
}

const skinDetail: AppearanceCategoryDef = {
  key: 'skinDetail',
  slug: 'skin-details',
  title: 'Détails de peau',
  framing: 'ID-style headshot portrait, head and shoulders, facing the camera',
  options: [
    { label: 'Peau nette',         slug: 'flawless',      promptEn: 'flawless smooth clear skin' },
    { label: 'Cicatrices d’acné',  slug: 'acne-scars',    promptEn: 'acne scarred skin texture' },
    { label: 'Pores visibles',     slug: 'visible-pores', promptEn: 'visible skin pores texture' },
    { label: 'Rosacée',            slug: 'rosacea',       promptEn: 'rosacea redness on the skin' },
    { label: 'Taches de rousseur', slug: 'freckles',      promptEn: 'freckled skin' },
    { label: 'Grain de beauté',    slug: 'mole',          promptEn: 'a prominent mole on the cheek' },
    { label: 'Rides',              slug: 'wrinkles',      promptEn: 'wrinkled aged skin' },
    { label: 'Personnalisé', custom: true },
  ],
}

export const appearanceCategories: AppearanceCategoryDef[] = [hairStyle, hairColor, eyes, facialHair, skinDetail]

// Prompt complet d'une illustration : modèle Black / afro-américain, genre + trait + cadrage.
export function buildAppearancePrompt(cat: AppearanceCategoryDef, opt: AppearanceOptionDef, gender: AppearanceGender): string {
  const who = gender === 'male' ? 'a Black African-American man' : 'a Black African-American woman'
  return [
    `Professional ${cat.framing} of ${who} with ${opt.promptEn}.`,
    'Dark brown skin tone, photorealistic, authentic, neutral seamless studio background, even soft lighting, sharp focus.',
    'No text, no watermark.',
  ].join(' ')
}
