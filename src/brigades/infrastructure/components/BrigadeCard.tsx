import Link from 'next/link'
import { MapPin, CalendarDays, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BrigadeStatusBadge } from './BrigadeStatusBadge'

export interface BrigadeCardProps {
  id: string
  name: string
  location: string
  date: string
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  patientsCount: number
  areasCount: number
}

export function BrigadeCard({
  id,
  name,
  location,
  date,
  status,
  patientsCount,
  areasCount,
}: BrigadeCardProps) {
  return (
    <Link
      href={`/dashboard/brigades/${id}`}
      className="block"
    >
      <Card className="p-5 transition hover:border-[var(--primary)]/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BrigadeStatusBadge status={status} />
            </div>
            <h3 className="mt-2 truncate text-base font-semibold">{name}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {date}
              </span>
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--accent)]">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2">
            <p className="text-xs text-[var(--muted)]">Pacientes</p>
            <p className="text-sm font-semibold">{patientsCount}</p>
          </div>
          <div className="flex-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2">
            <p className="text-xs text-[var(--muted)]">Áreas</p>
            <p className="text-sm font-semibold">{areasCount}</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
