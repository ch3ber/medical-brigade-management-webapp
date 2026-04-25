'use client'

import { useState, useTransition } from 'react'
import { PhoneCall, SkipForward, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'

export interface CurrentTurnoDisplayProps {
  label?: string
  patientName?: string
  age?: number
  onCallNext?: () => Promise<void>
  onMove?: () => Promise<void>
  onRemove?: () => Promise<void>
}

export function CurrentTurnoDisplay({
  label,
  patientName,
  age,
  onCallNext,
  onMove,
  onRemove,
}: CurrentTurnoDisplayProps) {
  const [pending, setPending] = useState<'callNext' | 'move' | 'remove' | null>(null)
  const [, startTransition] = useTransition()

  const handle = (key: 'callNext' | 'move' | 'remove', action?: () => Promise<void>) => {
    if (!action || pending) return
    setPending(key)
    startTransition(async () => {
      try {
        await action()
      } finally {
        setPending(null)
      }
    })
  }

  if (!label) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-[var(--muted)]">Ningún turno está siendo atendido.</p>
        <Button
          size="md"
          className="mt-4"
          disabled={pending === 'callNext'}
          onClick={() => handle('callNext', onCallNext)}
        >
          <PhoneCall className="h-4 w-4" />
          {pending === 'callNext' ? 'Llamando…' : 'Llamar siguiente'}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden border-0 p-0 text-white">
      <div className="bg-brand-gradient absolute inset-0" />
      <div className="relative p-6">
        <p className="text-xs font-medium tracking-widest text-white/70 uppercase">Atendiendo ahora</p>
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
                {patientName} · {age} años
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full border-0 bg-white text-[var(--accent)]"
            disabled={!!pending}
            onClick={() => handle('callNext', onCallNext)}
          >
            <PhoneCall className="h-4 w-4" />
            {pending === 'callNext' ? '…' : 'Siguiente'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            disabled={!!pending}
            onClick={() => handle('move', onMove)}
          >
            <SkipForward className="h-4 w-4" />
            {pending === 'move' ? '…' : 'Mover'}
          </Button>
          <Button
            variant="destructive"
            size="md"
            className="w-full"
            disabled={!!pending}
            onClick={() => handle('remove', onRemove)}
          >
            <XCircle className="h-4 w-4" />
            {pending === 'remove' ? '…' : 'Retirar'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
