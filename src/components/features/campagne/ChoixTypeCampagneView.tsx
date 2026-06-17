'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'

const TYPES = [
  {
    href: '/campagne/etape-1',
    icon: '',
    title: 'Campagne Générale',
    desc: 'Le format classique en 4 étapes. Créez des campagnes structurées, définissez l\'ADN de la marque, générez des avatars et des contenus variés (UGC, Motion, etc.).',
    cta: 'Démarrer le pipeline →',
    border: 'border-accent',
    shadow: 'shadow-neo',
    iconBg: 'bg-accent/10 border-accent/30',
    iconColor: 'text-accent',
    ctaColor: 'text-accent',
    badge: null,
  },
  {
    href: '/campagne/speciale/etape-1',
    icon: '●',
    title: 'Campagne Spéciale',
    desc: 'Un format dédié pour notre toute nouvelle fonctionnalité. Expérience optimisée, workflow spécifique et outils de génération avancés.',
    cta: 'Découvrir la nouvelle feature →',
    border: 'border-border-purple',
    shadow: '',
    iconBg: 'bg-purple/15 border-border-purple',
    iconColor: 'text-purple',
    ctaColor: 'text-purple',
    badge: 'Nouveau',
  },
]

export default function ChoixTypeCampagneView() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const reset   = useCampaignWizard((s) => s.reset)
  const setStep1 = useCampaignWizard((s) => s.setStep1)

  // ADN en attente (depuis la Stratégie) : consommé AU MOUNT (lecture + suppression)
  // → lié à cette visite. Si l'utilisateur abandonne, plus de fuite vers une campagne ultérieure.
  const pendingDnaRef = useRef<string | null>(null)
  useEffect(() => {
    const dna = sessionStorage.getItem('pending-campaign-dna')
    if (dna) { pendingDnaRef.current = dna; sessionStorage.removeItem('pending-campaign-dna') }
  }, [])

  // Choisir un type = nouveau projet → on repart d'un store propre
  // (évite que le nom/ADN/dates d'un flux précédent contaminent l'autre)
  function startCampaign(href: string) {
    reset()
    // Date de début pré-remplie (depuis le Calendrier : ?start=YYYY-MM-DD)
    const start = searchParams.get('start')
    if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) setStep1({ startDate: start })
    // ADN pré-rempli (depuis la Stratégie) — consommé au mount
    if (pendingDnaRef.current) setStep1({ dnaText: pendingDnaRef.current })
    router.push(href)
  }

  return (
    <div className="animate-fade-in max-w-[900px] mx-auto pt-10">
      <div className="text-center mb-14">
        <p className="nb-label mb-3">Nouveau Projet</p>
        <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary mb-4">
          Quel type de campagne ?
        </h1>
        <p className="text-[14px] text-text-muted max-w-[460px] mx-auto leading-relaxed">
          Sélectionnez le type de campagne que vous souhaitez déployer.
          L'infrastructure s'adaptera automatiquement à vos besoins.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-7">
        {TYPES.map((t) => (
          <button
            key={t.href}
            type="button"
            onClick={() => startCampaign(t.href)}
            className="group block w-full h-full text-left"
          >
            <div className={`
              relative flex flex-col h-full bg-bg-card border ${t.border} rounded-neo-lg p-10
              transition-all duration-150
              group-hover:${t.shadow} group-hover:border-border-strong
            `}>
              {/* Badge */}
              {t.badge && (
                <div className="absolute top-6 right-6">
                  <Badge variant="purple">{t.badge}</Badge>
                </div>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 rounded-neo-lg border ${t.iconBg} flex items-center justify-center ${t.iconColor} text-2xl mb-7`}>
                {t.icon}
              </div>

              <h2 className="font-display font-bold text-[22px] text-text-primary mb-3">
                {t.title}
              </h2>
              <p className="text-[13.5px] text-text-muted leading-relaxed mb-9 flex-1">
                {t.desc}
              </p>
              <div className={`flex items-center gap-2 text-[13px] font-bold ${t.ctaColor} group-hover:gap-3 transition-all duration-100`}>
                {t.cta}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
