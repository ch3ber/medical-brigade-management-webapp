import { CurrentTurnoDisplay } from './CurrentTurnoDisplay'
import { WaitingQueue } from './WaitingQueue'
import { ServedList } from './ServedList'
import type { AuthenticatedAreaQueue } from '@/src/turnos/domain/repositories/ITurnoRepository'

export type { AuthenticatedAreaQueue }

interface AreaDashboardProps {
  queue: AuthenticatedAreaQueue
}

export function AreaDashboard({ queue }: AreaDashboardProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--muted)]">Área</p>
        <h2 className="text-xl font-bold">{queue.area.nombre}</h2>
      </div>
      <CurrentTurnoDisplay
        label={queue.turnoActual?.label}
        patientName={queue.turnoActual?.patientName}
        age={queue.turnoActual?.age}
      />
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">En espera</h3>
          <span className="text-xs text-[var(--muted)]">{queue.enEspera.length} personas</span>
        </div>
        <WaitingQueue items={queue.enEspera} />
      </section>
      {queue.atendidos.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Atendidos recientemente</h3>
          <ServedList items={queue.atendidos} />
        </section>
      )}
    </div>
  )
}
