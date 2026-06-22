'use client'

import { useState } from 'react'
import { ArrowRight, Globe2, MessageSquare, Mic, Palette, ShoppingBag, Sparkles, Store, Telescope, UsersRound, Wand2 } from 'lucide-react'
import { useSettings } from '@/lib/stores/settingsStore'

export default function BrandProfilePage() {
  const [websitePromptOpen, setWebsitePromptOpen] = useState(false)
  const studioName = useSettings((s) => s.studioName)

  return (
    <main className="min-h-screen bg-[#eeeeee] text-[#111111]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-b-[28px] bg-[#eaded8] px-8 py-10 lg:min-h-screen lg:rounded-b-none lg:rounded-r-[28px] lg:px-16">
          <div className="flex flex-1 items-center justify-center">
            <div className="relative h-[300px] w-[360px] max-w-full">
              <div className="absolute left-[78px] top-[56px] h-[220px] w-[138px] rounded-[18px] border-[3px] border-white/60 bg-[#1b1715] shadow-[0_16px_40px_rgba(17,17,17,0.18)]" />
              <div className="absolute left-[118px] top-[28px] h-[250px] w-[176px] overflow-hidden rounded-[18px] border-[3px] border-white bg-white shadow-[0_18px_44px_rgba(17,17,17,0.20)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=520&q=85"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute right-[6px] top-[110px] grid h-[74px] w-[74px] place-items-center rounded-[8px] border border-black/10 bg-white/85 shadow-[0_10px_26px_rgba(17,17,17,0.14)] backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=220&q=80"
                  alt=""
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div className="absolute left-[18px] top-[176px] flex h-9 w-[160px] items-center gap-2 rounded-[6px] bg-white/95 px-3 text-[12px] font-semibold text-[#6b6b72] shadow-[0_8px_22px_rgba(17,17,17,0.12)]">
                <Mic size={13} />
                <span className="truncate">Change the model</span>
              </div>
              <div className="absolute bottom-[46px] right-[0px] flex h-10 w-[148px] items-center gap-3 rounded-full bg-[#ef5b3e] px-5 text-white shadow-[0_12px_28px_rgba(239,91,62,0.34)]">
                <span className="h-4 w-1.5 rounded-full bg-white" />
                <span className="h-1.5 flex-1 rounded-full bg-white/70" />
              </div>
              <Sparkles className="absolute left-[44px] top-[160px] text-[#ef5b3e]" size={16} fill="currentColor" />
              <Sparkles className="absolute right-[18px] bottom-[72px] text-[#ef5b3e]" size={18} fill="currentColor" />
              <span className="absolute right-[54px] top-[72px] text-[20px] font-black text-[#ef5b3e]">+</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[760px] pb-8 lg:pb-14">
            <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px] lg:text-[60px]">
              Batch <span className="text-[#ef3d12]">Content Creation</span>
            </h1>
            <p className="mt-6 text-[18px] font-medium text-[#2f2f34] sm:text-[20px]">
              Generate months of high-performing social content in a single afternoon.
            </p>
            <div className="mt-12 flex items-center justify-center gap-3">
              {[0, 1, 2, 3, 4].map((dot) => (
                <span key={dot} className="h-3 w-3 rounded-full bg-[#f4a890]" />
              ))}
              <span className="h-3 w-9 rounded-full bg-[#ef3d12]" />
            </div>
          </div>
        </section>

        <section className="relative flex min-h-[560px] items-center justify-center px-6 py-12 lg:min-h-screen">
          <div className="w-full max-w-[620px] text-center">
            <div className="mx-auto grid h-[132px] w-[132px] place-items-center rounded-[12px] bg-[#ef5b3e] text-white shadow-[0_18px_48px_rgba(239,91,62,0.24)]">
              <Wand2 size={76} strokeWidth={1.8} />
            </div>

            <h2 className="mt-10 font-display text-[40px] font-extrabold leading-tight tracking-tight sm:text-[48px]">
              Welcome to <span className="text-[#ef3d12]">{studioName}</span> 👋
            </h2>
            <p className="mt-3 text-[20px] font-semibold text-[#353539]">
              Let&apos;s create your brand profile
            </p>

            <div className="mx-auto mt-20 max-w-[560px] text-left">
              <label htmlFor="brand-url" className="mb-3 block text-[14px] font-extrabold text-[#242428]">
                Enter your brand website URL
              </label>
              <div className="flex items-center gap-3 rounded-[18px] border border-black/10 bg-white/55 p-3 shadow-[0_2px_8px_rgba(17,17,17,0.04)]">
                <input
                  id="brand-url"
                  type="url"
                  placeholder="yourbrand.com"
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent px-3 text-[20px] font-extrabold text-[#222225] outline-none placeholder:text-[#252529]"
                />
                <button className="inline-flex h-12 min-w-[156px] items-center justify-center gap-3 rounded-[12px] bg-[#e9866d] px-6 text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(233,134,109,0.32)] transition hover:brightness-105">
                  Analyze
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {[
                  { label: 'SHOPIFY URL', icon: ShoppingBag },
                  { label: 'WEBSITE URL', icon: Globe2 },
                  { label: 'WOOCOMMERCE URL', icon: Store },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <span key={item.label} className="inline-flex h-8 items-center gap-2 rounded-full bg-black/[0.07] px-4 text-[12px] font-extrabold text-[#55555b]">
                      <Icon size={15} />
                      {item.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWebsitePromptOpen(true)}
              className="mt-16 text-[14px] font-extrabold text-[#242428] transition hover:text-[#ef3d12]"
            >
              I don&apos;t have a website, skip for now
            </button>
          </div>

          <button className="fixed bottom-6 right-6 grid h-16 w-16 place-items-center rounded-full bg-[#e75a00] text-white shadow-[0_16px_40px_rgba(231,90,0,0.35)] transition hover:brightness-105" aria-label="Chat">
            <MessageSquare size={30} fill="currentColor" />
          </button>
        </section>
      </div>

      {websitePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 py-6">
          <div className="w-full max-w-[760px] animate-fade-in rounded-[18px] bg-[#eeeeee] px-8 py-9 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:px-11 sm:py-12">
            <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
              Add your website to supercharge {studioName}
            </h2>
            <p className="mt-7 max-w-[650px] text-[22px] font-medium leading-relaxed text-[#26262a]">
              Share your site and we&apos;ll set up your whole brand for you, in seconds.
            </p>

            <div className="mt-9 space-y-5">
              {[
                {
                  title: 'Your brand, done for you',
                  desc: 'Logo, colours and tone of voice, pulled automatically.',
                  icon: Palette,
                },
                {
                  title: 'Competitors mapped',
                  desc: "We find who you're up against and how to stand out.",
                  icon: Telescope,
                },
                {
                  title: 'Your ideal customers',
                  desc: 'Buyer profiles built in, so every ad lands.',
                  icon: UsersRound,
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-center gap-5">
                    <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-[18px] bg-[#ead6ce] text-[#ef3d12]">
                      <Icon size={30} strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[22px] font-extrabold leading-tight">{item.title}</span>
                      <span className="mt-1 block text-[18px] font-medium leading-snug text-[#29292d]">{item.desc}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 rounded-[16px] border border-[#edb8a8] bg-[#eaded8]/55 px-6 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <ShoppingBag size={30} className="text-[#5b8643]" fill="currentColor" />
                <span className="rounded-full bg-[#d6d4c9] px-4 py-1 text-[16px] font-extrabold text-[#5a7e44]">
                  BEST WITH SHOPIFY
                </span>
              </div>
              <h3 className="mt-5 text-[22px] font-extrabold leading-tight">Your products, imported automatically</h3>
              <p className="mt-3 text-[19px] font-medium leading-snug text-[#29292d]">
                Connected to Shopify? We pull your entire catalogue in. Zero manual work.
              </p>
            </div>

            <p className="mt-7 text-center text-[18px] font-medium text-[#242428]">
              Takes a few seconds. Change anything later.
            </p>

            <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setWebsitePromptOpen(false)}
                className="h-14 rounded-[12px] border border-black/12 bg-white/35 px-8 text-[20px] font-extrabold text-[#111111] shadow-[0_2px_8px_rgba(17,17,17,0.08)] transition hover:bg-white/60"
              >
                Continue without it
              </button>
              <button
                type="button"
                onClick={() => setWebsitePromptOpen(false)}
                className="inline-flex h-14 items-center justify-center gap-4 rounded-[12px] bg-[#e73300] px-9 text-[20px] font-extrabold text-white shadow-[0_10px_24px_rgba(231,51,0,0.30)] transition hover:brightness-105"
              >
                Add my website
                <ArrowRight size={24} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
