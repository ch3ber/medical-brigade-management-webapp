import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export interface WaitingTurno {
  id: string
  label: string
  patientName: string
  age: number
}

export function WaitingQueue({ items }: { items: WaitingTurno[] }) {
  if (items.length === 0) {
    return <Card className="p-5 text-center text-sm text-[var(--muted)]">La cola está vacía.</Card>
  }
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <Card
          key={t.id}
          className="flex items-center gap-3 p-3"
        >
          <Avatar
            initials={t.patientName.slice(0, 1)}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t.patientName}</p>
            <p className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
              <Clock className="h-3 w-3" />
              {t.age} años · #{t.label}
            </p>
          </div>
          {i === 0 ? <Badge variant="primary">Siguiente</Badge> : <Badge variant="muted">#{i + 1}</Badge>}
        </Card>
      ))}
    </div>
  )
}
