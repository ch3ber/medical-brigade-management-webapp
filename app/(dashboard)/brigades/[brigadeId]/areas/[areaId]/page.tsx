import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function LegacyAreaQueuePage({ params }: Props) {
  const { brigadeId, areaId } = await params
  redirect(`/dashboard/brigades/${brigadeId}/areas/${areaId}`)
}
