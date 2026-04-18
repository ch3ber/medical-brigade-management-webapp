import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { PatientForm } from '@/src/patients/infrastructure/components/PatientForm'
import { mockAreas, mockBrigades } from '@/shared/lib/mock-data'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function NewPatientPage({ params }: Props) {
  const { brigadeId } = await params
  const brigade = mockBrigades.find((b) => b.id === brigadeId)
  if (!brigade) notFound()
  const areas = mockAreas.filter((a) => a.brigadeId === brigadeId)

  return (
    <>
      <PageHeader
        title="Register patient"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <p className="mb-5 text-sm text-[var(--muted)]">
          Adding a patient to <span className="font-medium text-[var(--foreground)]">{brigade.name}</span>
        </p>
        <PatientForm areas={areas} />
      </div>
    </>
  )
}
