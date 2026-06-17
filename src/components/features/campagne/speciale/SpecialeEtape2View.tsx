'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import CloneLabTab from './tabs/CloneLabTab'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { useToast } from '@/lib/stores/toastStore'

const STEPS = [
  { n: '✓', label: 'Config',    done: true,  active: false },
  { n: '2', label: 'Clone Lab', done: false, active: true  },
  { n: '3', label: 'Production', done: false, active: false },
]

export default function SpecialeEtape2View() {
  const router = useRouter()
  const toast  = useToast()
  const campaignId = useCampaignWizard((s) => s.campaignId)

  // Guard : pas de projet créé → retour à l'étape 1
  useEffect(() => {
    if (!campaignId) {
      toast.error('Créez d\'abord votre projet à l\'étape 1')
      router.replace('/campagne/speciale/etape-1')
    }
  }, [campaignId, router, toast])

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-9">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-neo-md border border-border-purple bg-purple/15 flex items-center justify-center text-[18px] text-purple">
            ●
          </div>
          <div>
            <p className="font-sans text-[10px] font-bold text-purple uppercase tracking-widest mb-0.5">
              Campagne Spéciale · Étape 2/3
            </p>
            <h1 className="font-display font-bold text-[20px] text-text-primary">Clone Lab</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                  ${s.done ? 'bg-purple/20 border border-border-purple text-purple' : s.active ? 'bg-purple text-bg-base' : 'bg-bg-surface border border-border text-text-dim'}`}>
                  {s.n}
                </div>
                <span className={`text-[12px] font-semibold ${s.active ? 'text-purple' : s.done ? 'text-purple/60' : 'text-text-dim'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-7 h-px ${s.done ? 'bg-border-purple' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <CloneLabTab />

      {/* Footer */}
      <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
        <Button variant="ghost" onClick={() => router.push('/campagne/speciale/etape-1')}>
          ← Retour Configuration
        </Button>
        <Button variant="secondary" onClick={() => router.push('/campagne/speciale/etape-3')}>
          Production →
        </Button>
      </div>
    </div>
  )
}
