import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Heart, Share2, MapPin, Calendar, Users, Plus, UserPlus, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrigadeStatusBadge } from '@/src/brigades/infrastructure/components/BrigadeStatusBadge'
import { AreaCard } from '@/src/areas/infrastructure/components/AreaCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'

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

  return (
    <>
      <PageHeader
        title="Brigada"
        backHref="/dashboard/brigades"
        right={
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Favorito"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Compartir"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <section className="px-5 pt-2">
        <Card className="relative overflow-hidden border-0 p-0 text-white">
          <div className="bg-brand-gradient absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative p-6">
            <BrigadeStatusBadge status={brigade.status} />
            <h1 className="mt-3 text-2xl font-bold">{brigade.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {brigade.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {brigade.date.toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-4">
        <StatTile
          label="Áreas"
          value={areas.length}
          icon={<Calendar className="h-3 w-3" />}
        />
        <StatTile
          label="Esperando"
          value={totalWaiting}
          icon={<Users className="h-3 w-3" />}
        />
        <StatTile
          label="Atendidos"
          value={areas.reduce((acc, a) => acc + a.totalAtendidos, 0)}
          icon={<Users className="h-3 w-3" />}
        />
      </section>

      <section className="flex gap-2 px-5 pt-5">
        <Link
          href={`/dashboard/brigades/${brigadeId}/patients/new`}
          className="flex-1"
        >
          <Button
            size="md"
            className="w-full"
          >
            <UserPlus className="h-4 w-4" />
            Registrar paciente
          </Button>
        </Link>
        <Link href={`/dashboard/brigades/${brigadeId}/settings`}>
          <Button
            size="md"
            variant="secondary"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="px-5 pt-6 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Áreas</h3>
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
    </>
  )
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
        {icon}
        {label}
      </p>
    </div>
  )
}
