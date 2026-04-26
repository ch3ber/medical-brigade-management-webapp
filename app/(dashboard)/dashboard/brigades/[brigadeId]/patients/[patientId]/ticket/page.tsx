import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'

interface Props {
  params: Promise<{ brigadeId: string; patientId: string }>
}

export default async function PatientTicketPage({ params }: Props) {
  const { brigadeId, patientId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [patient, areas] = await Promise.all([
    new GetPatientDetailUseCase(new PrismaPatientRepository(prisma))
      .execute({ brigadeId, patientId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => []),
  ])

  if (!patient) notFound()

  const colorByAreaId = Object.fromEntries(areas.map((a) => [a.id, a.color]))

  const mainTurno = patient.turnos[0]
  const mainColor = mainTurno ? (colorByAreaId[mainTurno.areaId] ?? '#5b6cf5') : '#5b6cf5'

  return (
    <>
      <PageHeader
        title="Turnos generados"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />

      <div className="space-y-5 px-5 pt-4 pb-4">
        {/* Success header */}
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: mainColor + '20', color: mainColor }}
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{patient.fullName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Turno global #{patient.globalOrder} · {patient.turnos.length}{' '}
              {patient.turnos.length === 1 ? 'área' : 'áreas'}
            </p>
          </div>
        </div>

        {/* Primary boarding-pass ticket */}
        {mainTurno && (
          <div
            className="relative overflow-hidden rounded-[22px] p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${mainColor} 0%, ${mainColor}dd 100%)`,
              boxShadow: `0 14px 30px -12px ${mainColor}77`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-white/85 uppercase">Área</p>
                <p className="mt-1 text-base font-semibold">{mainTurno.areaName}</p>
              </div>
              <div
                className="rounded-xl px-3 py-1.5 text-[11px] font-bold tracking-wide"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {mainTurno.areaPrefix}
              </div>
            </div>

            <p className="mt-4 text-6xl leading-none font-extrabold tracking-tight">
              {mainTurno.areaPrefix}-{mainTurno.areaOrder}
            </p>
            <p className="mt-1 text-sm text-white/85">Posición {mainTurno.areaOrder} en la cola</p>

            {/* Perforation line */}
            <div
              className="my-5 h-px"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 4px, transparent 4px, transparent 10px)',
                margin: '18px -24px 14px',
              }}
            />

            <div className="flex justify-between text-[11px]">
              <div>
                <p className="tracking-wide text-white/70 uppercase">Paciente</p>
                <p className="mt-1 font-semibold">{patient.fullName}</p>
              </div>
              <div className="text-right">
                <p className="tracking-wide text-white/70 uppercase">Turno global</p>
                <p className="mt-1 font-semibold">#{patient.globalOrder}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secondary turnos */}
        {patient.turnos.length > 1 && (
          <div>
            <p className="mb-3 text-sm font-semibold">Turnos adicionales</p>
            <div className="space-y-2">
              {patient.turnos.slice(1).map((t) => {
                const color = colorByAreaId[t.areaId] ?? '#5b6cf5'
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {t.areaPrefix}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.areaName}</p>
                      <p className="text-xs text-[var(--muted)]">Posición {t.areaOrder} en la cola</p>
                    </div>
                    <p
                      className="text-base font-bold"
                      style={{ color }}
                    >
                      {t.areaPrefix}-{t.areaOrder}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/dashboard/brigades/${brigadeId}/patients/new`}
            className="flex-1"
          >
            <Button
              variant="secondary"
              size="md"
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              Otro paciente
            </Button>
          </Link>
          <Link
            href={`/dashboard/brigades/${brigadeId}`}
            className="flex-1"
          >
            <Button
              size="md"
              className="w-full"
            >
              Volver a brigada
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
