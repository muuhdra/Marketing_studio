import { listCampaigns } from '@/lib/actions/campaigns'
import CampagnesListView from '@/components/features/campagne/CampagnesListView'

export default async function Page() {
  // Fetch real campaigns from Supabase (server-side, auth checked in action)
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = []
  try {
    campaigns = await listCampaigns()
  } catch {
    // Non authentifié → middleware redirige déjà; on retourne liste vide par sécurité
  }

  return <CampagnesListView campaigns={campaigns} />
}
