'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import ProductionTab from './tabs/ProductionTab'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { finalizeCampaign } from '@/lib/actions/wizard'
import { useToast } from '@/lib/stores/toastStore'

const STEPS = [
  { n: '✓', label: 'Config',     done: true,  active: false },
  { n: '✓', label: 'Clone Lab',  done: true,  active: false },
  { n: '3', label: 'Production', done: false, active: true  },
]

export default function SpecialeEtape3View() {
  const router = useRouter()
  const toast  = useToast()
  const { campaignId, reset } = useCampaignWizard()
  const [finalizing, setFinalizing] = useState(false)
  const leavingRef = useRef(false)

  // Guard : pas de projet créé → retour à l'étape 1 (sauf sortie volontaire)
  useEffect(() => {
    if (!campaignId && !leavingRef.current) {
      toast.error('Créez d\'abord votre projet à l\'étape 1')
      router.replace('/campagne/speciale/etape-1')
    }
  }, [campaignId, router, toast])

  async function handleFinalize() {
    if (!campaignId) return   // le guard redirige déjà — pas de finalisation fantôme
    setFinalizing(true)
    try {
      const updated = await finalizeCampaign(campaignId)
      toast.success('Campagne Spéciale lancée en production')
      leavingRef.current = true   // désarme le guard avant que reset() ne vide campaignId
      reset()
      router.push(`/campagne/${updated.id}`)
    } catch (e: any) {
      leavingRef.current = false
      toast.error(e?.message ?? 'Erreur lors de la finalisation')
      setFinalizing(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-9">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-neo-md border border-accent/40 bg-accent/10 flex items-center justify-center text-[18px] text-accent">
            ●
          </div>
          <div>
            <p className="font-sans text-[10px] font-bold text-accent uppercase tracking-widest mb-0.5">
              Campagne Spéciale · Étape 3/3
            </p>
            <h1 className="font-display font-bold text-[20px] text-text-primary">Production</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                  ${s.active ? 'bg-accent text-bg-base' : 'bg-purple/20 border border-border-purple text-purple'}`}>
                  {s.n}
                </div>
                <span className={`text-[12px] font-semibold ${s.active ? 'text-accent' : 'text-purple/60'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-7 h-px bg-border-purple" />
              )}
            </div>
          ))}
        </div>
      </div>

      <ProductionTab />

      {/* Footer */}
      <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
        <Button variant="ghost" onClick={() => router.push('/campagne/speciale/etape-2')}>
          ← Clone Lab
        </Button>
        <Button onClick={handleFinalize} loading={finalizing}>
          Finaliser la Campagne →
        </Button>
      </div>
    </div>
  )
}
