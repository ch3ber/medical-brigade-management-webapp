'use client'

import { useState } from 'react'
import { use } from 'react'
import { Trash2, Plus, Users, Copy, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { mockAreas } from '@/shared/lib/mock-data'

const COLORS = ['#4b6bfb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default function BrigadeSettingsPage({ params }: Props) {
  const { brigadeId } = use(params)
  const initial = mockAreas.filter((a) => a.brigadeId === brigadeId)

  const [areas, setAreas] = useState(initial.map((a) => ({ ...a, editing: false })))

  const addArea = () =>
    setAreas((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        brigadeId,
        name: '',
        prefix: '',
        color: COLORS[prev.length % COLORS.length],
        waitingCount: 0,
        servedCount: 0,
        editing: true,
      },
    ])

  const remove = (id: string) => setAreas((prev) => prev.filter((a) => a.id !== id))

  const update = (id: string, field: string, value: string) =>
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  return (
    <>
      <PageHeader
        title="Configuración"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />

      <div className="space-y-6 px-5 pt-2 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de la brigada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block">
              <span className="ml-2 text-xs text-[var(--muted)]">Nombre</span>
              <Input
                defaultValue="San Miguel Health Day"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="ml-2 text-xs text-[var(--muted)]">Lugar</span>
              <Input
                defaultValue="Parroquia San Miguel"
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="ml-2 text-xs text-[var(--muted)]">Fecha</span>
              <Input
                type="date"
                defaultValue="2026-04-18"
                className="mt-1"
              />
            </label>
            <Button
              size="md"
              className="mt-2 w-full"
            >
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Áreas</CardTitle>
              <button
                type="button"
                onClick={addArea}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center gap-3"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                  style={{ background: area.color }}
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <Input
                    value={area.name}
                    placeholder="Nombre del área"
                    onChange={(e) => update(area.id, 'name', e.target.value)}
                    className="h-10 text-sm"
                  />
                  <Input
                    value={area.prefix}
                    placeholder="Prefijo"
                    maxLength={4}
                    onChange={(e) => update(area.id, 'prefix', e.target.value.toUpperCase())}
                    className="h-10 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(area.id)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Eber Alejo', role: 'DIRECTOR' },
              { name: 'Ana Torres', role: 'STAFF' },
              { name: 'Pedro Gómez', role: 'STAFF' },
            ].map(({ name, role }) => (
              <div
                key={name}
                className="flex items-center gap-3"
              >
                <div className="bg-brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
                  {name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                </div>
                <Badge variant={role === 'DIRECTOR' ? 'primary' : 'muted'}>
                  {role === 'DIRECTOR' ? 'Director' : 'Personal'}
                </Badge>
              </div>
            ))}
            <Separator className="my-2" />
            <Button
              variant="soft"
              size="md"
              className="w-full"
            >
              <Users className="h-4 w-4" />
              Invitar miembro
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 bg-[var(--surface-muted)]">
          <CardContent className="space-y-3 py-5">
            <Button
              variant="secondary"
              size="md"
              className="w-full"
            >
              <Copy className="h-4 w-4" />
              Clonar brigada
            </Button>
            <Button
              size="md"
              className="w-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
            >
              <AlertTriangle className="h-4 w-4" />
              Cerrar brigada
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
