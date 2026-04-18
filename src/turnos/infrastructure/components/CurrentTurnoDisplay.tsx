import { PhoneCall, SkipForward, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'

export interface CurrentTurnoDisplayProps {
  label?: string
  patientName?: string
  age?: number
  onCallNext?: () => void
  onMove?: () => void
  onRemove?: () => void
}

export function CurrentTurnoDisplay({ label, patientName, age }: CurrentTurnoDisplayProps) {
  if (!label) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-[var(--muted)]">No turno is being served.</p>
        <Button
          size="md"
          className="mt-4"
        >
          <PhoneCall className="h-4 w-4" />
          Call next
        </Button>
      </Card>
    )
  }
  return (
    <Card className="relative overflow-hidden border-0 p-0 text-white">
      <div className="bg-brand-gradient absolute inset-0" />
      <div className="relative p-6">
        <p className="text-xs font-medium tracking-widest text-white/70 uppercase">Now serving</p>
        <div className="mt-2 flex items-center gap-4">
          <Avatar
            initials={patientName?.slice(0, 1) ?? '?'}
            size="lg"
            className="bg-white/20"
          />
          <div>
            <p className="text-4xl font-extrabold tracking-tight">{label}</p>
            {patientName && (
              <p className="text-sm text-white/90">
                {patientName} · {age} yrs
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full border-0 bg-white text-[var(--accent)]"
          >
            <PhoneCall className="h-4 w-4" />
            Next
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <SkipForward className="h-4 w-4" />
            Move
          </Button>
          <Button
            variant="destructive"
            size="md"
            className="w-full"
          >
            <XCircle className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </Card>
  )
}
