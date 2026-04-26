import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { AreaDashboard } from '@/src/turnos/infrastructure/components/AreaDashboard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetAuthenticatedAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-authenticated-area-queue'
import { callNextAction, moveTurnoAction, removeTurnoAction } from './actions'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function AreaQueuePage({ params }: Props) {
  const { brigadeId, areaId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const repo = new PrismaTurnoRepository(prisma)
  const queue = await new GetAuthenticatedAreaQueueUseCase(repo)
    .execute({ brigadeId, areaId, userId: user.id })
    .catch(() => null)

  if (!queue) notFound()

  const currentTurnoId = queue.turnoActual?.id ?? ''
  const onCallNext = callNextAction.bind(null, brigadeId, areaId)
  const onMove = moveTurnoAction.bind(null, brigadeId, areaId, currentTurnoId)
  const onRemove = removeTurnoAction.bind(null, brigadeId, areaId, currentTurnoId)

  return (
    <>
      <PageHeader
        title={queue.area.nombre}
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <AreaDashboard
          queue={queue}
          onCallNext={onCallNext}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
    </>
  )
}
