'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useSettings } from '@/lib/stores/settingsStore'
import { useToast } from '@/lib/stores/toastStore'
import { useBrands } from '@/lib/stores/brandsStore'
import { listBrands, deleteBrand, type BrandDTO } from '@/lib/actions/brands'
import { actionIsDev } from '@/lib/actions/auth'
import { listTemplates, createTemplate, deleteTemplate, type TemplateDTO } from '@/lib/actions/templates'
import { useT } from '@/lib/i18n'
import { User, Building2, LogOut, Check, Trash2, Loader2, Store, Code2, Upload, Video, Image as ImageIcon } from 'lucide-react'

const LOCALES = [
  { id: 'fr-FR', label: '🇫🇷 Français' },
  { id: 'en-US', label: '🇺🇸 English' },
]

export default function SettingsView() {
  const router = useRouter()
  const toast = useToast()
  const tr = useT()
  const studioName = useSettings((s) => s.studioName)
  const locale = useSettings((s) => s.locale)
  const setSettings = useSettings((s) => s.setSettings)

  const activeBrandId = useBrands((s) => s.activeBrandId)
  const setBrands = useBrands((s) => s.setBrands)

  const [email, setEmail] = useState('')
  const [name, setName] = useState(studioName)
  const [saved, setSaved] = useState(false)
  const [brands, setBrandsList] = useState<BrandDTO[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Dev only : gestion des templates système (globaux) ──
  const [isDev, setIsDev] = useState(false)
  const [sysTemplates, setSysTemplates] = useState<TemplateDTO[]>([])
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [tplLabel, setTplLabel] = useState('')
  const [tplCategory, setTplCategory] = useState('')
  const [tplPrompt, setTplPrompt] = useState('')
  const [uploadingTpl, setUploadingTpl] = useState(false)
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null)
  const [tplKindTab, setTplKindTab] = useState<'video' | 'image'>('video')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')).catch(() => {})
    listBrands().then(setBrandsList).catch(() => {})
    actionIsDev().then((dev) => {
      setIsDev(dev)
      if (dev) listTemplates().then(setSysTemplates).catch(() => {})
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadSystemTemplate() {
    if (uploadingTpl) return
    if (!tplFile) { toast.error(tr('settings.sysTemplates.errFile')); return }
    if (!tplLabel.trim()) { toast.error(tr('settings.sysTemplates.errLabel')); return }
    if (!tplCategory.trim()) { toast.error(tr('settings.sysTemplates.errCategory')); return }
    setUploadingTpl(true)
    try {
      const fd = new FormData()
      fd.append('file', tplFile)
      fd.append('label', tplLabel.trim())
      fd.append('category', tplCategory.trim())
      fd.append('prompt', tplPrompt.trim())
      const tpl = await createTemplate(fd)
      setSysTemplates((l) => [...l, tpl])
      setTplFile(null); setTplLabel(''); setTplCategory(''); setTplPrompt('')
      toast.success(tr('settings.sysTemplates.added'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('settings.sysTemplates.addFailed'))
    } finally {
      setUploadingTpl(false)
    }
  }

  async function removeSystemTemplate(id: string) {
    if (deletingTplId) return
    setDeletingTplId(id)
    try {
      await deleteTemplate(id)
      setSysTemplates((l) => l.filter((x) => x.id !== id))
      toast.success(tr('settings.sysTemplates.deleted'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('settings.sysTemplates.deleteFailed'))
    } finally {
      setDeletingTplId(null)
    }
  }

  async function removeBrand(id: string) {
    setDeletingId(id)
    try {
      await deleteBrand(id)
      const list = await listBrands()
      setBrandsList(list)
      setBrands(list)            // resync sidebar store (recalcule la marque active)
      setConfirmDelete(null)
      toast.success(tr('settings.brands.deleted'))
      // Si on a supprimé la marque active → recharger pour re-scoper toutes les données.
      if (id === activeBrandId) {
        const next = list[0]?.id
        document.cookie = next
          ? `active-brand=${next}; path=/; max-age=31536000; samesite=lax`
          : 'active-brand=; path=/; max-age=0'
        window.location.reload()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('settings.brands.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  function saveStudio() {
    setSettings({ studioName: name.trim() || 'Studio UGC IA' })
    setSaved(true)
    toast.success(tr('settings.studio.saved'))
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="-mx-8 -mb-8 -mt-6 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card text-text-primary shadow-neo-sm">
        <header className="flex h-[56px] shrink-0 items-center border-b border-border px-5">
          <h1 className="text-[17px] font-extrabold tracking-tight text-text-primary">{tr('settings.title')}</h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-[640px] flex-col gap-5">

            {/* Studio */}
            <div className="rounded-[14px] border border-border bg-fg/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-accent" />
                <h2 className="text-[14px] font-extrabold text-text-primary">{tr('settings.studio.heading')}</h2>
              </div>

              <label className="mb-4 block">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">{tr('settings.studio.nameLabel')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr('settings.studio.namePlaceholder')}
                  className="h-9 w-full rounded-[8px] border border-border bg-bg-card px-3 text-[13px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
                <span className="mt-1.5 block text-[11px] font-medium text-text-muted">{tr('settings.studio.nameHint')}</span>
              </label>

              <label className="block max-w-[280px]">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">{tr('settings.studio.langLabel')}</span>
                <select
                  value={locale}
                  onChange={(e) => setSettings({ locale: e.target.value })}
                  className="h-9 w-full rounded-[8px] border border-border bg-bg-card px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-accent"
                >
                  {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </label>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={saveStudio}
                  className="flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  {saved ? <><Check size={15} strokeWidth={2.8} /> {tr('common.saved')}</> : tr('common.save')}
                </button>
              </div>
            </div>

            {/* Compte */}
            <div className="rounded-[14px] border border-border bg-fg/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2">
                <User size={16} className="text-accent" />
                <h2 className="text-[14px] font-extrabold text-text-primary">{tr('settings.account.heading')}</h2>
              </div>

              <div className="mb-4">
                <span className="mb-1.5 block text-[12px] font-extrabold text-text-primary">{tr('settings.account.emailLabel')}</span>
                <div className="flex h-9 items-center rounded-[8px] border border-border bg-fg/[0.04] px-3 text-[13px] font-semibold text-text-secondary">
                  {email || '—'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 items-center gap-2 rounded-[9px] border border-coral/40 px-4 text-[13px] font-extrabold text-coral transition hover:bg-coral/10"
              >
                <LogOut size={15} strokeWidth={2.4} />
                {tr('settings.account.logout')}
              </button>
            </div>

            {/* Marques */}
            <div className="rounded-[14px] border border-border bg-fg/[0.02] p-5">
              <div className="mb-1 flex items-center gap-2">
                <Store size={16} className="text-accent" />
                <h2 className="text-[14px] font-extrabold text-text-primary">{tr('settings.brands.heading')}</h2>
              </div>
              <p className="mb-4 text-[11px] font-medium text-text-muted">
                {(() => {
                  const parts = tr('settings.brands.warning').split('{strong}')
                  return <>{parts[0]}<span className="font-bold text-coral">{tr('settings.brands.warningStrong')}</span>{parts[1]}</>
                })()}
              </p>

              {brands.length === 0 ? (
                <p className="text-[12px] font-medium text-text-muted">{tr('settings.brands.empty')}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {brands.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-card px-3 py-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white" style={{ backgroundColor: b.color }}>
                        {b.name.trim()[0]?.toUpperCase() ?? '?'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-text-primary">{b.name}</span>
                      {b.id === activeBrandId && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold text-accent">{tr('settings.brands.active')}</span>
                      )}
                      {confirmDelete === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-[7px] px-2 py-1 text-[11px] font-extrabold text-text-secondary hover:bg-fg/[0.06]">{tr('common.cancel')}</button>
                          <button type="button" onClick={() => removeBrand(b.id)} disabled={deletingId === b.id} className="flex items-center gap-1 rounded-[7px] bg-coral px-2.5 py-1 text-[11px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-50">
                            {deletingId === b.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} strokeWidth={2.5} />}
                            {tr('common.delete')}
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(b.id)} title={tr('settings.brands.deleteTitle')} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={14} strokeWidth={2.3} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Templates système — DEV uniquement */}
            {isDev && (
              <div className="rounded-[14px] border border-accent/30 bg-accent/[0.03] p-5">
                <div className="mb-1 flex items-center gap-2">
                  <Code2 size={16} className="text-accent" />
                  <h2 className="text-[14px] font-extrabold text-text-primary">{tr('settings.sysTemplates.heading')}</h2>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">{tr('settings.sysTemplates.devBadge')}</span>
                </div>
                <p className="mb-4 text-[11px] font-medium text-text-muted">
                  {tr('settings.sysTemplates.subtitle')}
                </p>

                {/* Formulaire d'ajout */}
                <div className="mb-4 grid gap-2.5 rounded-[10px] border border-border bg-bg-card p-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={tplLabel} onChange={(e) => setTplLabel(e.target.value)} placeholder={tr('settings.sysTemplates.labelPlaceholder')} className="h-9 rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent" />
                    <input value={tplCategory} onChange={(e) => setTplCategory(e.target.value)} placeholder={tr('settings.sysTemplates.categoryPlaceholder')} className="h-9 rounded-[8px] border border-border bg-fg/[0.03] px-3 text-[12px] font-semibold text-text-primary outline-none focus:border-accent" />
                  </div>
                  <textarea value={tplPrompt} onChange={(e) => setTplPrompt(e.target.value)} placeholder={tr('settings.sysTemplates.promptPlaceholder')} rows={2} className="resize-none rounded-[8px] border border-border bg-fg/[0.03] px-3 py-2 text-[12px] font-medium text-text-primary outline-none focus:border-accent" />
                  <div className="flex items-center gap-2.5">
                    <label className="flex h-9 flex-1 cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-border-strong bg-fg/[0.03] px-3 text-[12px] font-semibold text-text-secondary transition hover:border-accent">
                      <Upload size={14} />
                      <span className="truncate">{tplFile ? tplFile.name : tr('settings.sysTemplates.filePlaceholder')}</span>
                      <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => setTplFile(e.target.files?.[0] ?? null)} />
                    </label>
                    <button type="button" onClick={uploadSystemTemplate} disabled={uploadingTpl} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-accent px-4 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105 disabled:opacity-55">
                      {uploadingTpl ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.6} />}
                      {tr('common.add')}
                    </button>
                  </div>
                </div>

                {/* Onglets Vidéo / Image */}
                <div className="mb-3 inline-flex rounded-[9px] bg-fg/[0.06] p-1">
                  {([['video', tr('settings.sysTemplates.tabVideos')], ['image', tr('settings.sysTemplates.tabImages')]] as const).map(([id, label]) => {
                    const count = sysTemplates.filter((t) => t.kind === id).length
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTplKindTab(id)}
                        className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12px] font-extrabold transition ${tplKindTab === id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        {id === 'video' ? <Video size={13} /> : <ImageIcon size={13} />}
                        {label}
                        <span className={`rounded-full px-1.5 text-[10px] ${tplKindTab === id ? 'bg-accent/15 text-accent' : 'bg-fg/[0.08] text-text-muted'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Liste des templates système (filtrée par type) */}
                {(() => { const shown = sysTemplates.filter((t) => t.kind === tplKindTab); return shown.length === 0 ? (
                  <p className="text-[12px] font-medium text-text-muted">{tplKindTab === 'video' ? tr('settings.sysTemplates.emptyVideo') : tr('settings.sysTemplates.emptyImage')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {shown.map((t) => (
                      <div key={t.id} className="group relative overflow-hidden rounded-[10px] border border-border bg-bg-card">
                        <div className="relative aspect-video bg-fg/[0.04]">
                          {t.kind === 'video' ? (
                            <video
                              src={t.url}
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                              onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}) }}
                              onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.url} alt={t.label} className="h-full w-full object-cover" />
                          )}
                          <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white">
                            {t.kind === 'video' ? <Video size={11} /> : <ImageIcon size={11} />}
                          </span>
                          <button type="button" onClick={() => removeSystemTemplate(t.id)} disabled={deletingTplId === t.id} aria-label={tr('common.delete')} className="absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-black/70 text-white transition hover:bg-coral group-hover:grid disabled:opacity-50">
                            {deletingTplId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="truncate text-[11px] font-extrabold text-text-primary">{t.label}</p>
                          <p className="truncate text-[10px] font-medium text-text-muted">{t.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) })()}
              </div>
            )}

          </div>
        </div>
      </section>
    </div>
  )
}
