'use client'

import { useState } from 'react'
import { User, Phone, CalendarDays, Stethoscope } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/cn'

export interface PatientFormAreaOption {
  id: string
  name: string
  prefix: string
  color: string
}

export function PatientForm({ areas }: { areas: PatientFormAreaOption[] }) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <form className="space-y-5">
      <Field
        icon={<User className="h-4 w-4" />}
        label="Nombre completo"
      >
        <Input
          placeholder="María López"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          icon={<CalendarDays className="h-4 w-4" />}
          label="Edad"
        >
          <Input
            type="number"
            placeholder="42"
            required
            min={0}
            max={130}
          />
        </Field>
        <Field
          icon={<Phone className="h-4 w-4" />}
          label="Teléfono"
        >
          <Input
            type="tel"
            placeholder="+503 0000 0000"
          />
        </Field>
      </div>

      <div>
        <label className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
          <Stethoscope className="h-3.5 w-3.5" />
          Asignar a áreas
        </label>
        <Card className="mt-2 p-3">
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => {
              const active = selected.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition',
                    active
                      ? 'bg-brand-gradient border-transparent text-white'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      active ? 'bg-white/25 text-white' : 'text-white',
                    )}
                    style={{ background: active ? undefined : a.color }}
                  >
                    {a.prefix}
                  </span>
                  {a.name}
                </button>
              )
            })}
          </div>
        </Card>
        <p className="mt-2 ml-2 text-xs text-[var(--muted)]">
          {selected.length} área{selected.length === 1 ? '' : 's'} seleccionada
          {selected.length === 1 ? '' : 's'}
        </p>
      </div>

      <Button
        size="lg"
        className="mt-2 w-full"
        type="submit"
      >
        Registrar y generar turnos
      </Button>
    </form>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
