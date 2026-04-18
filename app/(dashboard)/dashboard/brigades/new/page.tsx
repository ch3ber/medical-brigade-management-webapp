'use client'

import { useState } from 'react'
import { MapPin, Calendar, FileText, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/cn'

const COLORS = ['#4b6bfb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

interface AreaDraft {
  id: string
  name: string
  prefix: string
  color: string
}

export default function NewBrigadePage() {
  const [areas, setAreas] = useState<AreaDraft[]>([
    { id: '1', name: 'General Medicine', prefix: 'GM', color: '#4b6bfb' },
  ])

  const addArea = () =>
    setAreas((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        prefix: '',
        color: COLORS[prev.length % COLORS.length],
      },
    ])

  const removeArea = (id: string) => setAreas((prev) => prev.filter((a) => a.id !== id))

  const updateArea = (id: string, field: keyof AreaDraft, value: string) =>
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  return (
    <>
      <PageHeader
        title="Nueva brigada"
        backHref="/dashboard/brigades"
      />
      <div className="space-y-5 px-5 pt-2 pb-4">
        <Field
          icon={<FileText className="h-4 w-4" />}
          label="Nombre de la brigada"
        >
          <Input
            placeholder="Brigada San Miguel"
            required
          />
        </Field>

        <Field
          icon={<MapPin className="h-4 w-4" />}
          label="Lugar"
        >
          <Input placeholder="Parroquia San Miguel" />
        </Field>

        <Field
          icon={<Calendar className="h-4 w-4" />}
          label="Fecha"
        >
          <Input type="date" />
        </Field>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Áreas</h3>
            <button
              type="button"
              onClick={addArea}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar área
            </button>
          </div>

          <div className="space-y-3">
            {areas.map((area) => (
              <Card
                key={area.id}
                className="space-y-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-[var(--radius-md)] shadow ring-2 ring-white"
                    style={{ background: area.color }}
                    title="Elegir color"
                  />
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      placeholder="Nombre del área"
                      value={area.name}
                      onChange={(e) => updateArea(area.id, 'name', e.target.value)}
                      className="h-10 text-sm"
                    />
                    <Input
                      placeholder="Prefijo (GM)"
                      value={area.prefix}
                      maxLength={4}
                      onChange={(e) => updateArea(area.id, 'prefix', e.target.value.toUpperCase())}
                      className="h-10 text-sm"
                    />
                  </div>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArea(area.id)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                      aria-label="Eliminar área"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateArea(area.id, 'color', c)}
                      className={cn(
                        'h-6 w-6 rounded-full transition',
                        area.color === c
                          ? 'scale-110 ring-2 ring-[var(--ring)] ring-offset-2'
                          : 'opacity-70 hover:opacity-100',
                      )}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Button
          size="lg"
          className="mt-2 w-full"
          type="submit"
        >
          Crear brigada
        </Button>
      </div>
    </>
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
      <span className="mb-1 ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}
