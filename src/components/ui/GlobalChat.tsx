'use client'

import { useState } from 'react'
import {
  MessageSquare,
  X,
  ChevronDown,
  User,
  Smile,
  AudioLines,
  Send,
  Zap
} from 'lucide-react'
import { useSettings } from '@/lib/stores/settingsStore'

export default function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false)
  const studioName = useSettings((s) => s.studioName)

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-[88px] right-6 z-50 flex h-[calc(100vh-130px)] max-h-[720px] w-[420px] flex-col overflow-hidden rounded-[16px] border border-[#2a2a2a] bg-[#1a1a1a] shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <header className="relative flex flex-col items-center bg-gradient-to-br from-[#f26513] to-[#d65113] pb-6 pt-5 px-5 text-white" style={{ backgroundImage: 'linear-gradient(135deg, #f26513 0%, #d65113 100%), url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10l10-10 10 10-10 10L0 10z\' fill=\'rgba(0,0,0,0.03)\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")', backgroundBlendMode: 'overlay' }}>
            {/* Top Bar */}
            <div className="flex w-full items-center justify-between">
              <div className="w-6" /> {/* Spacer */}
              <button className="flex items-center gap-1.5 rounded-full bg-black/15 px-3.5 py-1.5 text-[13px] font-extrabold transition hover:bg-black/25">
                <MessageSquare size={14} strokeWidth={2.5} className="fill-white" />
                Messages
              </button>
              <button className="grid h-6 w-6 place-items-center rounded-full text-white/80 transition hover:bg-black/15 hover:text-white" onClick={() => setIsOpen(false)}>
                <ChevronDown size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Avatars */}
            <div className="mt-5 flex items-center justify-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className="-ml-2 grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-[#de5a19] bg-[#292a2c] first:ml-0">
                  <User size={22} className="text-[#6d6e73]" strokeWidth={2.5} />
                </div>
              ))}
              <div className="-ml-2 grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-[#de5a19] bg-white">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f25c1a]">
                  <Zap size={16} strokeWidth={2.5} className="fill-white text-white" />
                </div>
              </div>
            </div>

            <p className="mt-4 text-[15px] font-extrabold tracking-tight">
              Questions? Chat with us.
            </p>
          </header>

          {/* Messages Area */}
          <main className="flex-1 overflow-y-auto p-4">
            <div className="flex items-end gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-[#f25c1a]">
                  <Zap size={11} strokeWidth={2.5} className="fill-white text-white" />
                </div>
              </div>
              <div className="rounded-[14px] rounded-bl-[4px] bg-[#272727] px-3.5 py-2.5 text-[14px] font-medium text-white max-w-[85%]">
                How can we help with {studioName}?
              </div>
            </div>
          </main>

          {/* Input Area */}
          <div className="p-4 pt-0">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[14px] border border-[#ea580c] bg-[#272727] transition-colors focus-within:border-[#ff7a2e]">
              <textarea
                placeholder="Compose your message..."
                rows={1}
                className="w-full resize-none bg-transparent px-3.5 pt-3.5 pb-2 text-[14px] text-white outline-none placeholder:text-[#888]"
              />
              <div className="flex items-center justify-between px-3.5 pb-2.5">
                <div className="flex items-center gap-2.5 text-[#aaa]">
                  <button type="button" className="transition hover:text-white"><Smile size={18} strokeWidth={2} /></button>
                  <button type="button" className="transition hover:text-white"><AudioLines size={18} strokeWidth={2} /></button>
                </div>
                <button type="button" className="text-[#444] transition hover:text-[#ea580c]">
                  <Send size={18} strokeWidth={2.5} className="fill-current" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex h-8 items-center justify-center gap-1.5 bg-[#141414] text-[10px] font-extrabold text-[#777]">
            We run on
            <span className="flex items-center gap-0.5 text-white">
              <MessageSquare size={10} strokeWidth={0} className="fill-[#0051e2] mb-px" />
              crisp
            </span>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#ea580c] shadow-[0_8px_16px_rgba(234,88,12,0.3)] transition-transform hover:scale-105"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X size={24} strokeWidth={2.5} className="text-white" />
        ) : (
          <MessageSquare size={22} strokeWidth={0} className="fill-white" />
        )}
      </button>
    </>
  )
}
