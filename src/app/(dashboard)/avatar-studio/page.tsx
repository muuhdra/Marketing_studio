import { listAvatars } from '@/lib/actions/avatars'
import { actionListOutfits, actionListEnvironments } from '@/lib/actions/avatar-assets'
import { createClient } from '@/lib/supabase/server'
import { BUCKETS } from '@/lib/supabase/storage'
import CharacterLibraryView from '@/components/features/avatar-studio/CharacterLibraryView'
import CharacterPromptGeneratorView, { type EditAvatar, type SavedOutfit, type SavedEnvironment } from '@/components/features/avatar-studio/CharacterPromptGeneratorView'

type PageSearchParams = {
  avatar?: string | string[]
  create?: string | string[]
}

export default async function Page({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>
}) {
  const params = await searchParams
  const avatarId = Array.isArray(params?.avatar) ? params.avatar[0] : params?.avatar
  const createMode = Array.isArray(params?.create) ? params.create[0] : params?.create

  if (createMode === 'actor') {
    return <CharacterPromptGeneratorView />
  }

  let avatars: Awaited<ReturnType<typeof listAvatars>> = []
  try {
    avatars = await listAvatars()
  } catch { /* middleware gère le non-authentifié */ }

  const supabase = await createClient()
  const sign = async (path: string | null) => {
    if (!path) return null
    // Déjà une URL absolue → on la garde telle quelle.
    if (/^https?:\/\//.test(path)) return path
    const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
    return data?.signedUrl ?? null
  }

  if (!avatarId) {
    const characters = await Promise.all(
      avatars
        .filter((a) => a.status !== 'archived')
        .map(async (a) => ({
          id:                  a.id,
          name:                a.name,
          age:                 a.age,
          ethnicity:           a.ethnicity,
          style_tags:          a.style_tags,
          source_photo_url:    await sign(a.source_photo_url),
          reference_sheet_url: await sign(a.reference_sheet_url),
        })),
    )
    return <CharacterLibraryView characters={characters} />
  }

  // Édition d'un avatar existant → on ouvre le nouveau workflow pré-rempli.
  const target = avatars.find((a) => a.id === avatarId && a.status !== 'archived')
  if (!target) {
    // Avatar introuvable / archivé → retour bibliothèque.
    const characters = await Promise.all(
      avatars
        .filter((a) => a.status !== 'archived')
        .map(async (a) => ({
          id:                  a.id,
          name:                a.name,
          age:                 a.age,
          ethnicity:           a.ethnicity,
          style_tags:          a.style_tags,
          source_photo_url:    await sign(a.source_photo_url),
          reference_sheet_url: await sign(a.reference_sheet_url),
        })),
    )
    return <CharacterLibraryView characters={characters} />
  }

  const morphology = (target.morphology as Record<string, string> | null) ?? {}
  const gender = morphology.gender === 'male' || morphology.gender === 'female' ? morphology.gender : ''
  const editAvatar: EditAvatar = {
    id:          target.id,
    name:        target.name,
    gender,
    ageGroup:    morphology.ageGroup ?? '',
    ethnicity:   target.ethnicity ?? '',
    portraitUrl: await sign(target.source_photo_url) ?? await sign(target.reference_sheet_url),
  }

  // Bibliothèque existante de l'avatar (tenues + décors) — affichée en édition.
  const [outfits, environments] = await Promise.all([
    actionListOutfits(target.id).catch(() => []),
    actionListEnvironments(target.id).catch(() => []),
  ])
  const savedOutfits: SavedOutfit[] = await Promise.all(
    outfits.map(async (o) => ({ id: o.id, name: o.name, refUrl: await sign(o.reference_photo_url) })),
  )
  const savedEnvironments: SavedEnvironment[] = await Promise.all(
    environments.map(async (e) => ({ id: e.id, name: e.name, refUrl: await sign(e.reference_photo_url) })),
  )

  return <CharacterPromptGeneratorView editAvatar={editAvatar} savedOutfits={savedOutfits} savedEnvironments={savedEnvironments} />
}
