import Link from 'next/link'
import { ArrowUpRight, Image as ImageIcon, Megaphone, GalleryHorizontalEnd, Package, Shirt } from 'lucide-react'

// Types de création d'image (écran « Que veux-tu créer ? »)
const IMAGE_TYPES = [
  {
    id: 'image-creator',
    title: 'Créateur d\'image',
    desc: 'Crée des images à partir d\'un simple prompt texte.',
    icon: ImageIcon,
    href: '/creer/image/creator',
  },
  {
    id: 'static-ad',
    title: 'Pub statique',
    desc: 'Visuels promo nets et percutants pour pubs et campagnes.',
    icon: Megaphone,
    href: '/creer/image/statics',
  },
  {
    id: 'carousel',
    title: 'Carrousel',
    desc: 'Séquences d\'images cohérentes pour les carrousels social.',
    icon: GalleryHorizontalEnd,
    href: '/creer/image/carousel',
  },
  {
    id: 'product',
    title: 'Shooting produit',
    desc: 'Plans lifestyle stylisés mettant ton produit en valeur.',
    icon: Package,
    href: '/creer/image/product-photoshoot',
  },
  {
    id: 'fashion',
    title: 'Shooting mode',
    desc: 'Shootings mode pro avec mannequins portant tes vêtements ou accessoires.',
    icon: Shirt,
    href: '/creer/image/fashion-photoshoot',
  },
]

export default function CreerImagePage() {
  return (
    <div className="animate-fade-in max-w-[920px] mx-auto py-2">
      <h1 className="font-display font-extrabold text-[30px] tracking-tight text-text-primary mb-7">
        Que veux-tu créer&nbsp;?
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {IMAGE_TYPES.map(({ id, title, desc, icon: Icon, href }) => (
          <Link
            key={id}
            href={href}
            className="group relative rounded-neo-xl overflow-hidden border border-border bg-bg-card shadow-neo hover:shadow-neo-lg hover:-translate-y-0.5 transition-all min-h-[320px]"
          >
            {/* Collage (placeholder — 3 vignettes décalées) */}
            <div className="absolute inset-x-0 top-0 h-[58%] flex items-center justify-center gap-3 px-7">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-neo-md bg-bg-elevated border border-border flex items-center justify-center text-text-faint overflow-hidden"
                  style={{ width: 92, height: 116, marginTop: i === 1 ? 0 : 22 + i * 4 }}
                >
                  <Icon size={26} />
                </span>
              ))}
            </div>

            {/* Dégradé orange montant */}
            <div className="absolute inset-0 bg-gradient-to-t from-accent from-[40%] via-accent/70 to-transparent" />

            {/* Texte + flèche */}
            <div className="absolute inset-x-0 bottom-0 p-6">
              <ArrowUpRight size={24} className="absolute right-6 bottom-7 text-white/90 group-hover:scale-110 transition-transform" />
              <h3 className="font-display font-extrabold text-[22px] text-white leading-tight pr-8">{title}</h3>
              <p className="text-[13px] text-white/85 mt-1.5 pr-8 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
