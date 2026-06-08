import { listAvatars } from '@/lib/actions/avatars'
import GalerieView from '@/components/features/galerie/GalerieView'

export default async function Page() {
  let avatars: Awaited<ReturnType<typeof listAvatars>> = []
  try {
    avatars = await listAvatars()
  } catch { /* middleware gère le non-authentifié */ }

  return <GalerieView avatars={avatars} />
}
