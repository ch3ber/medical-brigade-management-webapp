import { notFound } from 'next/navigation'
import { PublicAreaDashboard } from '@/src/turnos/infrastructure/components/PublicAreaDashboard'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PublicAreaPage({ params, searchParams }: Props) {
  const { brigadeId, areaId } = await params
  const { token } = await searchParams

  if (!token) notFound()

  const repo = new PrismaTurnoRepository(prisma)
  const queue = await new GetPublicAreaQueueUseCase(repo)
    .execute({ brigadeId, areaId, token })
    .catch(() => null)

  if (!queue) notFound()

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="bg-brand-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_70%)]" />
      <div className="relative mx-auto max-w-2xl px-6 py-10 md:py-16">
        <PublicAreaDashboard
          areaName={queue.area.nombre}
          prefix={queue.area.prefijo}
          currentLabel={queue.turnoActual?.label}
          upcoming={queue.enEspera.map((t) => t.label)}
        />
      </div>
    </main>
  )
}
