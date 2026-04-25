'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createAreaAction, updateAreaAction, deleteAreaAction } from './actions'

const COLORS = ['#4b6bfb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

interface AreaRow {
  id: string
  name: string
  prefix: string
  color: string
}

interface Props {
  brigadeId: string
  initialAreas: AreaRow[]
}

export function SettingsClient({ brigadeId, initialAreas }: Props) {
  const [adding, setAdding] = useState(false)
  const [newColor, setNewColor] = useState(COLORS[0])

  const createArea = createAreaAction.bind(null, brigadeId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Áreas</CardTitle>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {initialAreas.map((area) => {
          const updateArea = updateAreaAction.bind(null, brigadeId, area.id)
          const deleteArea = deleteAreaAction.bind(null, brigadeId, area.id)
          return (
            <form
              key={area.id}
              action={updateArea}
              className="flex items-center gap-3"
            >
              <input
                type="hidden"
                name="color"
                value={area.color}
              />
              <div
                className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                style={{ background: area.color }}
              />
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <Input
                  name="name"
                  defaultValue={area.name}
                  placeholder="Nombre del área"
                  className="h-10 text-sm"
                />
                <Input
                  name="prefix"
                  defaultValue={area.prefix}
                  placeholder="Prefijo"
                  maxLength={4}
                  className="h-10 text-sm"
                  onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
                />
              </div>
              <button
                type="submit"
                className="hidden"
              />
              <button
                type="button"
                onClick={async () => {
                  await deleteArea()
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          )
        })}

        {adding && (
          <form
            action={async (fd) => {
              fd.append('color', newColor)
              await createArea(fd)
              setAdding(false)
            }}
            className="flex items-center gap-3"
          >
            <div
              className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
              style={{ background: newColor }}
            />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Input
                name="name"
                placeholder="Nombre del área"
                required
                className="h-10 text-sm"
              />
              <Input
                name="prefix"
                placeholder="Prefijo"
                maxLength={4}
                required
                className="h-10 text-sm"
                onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600"
            >
              ✓
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
