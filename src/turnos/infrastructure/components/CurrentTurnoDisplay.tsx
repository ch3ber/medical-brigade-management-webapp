'use client'

import { useState, useTransition } from 'react'
import { SkipForward, XCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'

export interface CurrentTurnoDisplayProps {
  label?: string
  patientName?: string
  age?: number
  areaColor?: string
  onCallNext?: () => Promise<void>
  onMove?: () => Promise<void>
  onRemove?: () => Promise<void>
}

export function CurrentTurnoDisplay({
  label,
  patientName,
  age,
  areaColor,
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

  const color = areaColor ?? '#5b6cf5'
  const gradient = `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`

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
          <CheckCircle2 className="h-4 w-4" />
          {pending === 'callNext' ? 'Llamando…' : 'Llamar siguiente'}
        </Button>
      </Card>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-5 text-white"
      style={{
        background: gradient,
        boxShadow: `0 14px 30px -12px ${color}77`,
      }}
    >
      <p className="text-[11px] font-bold tracking-widest text-white/85 uppercase">Atendiendo ahora</p>
      <div className="mt-3 flex items-center gap-4">
        <Avatar
          initials={patientName?.slice(0, 1) ?? '?'}
          size="lg"
          className="bg-white/20"
        />
        <div>
          <p className="text-4xl leading-none font-extrabold tracking-tight">{label}</p>
          {patientName && (
            <p className="mt-1 text-sm text-white/90">
              {patientName} · {age} años
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          disabled={!!pending}
          onClick={() => handle('callNext', onCallNext)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ color }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {pending === 'callNext' ? '…' : 'Atendido'}
        </button>
        <button
          disabled={!!pending}
          onClick={() => handle('move', onMove)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          <SkipForward className="h-3.5 w-3.5" />
          {pending === 'move' ? '…' : 'Mover'}
        </button>
        <button
          disabled={!!pending}
          onClick={() => handle('remove', onRemove)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#e85a5a' }}
        >
          <XCircle className="h-3.5 w-3.5" />
          {pending === 'remove' ? '…' : 'Retirar'}
        </button>
      </div>
    </div>
  )
}
