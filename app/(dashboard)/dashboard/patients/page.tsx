import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Search, MapPin, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'

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
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <span className="text-sm text-[var(--muted)]">Buscar por nombre o turno</span>
        </div>
        <p className="mt-2.5 text-xs text-[var(--muted)]">
          Mostrando pacientes de:{' '}
          <span className="font-semibold text-[var(--foreground)]">{activeBrigade.name}</span>
        </p>
      </div>

      <div className="space-y-2 px-5 pt-4 pb-4">
        {patients.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/brigades/${activeBrigade.id}/patients/${p.id}`}
            className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 transition hover:bg-white"
          >
            <Avatar
              initials={p.fullName[0]}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.fullName}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="h-3 w-3" />
                {p.age} años
              </p>
            </div>
            <div className="flex max-w-[45%] flex-wrap justify-end gap-1">
              {p.turnos.slice(0, 3).map((t) => {
                const color = colorByAreaId[t.areaId] ?? '#5b6cf5'
                const isCalled = t.status === 'CALLED'
                return (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: isCalled ? color : color + '20',
                      color: isCalled ? 'white' : color,
                    }}
                  >
                    {t.areaPrefix}-{t.areaOrder}
                  </span>
                )
              })}
            </div>
          </Link>
        ))}
        {patients.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">No hay pacientes registrados.</p>
        )}
      </div>
    </>
  )
}
