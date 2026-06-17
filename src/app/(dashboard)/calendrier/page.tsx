import { listCampaigns } from '@/lib/actions/campaigns'
import CalendrierView from '@/components/features/calendrier/CalendrierView'

export default async function Page() {
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = []
  try {
    campaigns = await listCampaigns()
  } catch {}

  // serverNow : référence temporelle unique SSR↔client (évite le mismatch d'hydratation)
  return <CalendrierView campaigns={campaigns} serverNow={Date.now()} />
}
