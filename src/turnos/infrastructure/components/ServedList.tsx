import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface ServedTurno {
  id: string
  label: string
  patientName: string
}

export function ServedList({ items }: { items: ServedTurno[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <Card
          key={t.id}
          className="flex items-center gap-3 border-0 bg-[var(--surface-muted)] p-3"
        >
          <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t.label}</p>
            <p className="text-xs text-[var(--muted)]">{t.patientName}</p>
          </div>
          <span className="text-xs text-[var(--muted)]">Atendido</span>
        </Card>
      ))}
    </div>
  )
}
