import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { AreaDashboard } from '@/src/turnos/infrastructure/components/AreaDashboard'
import { mockAreas, mockTurnos, mockServed } from '@/shared/lib/mock-data'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function AreaQueuePage({ params }: Props) {
  const { brigadeId, areaId } = await params
  const area = mockAreas.find((a) => a.id === areaId && a.brigadeId === brigadeId)
  if (!area) notFound()

  const called = mockTurnos.find((t) => t.status === 'CALLED')
  const waiting = mockTurnos.filter((t) => t.status === 'WAITING')

  return (
    <>
      <PageHeader
        title={area.name}
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <AreaDashboard
          areaName={area.name}
          current={called}
          waiting={waiting}
          served={mockServed}
        />
      </div>
    </>
  )
}
