'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, ChevronDown, Send, Sparkles, Loader2 } from 'lucide-react'
import { useSettings } from '@/lib/stores/settingsStore'
import { useBrand } from '@/lib/stores/brandStore'
import { actionChatAssistant } from '@/lib/actions/ai'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false)
  const studioName = useSettings((s) => s.studioName)
  const brandName = useBrand((s) => s.name)

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: `Salut 👋 Je suis l'assistant de ${studioName}. Comment puis-je t'aider à créer ta prochaine pub ?` },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const reply = await actionChatAssistant(next, { studioName, brand: brandName })
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Désolé, une erreur est survenue. Réessaie dans un instant." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-[84px] right-6 z-50 flex h-[calc(100vh-130px)] max-h-[640px] w-[400px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-lg animate-slide-up">
          {/* Header */}
          <header className="flex items-center justify-between gap-2 bg-gradient-accent px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <Sparkles size={18} strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[14px] font-extrabold leading-tight">Assistant</p>
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En ligne · {studioName}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white">
              <ChevronDown size={20} strokeWidth={2.5} />
            </button>
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
                <div className={`max-w-[82%] whitespace-pre-wrap rounded-[14px] px-3 py-2 text-[12px] font-medium leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-br-[5px] bg-accent text-white'
                    : 'rounded-bl-[5px] border border-border bg-bg-card text-text-primary'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2 justify-start">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Sparkles size={12} strokeWidth={2.4} />
                </span>
                <div className="flex items-center gap-1.5 rounded-[14px] rounded-bl-[5px] border border-border bg-bg-card px-3 py-2 text-text-muted shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted/60 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted/60 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted/60" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Saisie — même composer que Production */}
          <div className="border-t border-border p-3">
            <div className="rounded-[14px] border border-border bg-bg-card px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Écris ton message…"
                rows={2}
                className="block max-h-32 w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-text-primary outline-none ring-0 placeholder:text-text-muted focus:ring-0"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-text-faint">↵ Envoyer · ⇧↵ nouvelle ligne</span>
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-medium text-text-faint">Propulsé par IA · peut faire des erreurs</p>
          </div>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-accent shadow-neo-solid transition-transform hover:scale-105"
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {isOpen ? <X size={24} strokeWidth={2.5} className="text-white" /> : <MessageSquare size={22} strokeWidth={0} className="fill-white" />}
      </button>
    </>
  )
}
