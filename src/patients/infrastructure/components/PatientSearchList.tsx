'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

export interface PatientListItem {
  id: string
  fullName: string
  age: number
  turnos: {
    id: string
    areaId: string
    areaPrefix: string
    areaOrder: number
    status: string
  }[]
}

interface Props {
  patients: PatientListItem[]
  brigadeId: string
  colorByAreaId: Record<string, string>
}

export function PatientSearchList({ patients, brigadeId, colorByAreaId }: Props) {
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? patients.filter((p) => {
        if (p.fullName.toLowerCase().includes(needle)) return true
        return p.turnos.some((t) => `${t.areaPrefix}-${t.areaOrder}`.toLowerCase().includes(needle))
      })
    : patients

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 transition focus-within:border-[#5b6cf5] focus-within:ring-2 focus-within:ring-[#5b6cf5]/20">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o turno"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="space-y-2 pt-4 pb-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/brigades/${brigadeId}/patients/${p.id}`}
            className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 transition hover:bg-white"
          >
            <Avatar
              initials={p.fullName[0]}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.fullName}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="h-3 w-3" />
                {p.age} años
              </p>
            </div>
            <div className="flex max-w-[45%] flex-wrap justify-end gap-1">
              {p.turnos.slice(0, 3).map((t) => {
                const color = colorByAreaId[t.areaId] ?? '#5b6cf5'
                const isCalled = t.status === 'CALLED'
                return (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: isCalled ? color : color + '20',
                      color: isCalled ? 'white' : color,
                    }}
                  >
                    {t.areaPrefix}-{t.areaOrder}
                  </span>
                )
              })}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">
            {query ? 'Sin resultados.' : 'No hay pacientes registrados.'}
          </p>
        )}
      </div>
    </>
  )
}
