import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { listCampaigns } from '@/lib/actions/campaigns'
import { listAvatars } from '@/lib/actions/avatars'
import DashboardView from '@/components/features/dashboard/DashboardView'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = []
  let avatars:   Awaited<ReturnType<typeof listAvatars>>   = []
  try { campaigns = await listCampaigns() } catch {}
  try { avatars   = await listAvatars()   } catch {}

  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'active' || c.status === 'pre_campaign'
  ).length

  const userName =
    (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'Studio'

  return (
    <DashboardView
      userName={userName}
      campaigns={campaigns}
      avatars={avatars}
      activeCampaigns={activeCampaigns}
    />
  )
}
