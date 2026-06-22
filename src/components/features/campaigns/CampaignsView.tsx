'use client'

import { useState } from 'react'
import {
  ArrowDownUp,
  ChevronDown,
  Filter,
  LayoutGrid,
  Megaphone,
  Plus,
  Search,
  X,
  Check,
} from 'lucide-react'
import { useBrands } from '@/lib/stores/brandsStore'
import { cn } from '@/lib/utils'

export default function CampaignsView() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [activeCampaignBrandId, setActiveCampaignBrandId] = useState<string | null>(null)
  const { brands, activeBrandId } = useBrands()

  const selectedCampaignBrand = brands.find((b) => b.id === activeCampaignBrandId)

  function openModal() {
    setSelectedBrandId(activeBrandId)
    setModalOpen(true)
  }

  return (
    <>
    <div className="animate-fade-in relative flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[18px] border border-[#d7d7d7] bg-[#f4f4f4] text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,0.10)]">
      {/* Header */}
      <header className="shrink-0 border-b border-[#e5e5e5] px-5 sm:px-6">
        <div className="flex h-[60px] items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-tight text-[#111]">Campaigns</h1>
          <button
            type="button"
            onClick={openModal}
            className="flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[#111] px-3.5 text-[12px] font-extrabold text-white transition-colors hover:bg-[#333]"
          >
            <Plus size={14} strokeWidth={2.8} />
            Create campaign
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e5e5e5] px-5 sm:px-6 py-3">
        <div className="relative w-[280px]">
          <Search size={15} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="h-[34px] w-full rounded-[8px] border border-[#dcdcdc] bg-transparent pl-9 pr-4 text-[13px] font-semibold text-[#111] outline-none transition-colors placeholder:text-[#777] focus:border-[#ff4a1c] focus:bg-white"
          />
        </div>
        <button
          type="button"
          className="flex h-[34px] items-center gap-1.5 rounded-[8px] border border-[#dcdcdc] bg-transparent px-3 text-[12px] font-extrabold text-[#333] transition-colors hover:bg-black/5"
        >
          <Filter size={14} strokeWidth={2.2} className="text-[#666]" />
          Objective
          <ChevronDown size={14} strokeWidth={2.5} className="text-[#888] ml-1" />
        </button>
        <button
          type="button"
          className="flex h-[34px] items-center gap-1.5 rounded-[8px] border border-[#dcdcdc] bg-transparent px-3 text-[12px] font-extrabold text-[#333] transition-colors hover:bg-black/5"
        >
          <ArrowDownUp size={13} strokeWidth={2.5} className="text-[#666]" />
          Newest first
          <ChevronDown size={14} strokeWidth={2.5} className="text-[#888] ml-1" />
        </button>
      </div>

      {/* Main Content */}
      {selectedCampaignBrand ? (
        <main className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-[500px] animate-fade-in rounded-[16px] border border-[#dcdcdc] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4 border-b border-[#eee] pb-5">
              <span
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[12px] text-white shadow-sm"
                style={{ backgroundColor: selectedCampaignBrand.color }}
              >
                <LayoutGrid size={24} strokeWidth={2.35} />
              </span>
              <div>
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#111]">New Campaign</h2>
                <p className="text-[13px] font-medium text-[#666]">
                  Creating for <span className="font-bold text-[#111]">{selectedCampaignBrand.name}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-[#333]">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Sale 2026"
                  className="h-10 w-full rounded-[8px] border border-[#dcdcdc] bg-[#f9f9f9] px-3 text-[14px] font-medium text-[#111] outline-none transition-colors focus:border-[#ff4a1c] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-[#333]">Objective</label>
                <select className="h-10 w-full rounded-[8px] border border-[#dcdcdc] bg-[#f9f9f9] px-3 text-[14px] font-medium text-[#111] outline-none transition-colors focus:border-[#ff4a1c] focus:bg-white">
                  <option>Brand Awareness</option>
                  <option>Lead Generation</option>
                  <option>Sales Conversion</option>
                </select>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#ea580c] text-[14px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#d04b08]"
                >
                  <Plus size={16} strokeWidth={2.8} />
                  Start Campaign
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#dcdcdc] text-[#333]">
            <Megaphone size={22} strokeWidth={2.5} />
          </div>
          <h2 className="mt-4 text-[16px] font-extrabold tracking-tight text-[#111]">
            No campaigns yet
          </h2>
          <p className="mt-1.5 text-[14px] font-semibold text-[#555] max-w-[280px]">
            Create your first campaign to start tracking your ad strategies.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-5 flex items-center gap-1.5 rounded-[9px] bg-[#111] px-4 py-2.5 text-[13px] font-extrabold text-white transition-colors hover:bg-[#333]"
          >
            <Plus size={14} strokeWidth={2.8} />
            Create campaign
          </button>
        </main>
      )}
    </div>

    {/* Brand Picker Modal */}
    {modalOpen && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px] transition-all"
          onClick={() => setModalOpen(false)}
        />

        {/* Modal */}
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[540px] -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95">
          <div className="overflow-hidden rounded-[20px] border border-[#e0e0e0] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#ececec] px-6 py-5">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#111]">Select a Brand</h2>
                <p className="mt-0.5 text-[13px] font-medium text-[#777]">
                  Choose which brand this campaign is for
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#888] transition-colors hover:bg-[#f4f4f4] hover:text-[#111]"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Brand List */}
            <div className="max-h-[320px] overflow-y-auto p-3">
              {brands.length === 0 ? (
                <div className="py-10 text-center text-[14px] font-semibold text-[#888]">
                  No brands yet. Create one first from the sidebar.
                </div>
              ) : (
                brands.map((brand) => {
                  const isSelected = brand.id === selectedBrandId
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedBrandId(brand.id)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-[12px] p-3 text-left transition-colors',
                        isSelected ? 'bg-[#f4f4f4]' : 'hover:bg-[#f8f8f8]',
                      )}
                    >
                      <span
                        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[10px] text-white"
                        style={{ backgroundColor: brand.color }}
                      >
                        <LayoutGrid size={20} strokeWidth={2.35} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-[#111]">{brand.name}</span>
                        {brand.id === activeBrandId && (
                          <span className="mt-0.5 block text-[11px] font-extrabold uppercase tracking-wide text-[#ea580c]">Active brand</span>
                        )}
                      </span>
                      <span className={cn(
                        'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-colors',
                        isSelected ? 'border-[#111] bg-[#111]' : 'border-[#ccc]',
                      )}>
                        {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#ececec] px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-[38px] rounded-[9px] border border-[#dcdcdc] px-5 text-[13px] font-extrabold text-[#444] transition-colors hover:bg-[#f4f4f4]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBrandId}
                onClick={() => {
                  setActiveCampaignBrandId(selectedBrandId)
                  setModalOpen(false)
                }}
                className="h-[38px] rounded-[9px] bg-[#111] px-5 text-[13px] font-extrabold text-white transition-colors hover:bg-[#333] disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}
