// Traits de mannequins « Shooting Mode » — source unique, client-safe (action serveur ET UI).
// La nationalité couvre la diversité ethnique/carnation ; gender & body affinent la génération.

export interface Nationality { name: string; flag: string }

export const MODEL_NATIONALITIES: Nationality[] = [
  { name: 'American',   flag: '🇺🇸' },
  { name: 'British',    flag: '🇬🇧' },
  { name: 'French',     flag: '🇫🇷' },
  { name: 'Italian',    flag: '🇮🇹' },
  { name: 'Spanish',    flag: '🇪🇸' },
  { name: 'German',     flag: '🇩🇪' },
  { name: 'Brazilian',  flag: '🇧🇷' },
  { name: 'Mexican',    flag: '🇲🇽' },
  { name: 'Japanese',   flag: '🇯🇵' },
  { name: 'Korean',     flag: '🇰🇷' },
  { name: 'Chinese',    flag: '🇨🇳' },
  { name: 'Filipino',   flag: '🇵🇭' },
  { name: 'Vietnamese', flag: '🇻🇳' },
  { name: 'Indian',     flag: '🇮🇳' },
  { name: 'Pakistani',  flag: '🇵🇰' },
  { name: 'Moroccan',   flag: '🇲🇦' },
  { name: 'Nigerian',   flag: '🇳🇬' },
  { name: 'Ethiopian',  flag: '🇪🇹' },
  { name: 'Kenyan',     flag: '🇰🇪' },
  { name: 'Senegalese', flag: '🇸🇳' },
]

export const MODEL_GENDERS = ['Female', 'Male'] as const
export const MODEL_BODY_TYPES = ['Slim', 'Athletic', 'Curvy', 'Plus-size', 'Petite', 'Tall'] as const
// Carnations (mains & peau) — claires comme profondes.
export const MODEL_SKIN_TONES = ['porcelain fair', 'light beige', 'medium olive', 'golden tan', 'warm brown', 'deep brown', 'rich dark ebony', 'dark mahogany'] as const

// Poses « catalogue e-commerce » — neutres/assurées, variées (cf. références).
export const MODEL_POSES = [
  'standing in a relaxed neutral pose, hands resting at the sides',
  'arms crossed confidently, looking at the camera',
  'one hand gently adjusting the t-shirt neckline',
  'hands clasped behind the back, upright posture',
  'a subtle three-quarter turn while looking at the camera',
  'one hand resting on the hip, relaxed shoulders',
] as const

// Teintes neutres de t-shirt uni.
export const MODEL_TSHIRT_TONES = ['white', 'cream', 'light grey', 'beige', 'off-white'] as const

export function nationalityFlag(name: string | null | undefined): string {
  return MODEL_NATIONALITIES.find((n) => n.name === name)?.flag ?? ''
}

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
