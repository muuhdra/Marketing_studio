import { listCampaigns } from '@/lib/actions/campaigns'
import { listAvatars } from '@/lib/actions/avatars'
import AnalyticsView from '@/components/features/analytics/AnalyticsView'

export default async function Page() {
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = []
  let avatars:   Awaited<ReturnType<typeof listAvatars>>   = []
  try { campaigns = await listCampaigns() } catch {}
  try { avatars   = await listAvatars()   } catch {}

  return <AnalyticsView campaigns={campaigns} avatars={avatars} />
}
