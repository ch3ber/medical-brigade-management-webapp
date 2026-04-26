import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function LegacyBrigadeDetailPage({ params }: Props) {
  const { brigadeId } = await params
  redirect(`/dashboard/brigades/${brigadeId}`)
}
