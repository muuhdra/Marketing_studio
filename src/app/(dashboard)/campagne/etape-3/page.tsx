import { listAvatars } from '@/lib/actions/avatars'
import AttributionAvatarsView from '@/components/features/campagne/generale/AttributionAvatarsView'

export default async function Page() {
  let avatars: Awaited<ReturnType<typeof listAvatars>> = []
  try {
    avatars = await listAvatars()
  } catch { /* middleware gère le non-authentifié */ }

  // Les avatars archivés ne sont pas assignables à une campagne
  const assignable = avatars.filter((a) => a.status !== 'archived')

  return <AttributionAvatarsView dbAvatars={assignable} />
}
