'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { createCampaign, updateCampaign } from '@/lib/actions/campaigns'
import { saveCampaignDna } from '@/lib/actions/wizard'
import { actionExtractDnaFile, actionDeleteDnaDraft } from '@/lib/actions/dna'
import { useToast } from '@/lib/stores/toastStore'
import { TARGET_MULT, TARGET_UNITS, toMonthlyTarget, fmtTargetNum } from '@/lib/content/contentTarget'

const STEPS = [
  { n: '1', label: 'Config',     active: true,  done: false },
  { n: '2', label: 'Clone Lab',  active: false, done: false },
  { n: '3', label: 'Production', active: false, done: false },
]

export default function SpecialeEtape1View() {
  const router = useRouter()
  const toast  = useToast()
  const { step1, setStep1, campaignId, setCampaignId, reset } = useCampaignWizard()

  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dnaFileRef = useRef<HTMLInputElement>(null)

  // Évite les mismatchs d'hydratation : les blocs dépendant du store persisté
  // (sessionStorage, absent au SSR) ne sont rendus qu'après le mount client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ── Upload d'un fichier ADN (Word / PDF / Markdown / texte) ────────────────
  async function handleDnaFile(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await actionExtractDnaFile(fd)
      if (step1.dnaFilePath && step1.dnaFilePath !== res.filePath) {
        actionDeleteDnaDraft(step1.dnaFilePath).catch(() => {})
      }
      setStep1({ dnaText: res.text, dnaFileName: res.fileName, dnaFilePath: res.filePath })
      toast.success(`ADN importé depuis "${res.fileName}" ✓`)
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'import du fichier ADN')
    } finally {
      setUploading(false)
      if (dnaFileRef.current) dnaFileRef.current.value = ''
    }
  }

  // ── Idempotent : update si projet déjà créé, create sinon ──────────────────
  async function handleNext() {
    if (!step1.name.trim())               { setError('Le nom du projet est requis.'); return }
    if (step1.dnaText.trim().length < 30) { setError("L'ADN doit contenir au moins 30 caractères."); return }
    if (step1.startDate && step1.endDate && step1.startDate > step1.endDate) {
      setError('La date de fin doit être après la date de début.'); return
    }
    setSaving(true); setError(null)
    try {
      let targetId = campaignId
      if (campaignId) {
        await updateCampaign(campaignId, {
          name:                step1.name.trim(),
          startDate:           step1.startDate        || undefined,
          endDate:             step1.endDate          || undefined,
          preCampaignEnabled:  step1.preCampaignEnabled,
          preCampaignStart:    step1.preCampaignStart || undefined,
          monthlyContentTarget: toMonthlyTarget(step1.contentTargetValue, step1.contentTargetUnit),
          assetsUrl:           step1.assetsUrl        || undefined,
        })
        toast.success(`Projet "${step1.name.trim()}" mis à jour ✓`)
      } else {
        const campaign = await createCampaign({
          name:                step1.name.trim(),
          campaignType:        'speciale',
          startDate:           step1.startDate        || undefined,
          endDate:             step1.endDate          || undefined,
          preCampaignEnabled:  step1.preCampaignEnabled,
          preCampaignStart:    step1.preCampaignStart || undefined,
          monthlyContentTarget: toMonthlyTarget(step1.contentTargetValue, step1.contentTargetUnit),
          assetsUrl:           step1.assetsUrl        || undefined,
        })
        targetId = campaign.id
        setCampaignId(campaign.id)
        toast.success(`Projet "${campaign.name}" créé ✓`)
      }

      // Persiste l'ADN (le CŒUR) + analyse Claude — comme le flux général
      if (targetId) {
        await saveCampaignDna(targetId, step1.dnaText, { filePath: step1.dnaFilePath })
      }

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
          <div className="w-10 h-10 rounded-neo-md border border-border-purple bg-purple/15 flex items-center justify-center text-[18px] text-purple">
            ●
          </div>
          <div>
            <p className="font-sans text-[10px] font-bold text-purple uppercase tracking-widest mb-0.5">
              Campagne Spéciale · Étape 1/3
            </p>
            <h1 className="font-display font-bold text-[20px] text-text-primary">
              {mounted && campaignId ? 'Modifier le Projet' : 'Configuration Initiale'}
            </h1>
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

        {/* ── ADN ── */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="nb-label">* ADN de la Campagne</span>
            <span className="font-sans text-[9px] font-bold text-purple border border-border-purple px-2 py-0.5 rounded-neo">CŒUR</span>
            {mounted && step1.dnaText.trim().length > 50 && (
              <span className="font-sans text-[9px] text-purple">✓ {step1.dnaText.trim().split(/\s+/).length} mots</span>
            )}
          </div>
          <p className="font-sans text-[11px] text-text-dim mb-3">
            Décrivez l'identité du projet — produit, valeurs, ton, audience, DA.
            Saisissez-la, ou importez un document (Word, PDF, Markdown) : Claude l'analysera.
          </p>

          {/* Barre d'import fichier ADN */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={() => dnaFileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 font-sans text-[11px] font-bold text-purple border border-border-purple rounded-neo px-3 py-1.5 hover:bg-purple/10 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Extraction…' : 'Importer un document ADN'}
            </button>
            {mounted && step1.dnaFileName && !uploading && (
              <span className="flex items-center gap-1.5 font-sans text-[10px] text-text-secondary bg-bg-surface border border-border rounded-neo px-2 py-1">
                <span className="text-purple">✓</span>
                {step1.dnaFileName}
                <button
                  type="button"
                  onClick={() => {
                    if (step1.dnaFilePath) actionDeleteDnaDraft(step1.dnaFilePath).catch(() => {})
                    setStep1({ dnaFileName: null, dnaFilePath: null })
                  }}
                  className="text-coral hover:scale-110 transition-transform ml-1"
                  title="Détacher le fichier"
                >
                  ×
                </button>
              </span>
            )}
            <span className="font-sans text-[9px] text-text-dim">.docx · .pdf · .md · .txt — max 10 MB</span>
            <input
              ref={dnaFileRef}
              type="file"
              accept=".docx,.pdf,.md,.markdown,.txt,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDnaFile(f) }}
            />
          </div>

          <textarea
            rows={7}
            value={step1.dnaText}
            onChange={(e) => setStep1({ dnaText: e.target.value })}
            placeholder={`Ex:\nProduit : ...\nTon : ...\nAudience : ...\nObjectifs : ...\nDirection artistique : ...`}
            className={`w-full rounded-neo-lg border px-4 py-3 text-[12.5px] leading-relaxed resize-y transition-colors focus:outline-none font-sans placeholder:text-text-dim
              ${step1.dnaText.trim().length > 50
                ? 'border-border-purple bg-purple/[0.03] text-text-primary focus:border-purple'
                : 'border-border-purple/40 bg-purple/[0.01] text-text-primary focus:border-border-purple'
              }`}
          />
        </div>

        {/* Lien web complémentaire (réel → assets_url) */}
        <div className="mb-9">
          <label className="nb-label block mb-2.5">Lien Web Complémentaire</label>
          <div className="flex gap-3">
            <input
              type="url"
              className="nb-input flex-1 text-[13px] py-2.5 px-3.5"
              placeholder="https://notion.so/mon-brief · Drive, Figma, Loom..."
              value={step1.assetsUrl}
              onChange={(e) => setStep1({ assetsUrl: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                const url = step1.assetsUrl.trim()
                if (!url) return
                try { new URL(url); toast.success('Lien enregistré ✓') }
                catch { toast.error('URL invalide'); setStep1({ assetsUrl: '' }) }
              }}
              className="nb-btn-secondary px-4 text-[12px] whitespace-nowrap"
            >
              Ajouter
            </button>
          </div>
          {mounted && step1.assetsUrl && (
            <p className="font-sans text-[10px] text-purple mt-1.5">✓ Lien enregistré avec le projet</p>
          )}
        </div>

        {/* Paramètres */}
        <div className="mb-10">
          <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
            Paramètres de la campagne
            <span className="text-[10px] text-text-dim ml-1.5 font-normal">(dates, pré-campagne...)</span>
          </Button>
        </div>

        {error && (
          <div className="mb-5 bg-coral/5 border border-coral/30 rounded-neo px-4 py-2.5">
            <p className="font-sans text-[11px] text-coral">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => { reset(); router.push('/campagne/nouveau') }}>← Retour</Button>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse-dot" />
              {mounted && campaignId ? 'Modification en cours' : 'Sauvegarde auto'}
            </span>
            <Button
              onClick={handleNext}
              loading={saving}
              disabled={!step1.name.trim() || step1.dnaText.trim().length < 30 || uploading}
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
            className="w-full max-w-[460px] bg-bg-card border border-border-purple rounded-neo-lg overflow-hidden shadow-neo-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-display font-bold text-[14px] flex items-center gap-2">
                Paramètres de la campagne
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

              {/* Objectif de volume — valeur + unité (mois / semaine / jour) */}
              <div className="border-t border-border pt-4">
                <label className="nb-label block mb-1.5">Contenus à générer</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={step1.contentTargetValue ?? ''}
                    onChange={(e) => setStep1({ contentTargetValue: e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0) })}
                    placeholder="Ex : 16"
                    className="nb-input text-[13px] py-2 px-3 w-[120px]"
                  />
                  <div className="flex items-center gap-1">
                    {TARGET_UNITS.map((u) => (
                      <button
                        key={u.key}
                        type="button"
                        onClick={() => setStep1({ contentTargetUnit: u.key })}
                        className={`font-sans text-[11px] font-bold px-3 py-2 rounded-neo border transition-all
                          ${step1.contentTargetUnit === u.key ? 'border-purple text-purple bg-purple/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                      >
                        / {u.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="font-sans text-[10px] text-text-dim mt-1.5">Réparti automatiquement (1 mois = 4 semaines = 28 jours).</p>
                {step1.contentTargetValue && step1.contentTargetValue > 0 ? (() => {
                  const monthly = step1.contentTargetValue * TARGET_MULT[step1.contentTargetUnit]
                  const perWeek = monthly / 4
                  const perDay  = monthly / 28
                  const gapDays = 28 / monthly
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-sans text-[10px] font-bold border border-border rounded-neo px-2.5 py-1 text-text-secondary">{fmtTargetNum(monthly)} / mois</span>
                      <span className="text-text-dim font-bold">·</span>
                      <span className="font-sans text-[10px] font-bold border border-border-purple text-purple bg-purple/10 rounded-neo px-2.5 py-1">≈ {fmtTargetNum(perWeek)} / semaine</span>
                      <span className="text-text-dim font-bold">·</span>
                      <span className="font-sans text-[10px] font-bold border border-border rounded-neo px-2.5 py-1 text-text-secondary">≈ {fmtTargetNum(perDay)} / jour</span>
                      {perDay < 1 && (
                        <>
                          <span className="text-text-dim font-bold">·</span>
                          <span className="font-sans text-[10px] font-bold border border-border rounded-neo px-2.5 py-1 text-text-secondary">1 tous les ~{fmtTargetNum(gapDays)} j</span>
                        </>
                      )}
                    </div>
                  )
                })() : null}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">⏮ Mode Pré-Campagne</div>
                    <div className="font-sans text-[11px] text-text-dim">Génère storyline & ads avant le lancement</div>
                  </div>
                  <button
                    onClick={() => {
                      const enabled = !step1.preCampaignEnabled
                      setStep1(enabled
                        ? { preCampaignEnabled: true }
                        : { preCampaignEnabled: false, preCampaignStart: '', preCampaignEnd: '', preCampaignDna: '' })
                    }}
                    className={`relative w-10 h-5 rounded-neo border transition-all flex-shrink-0 ${step1.preCampaignEnabled ? 'bg-purple border-border-purple' : 'bg-bg-base border-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all ${step1.preCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`} />
                  </button>
                </div>
                {step1.preCampaignEnabled && (
                  <div className="mt-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="nb-label block mb-1.5">Début pré-campagne</label>
                      <input type="date" value={step1.preCampaignStart} onChange={(e) => setStep1({ preCampaignStart: e.target.value })} className="nb-input text-[13px] py-2 px-3" />
                    </div>
                    <div>
                      <label className="nb-label block mb-1.5">Fin pré-campagne</label>
                      <input type="date" value={step1.preCampaignEnd} onChange={(e) => setStep1({ preCampaignEnd: e.target.value })} className="nb-input text-[13px] py-2 px-3" />
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => setSettingsOpen(false)}>Sauvegarder</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
