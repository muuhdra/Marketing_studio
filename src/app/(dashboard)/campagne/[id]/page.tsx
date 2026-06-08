import { notFound } from 'next/navigation'
import { getCampaign } from '@/lib/actions/campaigns'
import CampaignDetailView from '@/components/features/campagne/CampaignDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  let campaign
  try {
    campaign = await getCampaign(id)
  } catch {
    notFound()
  }

  return <CampaignDetailView campaign={campaign} />
}
