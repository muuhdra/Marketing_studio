import { listAvatars } from '@/lib/actions/avatars'
import { createClient } from '@/lib/supabase/server'
import { BUCKETS } from '@/lib/supabase/storage'
import AvatarStudioView from '@/components/features/avatar-studio/AvatarStudioView'
import CharacterLibraryView from '@/components/features/avatar-studio/CharacterLibraryView'
import CharacterPromptGeneratorView from '@/components/features/avatar-studio/CharacterPromptGeneratorView'

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

  if (!avatarId) {
    const supabase = await createClient()
    const sign = async (path: string | null) => {
      if (!path) return null
      // Déjà une URL absolue → on la garde telle quelle.
      if (/^https?:\/\//.test(path)) return path
      const { data } = await supabase.storage.from(BUCKETS.ASSETS).createSignedUrl(path, 60 * 60)
      return data?.signedUrl ?? null
    }
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

  // Avatars éditables (on exclut les archivés)
  const editable = avatars
    .filter((a) => a.status !== 'archived')
    .map((a) => ({
      id:               a.id,
      name:             a.name,
      age:              a.age,
      ethnicity:        a.ethnicity,
      style_tags:       a.style_tags,
      continuity_mode:  a.continuity_mode,
      source_photo_url: a.source_photo_url,
      reference_sheet_url: a.reference_sheet_url,
      morphology:        a.morphology as Record<string, string> | null,
      voice_engine:      a.voice_engine,
      voice_id:          a.voice_id,
      voice_mode:        a.voice_mode,
      voice_description: a.voice_description,
      voice_settings:    a.voice_settings as { emotion?: string; speed?: number; pitch?: number } | null,
      voice_label:       a.voice_label,
    }))

  return <AvatarStudioView existingAvatars={editable} />
}
