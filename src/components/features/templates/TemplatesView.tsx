'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronDown, Check, Video, Image as ImageIcon, LayoutGrid, User } from 'lucide-react'
import Link from 'next/link'
import { VIDEO_TEMPLATES, IMAGE_TEMPLATES, TEMPLATE_CATEGORIES as CATEGORIES } from '@/lib/templates/library'

// ─── Component ───────────────────────────────────────────────────────────────

export default function TemplatesView() {
  const [mode, setMode]       = useState<'video' | 'image'>('video')
  const [imgTab, setImgTab]   = useState<'library' | 'mine'>('library')
  const [catOpen, setCatOpen] = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleCat(cat: string) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <section className="flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-[#f8f8f8] text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,0.10)]">

      {/* ── Header ── */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-[#fbfbfb] px-5 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="grid h-8 w-8 place-items-center rounded-full text-[#111] transition-colors hover:bg-black/5"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#111]">Browse templates</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Category dropdown */}
          <div className="relative" ref={catRef}>
            <button
              onClick={() => setCatOpen((o) => !o)}
              className="flex items-center gap-2 rounded-[10px] border border-[#d5d5d5] bg-[#f5f5f5] px-4 py-2 transition-colors hover:bg-[#eaeaea]"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#888]">Categories</span>
              <span className="text-[14px] font-extrabold text-[#111]">
                {selectedCats.length === 0 ? 'All categories' : selectedCats.length === 1 ? selectedCats[0] : `${selectedCats.length} selected`}
              </span>
              <ChevronDown size={15} strokeWidth={2.5} className={`text-[#555] transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>

            {catOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-[14px] border border-[#e0e0e0] bg-[#f8f8f8] shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
                {/* All categories row */}
                <button
                  onClick={() => setSelectedCats([])}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#efefef]"
                >
                  {selectedCats.length === 0
                    ? <Check size={17} strokeWidth={3} className="text-[#ff4a1c]" />
                    : <span className="h-[17px] w-[17px]" />}
                  <span className={`text-[15px] font-extrabold ${selectedCats.length === 0 ? 'text-[#ff4a1c]' : 'text-[#111]'}`}>
                    All categories
                  </span>
                </button>

                <div className="mx-4 border-t border-[#e5e5e5]" />

                {/* Category list with checkboxes */}
                {CATEGORIES.map((cat) => {
                  const checked = selectedCats.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#efefef]"
                    >
                      <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border-2 transition-colors ${
                        checked ? 'border-[#ff4a1c] bg-[#ff4a1c]' : 'border-[#bbb] bg-white'
                      }`}>
                        {checked && <Check size={11} strokeWidth={3.5} className="text-white" />}
                      </span>
                      <span className="text-[14px] font-semibold text-[#111]">{cat}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Video / Image toggle */}
          <div className="flex h-8 items-center rounded-[8px] bg-[#e8e8e8] p-0.5">
            <button
              onClick={() => setMode('video')}
              className={`flex h-full items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-extrabold shadow-sm transition-colors ${
                mode === 'video' ? 'bg-[#ff4a1c] text-white' : 'text-[#555] hover:text-[#111]'
              }`}
            >
              <Video size={14} strokeWidth={2.5} />
              Video
            </button>
            <button
              onClick={() => setMode('image')}
              className={`flex h-full items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-extrabold shadow-sm transition-colors ${
                mode === 'image' ? 'bg-[#ff4a1c] text-white' : 'text-[#555] hover:text-[#111]'
              }`}
            >
              <ImageIcon size={14} strokeWidth={2.5} />
              Image
            </button>
          </div>
        </div>
      </header>

      {/* ── Sub-tabs (Image mode only) ── */}
      {mode === 'image' && (
        <div className="flex shrink-0 items-center gap-1 border-b border-[#e5e5e5] bg-[#f8f8f8] px-5 py-2.5 sm:px-6">
          <button
            onClick={() => setImgTab('library')}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-extrabold transition-colors ${
              imgTab === 'library'
                ? 'bg-[#e8e8e8] text-[#111]'
                : 'text-[#666] hover:bg-[#efefef] hover:text-[#111]'
            }`}
          >
            <LayoutGrid size={14} strokeWidth={2.5} />
            Library
          </button>
          <button
            onClick={() => setImgTab('mine')}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-extrabold transition-colors ${
              imgTab === 'mine'
                ? 'bg-[#e8e8e8] text-[#111]'
                : 'text-[#666] hover:bg-[#efefef] hover:text-[#111]'
            }`}
          >
            <User size={14} strokeWidth={2.5} />
            My templates
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">

        {/* VIDEO — masonry portrait */}
        {mode === 'video' && (
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
            {VIDEO_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="group relative mb-3 w-full cursor-pointer overflow-hidden rounded-[14px] break-inside-avoid"
              >
                <div className={`relative w-full ${t.aspect}`}>
                  <img
                    src={t.image}
                    alt={t.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-[13px] font-extrabold leading-snug text-white drop-shadow-sm">{t.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* IMAGE — uniform 5-col grid */}
        {mode === 'image' && (
          <>
            {imgTab === 'library' ? (
              <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
                {IMAGE_TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    className="group relative mb-3 w-full cursor-pointer overflow-hidden rounded-[14px] break-inside-avoid"
                  >
                    <div className={`relative w-full ${t.aspect}`}>
                      <img
                        src={t.image}
                        alt={t.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <h3 className="text-[12px] font-extrabold leading-snug text-white drop-shadow-sm">{t.title}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* My Templates empty state */
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#e8e8e8]">
                  <ImageIcon size={28} strokeWidth={2} className="text-[#999]" />
                </div>
                <p className="text-[16px] font-extrabold text-[#111]">No templates yet</p>
                <p className="text-[14px] font-medium text-[#666]">Your saved image templates will appear here</p>
              </div>
            )}
          </>
        )}
      </main>
    </section>
  )
}
