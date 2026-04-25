import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { PatientForm } from '@/src/patients/infrastructure/components/PatientForm'
import { registerPatientAction } from './actions'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function NewPatientPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const action = registerPatientAction.bind(null, brigadeId)

  return (
    <>
      <PageHeader
        title="Registrar paciente"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <p className="mb-5 text-sm text-[var(--muted)]">
          Agregando paciente a <span className="font-medium text-[var(--foreground)]">{brigade.name}</span>
        </p>
        <PatientForm
          areas={areas.map((a) => ({ id: a.id, name: a.name, prefix: a.prefix, color: a.color }))}
          action={action}
        />
      </div>
    </>
  )
}
