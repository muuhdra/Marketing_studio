'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { createCampaign } from '@/lib/actions/campaigns'
import { useToast } from '@/lib/stores/toastStore'

const STEPS = [
  { n: '1', label: 'Config',     active: true,  done: false },
  { n: '2', label: 'Clone Lab',  active: false, done: false },
  { n: '3', label: 'Production', active: false, done: false },
]

export default function SpecialeEtape1View() {
  const router = useRouter()
  const toast  = useToast()
  const { step1, setStep1, setCampaignId, reset } = useCampaignWizard()

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adnFile, setAdnFile]           = useState<string | null>(null)
  const [visualFiles, setVisualFiles]   = useState<string[]>([])
  const [webLink, setWebLink]           = useState('')

  async function handleNext() {
    if (!step1.name.trim()) { setError('Le nom du projet est requis.'); return }
    setSaving(true); setError(null)
    try {
      const campaign = await createCampaign({
        name:                step1.name.trim(),
        campaignType:        'speciale',
        startDate:           step1.startDate   || undefined,
        endDate:             step1.endDate     || undefined,
        preCampaignEnabled:  step1.preCampaignEnabled,
        preCampaignStart:    step1.preCampaignStart || undefined,
        postCampaignEnabled: step1.postCampaignEnabled,
      })
      setCampaignId(campaign.id)
      toast.success(`Projet "${campaign.name}" créé ✓`)
      router.push('/campagne/speciale/etape-2')
    } catch (e: any) {
      const msg = e.message ?? 'Erreur lors de la création'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-neo-md border-2 border-border-purple bg-purple/15 flex items-center justify-center text-[18px] text-purple">
            ⎈
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold text-purple uppercase tracking-widest mb-0.5">
              Campagne Spéciale · Étape 1/3
            </p>
            <h1 className="font-display font-bold text-[20px] text-text-primary">Configuration Initiale</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                  ${s.active ? 'bg-purple text-bg-base' : 'bg-bg-surface border border-border text-text-dim'}`}>
                  {s.n}
                </div>
                <span className={`text-[12px] font-semibold ${s.active ? 'text-purple' : 'text-text-dim'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-7 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[840px] mx-auto pb-20">

        {/* Nom */}
        <div className="mb-8 max-w-[500px]">
          <Input
            label="* Nom du Projet"
            placeholder="Ex: Lancement Produit Clone X"
            value={step1.name}
            onChange={(e) => setStep1({ name: e.target.value })}
          />
        </div>

        {/* ADN + Visuels */}
        <div className="grid grid-cols-2 gap-5 mb-7">

          {/* ADN */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="nb-label">* ADN de la Campagne</span>
              <span className="font-mono text-[9px] font-bold text-purple border border-border-purple px-2 py-0.5 rounded-neo">CŒUR</span>
            </div>
            <div
              onClick={() => setAdnFile(adnFile ? null : 'brief_campagne.pdf')}
              className={`
                flex flex-col items-center justify-center text-center
                border-2 border-dashed rounded-neo-lg px-5 py-10 cursor-pointer
                transition-all duration-150
                ${adnFile
                  ? 'border-border-purple bg-purple/5'
                  : 'border-border-purple/30 bg-purple/[0.02] hover:bg-purple/5 hover:border-border-purple'
                }
              `}
            >
              {adnFile ? (
                <>
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-mono text-[12px] font-bold text-purple mb-1">{adnFile}</div>
                  <div className="font-mono text-[10px] text-text-dim">Cliquez pour remplacer</div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-neo-md border-2 border-border-purple bg-purple/10 flex items-center justify-center text-xl mb-4 text-purple">📄</div>
                  <div className="text-[13px] font-medium text-purple mb-1">Déposez le document ADN</div>
                  <div className="font-mono text-[10px] text-text-dim">PDF, DOCX, Markdown</div>
                </>
              )}
            </div>
          </div>

          {/* Visuels */}
          <div>
            <span className="nb-label block mb-2.5">Visuels & Charte Graphique</span>
            <div
              onClick={() => setVisualFiles(visualFiles.length > 0 ? [] : ['moodboard.png', 'brand_kit.zip'])}
              className="flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-neo-lg px-5 py-10 cursor-pointer hover:border-border-strong hover:bg-bg-elevated transition-all duration-150"
            >
              {visualFiles.length > 0 ? (
                <>
                  <div className="text-3xl mb-2">🖼️</div>
                  {visualFiles.map((f) => (
                    <div key={f} className="text-[12px] text-text-secondary mb-1">{f}</div>
                  ))}
                  <div className="font-mono text-[10px] text-text-dim mt-2">+ Ajouter d'autres</div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-neo-md border-2 border-border bg-bg-elevated flex items-center justify-center text-xl mb-4 text-text-dim">🖼️</div>
                  <div className="text-[13px] font-medium text-text-muted mb-1">Images, moodboards, charte</div>
                  <div className="font-mono text-[10px] text-text-dim">PNG, JPG, SVG, ZIP</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lien web */}
        <div className="mb-9">
          <label className="nb-label block mb-2.5">🔗 Lien Web Complémentaire</label>
          <div className="flex gap-3">
            <input
              type="url"
              className="nb-input flex-1 text-[13px] py-2.5 px-3.5"
              placeholder="https://notion.so/mon-brief · Drive, Figma, Loom..."
              value={webLink}
              onChange={(e) => setWebLink(e.target.value)}
            />
            <button className="nb-btn-secondary px-4 text-[12px] whitespace-nowrap">Ajouter</button>
          </div>
        </div>

        {/* Paramètres */}
        <div className="mb-10">
          <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
            ⚙ Paramètres de la campagne
            <span className="text-[10px] text-text-dim ml-1.5 font-normal">(dates, budget, fréquence...)</span>
          </Button>
        </div>

        {error && (
          <div className="mb-5 bg-coral/5 border-2 border-coral/30 rounded-neo px-4 py-2.5">
            <p className="font-mono text-[11px] text-coral">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t-2 border-border">
          <Button variant="ghost" onClick={() => { reset(); router.push('/campagne/nouveau') }}>← Retour</Button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse-dot" />
              Sauvegarde auto
            </span>
            <Button
              onClick={handleNext}
              loading={saving}
              disabled={!step1.name.trim()}
            >
              Clone Lab →
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-[460px] bg-bg-card border-2 border-border-purple rounded-neo-lg overflow-hidden shadow-[4px_4px_0px_rgba(160,154,224,0.25)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-border">
              <div className="font-display font-bold text-[14px] flex items-center gap-2">
                <span className="text-purple">⚙</span> Paramètres de la campagne
              </div>
              <button onClick={() => setSettingsOpen(false)} className="nb-btn-ghost w-7 h-7 p-0 text-lg">×</button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {([['Début campagne', 'startDate'], ['Fin campagne', 'endDate']] as const).map(([label, field]) => (
                  <div key={field}>
                    <label className="nb-label block mb-1.5">{label}</label>
                    <input
                      type="date"
                      value={step1[field]}
                      onChange={(e) => setStep1({ [field]: e.target.value })}
                      className="nb-input text-[13px] py-2 px-3"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="nb-label block mb-1.5">Budget Alloué (Optionnel)</label>
                <input type="text" placeholder="Ex : 5 000 €" className="nb-input text-[13px] py-2.5 px-3.5" />
              </div>
              <div>
                <label className="nb-label block mb-1.5">Fréquence de production</label>
                <input type="text" placeholder="Ex : 3 vidéos / semaine" className="nb-input text-[13px] py-2.5 px-3.5" />
              </div>
              <div className="border-t-2 border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">⏮ Mode Pré-Campagne</div>
                    <div className="font-mono text-[11px] text-text-dim">Génère storyline & ads avant le lancement</div>
                  </div>
                  <button
                    onClick={() => setStep1({ preCampaignEnabled: !step1.preCampaignEnabled })}
                    className={`relative w-10 h-5 rounded-neo border-2 transition-all flex-shrink-0 ${step1.preCampaignEnabled ? 'bg-purple border-border-purple' : 'bg-bg-base border-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all ${step1.preCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`} />
                  </button>
                </div>
              </div>
              <Button onClick={() => setSettingsOpen(false)}>Sauvegarder</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
