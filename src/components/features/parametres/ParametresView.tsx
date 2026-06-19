'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  Box,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FileUp,
  FolderPlus,
  ImageIcon,
  Info,
  Laptop,
  LinkIcon,
  Megaphone,
  Music,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  UsersRound,
  Video,
  X,
} from 'lucide-react'

interface Props {
  currentUser: { email: string; createdAt: string | null } | null
}

const brandTabs = [
  {
    id: 'identity',
    label: 'Identity',
    description: 'Core brand values and assets.',
    icon: ShieldCheck,
  },
  {
    id: 'tone',
    label: 'Tone',
    description: 'Voice guidelines and messaging style.',
    icon: Megaphone,
  },
  {
    id: 'audience',
    label: 'Audience',
    description: 'Target demographics and personas.',
    icon: UsersRound,
  },
]

type BrandTabId = (typeof brandTabs)[number]['id']

const colors = [
  { value: '#1A1A1A', bg: '#111111' },
  { value: '#F5F0EB', bg: '#cfcac4' },
  { value: '#C8A882', bg: '#a98d68' },
  { value: '#000000', bg: '#000000' },
]

const brandTypes = [
  { label: 'E-Commerce', description: 'Physical products', icon: Store, active: false },
  { label: 'SaaS / App', description: 'Digital products', icon: Laptop, active: false },
  { label: 'Service', description: 'Agency or Consulting', icon: BriefcaseBusiness, active: true },
]

const preferredWords = ['quality', 'essential', 'everyday', 'accessible', 'sustainable']
const wordsToAvoid = ['cheap', 'luxury', 'exclusive']
const audienceDesires = ['Effortless everyday style', 'Products that last', 'Guilt-free purchases']
const audienceProblems = [
  'Finding affordable quality clothing',
  'Overwhelmed by too many choices',
  'Concerned about sustainability',
]
const folderColors = ['#c73538', '#d18707', '#159b70', '#356bc4', '#7048c5', '#bd3b85', '#1295a3', '#66a80f']

export default function ParametresView(_props: Props) {
  const [activeTab, setActiveTab] = useState<BrandTabId>('identity')
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [folderColor, setFolderColor] = useState(folderColors[0])
  const searchParams = useSearchParams()
  const section = searchParams.get('section') ?? 'profile'

  if (section === 'products') {
    return (
      <div className="animate-fade-in">
        <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
          <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2.5">
            <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Brand Products</h1>
            <button
              type="button"
              onClick={() => setIsProductDrawerOpen(true)}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-[#e33508] px-5 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <Plus size={18} strokeWidth={2.4} />
              Add new product
            </button>
          </header>

          <div className="flex min-h-[calc(100vh-112px)] items-center justify-center px-6 py-16">
            <div className="-mt-28 flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#d5d5d5] text-[#2f3033]">
                <Box size={31} strokeWidth={2.3} />
              </span>
              <p className="mt-5 text-[17px] font-semibold text-[#25262a]">No products found.</p>
              <button
                type="button"
                onClick={() => setIsProductDrawerOpen(true)}
                className="mt-2.5 flex h-8 items-center gap-2 rounded-[8px] border border-[#d1d1d1] bg-[#e8e8e8] px-4 text-[13px] font-extrabold text-[#242529] shadow-sm transition hover:border-[#bdbdbd]"
              >
                <Plus size={16} strokeWidth={2.4} />
                Add product
              </button>
            </div>
          </div>
        </section>

        {isProductDrawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/75">
            <button
              type="button"
              aria-label="Close add product panel"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsProductDrawerOpen(false)}
            />
            <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto bg-[#eeeeee] px-5 py-6 text-[#1a1a1d] shadow-neo lg:px-6">
              <button
                type="button"
                aria-label="Close add product panel"
                onClick={() => setIsProductDrawerOpen(false)}
                className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border-2 border-[#e33508] text-[#55565a] transition hover:bg-[#eaded8] hover:text-[#e33508]"
              >
                <X size={16} strokeWidth={2.2} />
              </button>

              <div className="flex items-start justify-between gap-3 pr-9">
                <div>
                  <h2 className="font-display text-[17px] font-extrabold leading-tight tracking-tight">
                    Add new product
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium text-[#34353a]">Create a new product for your brand</p>
                </div>
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-[#e98d72] px-3.5 text-[12px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  Create product
                </button>
              </div>

              <div className="mt-6">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  <Sparkles size={13} className="text-[#e33508]" strokeWidth={2.3} />
                  Auto-fill from URL
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-8 min-w-0 items-center gap-2 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-2.5 text-[#242529]">
                    <LinkIcon size={14} strokeWidth={2.2} />
                    <input
                      aria-label="Product URL"
                      placeholder="e.g. https://yourwebsite.com/products/<product-name>"
                      className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold outline-none placeholder:text-[#3f4044]"
                    />
                  </label>
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-[#e98d72] px-3.5 text-[11px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                  >
                    <Sparkles size={13} strokeWidth={2.3} />
                    Analyze
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3.5 md:grid-cols-[142px_1fr]">
                <button
                  type="button"
                  aria-label="Upload product image"
                  className="grid aspect-square min-h-[132px] place-items-center rounded-[9px] bg-[#cfcfcf] text-[#828282] transition hover:bg-[#c7c7c7]"
                >
                  <Box size={30} strokeWidth={2.2} />
                </button>

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                      Name
                    </span>
                    <input
                      aria-label="Product name"
                      placeholder="Entity name"
                      className="h-9 w-full rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                      Description
                    </span>
                    <textarea
                      aria-label="Product description"
                      placeholder="Describe this entity..."
                      className="h-[66px] w-full resize-none rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 py-2 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  $ Pricing
                </span>
                <div className="grid gap-2 sm:grid-cols-[64px_1fr]">
                  <button
                    type="button"
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] text-[12px] font-semibold text-[#222327] shadow-sm"
                  >
                    USD
                  </button>
                  <input
                    aria-label="Product price"
                    placeholder="0.00"
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                  />
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  Benefits
                </span>
                <div className="grid gap-2 sm:grid-cols-[1fr_36px]">
                  <input
                    aria-label="Product benefit"
                    placeholder="Add a new benefit..."
                    className="h-8 rounded-[7px] border border-[#d1d1d1] bg-[#e4e4e4] px-3 text-[12px] font-semibold text-[#222327] outline-none focus:border-[#e33508]"
                  />
                  <button
                    type="button"
                    aria-label="Add benefit"
                    className="grid h-8 place-items-center rounded-[7px] bg-[#dddddd] text-[#58595d] transition hover:bg-[#d4d4d4]"
                  >
                    <Plus size={16} strokeWidth={2.1} />
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">
                  Additional images (0)
                </span>
                <button
                  type="button"
                  className="grid h-[92px] w-[92px] place-items-center rounded-[9px] border-2 border-dashed border-[#aaaaaa] bg-[#e4e4e4] text-[#232428] transition hover:border-[#e33508] hover:text-[#e33508]"
                >
                  <span className="flex flex-col items-center gap-1.5 text-[11px] font-semibold">
                    <Upload size={15} strokeWidth={2.2} />
                    Upload
                  </span>
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    )
  }

  if (section === 'assets') {
    return (
      <div className="animate-fade-in">
        <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
          <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2">
            <h1 className="font-display text-[20px] font-extrabold leading-tight tracking-tight">Brand Assets</h1>
            <button
              type="button"
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[#e33508] px-4 text-[13px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
            >
              <FolderPlus size={16} strokeWidth={2.35} />
              Create Folder
            </button>
          </header>

          <div className="grid min-h-[calc(100vh-108px)] lg:grid-cols-[1fr_230px]">
            <main className="flex items-start justify-center px-6 py-14 lg:py-18">
              <div className="mt-8 flex flex-col items-center text-center">
                <ImageIcon size={46} strokeWidth={2.2} className="text-[#2c2c30]" />
                <p className="mt-4 text-[15px] font-extrabold text-[#17181b]">No images yet</p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#34353a]">
                  Upload your first image to get started
                </p>
              </div>
            </main>

            <aside className="border-t border-[#d1d1d1] px-3.5 py-4 lg:border-l lg:border-t-0">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-[#34353a]">Asset Type</h2>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="flex h-7 items-center gap-1.5 rounded-[8px] bg-[#e33508] px-2.5 text-[10px] font-extrabold text-white shadow-neo-sm"
                >
                  <ImageIcon size={13} strokeWidth={2.3} />
                  Images
                </button>
                <button
                  type="button"
                  className="flex h-7 items-center gap-1.5 rounded-[8px] border border-[#d0d0d0] bg-[#e4e4e4] px-2.5 text-[10px] font-extrabold text-[#25262a] transition hover:border-[#bbbbbb]"
                >
                  <Video size={13} strokeWidth={2.3} />
                  Videos
                </button>
                <button
                  type="button"
                  className="flex h-7 items-center gap-1.5 rounded-[8px] border border-[#d0d0d0] bg-[#e4e4e4] px-2.5 text-[10px] font-extrabold text-[#25262a] transition hover:border-[#bbbbbb]"
                >
                  <Music size={13} strokeWidth={2.3} />
                  Audio
                </button>
              </div>

              <button
                type="button"
                className="mt-4 flex min-h-[174px] w-full flex-col items-center justify-center rounded-[9px] border-2 border-dashed border-[#9f9f9f] bg-[#e4e4e4] px-4 text-center text-[#222327] transition hover:border-[#e33508]"
              >
                <FileUp size={23} strokeWidth={2.2} />
                <span className="mt-3.5 flex items-center gap-1.5 text-[14px] font-extrabold">
                  <Video size={13} strokeWidth={2.4} />
                  Upload Videos
                </span>
                <span className="mt-2 text-[11px] font-medium leading-snug text-[#34353a]">
                  Drag &amp; drop or click to select
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#6a6b70]">
                  Supported file types:
                  <Info size={11} strokeWidth={2.2} />
                </span>
                <span className="mt-3 max-w-[170px] text-[11px] font-medium leading-snug text-[#626368]">
                  Max 100MB for videos, 20MB for images, 25MB for audios
                </span>
              </button>

              <div className="my-4 flex items-center gap-2.5">
                <span className="h-px flex-1 bg-[#d1d1d1]" />
                <span className="text-[11px] font-extrabold uppercase text-[#5f6065]">Or</span>
                <span className="h-px flex-1 bg-[#d1d1d1]" />
              </div>

              <button
                type="button"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#d1d1d1] bg-[#e4e4e4] text-[12px] font-extrabold text-[#202124] shadow-sm transition hover:border-[#bdbdbd]"
              >
                <Sparkles size={14} strokeWidth={2.3} />
                Create with AI
              </button>
            </aside>
          </div>
        </section>

        {isCreateFolderOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <button
              type="button"
              aria-label="Close create folder modal"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsCreateFolderOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[560px] rounded-[14px] border border-[#cfcfcf] bg-[#eeeeee] px-7 py-7 text-[#17181b] shadow-neo">
              <button
                type="button"
                aria-label="Close create folder modal"
                onClick={() => setIsCreateFolderOpen(false)}
                className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full text-[#4d4e52] transition hover:bg-[#dedede] hover:text-[#111111]"
              >
                <X size={20} strokeWidth={2.1} />
              </button>

              <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Create Folder</h2>
              <p className="mt-2 text-[16px] font-medium text-[#292a2e]">
                Create a new folder in the current directory.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-[112px_1fr] sm:items-end">
                <span aria-hidden className="relative block h-[78px] w-[104px]">
                  <span
                    className="absolute left-0 top-[18px] h-[56px] w-[104px] rounded-[10px] border-[4px] border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span
                    className="absolute left-0 top-0 h-[34px] w-[50px] rounded-t-[10px] border-[4px] border-b-0 border-[#050505]"
                    style={{ backgroundColor: folderColor }}
                  />
                  <span className="absolute left-[42px] top-[16px] h-[12px] w-[48px] rounded-tr-[10px] bg-[#050505]" />
                </span>

                <label className="block">
                  <span className="block text-[12px] font-extrabold uppercase tracking-wide text-[#34353a]">
                    Folder Name
                  </span>
                  <input
                    autoFocus
                    aria-label="Folder name"
                    placeholder="Enter folder name"
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#e33508] bg-[#eeeeee] px-3 text-[16px] font-medium text-[#1d1e22] outline-none ring-1 ring-[#e33508]/20 placeholder:text-[#333438]"
                  />
                </label>
              </div>

              <div className="mt-9">
                <span className="block text-[12px] font-extrabold uppercase tracking-wide text-[#34353a]">Color</span>
                <div className="mt-3 flex flex-wrap gap-3">
                  {folderColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select folder color ${color}`}
                      onClick={() => setFolderColor(color)}
                      className={`h-12 w-12 rounded-[9px] border transition ${
                        folderColor === color
                          ? 'border-[#e33508] ring-2 ring-[#e33508] ring-offset-2 ring-offset-[#eeeeee]'
                          : 'border-transparent hover:ring-2 hover:ring-black/15'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="h-10 rounded-[9px] border border-[#d1d1d1] bg-[#e8e8e8] px-5 text-[14px] font-extrabold text-[#17181b] shadow-sm transition hover:border-[#bcbcbc]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="flex h-10 items-center gap-2 rounded-[9px] bg-[#e33508] px-5 text-[14px] font-extrabold text-white shadow-neo-sm transition hover:brightness-105"
                >
                  <Plus size={17} strokeWidth={2.4} />
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <section className="min-h-[calc(100vh-56px)] overflow-hidden rounded-[18px] border border-border bg-[#eeeeee] text-[#1a1a1d] shadow-neo-sm">
        <header className="flex items-center justify-between border-b border-[#d7d7d7] px-5 py-2.5">
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight">Brand Details</h1>
          <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#2c2c30]">
            <CheckCircle2 size={17} className="text-emerald-600" />
            Saved
          </div>
        </header>

        <div className="grid gap-8 px-5 py-9 lg:grid-cols-[180px_1fr] lg:px-6 lg:py-12">
          <aside className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {brandTabs.map((tab) => {
              const Icon = tab.icon

              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-[132px] w-[148px] flex-shrink-0 flex-col items-start justify-between rounded-[15px] border-2 px-4 py-4 text-left transition lg:w-full ${
                    activeTab === tab.id
                      ? 'border-[#e33508] bg-[#eaded8] text-[#e33508]'
                      : 'border-[#d1d1d1] bg-transparent text-[#1f2024] hover:border-[#b8b8b8]'
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full ${
                      activeTab === tab.id ? 'bg-[#e7cec5] text-[#e33508]' : 'bg-[#d9d9d9] text-[#2c2c2f]'
                    }`}
                  >
                    <Icon size={23} strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block font-display text-[18px] font-extrabold leading-tight tracking-tight">
                      {tab.label}
                    </span>
                    <span className={`mt-1.5 block text-[13px] font-medium leading-tight ${activeTab === tab.id ? 'text-[#2f2f33]' : 'text-[#333438]'}`}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </aside>

          {activeTab === 'identity' ? (
          <div className="grid gap-x-5 gap-y-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(390px,1.05fr)]">
            <div className="grid gap-5 md:grid-cols-[118px_1fr] xl:col-span-2">
              <button
                type="button"
                className="grid h-24 w-24 place-items-center rounded-full bg-[#d4d4d4] text-center text-[#202124] transition hover:bg-[#cccccc]"
              >
                <span className="flex flex-col items-center gap-1.5 text-[11px] font-extrabold">
                  <Upload size={17} strokeWidth={2.3} />
                  Upload logo
                </span>
              </button>

              <div className="min-w-0">
                <input
                  aria-label="Brand name"
                  defaultValue="My Brand"
                  className="h-10 w-full border-0 border-b border-[#d1d1d1] bg-transparent px-0 font-display text-[18px] font-extrabold text-[#111111] outline-none"
                />

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_300px]">
                  <label className="block">
                    <span className="mb-2 block text-[15px] font-extrabold">Brand Category</span>
                    <div className="flex h-8 items-center rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5">
                      <span className="rounded-full border border-[#c9c9c9] bg-[#dddddd] px-2.5 py-0.5 text-[9px] font-extrabold">
                        FASHION &amp; CLOTHING
                      </span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[15px] font-extrabold">Language</span>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5 text-left"
                    >
                      <span className="text-[13px] font-medium">🇺🇸&nbsp; English</span>
                      <ChevronDown size={15} className="text-[#77777a]" />
                    </button>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block">
                <span className="mb-2 block text-[15px] font-extrabold">Brand Description</span>
                <div className="relative">
                  <textarea
                    defaultValue="A modern brand offering quality products and services."
                    className="h-[92px] w-full resize-none rounded-[9px] border border-[#d4d4d4] bg-[#e8e8e8] p-3 text-[13px] font-medium leading-snug text-[#111111] outline-none focus:border-[#e33508]"
                    maxLength={2000}
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-[#44454a]">54/2000</span>
                </div>
              </label>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Palette size={16} className="text-[#e33508]" />
                  <h2 className="text-[15px] font-extrabold">Brand Colors</h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {colors.map((color) => (
                    <div key={color.value} className="text-center">
                      <span
                        className="block h-[44px] w-[44px] rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: color.bg }}
                      />
                      <span className="mt-1.5 block text-[11px] font-extrabold text-[#77777b]">{color.value}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="grid h-[44px] w-[44px] place-items-center rounded-full border-2 border-dashed border-[#bfbfbf] text-[#77777b] transition hover:border-[#e33508] hover:text-[#e33508]"
                    aria-label="Add brand color"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-[15px] font-extrabold">Brand Type</h2>
              <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-3">
                {brandTypes.map((type) => {
                  const Icon = type.icon

                  return (
                    <button
                      key={type.label}
                      type="button"
                      className={`min-h-[92px] rounded-[10px] border-2 px-3 py-3 text-left transition ${
                        type.active
                          ? 'border-[#e33508] bg-[#eaded8]'
                          : 'border-[#d4d4d4] bg-[#e4e4e4] hover:border-[#bcbcbc]'
                      }`}
                    >
                      <span
                        className={`mb-3 grid h-8 w-8 place-items-center rounded-full ${
                          type.active ? 'bg-[#e7cec5] text-[#e33508]' : 'bg-[#d4d4d4] text-[#343438]'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.3} />
                      </span>
                      <span className="block text-[13px] font-extrabold leading-tight">{type.label}</span>
                      <span className="mt-1 block text-[11px] font-medium leading-tight text-[#34353a]">{type.description}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-extrabold">Key Features</h2>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                    aria-label="Add key feature"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-[13px] font-medium italic text-[#29292d]">Add Key Features.</p>
              </div>
            </div>
          </div>
          ) : null}

          {activeTab === 'tone' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2.5 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <Megaphone size={15} className="text-[#e33508]" />
                  Communication Tone
                </span>
                <input
                  aria-label="Communication tone"
                  defaultValue="Friendly, confident, and approachable"
                  className="h-8 w-full rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-2.5 text-[12px] font-medium text-[#111111] outline-none focus:border-[#e33508]"
                />
              </label>

              <div className="mt-8 grid gap-x-6 gap-y-7 xl:grid-cols-2">
                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Preferred Words</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add preferred word"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="flex max-w-[460px] flex-wrap gap-2">
                    {preferredWords.map((word) => (
                      <span
                        key={word}
                        className="min-w-[104px] rounded-[8px] bg-[#d8d8d8] px-2.5 py-1.5 text-[12px] font-semibold text-[#15161a]"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Words to Avoid</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add word to avoid"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="flex max-w-[460px] flex-wrap gap-2">
                    {wordsToAvoid.map((word) => (
                      <span
                        key={word}
                        className="min-w-[104px] rounded-[8px] bg-[#d8d8d8] px-2.5 py-1.5 text-[12px] font-semibold text-[#15161a]"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Good Examples</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add good example"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <p className="text-[12px] font-medium italic text-[#29292d]">Add Good Examples.</p>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Bad Examples</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add bad example"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <p className="text-[12px] font-medium italic text-[#29292d]">Add Bad Examples.</p>
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'audience' ? (
            <div className="pt-1">
              <label className="block">
                <span className="mb-2.5 flex items-center gap-1.5 text-[13px] font-extrabold">
                  <UsersRound size={15} className="text-[#e33508]" />
                  Target Audience
                </span>
                <div className="relative">
                  <textarea
                    aria-label="Target audience"
                    defaultValue="Style-conscious adults aged 25-40 who value quality and sustainability over fast fashion"
                    maxLength={1000}
                    className="h-[82px] w-full resize-none rounded-[9px] border border-[#d4d4d4] bg-[#e8e8e8] p-3 text-[12px] font-medium leading-snug text-[#111111] outline-none focus:border-[#e33508]"
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[12px] font-medium text-[#44454a]">88/1000</span>
                </div>
              </label>

              <div className="mt-8 grid gap-x-6 gap-y-7 xl:grid-cols-2">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Audience Desires</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add audience desire"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {audienceDesires.map((desire) => (
                      <div
                        key={desire}
                        className="rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 py-2 text-[12px] font-medium text-[#15161a]"
                      >
                        {desire}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-extrabold">Audience Problems</h2>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-[#303034] transition hover:bg-[#dedede]"
                      aria-label="Add audience problem"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {audienceProblems.map((problem) => (
                      <div
                        key={problem}
                        className="rounded-[8px] border border-[#d4d4d4] bg-[#e8e8e8] px-3 py-2 text-[12px] font-medium text-[#15161a]"
                      >
                        {problem}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
