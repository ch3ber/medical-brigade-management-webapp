import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function LegacyNewPatientPage({ params }: Props) {
  const { brigadeId } = await params
  redirect(`/dashboard/brigades/${brigadeId}/patients/new`)
}
