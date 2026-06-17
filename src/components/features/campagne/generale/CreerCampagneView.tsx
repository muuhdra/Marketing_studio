'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StepBar from '@/components/ui/StepBar'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCampaignWizard } from '@/lib/stores/campaignWizardStore'
import { createCampaign, updateCampaign } from '@/lib/actions/campaigns'
import { saveCampaignDna } from '@/lib/actions/wizard'
import { actionExtractDnaFile, actionDeleteDnaDraft } from '@/lib/actions/dna'
import { useToast } from '@/lib/stores/toastStore'
import { TARGET_MULT, TARGET_UNITS, toMonthlyTarget, fmtTargetNum } from '@/lib/content/contentTarget'

const POST_DELAYS = [2, 3, 4, 6] as const

export default function CreerCampagneView() {
  const router = useRouter()
  const toast  = useToast()
  const { step1, setStep1, campaignId, setCampaignId, reset } = useCampaignWizard()

  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dnaFileRef = useRef<HTMLInputElement>(null)

  // Évite les mismatchs d'hydratation : blocs dépendant du store persisté
  // (sessionStorage, absent au SSR) rendus seulement après le mount client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ── Upload d'un fichier ADN (Word / PDF / Markdown / texte) ────────────────
  async function handleDnaFile(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await actionExtractDnaFile(fd)
      // Cleanup : supprime l'ancien fichier draft remplacé (best-effort)
      if (step1.dnaFilePath && step1.dnaFilePath !== res.filePath) {
        actionDeleteDnaDraft(step1.dnaFilePath).catch(() => {})
      }
      // Le texte extrait devient l'ADN (éditable). On conserve aussi le fichier original.
      setStep1({
        dnaText:     res.text,
        dnaFileName: res.fileName,
        dnaFilePath: res.filePath,
      })
      toast.success(`ADN importé depuis "${res.fileName}" ✓`)
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'import du fichier ADN')
    } finally {
      setUploading(false)
      if (dnaFileRef.current) dnaFileRef.current.value = ''
    }
  }

  // ── Idempotent : update si campagne déjà créée, create sinon ───────────────
  async function handleNext() {
    if (!step1.name.trim())               { setError('Le nom de la campagne est requis.'); return }
    if (step1.dnaText.trim().length < 30) { setError("L'ADN doit contenir au moins 30 caractères."); return }

    // Cohérence des dates
    if (step1.startDate && step1.endDate && step1.startDate > step1.endDate) {
      setError('La date de fin de campagne doit être après la date de début.'); return
    }
    if (step1.preCampaignEnabled) {
      if (step1.preCampaignStart && step1.preCampaignEnd && step1.preCampaignStart > step1.preCampaignEnd) {
        setError('La fin de pré-campagne doit être après son début.'); return
      }
      if (step1.preCampaignEnd && step1.startDate && step1.preCampaignEnd > step1.startDate) {
        setError('La pré-campagne doit se terminer avant le début de la campagne.'); return
      }
    }

    setSaving(true); setError(null)
    try {
      let targetId = campaignId
      if (campaignId) {
        await updateCampaign(campaignId, {
          name:                step1.name.trim(),
          startDate:           step1.startDate          || undefined,
          endDate:             step1.endDate            || undefined,
          preCampaignEnabled:  step1.preCampaignEnabled,
          preCampaignStart:    step1.preCampaignStart   || undefined,
          preCampaignEnd:      step1.preCampaignEnd     || undefined,
          preCampaignDna:      step1.preCampaignDna     || undefined,
          postCampaignEnabled: step1.postCampaignEnabled,
          postCampaignDelayWeeks: step1.postCampaignDelayWeeks,
          monthlyContentTarget: toMonthlyTarget(step1.contentTargetValue, step1.contentTargetUnit),
          assetsUrl:           step1.assetsUrl          || undefined,
        })
        toast.success(`Campagne "${step1.name.trim()}" mise à jour ✓`)
      } else {
        const campaign = await createCampaign({
          name:                step1.name.trim(),
          campaignType:        step1.campaignType,
          startDate:           step1.startDate          || undefined,
          endDate:             step1.endDate            || undefined,
          preCampaignEnabled:  step1.preCampaignEnabled,
          preCampaignStart:    step1.preCampaignStart   || undefined,
          preCampaignEnd:      step1.preCampaignEnd     || undefined,
          preCampaignDna:      step1.preCampaignDna     || undefined,
          postCampaignEnabled: step1.postCampaignEnabled,
          postCampaignDelayWeeks: step1.postCampaignDelayWeeks,
          monthlyContentTarget: toMonthlyTarget(step1.contentTargetValue, step1.contentTargetUnit),
          assetsUrl:           step1.assetsUrl          || undefined,
        })
        targetId = campaign.id
        setCampaignId(campaign.id)
        toast.success(`Campagne "${campaign.name}" créée ✓`)
      }

      // Persiste l'ADN (le CŒUR) + analyse Claude — injecté dans tous les prompts IA
      if (targetId) {
        await saveCampaignDna(targetId, step1.dnaText, { filePath: step1.dnaFilePath })
      }

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
            {mounted && campaignId ? 'Modifier la Campagne' : 'Créer la Campagne'}
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

        {/* ADN */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="nb-label">* ADN de la Campagne</span>
            <span className="font-sans text-[9px] font-bold text-teal border border-border-teal px-2 py-0.5 rounded-neo">CŒUR</span>
            {mounted && step1.dnaText.trim().length > 50 && (
              <span className="font-sans text-[9px] text-teal">✓ {step1.dnaText.trim().split(/\s+/).length} mots</span>
            )}
          </div>
          <p className="font-sans text-[11px] text-text-dim mb-3">
            Décrivez l'identité de votre campagne — produit, valeurs, ton, audience cible, objectifs, DA.
            Saisissez-la, ou importez un document (Word, PDF, Markdown) : Claude l'analysera.
          </p>

          {/* Barre d'import fichier ADN */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              type="button"
              onClick={() => dnaFileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 font-sans text-[11px] font-bold text-teal border border-border-teal rounded-neo px-3 py-1.5 hover:bg-teal/10 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Extraction…' : 'Importer un document ADN'}
            </button>
            {mounted && step1.dnaFileName && !uploading && (
              <span className="flex items-center gap-1.5 font-sans text-[10px] text-text-secondary bg-bg-surface border border-border rounded-neo px-2 py-1">
                <span className="text-teal">✓</span>
                {step1.dnaFileName}
                <button
                  type="button"
                  onClick={() => {
                    // Cleanup Storage best-effort puis détache la référence
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
            rows={8}
            value={step1.dnaText}
            onChange={(e) => setStep1({ dnaText: e.target.value })}
            placeholder={`Ex:\nProduit : Sneakers Spring Drop 2026 — collection limitée 150 paires, coloris pastel, collab avec artiste local.\nTon : Authentique, Gen Z, lifestyle urbain. Ni trop corporate, ni trop street.\nAudience : 18-30 ans, passionnés sneakers, Paris & Lyon.\nObjectifs : Créer du FOMO, sell-out en 48h, 500K vues sur TikTok.\nMessages clés : Exclusivité · Collab artiste · Matières premium · Drop limité.`}
            className={`w-full rounded-neo-lg border px-4 py-3 text-[12.5px] leading-relaxed resize-y transition-colors focus:outline-none font-sans placeholder:text-text-dim
              ${step1.dnaText.trim().length > 50
                ? 'border-teal bg-teal/[0.02] text-text-primary focus:border-teal'
                : 'border-border-teal/40 bg-teal/[0.01] text-text-primary focus:border-border-teal'
              }`}
          />
        </div>

        {/* Assets (optionnel) */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="nb-label">Assets visuels</span>
            <span className="font-sans text-[9px] text-text-dim border border-border px-2 py-0.5 rounded-neo">optionnel</span>
            {mounted && step1.assetsUrl && (
              <span className="font-sans text-[9px] text-teal">✓ Lien enregistré</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={step1.assetsUrl}
              onChange={(e) => setStep1({ assetsUrl: e.target.value })}
              className="nb-input flex-1 text-[13px] py-2 px-3"
              placeholder="Lien Notion, Google Drive, Dropbox..."
            />
            <button
              type="button"
              onClick={() => {
                const url = step1.assetsUrl.trim()
                if (!url) return
                try {
                  new URL(url)
                  toast.success('Lien assets enregistré ✓')
                } catch {
                  toast.error('URL invalide — vérifiez le lien')
                  setStep1({ assetsUrl: '' })
                }
              }}
              className="nb-btn-secondary text-xs px-3 whitespace-nowrap"
            >
              Importer
            </button>
          </div>
          <p className="font-sans text-[10px] text-text-dim mt-1.5">Charte graphique, visuels produit, guidelines — optionnel</p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
          Paramètres de la Campagne
        </Button>

        {error && (
          <div className="mt-4 bg-coral/5 border border-coral/30 rounded-neo px-4 py-2.5">
            <p className="font-sans text-[11px] text-coral">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-7 pt-5 border-t border-border">
          <Button variant="ghost" onClick={() => { reset(); router.push('/dashboard') }}>← Dashboard</Button>
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-dot" />
              {mounted && campaignId ? 'Modification en cours' : 'Sauvegarde auto'}
            </span>
            <Button
              onClick={handleNext}
              loading={saving}
              disabled={!step1.name.trim() || step1.dnaText.trim().length < 30 || uploading}
            >
              {mounted && campaignId ? 'Mettre à jour →' : 'Suivant — Choisir les Contenus →'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Paramètres */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-bg-card border border-border rounded-neo-lg shadow-neo-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-bg-card">
              <div className="font-display font-bold text-[14px] flex items-center gap-2">
                Paramètres de la Campagne
              </div>
              <button onClick={() => setSettingsOpen(false)} className="nb-btn-ghost w-7 h-7 p-0 text-lg">×</button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Dates début / fin */}
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
                          ${step1.contentTargetUnit === u.key ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-border-strong'}`}
                      >
                        / {u.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="font-sans text-[10px] text-text-dim mt-1.5">Réparti automatiquement (1 mois = 4 semaines = 28 jours).</p>

                {/* Répartition calculée : mois · semaine · jour · écart */}
                {step1.contentTargetValue && step1.contentTargetValue > 0 ? (() => {
                  const monthly = step1.contentTargetValue * TARGET_MULT[step1.contentTargetUnit]
                  const perWeek = monthly / 4
                  const perDay  = monthly / 28
                  const gapDays = 28 / monthly
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-sans text-[10px] font-bold border border-border rounded-neo px-2.5 py-1 text-text-secondary">{fmtTargetNum(monthly)} / mois</span>
                      <span className="text-text-dim font-bold">·</span>
                      <span className="font-sans text-[10px] font-bold border border-accent text-accent bg-accent/10 rounded-neo px-2.5 py-1">≈ {fmtTargetNum(perWeek)} / semaine</span>
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

              {/* ── Pré-Campagne ── */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">⏮ Mode Pré-Campagne</div>
                    <div className="font-sans text-[11px] text-text-dim">Génère storyline & ads avant le lancement</div>
                  </div>
                  <button
                    onClick={() => {
                      const enabled = !step1.preCampaignEnabled
                      // Désactivation → on purge les réglages pré-campagne
                      setStep1(enabled
                        ? { preCampaignEnabled: true }
                        : { preCampaignEnabled: false, preCampaignStart: '', preCampaignEnd: '', preCampaignDna: '' })
                    }}
                    className={`relative w-10 h-5 rounded-neo border transition-all flex-shrink-0
                      ${step1.preCampaignEnabled ? 'bg-accent border-accent' : 'bg-bg-base border-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all
                      ${step1.preCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`}
                    />
                  </button>
                </div>

                {step1.preCampaignEnabled && (
                  <div className="mt-3 flex flex-col gap-3 bg-bg-surface border border-border rounded-neo p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="nb-label block mb-1.5">Début pré-campagne</label>
                        <input
                          type="date"
                          value={step1.preCampaignStart}
                          onChange={(e) => setStep1({ preCampaignStart: e.target.value })}
                          className="nb-input text-[13px] py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="nb-label block mb-1.5">Fin pré-campagne</label>
                        <input
                          type="date"
                          value={step1.preCampaignEnd}
                          onChange={(e) => setStep1({ preCampaignEnd: e.target.value })}
                          className="nb-input text-[13px] py-2 px-3"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="nb-label block mb-1.5">Direction de la pré-campagne</label>
                      <textarea
                        rows={3}
                        value={step1.preCampaignDna}
                        onChange={(e) => setStep1({ preCampaignDna: e.target.value })}
                        placeholder="Ex: Teasing mystérieux, compte à rebours, révélations progressives. Ton intrigant, focus sur l'attente et l'exclusivité avant le drop."
                        className="w-full rounded-neo border border-border bg-bg-input px-3 py-2 text-[12px] leading-relaxed resize-y text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors font-sans"
                      />
                      <p className="font-sans text-[10px] text-text-dim mt-1">Indique au système comment faire avancer la pré-campagne (DA, ton, objectifs)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Post-Campagne ── */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary mb-0.5">Mode Post-Campagne</div>
                    <div className="font-sans text-[11px] text-text-dim">Bilan & optimisation après la campagne</div>
                  </div>
                  <button
                    onClick={() => {
                      const enabled = !step1.postCampaignEnabled
                      // Désactivation → on purge le délai pour ne pas persister un réglage fantôme
                      setStep1(enabled
                        ? { postCampaignEnabled: true }
                        : { postCampaignEnabled: false, postCampaignDelayWeeks: null })
                    }}
                    className={`relative w-10 h-5 rounded-neo border transition-all flex-shrink-0
                      ${step1.postCampaignEnabled ? 'bg-teal border-border-teal' : 'bg-bg-base border-border'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-neo transition-all
                      ${step1.postCampaignEnabled ? 'left-[22px] bg-bg-base' : 'left-[2px] bg-text-dim'}`}
                    />
                  </button>
                </div>

                {step1.postCampaignEnabled && (
                  <div className="mt-3 flex flex-col gap-3 bg-bg-surface border border-border rounded-neo p-3">
                    <div>
                      <label className="nb-label block mb-2">Déclenchement après la fin de campagne</label>
                      <div className="flex gap-2 flex-wrap">
                        {POST_DELAYS.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setStep1({ postCampaignDelayWeeks: w })}
                            className={`font-sans text-[11px] font-bold px-3 py-1.5 rounded-neo border transition-all
                              ${step1.postCampaignDelayWeeks === w
                                ? 'border-border-teal text-teal bg-teal/10'
                                : 'border-border text-text-muted hover:border-border-strong'}`}
                          >
                            {w} sem.
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="font-sans text-[10px] text-text-dim leading-relaxed">
                      À l'échéance, vous saisirez les résultats de la campagne (objectifs atteints ou non,
                      ventes, audience…) pour que le système ajuste et fasse grossir le produit.
                      Les données de bilan seront renseignées à ce moment-là.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border bg-bg-surface flex justify-end">
              <Button onClick={() => setSettingsOpen(false)} size="sm">Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
