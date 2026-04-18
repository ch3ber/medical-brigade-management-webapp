import Link from 'next/link'
import { Users, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface AreaCardProps {
  brigadeId: string
  id: string
  name: string
  prefix: string
  color: string
  waitingCount: number
  servedCount: number
  currentLabel?: string
}

export function AreaCard({
  brigadeId,
  id,
  name,
  prefix,
  color,
  waitingCount,
  servedCount,
  currentLabel,
}: AreaCardProps) {
  return (
    <Link
      href={`/dashboard/brigades/${brigadeId}/areas/${id}`}
      className="block"
    >
      <Card className="p-4 transition hover:border-[var(--primary)]/40">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold text-white"
            style={{ background: color }}
          >
            {prefix}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold">{name}</h4>
            <p className="text-xs text-[var(--muted)]">
              {waitingCount} waiting · {servedCount} served
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--muted)]" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {currentLabel ? (
            <Badge variant="primary">Now: {currentLabel}</Badge>
          ) : (
            <Badge variant="muted">Idle</Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
            <Users className="h-3.5 w-3.5" />
            {waitingCount + servedCount}
          </span>
        </div>
      </Card>
    </Link>
  )
}
