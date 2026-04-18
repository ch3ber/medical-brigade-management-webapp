import { Search, Filter, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { mockTurnos, mockServed } from '@/shared/lib/mock-data'

const allPatients = [
  ...mockTurnos.map((t) => ({
    id: t.id,
    name: t.patientName,
    age: t.age,
    labels: [t.label],
    status: t.status as string,
  })),
  ...mockServed.map((t) => ({
    id: t.id,
    name: t.patientName,
    age: t.age,
    labels: [t.label],
    status: 'SERVED' as string,
  })),
]

export default function PatientsPage() {
  return (
    <>
      <PageHeader
        title="Pacientes"
        backHref="/dashboard"
      />

      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              placeholder="Buscar por nombre o turno"
              className="pl-11"
            />
          </div>
          <button
            className="bg-brand-gradient inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
            aria-label="Filtrar"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5">
        {(['Todos', 'Esperando', 'Llamado', 'Atendido'] as const).map((label, i) => (
          <button
            key={label}
            className={
              'shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ' +
              (i === 0
                ? 'bg-brand-gradient text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <p className="px-5 pt-5 text-xs text-[var(--muted)]">
        {allPatients.length} pacientes · San Miguel Health Day
      </p>

      <div className="space-y-2 px-5 pt-3 pb-4">
        {allPatients.map((p) => (
          <Card
            key={p.id}
            className="flex items-center gap-3 p-3"
          >
            <Avatar
              initials={p.name[0]}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="h-3 w-3" />
                {p.age} años · {p.labels.join(', ')}
              </p>
            </div>
            <Badge
              variant={
                p.status === 'CALLED'
                  ? 'primary'
                  : p.status === 'SERVED'
                    ? 'success'
                    : p.status === 'WAITING'
                      ? 'soft'
                      : 'muted'
              }
            >
              {p.status === 'CALLED'
                ? 'Llamado'
                : p.status === 'SERVED'
                  ? 'Atendido'
                  : p.status === 'WAITING'
                    ? 'Esperando'
                    : p.status}
            </Badge>
          </Card>
        ))}
      </div>
    </>
  )
}
