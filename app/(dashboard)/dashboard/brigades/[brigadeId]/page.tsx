import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MapPin, Calendar, Users, Plus, UserPlus, Settings, Play, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { BrigadeStatusBadge } from '@/src/brigades/infrastructure/components/BrigadeStatusBadge'
import { AreaCard } from '@/src/areas/infrastructure/components/AreaCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { openBrigadeAction, closeBrigadeAction } from './actions'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function BrigadeDetailPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigadeRepo = new PrismaBrigadeRepository(prisma)
  const areaRepo = new PrismaAreaRepository(prisma)

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(brigadeRepo).execute({ brigadeId, userId: user.id }).catch(() => null),
    new ListAreasUseCase(areaRepo).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const totalWaiting = areas.reduce((acc, a) => acc + a.totalEnEspera, 0)
  const totalServed = areas.reduce((acc, a) => acc + a.totalAtendidos, 0)

  const isDraft = brigade.status === 'DRAFT'
  const isActive = brigade.status === 'ACTIVE'
  const isClosed = brigade.status === 'CLOSED'

  const openAction = openBrigadeAction.bind(null, brigadeId)
  const closeAction = closeBrigadeAction.bind(null, brigadeId)

  return (
    <>
      <PageHeader
        title="Brigada"
        backHref="/dashboard/brigades"
        right={
          <Link href={`/dashboard/brigades/${brigadeId}/settings`}>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Configuración"
            >
              <Settings className="h-4 w-4" />
            </button>
          </Link>
        }
      />

      <section className="px-5 pt-2">
        <div
          className="relative overflow-hidden rounded-[22px] p-5 text-white"
          style={{
            background: isClosed
              ? 'linear-gradient(135deg, #6c7593 0%, #939bb5 100%)'
              : 'linear-gradient(135deg, #5b6cf5 0%, #7b8cfa 100%)',
            boxShadow: isClosed ? 'none' : '0 14px 30px -12px rgba(91,108,245,0.45)',
          }}
        >
          <div className="flex items-center justify-between">
            <BrigadeStatusBadge status={brigade.status} />
            {isActive && (
              <div className="flex items-center gap-2 text-xs text-white/90">
                <span
                  className="h-2 w-2 rounded-full bg-green-400"
                  style={{ boxShadow: '0 0 0 4px rgba(136,240,164,0.25)' }}
                />
                en vivo
              </div>
            )}
          </div>
          <h1 className="mt-3 text-2xl leading-tight font-bold">{brigade.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {brigade.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {brigade.date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBox
              label="ÁREAS"
              value={areas.length}
            />
            <StatBox
              label="ATENDIDOS"
              value={totalServed}
            />
            <StatBox
              label="EN COLA"
              value={totalWaiting}
            />
          </div>
        </div>
      </section>

      {/* Lifecycle controls */}
      {isDraft && (
        <section className="px-5 pt-4">
          <form action={openAction}>
            <Button
              size="md"
              className="w-full"
              type="submit"
            >
              <Play className="h-4 w-4" />
              Abrir brigada
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Al abrir, se permitirá registrar pacientes.
          </p>
        </section>
      )}

      {isActive && (
        <section className="grid grid-cols-2 gap-2 px-5 pt-4">
          <Link href={`/dashboard/brigades/${brigadeId}/patients/new`}>
            <Button
              size="md"
              className="w-full"
            >
              <UserPlus className="h-4 w-4" />
              Registrar paciente
            </Button>
          </Link>
          <Link href={`/dashboard/patients`}>
            <Button
              size="md"
              variant="secondary"
              className="w-full"
            >
              <Users className="h-4 w-4" />
              Ver pacientes
            </Button>
          </Link>
        </section>
      )}

      {/* Areas list */}
      {!isDraft && (
        <section className="px-5 pt-6 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Áreas en tiempo real</h3>
            <Link
              href={`/dashboard/brigades/${brigadeId}/settings`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar área
            </Link>
          </div>
          <div className="space-y-3">
            {areas.map((a) => (
              <AreaCard
                key={a.id}
                brigadeId={a.brigadeId}
                id={a.id}
                name={a.name}
                prefix={a.prefix}
                color={a.color}
                waitingCount={a.totalEnEspera}
                servedCount={a.totalAtendidos}
              />
            ))}
            {areas.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--muted)]">No hay áreas configuradas.</p>
            )}
          </div>
        </section>
      )}

      {/* Close brigade */}
      {isActive && (
        <section className="px-5 pb-6">
          <form action={closeAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <XCircle className="h-4 w-4" />
              Cerrar brigada
            </button>
          </form>
        </section>
      )}

      {isClosed && (
        <section className="px-5 pb-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--muted)]">
            Esta brigada se cerró. Todos los datos son de solo lectura.
          </div>
        </section>
      )}
    </>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-white/15 px-2 py-2 text-center backdrop-blur">
      <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}
