import { notFound } from 'next/navigation'
import { PublicAreaDashboard } from '@/src/turnos/infrastructure/components/PublicAreaDashboard'
import { mockAreas, mockTurnos } from '@/shared/lib/mock-data'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function PublicAreaPage({ params }: Props) {
  const { brigadeId, areaId } = await params
  const area = mockAreas.find((a) => a.id === areaId && a.brigadeId === brigadeId)
  if (!area) notFound()

  const upcoming = mockTurnos
    .filter((t) => t.status === 'WAITING')
    .slice(0, 6)
    .map((t) => t.label)

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="bg-brand-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_70%)]" />
      <div className="relative mx-auto max-w-2xl px-6 py-10 md:py-16">
        <PublicAreaDashboard
          areaName={area.name}
          prefix={area.prefix}
          currentLabel={area.currentLabel}
          upcoming={upcoming}
        />
      </div>
    </main>
  )
}
