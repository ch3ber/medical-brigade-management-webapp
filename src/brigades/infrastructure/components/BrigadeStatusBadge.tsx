import { Badge } from '@/components/ui/badge'

type Status = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export function BrigadeStatusBadge({ status }: { status: Status }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'muted'
  return <Badge variant={variant}>{status}</Badge>
}
