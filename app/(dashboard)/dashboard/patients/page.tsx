import { redirect } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'

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
        <PageHeader
          title="Pacientes"
          backHref="/dashboard"
        />
        <div className="px-5 pt-10 text-center text-sm text-[var(--muted)]">
          No hay brigadas disponibles. Crea una brigada primero.
        </div>
      </>
    )
  }

  const patientRepo = new PrismaPatientRepository(prisma)
  const { patients } = await new ListPatientsUseCase(patientRepo).execute({
    brigadeId: activeBrigade.id,
    userId: user.id,
    filters: { pagina: 1, limite: 50 },
  })

  return (
    <>
      <PageHeader
        title="Pacientes"
        backHref="/dashboard"
      />

      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              placeholder="Buscar por nombre o turno"
              className="pl-11"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Mostrando pacientes de: {activeBrigade.name}</p>
      </div>

      <div className="space-y-2 px-5 pt-4 pb-4">
        {patients.map((p) => (
          <Card
            key={p.id}
            className="flex items-center gap-3 p-3"
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
            <div className="flex flex-wrap justify-end gap-1">
              {p.turnos.map((t) => (
                <Badge
                  key={t.id}
                  variant={t.status === 'SERVED' ? 'muted' : t.status === 'CALLED' ? 'primary' : 'soft'}
                >
                  {`${t.areaPrefix}-${t.areaOrder}`}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
        {patients.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">No hay pacientes registrados.</p>
        )}
      </div>
    </>
  )
}
