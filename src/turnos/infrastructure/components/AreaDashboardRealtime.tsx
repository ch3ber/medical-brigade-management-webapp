'use client'

import { useAreaRealtime } from '@/shared/realtime/use-area-realtime'
import { AreaDashboard } from './AreaDashboard'
import type { AuthenticatedAreaQueue } from './AreaDashboard'

interface Props {
  queue: AuthenticatedAreaQueue
  onCallNext: () => Promise<void>
  onMove: () => Promise<void>
  onRemove: () => Promise<void>
}

export function AreaDashboardRealtime({ queue, onCallNext, onMove, onRemove }: Props) {
  useAreaRealtime(queue.area.id)

  return (
    <AreaDashboard
      queue={queue}
      onCallNext={onCallNext}
      onMove={onMove}
      onRemove={onRemove}
    />
  )
}
