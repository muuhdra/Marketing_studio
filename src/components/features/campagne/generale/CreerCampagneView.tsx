'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { createCampaign } from '@/lib/actions/campaigns'
import { useToast } from '@/lib/stores/toastStore'

export default function CreerCampagneView() {
  const router = useRouter()
  const toast  = useToast()
  const { step1, setStep1, setCampaignId, reset } = useCampaignWizard()

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleNext() {
    if (!step1.name.trim()) { setError('Le nom de la campagne est requis.'); return }
    setSaving(true); setError(null)
    try {
      const campaign = await createCampaign({
        name:                step1.name.trim(),
        campaignType:        step1.campaignType,
        startDate:           step1.startDate   || undefined,
        endDate:             step1.endDate     || undefined,
        preCampaignEnabled:  step1.preCampaignEnabled,
        preCampaignStart:    step1.preCampaignStart || undefined,
        postCampaignEnabled: step1.postCampaignEnabled,
      })
      setCampaignId(campaign.id)
      toast.success(`Campagne "${campaign.name}" créée ✓`)
      router.push('/campagne/etape-2')
    } catch (e: any) {
      const msg = e.message ?? 'Erreur lors de la sauvegarde'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <StepBar current={1} />

      <div className="max-w-[840px] mx-auto pt-2 pb-16">

        <div className="mb-7">
          <h1 className="font-display font-bold text-[22px] tracking-tight text-text-primary mb-1">
            Créer la Campagne
          </h1>
          <p className="text-[13px] text-text-muted">
            Définissez l'identité, le contexte et les paramètres de votre campagne
          </p>
        </div>

        {/* Nom */}
        <div className="mb-5 max-w-[500px]">
          <Input
            label="* Nom de la campagne"
            placeholder="Ex: Sneakers Spring Drop 2026"
            value={step1.name}
            onChange={(e) => setStep1({ name: e.target.value })}
          />
        </div>

        {/* ADN + Assets */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="nb-label">* ADN de la Campagne</span>
              <span className="font-mono text-[9px] font-bold text-teal border border-border-teal px-2 py-0.5 rounded-neo">CŒUR</span>
            </div>
            <div
              onClick={() => setStep1({ dnaFileName: step1.dnaFileName ? null : 'document_adn.pdf' })}
              className={`flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-neo-lg p-6 cursor-pointer transition-all duration-150 ${step1.dnaFileName ? 'border-teal bg-teal/5 shadow-neo-teal' : 'border-border-teal bg-teal/[0.03] hover:bg-teal/5 hover:border-teal'}`}
            >
              {step1.dnaFileName ? (
                <>
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-mono text-[12px] font-bold text-teal mb-1">{step1.dnaFileName}</div>
                  <div className="font-mono text-[10px] text-text-dim">Cliquez pour remplacer</div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-neo-md border-2 border-border-teal flex items-center justify-center text-teal text-lg mb-3">📄</div>
                  <div className="text-[12px] text-teal font-medium mb-1">Glissez votre document ici</div>
                  <div className="font-mono text-[10px] text-text-dim mb-3">PDF, Word (.docx) ou Markdown (.md)</div>
                  <span className="nb-btn-secondary text-xs px-3 py-1.5 !border-border-teal !text-teal">Parcourir</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="nb-label mb-2">Assets de la Campagne</span>
            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-neo-lg p-6 cursor-pointer hover:border-border-strong hover:bg-white/[0.02] transition-all duration-150">
              <div className="text-2xl text-text-dim mb-2">☁</div>
              <div className="text-[12px] text-text-muted leading-relaxed">Glissez vos fichiers ici<br /><span className="text-text-dim">Images, charte, visuels</span></div>
            </div>
            <div className="flex gap-2 mt-2">
              <input type="text" className="nb-input flex-1 text-[13px] py-2 px-3" placeholder="Lien (Notion, Drive...)" />
              <button className="nb-btn-secondary text-xs px-3 whitespace-nowrap">🔗 Importer</button>
            </div>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
          ⚙ Paramètres de la Campagne
        </Button>

        {error && (
          <div className="mt-4 bg-coral/5 border-2 border-coral/30 rounded-neo px-4 py-2.5">
            <p className="font-mono text-[11px] text-coral">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-7 pt-5 border-t-2 border-border">
          <Button variant="ghost" onClick={() => { reset(); router.push('/dashboard') }}>← Dashboard</Button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-dot" />
              Sauvegarde auto
            </span>
            <Button onClick={handleNext} loading={saving} disabled={!step1.name.trim()}>
              Suivant — Choisir les Contenus →
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Paramètres */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in" onClick={() => setSettingsOpen(false)}>
          <div className="w-full max-w-[540px] bg-bg-card border-2 border-border rounded-neo-lg overflow-hidden shadow-[5px_5px_0px_rgba(200,245,90,0.3)] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-border">
              <div className="font-display font-bold text-[14px] flex items-center gap-2"><span className="text-accent">⚙</span> Paramètres de la Campagne</div>
              <button onClick={() => setSettingsOpen(false)} className="nb-btn-ghost w-7 h-7 p-0 text-lg">×</button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {([['Début campagne', 'startDate'], ['Fin campagne', 'endDate']] as const).map(([label, field]) => (
                  <div key={field}>
                    <label className="nb-label block mb-1.5">{label}</label>
                    <input type="date" value={step1[field]} onChange={(e) => setStep1({ [field]: e.target.value })} className="nb-input text-[13px] py-2 px-3" />
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">⏮ Mode Pré-Campagne</div>
                    <div className="font-mono text-[11px] text-text-dim">Génère storyline & ads avant le lancement</div>
                  </div>
                  <button onClick={() => setStep1({ preCampaignEnabled: !step1.preCampaignEnabled })}
                    className={`relative w-10 h-5 rounded-neo border-2 transition-all flex-shrink-0 ${step1.preCampaignEnabled ? 'bg-accent border-accent' : 'bg-bg-base border-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all ${step1.preCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`} />
                  </button>
                </div>
              </div>
              <div className="border-t-2 border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">📈 Mode Post-Campagne</div>
                    <div className="font-mono text-[11px] text-text-dim">Paramétrable à la fin de la campagne</div>
                  </div>
                  <button onClick={() => setStep1({ postCampaignEnabled: !step1.postCampaignEnabled })}
                    className={`relative w-10 h-5 rounded-neo border-2 transition-all flex-shrink-0 ${step1.postCampaignEnabled ? 'bg-teal border-border-teal' : 'bg-bg-base border-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all ${step1.postCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t-2 border-border bg-bg-surface flex justify-end">
              <Button onClick={() => setSettingsOpen(false)} size="sm">Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
