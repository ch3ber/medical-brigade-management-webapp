import { CurrentTurnoDisplay } from './CurrentTurnoDisplay'
import { WaitingQueue } from './WaitingQueue'
import { ServedList } from './ServedList'
import type { MockTurno } from '@/shared/lib/mock-data'

export interface AreaDashboardProps {
  areaName: string
  current?: MockTurno
  waiting: MockTurno[]
  served: MockTurno[]
}

export function AreaDashboard({ areaName, current, waiting, served }: AreaDashboardProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--muted)]">Área</p>
        <h2 className="text-xl font-bold">{areaName}</h2>
      </div>
      <CurrentTurnoDisplay
        label={current?.label}
        patientName={current?.patientName}
        age={current?.age}
      />
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">En espera</h3>
          <span className="text-xs text-[var(--muted)]">{waiting.length} personas</span>
        </div>
        <WaitingQueue items={waiting} />
      </section>
      {served.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Atendidos recientemente</h3>
          <ServedList items={served} />
        </section>
      )}
    </div>
  )
}
