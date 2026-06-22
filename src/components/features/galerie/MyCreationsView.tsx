'use client'

import { Filter, LayoutGrid, Video } from 'lucide-react'

export default function MyCreationsView() {
  return (
    <section className="flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-[#f5f5f5] text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,0.10)]">
      {/* Header */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#d6d6d6] px-5 sm:px-6">
        <h1 className="text-[19px] font-extrabold tracking-tight text-[#111]">My Creations</h1>
        <button className="flex items-center gap-2 rounded-md bg-[#e4e4e4] px-3 py-1.5 text-[13px] font-extrabold text-[#333] transition-colors hover:bg-[#d8d8d8]">
          <LayoutGrid size={15} strokeWidth={2.5} />
          View Social Posts
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Empty State Area */}
        <main className="flex flex-1 flex-col items-center justify-center bg-[#f5f5f5] p-5">
          <Video size={56} fill="#888" className="text-[#888] mb-5" strokeWidth={0} />
          <h2 className="text-[20px] font-extrabold text-[#111]">No creations found</h2>
          <p className="mt-1 text-[15px] font-medium text-[#444]">Start creating videos to see them here</p>
        </main>

        {/* Sidebar Filters */}
        <aside className="flex w-[300px] flex-col border-l border-[#d6d6d6] bg-[#eaeaea] shrink-0">
          <div className="flex items-center justify-between border-b border-[#d6d6d6] p-5 py-4">
            <h2 className="text-[18px] font-extrabold tracking-tight">Filters</h2>
            <button className="flex items-center gap-1.5 text-[13px] font-bold text-[#666] transition-colors hover:text-[#111]">
              <Filter size={14} strokeWidth={2.5} />
              Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-6">
              <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-[#555]">
                Status
              </label>
              <div className="relative">
                <select className="w-full appearance-none rounded-md border border-[#cfcfcf] bg-[#f5f5f5] py-2 pl-9 pr-8 text-[14px] font-extrabold text-[#222] outline-none transition-colors focus:border-[#ff4a1c]">
                  <option>All Statuses</option>
                </select>
                <Filter size={15} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wide text-[#555]">
                Creation Type
              </label>
              <div className="relative">
                <select className="w-full appearance-none rounded-md border border-[#cfcfcf] bg-[#f5f5f5] py-2 pl-9 pr-8 text-[14px] font-extrabold text-[#222] outline-none transition-colors focus:border-[#ff4a1c]">
                  <option>All Types</option>
                </select>
                <Filter size={15} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="my-6 border-t border-[#d6d6d6]" />

            <div className="flex items-center justify-between text-[14px]">
              <span className="font-semibold text-[#444]">Total Results</span>
              <span className="font-extrabold text-[#111]">0</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
