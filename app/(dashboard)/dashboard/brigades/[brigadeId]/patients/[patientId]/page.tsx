import { notFound, redirect } from 'next/navigation'
import { Phone, MapPin, Heart, CheckCircle2, Clock, PhoneCall, XCircle, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { addPatientToAreaAction } from './actions'

interface Props {
  params: Promise<{ brigadeId: string; patientId: string }>
}

const TURNO_STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  WAITING: { label: 'En espera', bg: '#e7eaff', fg: '#5b6cf5' },
  CALLED: { label: 'Atendiendo', bg: '#fff3cd', fg: '#a87718' },
  SERVED: { label: 'Atendido', bg: '#daf3e8', fg: '#22b07d' },
  REMOVED: { label: 'Retirado', bg: '#fbdada', fg: '#e85a5a' },
}

export default async function PatientDetailPage({ params }: Props) {
  const { brigadeId, patientId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [patient, areas, brigade] = await Promise.all([
    new GetPatientDetailUseCase(new PrismaPatientRepository(prisma))
      .execute({ brigadeId, patientId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({ brigadeId, userId: user.id }),
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
  ])

  if (!patient || !brigade) notFound()

  const colorByAreaId = Object.fromEntries(areas.map((a) => [a.id, a.color]))
  const assignedAreaIds = new Set(patient.turnos.map((t) => t.areaId))
  const availableAreas = areas.filter((a) => !assignedAreaIds.has(a.id))
  const isActive = brigade.status === 'ACTIVE'

  const addToAreaAction = addPatientToAreaAction.bind(null, brigadeId, patientId)

  return (
    <>
      <PageHeader
        title="Paciente"
        backHref={`/dashboard/patients`}
      />

      <div className="space-y-4 px-5 pt-3 pb-6">
        {/* Patient info card */}
        <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] p-4">
          <Avatar
            initials={patient.fullName[0]}
            size="lg"
            className="h-16 w-16 text-xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{patient.fullName}</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {patient.age} años ·{' '}
              {patient.gender === 'F' ? 'Femenino' : patient.gender === 'M' ? 'Masculino' : 'Otro'}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Turno global <span className="font-bold text-[var(--foreground)]">#{patient.globalOrder}</span>
            </p>
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-3 rounded-2xl bg-[var(--surface)] p-4">
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono"
            value={patient.phone || '—'}
          />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label="Dirección"
            value={patient.address || '—'}
          />
          <DetailRow
            icon={<Heart className="h-4 w-4" />}
            label="Visita pastoral"
            value={patient.wantsChurchVisit ? 'Sí, deseada' : 'No, gracias'}
          />
        </div>

        {/* Turnos */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Turnos en esta brigada</h3>
          <div className="space-y-2">
            {patient.turnos.map((t) => {
              const color = colorByAreaId[t.areaId] ?? '#5b6cf5'
              const statusInfo = TURNO_STATUS_MAP[t.status] ?? TURNO_STATUS_MAP.WAITING
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
                    <p className="text-sm font-semibold">
                      {t.areaPrefix}-{t.areaOrder}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">{t.areaName}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: statusInfo.bg, color: statusInfo.fg }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
            {patient.turnos.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--muted)]">Sin turnos asignados.</p>
            )}
          </div>
        </div>

        {/* Add to another area */}
        {isActive && availableAreas.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Agregar a otra área</h3>
            <div className="space-y-2">
              {availableAreas.map((a) => {
                const action = addToAreaAction.bind(null, a.id)
                return (
                  <form
                    key={a.id}
                    action={action}
                  >
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold"
                        style={{ background: a.color + '20', color: a.color }}
                      >
                        {a.prefix}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        <p className="text-xs text-[var(--muted)]">Generar nuevo turno</p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    </button>
                  </form>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-[var(--muted)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-sm text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  )
}
