'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, X, ChevronDown, Send, Sparkles, Loader2, ShoppingBag, User, Plus, Store, RotateCcw } from 'lucide-react'
import { useChat, type ChatMsg } from '@/lib/stores/chatStore'
import { useSettings } from '@/lib/stores/settingsStore'
import { useBrand } from '@/lib/stores/brandStore'
import { useBrands } from '@/lib/stores/brandsStore'
import { actionChatAgent } from '@/lib/actions/ai'
import { createBrand, listBrands } from '@/lib/actions/brands'
import { actionListProducts, type ProductDTO } from '@/lib/actions/products'
import { actionListAvatarsForPicker, actionUploadTempImage } from '@/lib/actions/avatar-assets'
import { fileToDataUrl } from '@/lib/media/videoFrames'
import { useToast } from '@/lib/stores/toastStore'
import { useT, type TFunc } from '@/lib/i18n'
import type { ChatAction } from '@/lib/ai/text'

type Msg = ChatMsg

const greeting = (studio: string, tr: TFunc): Msg => ({ role: 'assistant', content: tr('chat.greeting', { studio }) })

export default function GlobalChat() {
  const router = useRouter()
  const toast = useToast()
  const tr = useT()
  const STARTERS = [tr('chat.starter1'), tr('chat.starter2'), tr('chat.starter3'), tr('chat.starter4')]
  const PROC_STEPS = [tr('chat.proc1'), tr('chat.proc2'), tr('chat.proc3'), tr('chat.proc4')]
  const [isOpen, setIsOpen] = useState(false)
  const studioName = useSettings((s) => s.studioName)
  const brandName = useBrand((s) => s.name)
  const allBrands = useBrands((s) => s.brands)
  const setBrands = useBrands((s) => s.setBrands)
  const setActiveBrand = useBrands((s) => s.setActiveBrand)

  // Exécute une action commandée par l'assistant (façon MCP).
  async function runAction(a: ChatAction) {
    switch (a.type) {
      case 'navigate':
        router.push(a.path); setIsOpen(false); break
      case 'create_image':
        router.push('/creer/image/creator'); setIsOpen(false); break
      case 'create_video':
        router.push(`/creer/video?mode=${a.mode}`); setIsOpen(false); break
      case 'switch_brand': {
        const b = allBrands.find((x) => x.name.toLowerCase() === a.name.toLowerCase())
        if (!b) { toast.error(tr('chat.brandNotFound', { name: a.name })); return }
        setActiveBrand(b.id)
        document.cookie = `active-brand=${b.id}; path=/; max-age=31536000; samesite=lax`
        toast.success(tr('chat.activeBrand', { name: b.name }))
        window.location.reload()
        break
      }
      case 'create_brand': {
        try {
          const nb = await createBrand({ name: a.name, color: a.color, category: a.category })
          setBrands(await listBrands())
          setActiveBrand(nb.id)
          document.cookie = `active-brand=${nb.id}; path=/; max-age=31536000; samesite=lax`
          window.location.assign('/parametres?section=profile')
        } catch { toast.error(tr('chat.brandCreateFailed')) }
        break
      }
    }
  }

  const messages = useChat((s) => s.messages)
  const setMessages = useChat((s) => s.setMessages)
  const resetChat = useChat((s) => s.reset)
  // Amorce la conversation (greeting) si vide.
  useEffect(() => {
    if (messages.length === 0) setMessages([greeting(studioName, tr)])
  }, [messages.length, studioName, setMessages])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Pièces jointes (comme le composer Production)
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [avatars, setAvatars] = useState<{ id: string; name: string; photoUrl: string | null }[]>([])
  const [attachProductId, setAttachProductId] = useState<string | null>(null)
  const [attachAvatarId, setAttachAvatarId] = useState<string | null>(null)
  const [attachMenu, setAttachMenu] = useState<'product' | 'avatar' | null>(null)
  const [refImage, setRefImage] = useState<string | null>(null)   // image jointe (URL temporaire)
  const [uploadingRef, setUploadingRef] = useState(false)
  const [freeCreation, setFreeCreation] = useState(true)          // création rapide sans marque (défaut)
  const fileRef = useRef<HTMLInputElement>(null)

  async function pickRefImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    setUploadingRef(true)
    try {
      const { url } = await actionUploadTempImage(await fileToDataUrl(file))
      setRefImage(url)
    } catch { toast.error(tr('chat.uploadImageFailed')) }
    finally { setUploadingRef(false) }
  }

  const attachedProduct = products.find((p) => p.id === attachProductId) ?? null
  const attachedAvatar = avatars.find((a) => a.id === attachAvatarId) ?? null

  const [procStep, setProcStep] = useState(0)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Fait défiler les messages de traitement tant que l'agent travaille.
  useEffect(() => {
    if (!sending) { setProcStep(0); return }
    const id = setInterval(() => setProcStep((s) => (s + 1) % PROC_STEPS.length), 2200)
    return () => clearInterval(id)
  }, [sending])

  // Charge produits + avatars à la 1ʳᵉ ouverture (scopés à la marque active).
  useEffect(() => {
    if (!isOpen || products.length || avatars.length) return
    actionListProducts().then(setProducts).catch(() => {})
    actionListAvatarsForPicker().then(setAvatars).catch(() => {})
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim()
    if (!text || sending) return
    // Note de pièces jointes injectée dans le message pour que l'agent en tienne compte.
    const tags = [
      attachedProduct ? `[Produit attaché: ${attachedProduct.name}]` : '',
      attachedAvatar ? `[Avatar attaché: ${attachedAvatar.name}]` : '',
    ].filter(Boolean).join(' ')
    const display = text
    const sent = tags ? `${text}\n${tags}` : text
    const next: Msg[] = [...messages, { role: 'user', content: display }]
    setMessages(next)
    setInput('')
    setAttachMenu(null)
    setSending(true)
    try {
      const history = next.slice(0, -1).concat({ role: 'user', content: sent })
      const res = await actionChatAgent(history, { studioName, brand: brandName, brands: allBrands.map((b) => b.name), freeCreation, refImageUrl: refImage ?? undefined })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, images: res.images, link: res.link }])
      setRefImage(null)
      if (res.action) runAction(res.action)
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: tr('chat.errorGeneric') }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-[84px] right-6 z-50 flex h-[calc(100vh-110px)] max-h-[760px] w-[460px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-lg animate-slide-up">
          {/* Header */}
          <header className="flex items-center justify-between gap-2 bg-gradient-accent px-3.5 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                <Sparkles size={15} strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[13px] font-extrabold leading-tight">{tr('chat.title')}</p>
                <p className="flex items-center gap-1 text-[10px] font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {tr('chat.online')} · {studioName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { resetChat(); setMessages([greeting(studioName, tr)]) }} title={tr('chat.newConversation')} className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white">
                <RotateCcw size={16} strokeWidth={2.4} />
              </button>
              <button onClick={() => setIsOpen(false)} title={tr('chat.minimize')} className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white">
                <ChevronDown size={20} strokeWidth={2.5} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-fg/[0.02] p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <Sparkles size={12} strokeWidth={2.4} />
                  </span>
                )}
                <div className={`max-w-[82%] rounded-[14px] px-3 py-2 text-[12px] font-medium leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-br-[5px] bg-accent text-white'
                    : 'rounded-bl-[5px] border border-border bg-bg-card text-text-primary'
                }`}>
                  <span className="whitespace-pre-wrap">{m.content}</span>
                  {m.images && m.images.length > 0 && (
                    <div className={`mt-2 grid gap-1.5 ${m.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {m.images.map((url, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={k} href={url} target="_blank" rel="noopener" className="block overflow-hidden rounded-[10px] border border-border">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {m.link && (
                    <button
                      type="button"
                      onClick={() => { router.push(m.link!.path); setIsOpen(false) }}
                      className="mt-2 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-extrabold text-white transition hover:brightness-105"
                    >
                      {m.link.label} →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2 justify-start">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Sparkles size={12} strokeWidth={2.4} className="animate-pulse" />
                </span>
                <div className="flex items-center gap-2 rounded-[14px] rounded-bl-[5px] border border-accent/30 bg-accent/[0.06] px-3 py-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-[12px] font-bold text-accent">{PROC_STEPS[procStep]}</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-accent/60 [animation-delay:-0.3s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-accent/60 [animation-delay:-0.15s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-accent/60" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Saisie — même composer que Production */}
          <div className="border-t border-border p-3">
            {/* Amorces (visibles tant que la conversation est courte) */}
            {messages.length <= 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border bg-fg/[0.03] px-2.5 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:border-accent/50 hover:text-accent">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-[14px] border border-border bg-bg-card px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={tr('chat.placeholder')}
                rows={2}
                className="block max-h-32 w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-text-primary outline-none ring-0 placeholder:text-text-muted focus:ring-0"
              />
              {/* Aperçu image jointe */}
              {refImage && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-[10px] border border-border bg-fg/[0.04] p-1 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={refImage} alt="" className="h-8 w-8 rounded-[7px] object-cover" />
                  <span className="text-[11px] font-bold text-text-secondary">{tr('chat.imageAttached')}</span>
                  <button type="button" onClick={() => setRefImage(null)} className="text-text-muted hover:text-coral"><X size={13} strokeWidth={2.5} /></button>
                </div>
              )}

              <div className="mt-1.5 flex items-center justify-between gap-2">
                {/* Pièces jointes */}
                <div className="flex items-center gap-1.5">
                  {/* + Image */}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickRefImage(e.target.files?.[0]); e.target.value = '' }} />
                  <button type="button" onClick={() => fileRef.current?.click()} title={tr('chat.attachImage')} className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-fg/[0.06] text-text-primary transition-colors hover:bg-fg/[0.10]">
                    {uploadingRef ? <Loader2 size={13} className="animate-spin" /> : <Plus size={15} strokeWidth={2.5} />}
                  </button>
                  {/* Scope marque / création rapide */}
                  <button type="button" onClick={() => setFreeCreation((v) => !v)} title={freeCreation ? tr('chat.freeTooltip') : tr('chat.brandTooltip', { brand: brandName })} className={`flex h-7 items-center gap-1.5 rounded-[9px] px-2 text-[11px] font-extrabold transition-colors ${freeCreation ? 'bg-fg/[0.06] text-text-muted' : 'bg-accent/10 text-accent'}`}>
                    <Store size={13} strokeWidth={2.3} />
                    {freeCreation ? tr('chat.freeCreation') : tr('chat.withBrand')}
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => setAttachMenu((m) => (m === 'product' ? null : 'product'))} className={`flex h-7 max-w-[130px] items-center gap-1.5 rounded-[9px] px-2 text-[11px] font-extrabold transition-colors ${attachedProduct ? 'bg-accent/10 text-accent' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.10]'}`}>
                      <ShoppingBag size={13} strokeWidth={2.3} />
                      <span className="truncate">{attachedProduct ? attachedProduct.name : tr('chat.product')}</span>
                      {attachedProduct && <X size={11} strokeWidth={2.6} onClick={(e) => { e.stopPropagation(); setAttachProductId(null) }} className="shrink-0 hover:scale-110" />}
                    </button>
                    {attachMenu === 'product' && (
                      <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[180px] w-[200px] overflow-y-auto rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                        {products.length === 0 ? <p className="px-3 py-2 text-[11px] font-medium text-text-muted">{tr('chat.noProduct')}</p> : products.map((p) => (
                          <button key={p.id} type="button" onClick={() => { setAttachProductId(p.id); setAttachMenu(null) }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${attachProductId === p.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}>
                            <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-fg/[0.08]">{p.imageUrl ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />) : <ShoppingBag size={12} className="text-text-muted" />}</span>
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button type="button" onClick={() => setAttachMenu((m) => (m === 'avatar' ? null : 'avatar'))} className={`flex h-7 max-w-[130px] items-center gap-1.5 rounded-[9px] px-2 text-[11px] font-extrabold transition-colors ${attachedAvatar ? 'bg-accent/10 text-accent' : 'bg-fg/[0.06] text-text-primary hover:bg-fg/[0.10]'}`}>
                      <User size={13} strokeWidth={2.3} />
                      <span className="truncate">{attachedAvatar ? attachedAvatar.name : tr('chat.avatar')}</span>
                      {attachedAvatar && <X size={11} strokeWidth={2.6} onClick={(e) => { e.stopPropagation(); setAttachAvatarId(null) }} className="shrink-0 hover:scale-110" />}
                    </button>
                    {attachMenu === 'avatar' && (
                      <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[180px] w-[200px] overflow-y-auto rounded-[10px] border border-border bg-bg-card py-1 shadow-neo-lg">
                        {avatars.length === 0 ? <p className="px-3 py-2 text-[11px] font-medium text-text-muted">{tr('chat.noCharacter')}</p> : avatars.map((a) => (
                          <button key={a.id} type="button" onClick={() => { setAttachAvatarId(a.id); setAttachMenu(null) }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${attachAvatarId === a.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-fg/[0.05]'}`}>
                            <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-fg/[0.08]">{a.photoUrl ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={a.photoUrl} alt="" className="h-full w-full object-cover" />) : <User size={12} className="text-text-muted" />}</span>
                            <span className="truncate">{a.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || sending}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={tr('chat.send')}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-medium text-text-faint">{tr('chat.disclaimer')}</p>
          </div>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-accent shadow-neo-solid transition-transform hover:scale-105"
        aria-label={isOpen ? tr('chat.close') : tr('chat.open')}
      >
        {isOpen ? <X size={24} strokeWidth={2.5} className="text-white" /> : <MessageSquare size={22} strokeWidth={0} className="fill-white" />}
      </button>
    </>
  )
}
