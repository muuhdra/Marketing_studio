import { listAvatars } from '@/lib/actions/avatars'
import AvatarStudioView from '@/components/features/avatar-studio/AvatarStudioView'

export default async function Page() {
  let avatars: Awaited<ReturnType<typeof listAvatars>> = []
  try {
    avatars = await listAvatars()
  } catch { /* middleware gère le non-authentifié */ }

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
