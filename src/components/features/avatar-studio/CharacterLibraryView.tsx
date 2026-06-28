'use client'

import Link from 'next/link'
import { Plus, UserRound, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n'

export type CharacterCard = {
  id: string
  name: string
  age: number | null
  ethnicity: string | null
  style_tags: string[] | null
  source_photo_url: string | null
  reference_sheet_url: string | null
}

export default function CharacterLibraryView({ characters = [] }: { characters?: CharacterCard[] }) {
  const tr = useT()
  const hasCharacters = characters.length > 0

  return (
    <div className="page animate-fade-in -mx-8 -mt-6 -mb-8 h-screen overflow-hidden px-2 py-1.5">
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border bg-bg-card shadow-neo-sm">
        <header className="flex h-[56px] flex-shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold tracking-tight text-text-primary">
              Characters
            </h1>
            {hasCharacters && (
              <span className="inline-flex items-center rounded-full bg-fg/[0.06] px-2 py-0.5 text-[12px] font-extrabold text-text-secondary">
                {characters.length}
              </span>
            )}
          </div>
          <Link
            href="/avatar-studio?create=actor"
            className="inline-flex h-9 flex-shrink-0 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
          >
            <Plus size={17} strokeWidth={2.6} />
            <span>{tr('avatar.createCharacter')}</span>
          </Link>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {hasCharacters ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {characters.map((character) => {
                const image = character.source_photo_url || character.reference_sheet_url || ''
                const meta = [character.ethnicity, character.age ? `${character.age} ans` : null]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <Link
                    key={character.id}
                    href={`/avatar-studio?avatar=${character.id}`}
                    className="group relative block aspect-[2/3] overflow-hidden rounded-[16px] bg-bg-elevated shadow-neo-sm ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-accent/60 hover:shadow-neo"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={character.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-text-faint">
                        <UserRound size={34} strokeWidth={1.8} />
                      </span>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-2.5 pt-9 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="block truncate text-[13px] font-extrabold leading-tight text-white">{character.name}</span>
                      {meta && <span className="block truncate text-[11px] font-medium text-white/80">{meta}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <div className="text-center">
                <div className="mx-auto grid h-[60px] w-[60px] place-items-center rounded-[14px] bg-fg/[0.06] text-text-primary">
                  <Sparkles size={30} strokeWidth={2.1} />
                </div>
                <h2 className="mt-6 text-[20px] font-extrabold tracking-tight text-text-primary">
                  {tr('avatar.libEmptyTitle')}
                </h2>
                <p className="mx-auto mt-3 max-w-[360px] text-[14px] font-medium text-text-secondary">
                  {tr('avatar.libEmptyDesc')}
                </p>
                <Link
                  href="/avatar-studio?create=actor"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-[13px] font-extrabold text-white shadow-neo-solid transition hover:brightness-105"
                >
                  <Plus size={17} strokeWidth={2.6} /> Créer un personnage
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
