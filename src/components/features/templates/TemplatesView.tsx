'use client'

import { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/lib/stores/toastStore'
import { createTemplate, listTemplates, updateTemplate, deleteTemplate, analyzeTemplate, type TemplateDTO } from '@/lib/actions/templates'
import { captureVideoFrames } from '@/lib/media/videoFrames'

const CATEGORIES = ['ugc', 'commercial', 'shooting', 'visuel', 'autre'] as const

export default function TemplatesView() {
  const toast = useToast()
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [loading, setLoading]     = useState(true)

  // ── Formulaire d'ajout ──
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName]       = useState<string | null>(null)
  const [category, setCategory]       = useState<string>('ugc')
  const [label, setLabel]             = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt]           = useState('')
  const [uploading, setUploading]     = useState(false)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())

  // ── Édition inline ──
  const [editId, setEditId]       = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editCategory, setEditCategory] = useState('ugc')
  const [saving, setSaving]       = useState(false)

  async function load() {
    setLoading(true)
    try { setTemplates(await listTemplates()) } catch (e: any) { toast.error(e.message ?? 'Chargement impossible') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file)        { toast.error('Sélectionne un fichier (vidéo ou image)'); return }
    if (!label.trim()) { toast.error('Donne un libellé'); return }
    setUploading(true)
    const needAnalyze = !prompt.trim()
    // Pour une vidéo sans prompt : capturer plusieurs frames (décomposition Gemini)
    // depuis le fichier local, avant upload (blob → pas de CORS).
    let frames: string[] = []
    if (needAnalyze && file.type.startsWith('video/')) {
      frames = await captureVideoFrames(file, 6)
    }
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', category)
      fd.append('label', label.trim())
      fd.append('description', description.trim())
      fd.append('prompt', prompt.trim())
      const created = await createTemplate(fd)
      const hint = `${created.category} · ${created.label}`
      setTemplates((t) => [created, ...t])
      setLabel(''); setDescription(''); setPrompt(''); setFileName(null)
      if (fileRef.current) fileRef.current.value = ''

      if (needAnalyze) {
        // Reverse-engineering automatique du prompt (en arrière-plan).
        setAnalyzingIds((s) => new Set(s).add(created.id))
        analyzeTemplate({
          id: created.id,
          imageUrl: created.kind === 'image' ? created.url : undefined,
          frames:   created.kind === 'video' && frames.length > 0 ? frames : undefined,
          hint,
        })
          .then((generated) => {
            if (generated) {
              setTemplates((ts) => ts.map((x) => x.id === created.id ? { ...x, prompt: generated } : x))
              toast.success('Prompt généré par analyse IA ✓')
            }
          })
          .catch(() => toast.error('Analyse IA échouée — tu peux ajouter le prompt manuellement'))
          .finally(() => setAnalyzingIds((s) => { const n = new Set(s); n.delete(created.id); return n }))
      } else {
        toast.success('Template ajouté ✓')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  function startEdit(t: TemplateDTO) {
    setEditId(t.id); setEditLabel(t.label); setEditPrompt(t.prompt ?? ''); setEditCategory(t.category)
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    try {
      await updateTemplate(editId, { label: editLabel.trim(), prompt: editPrompt.trim() || null, category: editCategory })
      setTemplates((ts) => ts.map((t) => t.id === editId ? { ...t, label: editLabel.trim(), prompt: editPrompt.trim() || null, category: editCategory } : t))
      setEditId(null)
      toast.success('Template mis à jour ✓')
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  async function remove(t: TemplateDTO) {
    if (!confirm(`Supprimer le template « ${t.label} » ?`)) return
    try {
      await deleteTemplate(t.id)
      setTemplates((ts) => ts.filter((x) => x.id !== t.id))
      toast.success('Template supprimé')
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de la suppression')
    }
  }

  return (
    <div className="animate-fade-in max-w-[1000px]">

      {/* Header */}
      <div className="mb-7">
        <p className="nb-label mb-2">Bibliothèque</p>
        <h1 className="font-display font-bold text-[28px] tracking-tight text-text-primary">Templates de contenu</h1>
        <p className="text-[13px] text-text-muted mt-1">Vidéos & images de référence + le prompt qui les a générés. Réutilisés comme point de départ dans les campagnes.</p>
      </div>

      {/* ── Ajout ── */}
      <section className="bg-bg-card border border-border rounded-neo-lg p-5 mb-6">
        <h2 className="font-display font-bold text-[14px] text-text-primary mb-4">Ajouter un template</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <label className="nb-label block mb-1.5">Fichier · vidéo ou image</label>
              <input
                ref={fileRef}
                type="file"
                accept="video/*,image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="font-sans text-[11px] text-text-secondary file:mr-3 file:rounded-neo file:border file:border-border file:bg-bg-surface file:px-3 file:py-1.5 file:font-sans file:text-[11px] file:text-text-primary"
              />
              <p className="font-sans text-[9px] text-text-dim mt-1">{fileName ?? 'Max 100 MB'}</p>
            </div>
            <div>
              <label className="nb-label block mb-1.5">Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="nb-input text-[13px] py-2 max-w-[220px]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. UGC Unboxing" />
          </div>
          <div className="flex flex-col gap-3">
            <Textarea label="Description (optionnel)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Courte description du type de contenu" />
            <Textarea label="Prompt source (optionnel)" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Le prompt qui a généré ce contenu — à ajouter si tu veux" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleUpload} loading={uploading}>Ajouter le template</Button>
        </div>
      </section>

      {/* ── Liste ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[220px] rounded-neo-lg border border-border bg-bg-card animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-neo-lg">
          <p className="font-sans text-[12px] text-text-dim">Aucun template. Ajoute ton premier ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-bg-card border border-border rounded-neo-lg overflow-hidden flex flex-col">
              <div className="h-[150px] bg-bg-elevated border-b border-border relative flex items-center justify-center overflow-hidden">
                {t.kind === 'video' ? (
                  <video src={t.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.url} alt={t.label} className="w-full h-full object-cover" />
                )}
                <span className="absolute top-2 left-2 font-sans text-[8px] font-bold uppercase bg-bg-base/90 border border-border rounded px-1.5 py-0.5 text-text-dim">{t.kind}</span>
                <span className="absolute top-2 right-2 font-sans text-[8px] font-bold uppercase bg-bg-base/90 border border-accent/40 rounded px-1.5 py-0.5 text-accent">{t.category}</span>
              </div>

              {editId === t.id ? (
                <div className="p-3 flex flex-col gap-2">
                  <Input label="Libellé" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <div>
                    <label className="nb-label block mb-1">Catégorie</label>
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="nb-input text-[12px] py-1.5">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Textarea label="Prompt" rows={3} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} loading={saving}>Enregistrer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <p className="font-sans text-[12px] font-bold text-text-primary truncate">{t.label}</p>
                  {t.prompt
                    ? <p className="font-sans text-[10px] text-text-dim leading-relaxed line-clamp-3">{t.prompt}</p>
                    : analyzingIds.has(t.id)
                      ? <p className="font-sans text-[10px] text-accent italic animate-pulse">Analyse IA du prompt en cours…</p>
                      : <p className="font-sans text-[10px] text-text-faint italic">Aucun prompt (optionnel)</p>}
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>Éditer</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(t)}>Supprimer</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
