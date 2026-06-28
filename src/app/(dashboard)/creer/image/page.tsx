import Link from 'next/link'
import { ArrowUpRight, Image as ImageIcon, Megaphone, GalleryHorizontalEnd, Package, Shirt } from 'lucide-react'
import { IMAGE_TEMPLATES } from '@/lib/templates/library'

// Résout 3 vignettes (URLs) depuis la bibliothèque d'images par id.
const pickImages = (ids: number[]): string[] =>
  ids.map((id) => IMAGE_TEMPLATES.find((t) => t.id === id)?.image).filter(Boolean) as string[]

// Types de création d'image (écran « Que veux-tu créer ? »)
const IMAGE_TYPES = [
  {
    id: 'image-creator',
    title: 'Créateur d\'image',
    desc: 'Crée des images à partir d\'un simple prompt texte.',
    icon: ImageIcon,
    href: '/creer/image/creator',
    images: pickImages([8, 15, 1]),
  },
  {
    id: 'static-ad',
    title: 'Pub statique',
    desc: 'Visuels promo nets et percutants pour pubs et campagnes.',
    icon: Megaphone,
    href: '/creer/image/statics',
    images: pickImages([12, 17, 7]),
  },
  {
    id: 'carousel',
    title: 'Carrousel',
    desc: 'Séquences d\'images cohérentes pour les carrousels social.',
    icon: GalleryHorizontalEnd,
    href: '/creer/image/carousel',
    images: pickImages([9, 4, 5]),
  },
  {
    id: 'product',
    title: 'Shooting produit',
    desc: 'Plans lifestyle stylisés mettant ton produit en valeur.',
    icon: Package,
    href: '/creer/image/product-photoshoot',
    images: pickImages([10, 19, 20]),
  },
  {
    id: 'fashion',
    title: 'Shooting mode',
    desc: 'Shootings mode pro avec mannequins portant tes vêtements ou accessoires.',
    icon: Shirt,
    href: '/creer/image/fashion-photoshoot',
    images: pickImages([3, 4, 15]),
  },
]

export default function CreerImagePage() {
  return (
    <div className="animate-fade-in max-w-[780px] mx-auto py-2">
      <h1 className="font-display font-extrabold text-[30px] tracking-tight text-text-primary mb-7">
        Que veux-tu créer&nbsp;?
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {IMAGE_TYPES.map(({ id, title, desc, icon: Icon, href, images }) => (
          <Link
            key={id}
            href={href}
            className="group relative rounded-neo-xl overflow-hidden border border-border bg-bg-card shadow-neo hover:shadow-neo-lg hover:-translate-y-0.5 transition-all min-h-[240px]"
          >
            {/* Collage — 3 vignettes décalées (vraies images, icône en secours) */}
            <div className="absolute inset-x-0 top-0 h-[58%] flex items-center justify-center gap-3 px-7">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-neo-md bg-bg-elevated border border-border flex items-center justify-center text-text-faint overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]"
                  style={{ width: 82, height: 106, marginTop: i === 1 ? 0 : 22 + i * 4 }}
                >
                  {images[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[i]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon size={22} />
                  )}
                </span>
              ))}
            </div>

            {/* Dégradé orange montant */}
            <div className="absolute inset-0 bg-gradient-to-t from-accent from-[40%] via-accent/70 to-transparent" />

            {/* Texte + flèche */}
            <div className="absolute inset-x-0 bottom-0 p-5">
              <ArrowUpRight size={20} className="absolute right-5 bottom-6 text-white/90 group-hover:scale-110 transition-transform" />
              <h3 className="font-display font-extrabold text-[19px] text-white leading-tight pr-8">{title}</h3>
              <p className="text-[13px] text-white/85 mt-1 pr-8 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
