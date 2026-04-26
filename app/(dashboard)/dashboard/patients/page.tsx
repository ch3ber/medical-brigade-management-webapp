import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { PatientSearchList } from '@/src/patients/infrastructure/components/PatientSearchList'

export default async function PatientsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigades = await new ListBrigadesUseCase(new PrismaBrigadeRepository(prisma)).execute({
    userId: user.id,
  })

  const activeBrigade = brigades.find((b) => b.status === 'ACTIVE') ?? brigades[0] ?? null

  if (!activeBrigade) {
    return (
      <>
        <PageHeader title="Pacientes" />
        <div className="px-5 pt-10 text-center text-sm text-[var(--muted)]">
          No hay brigadas disponibles. Crea una brigada primero.
        </div>
      </>
    )
  }

  const [{ patients }, areas] = await Promise.all([
    new ListPatientsUseCase(new PrismaPatientRepository(prisma)).execute({
      brigadeId: activeBrigade.id,
      userId: user.id,
      filters: { pagina: 1, limite: 50 },
    }),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({
      brigadeId: activeBrigade.id,
      userId: user.id,
    }),
  ])

  const colorByAreaId = Object.fromEntries(areas.map((a) => [a.id, a.color]))

  return (
    <>
      <PageHeader
        title="Pacientes"
        right={
          activeBrigade.status === 'ACTIVE' ? (
            <Link href={`/dashboard/brigades/${activeBrigade.id}/patients/new`}>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ background: '#5b6cf5' }}
              >
                <Plus className="h-5 w-5" />
              </button>
            </Link>
          ) : null
        }
      />

      <div className="px-5 pt-2">
        <p className="mb-3 text-xs text-[var(--muted)]">
          Mostrando pacientes de:{' '}
          <span className="font-semibold text-[var(--foreground)]">{activeBrigade.name}</span>
        </p>
        <PatientSearchList
          patients={patients}
          brigadeId={activeBrigade.id}
          colorByAreaId={colorByAreaId}
        />
      </div>
    </>
  )
}
