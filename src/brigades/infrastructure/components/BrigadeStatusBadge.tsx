import { Badge } from '@/components/ui/badge'

type Status = 'DRAFT' | 'ACTIVE' | 'CLOSED'

const labels: Record<Status, string> = {
  ACTIVE: 'Activa',
  DRAFT: 'Borrador',
  CLOSED: 'Cerrada',
}

export function BrigadeStatusBadge({ status }: { status: Status }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'muted'
  return <Badge variant={variant}>{labels[status]}</Badge>
}
