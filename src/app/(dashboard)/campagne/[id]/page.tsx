import { notFound } from 'next/navigation'
import { getCampaignWithDetails } from '@/lib/actions/campaigns'
import CampaignDetailView from '@/components/features/campagne/CampaignDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  let data: Awaited<ReturnType<typeof getCampaignWithDetails>> | null = null
  try {
    data = await getCampaignWithDetails(id)
  } catch {
    notFound()
  }

  return <CampaignDetailView data={data!} />
}
