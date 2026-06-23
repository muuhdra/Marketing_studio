// Bibliothèque de templates partagée — source unique de vérité pour la page
// « Templates » (sidebar) ET l'étape « Choose Templates » de Pub Statique.

export interface LibraryTemplate {
  id: number
  title: string
  image: string
  aspect: string
  category: string
}

// Catégories produit (verticales e-commerce / DTC) — liste de référence FR.
export const TEMPLATE_CATEGORIES = [
  'Mode & Vêtements',
  'Chaussures & Sneakers',
  'Beauté & Skincare',
  'Maquillage & Cosmétiques',
  'Parfums',
  'Cheveux & Coiffure',
  'Santé & Bien-être',
  'Sport & Fitness',
  'Compléments alimentaires',
  'Alimentation & Boissons',
  'Café & Thé',
  'Maison & Décoration',
  'Meubles',
  'Cuisine & Ustensiles',
  'Électronique & High-tech',
  'Accessoires téléphone',
  'Gaming',
  'Bébé & Enfants',
  'Jouets',
  'Animaux',
  'Bijoux & Montres',
  'Lunettes & Optique',
  'Sacs & Maroquinerie',
  'Voyage & Bagagerie',
  'Auto & Moto',
  'Jardin & Extérieur',
  'Bricolage & Outils',
  'Papeterie & Bureau',
  'Livres & Médias',
  'Art & Loisirs créatifs',
  'Bien-être sexuel',
  'CBD & Bien-être naturel',
]

// ─── Templates vidéo (masonry, portrait) ─────────────────────────────────────
export const VIDEO_TEMPLATES: { id: number; title: string; image: string; aspect: string }[] = [
  { id: 1,  title: 'Open World Rampage',                           image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=600&fit=crop',  aspect: 'aspect-[9/14]' },
  { id: 2,  title: 'UGC — Store Find',                            image: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?w=400&h=700&fit=crop',  aspect: 'aspect-[9/16]' },
  { id: 3,  title: '3D Animated — "The Mascot Squad" Explainer',  image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop',  aspect: 'aspect-[9/14]' },
  { id: 4,  title: 'ASMR — UGC Whisper',                          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',  aspect: 'aspect-[9/14]' },
  { id: 5,  title: 'Street Interview — Live Reaction / Blind Test', image: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?w=400&h=700&fit=crop', aspect: 'aspect-[9/16]' },
  { id: 6,  title: 'UGC Reaction Hook',                           image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=700&fit=crop',  aspect: 'aspect-[9/16]' },
  { id: 7,  title: 'Viral Meme — Stadium Goal',                   image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=650&fit=crop',  aspect: 'aspect-[9/15]' },
  { id: 8,  title: '3D Animation — "What Happens When…"',         image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=600&fit=crop',  aspect: 'aspect-[9/14]' },
  { id: 9,  title: 'Street Interview — Question & Answer',        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=700&fit=crop',  aspect: 'aspect-[9/16]' },
  { id: 10, title: 'Street Interview — Problem & Solution',       image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=700&fit=crop',  aspect: 'aspect-[9/16]' },
  { id: 11, title: 'Day-in-the-Life Vlog',                        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',  aspect: 'aspect-[9/14]' },
  { id: 12, title: 'POV Unboxing Hook',                           image: 'https://images.unsplash.com/photo-1549813069-f95e44d7f498?w=400&h=700&fit=crop',  aspect: 'aspect-[9/16]' },
]

// ─── Templates image (grille uniforme) ───────────────────────────────────────
// `category` = métadonnée de seed (vertical produit) pour le filtrage par onglet.
export const IMAGE_TEMPLATES: LibraryTemplate[] = [
  { id: 1,  title: 'Bienfaits — Confort menstruel',     image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=500&fit=crop', aspect: 'aspect-[4/5]',   category: 'Santé & Bien-être' },
  { id: 2,  title: 'Énergie sans caféine',     image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop', aspect: 'aspect-square',  category: 'Alimentation & Boissons' },
  { id: 3,  title: 'Lancement nouvelle taille',             image: 'https://images.unsplash.com/photo-1587556930799-8dca6fad6d41?w=400&h=420&fit=crop', aspect: 'aspect-[4/4.2]', category: 'Mode & Vêtements' },
  { id: 4,  title: 'Sac minimaliste de marque',           image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=350&fit=crop', aspect: 'aspect-[4/3.5]', category: 'Mode & Vêtements' },
  { id: 5,  title: 'Réassort — Sac',                 image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=320&fit=crop', aspect: 'aspect-[4/3.2]', category: 'Bijoux & Montres' },
  { id: 6,  title: 'Résultats sondage client',     image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=550&fit=crop', aspect: 'aspect-[4/5.5]', category: 'Bébé & Enfants' },
  { id: 7,  title: 'Offre produit',               image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=500&fit=crop', aspect: 'aspect-[4/5]',   category: 'Animaux' },
  { id: 8,  title: 'Focus ingrédient',        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=480&fit=crop', aspect: 'aspect-[4/4.8]', category: 'Beauté & Skincare' },
  { id: 9,  title: 'Offre — Collage sacs',           image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=420&fit=crop', aspect: 'aspect-[4/4.2]', category: 'Maison & Décoration' },
  { id: 10, title: 'Sac cabine',                image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=380&fit=crop', aspect: 'aspect-[4/3.8]', category: 'Électronique & High-tech' },
  { id: 11, title: 'Sommeil profond — Lifestyle',        image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=500&fit=crop', aspect: 'aspect-[4/5]',   category: 'Santé & Bien-être' },
  { id: 12, title: 'Offre spéciale produit',       image: 'https://images.unsplash.com/photo-1559181567-c3190ca9be46?w=400&h=480&fit=crop', aspect: 'aspect-[4/4.8]', category: 'Alimentation & Boissons' },
  { id: 13, title: 'Comparatif marché — Témoignage', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=450&fit=crop', aspect: 'aspect-[4/4.5]', category: 'Électronique & High-tech' },
  { id: 14, title: 'Message — Demande client',    image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=400&fit=crop', aspect: 'aspect-square',  category: 'Bébé & Enfants' },
  { id: 15, title: 'Transformation du regard',          image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=460&fit=crop', aspect: 'aspect-[4/4.6]', category: 'Beauté & Skincare' },
  { id: 16, title: 'Marre des douleurs aux pieds',  image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=380&fit=crop', aspect: 'aspect-[4/3.8]', category: 'Santé & Bien-être' },
  { id: 17, title: 'Offre',                      image: 'https://images.unsplash.com/photo-1542601098-3adb3baeb1ec?w=400&h=420&fit=crop', aspect: 'aspect-[4/4.2]', category: 'Maison & Décoration' },
  { id: 18, title: 'Témoignage produit',         image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=500&fit=crop', aspect: 'aspect-[4/5]',   category: 'Animaux' },
  { id: 19, title: 'Offre produit',               image: 'https://images.unsplash.com/photo-1581333100576-b73befd79b49?w=400&h=420&fit=crop', aspect: 'aspect-[4/4.2]', category: 'Bijoux & Montres' },
  { id: 20, title: 'Parfum Doux',               image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&h=450&fit=crop', aspect: 'aspect-[4/4.5]', category: 'Beauté & Skincare' },
]
