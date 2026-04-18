import Link from 'next/link'
import { Search, Plus, ArrowUpRight, Stethoscope, Baby, Pill, Heart, Cross } from 'lucide-react'
import { TopGreeting } from '@/components/layout/TopGreeting'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrigadeCard } from '@/src/brigades/infrastructure/components/BrigadeCard'
import { mockBrigades } from '@/shared/lib/mock-data'

const specialties = [
  { label: 'General', icon: Stethoscope, color: '#4b6bfb' },
  { label: 'Odontología', icon: Cross, color: '#16a34a' },
  { label: 'Pediatría', icon: Baby, color: '#f59e0b' },
  { label: 'Farmacia', icon: Pill, color: '#8b5cf6' },
  { label: 'Cardio', icon: Heart, color: '#ef4444' },
]

export default function DashboardHomePage() {
  const active = mockBrigades.find((b) => b.status === 'ACTIVE')
  const others = mockBrigades.filter((b) => b.id !== active?.id)

  return (
    <>
      <TopGreeting
        name="Eber"
        subtitle="¿Listo para la brigada de hoy?"
      />

      <div className="px-5 pt-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            placeholder="Buscar brigadas o pacientes"
            className="pl-11"
          />
        </div>
      </div>

      <section className="px-5 pt-5">
        <div className="no-scrollbar flex gap-4 overflow-x-auto">
          {specialties.map(({ label, icon: Icon, color }) => (
            <button
              key={label}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
                style={{ color }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <section className="px-5 pt-6">
          <Card className="relative overflow-hidden border-0 p-0 text-white">
            <div className="bg-brand-gradient absolute inset-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <Badge className="border-0 bg-white/20 text-white">Brigada activa</Badge>
                <Link
                  href={`/dashboard/brigades/${active.id}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                  aria-label="Abrir"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <h2 className="mt-4 text-xl font-bold">{active.name}</h2>
              <p className="mt-1 text-sm text-white/80">
                {active.location} · {active.date}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-md)] bg-white/15 px-3 py-2 backdrop-blur">
                  <p className="text-[10px] tracking-wide text-white/70 uppercase">Pacientes</p>
                  <p className="font-semibold">{active.patientsCount}</p>
                </div>
                <div className="rounded-[var(--radius-md)] bg-white/15 px-3 py-2 backdrop-blur">
                  <p className="text-[10px] tracking-wide text-white/70 uppercase">Áreas</p>
                  <p className="font-semibold">{active.areasCount}</p>
                </div>
              </div>
              <Link
                href={`/dashboard/brigades/${active.id}/patients/new`}
                className="mt-5 block"
              >
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full border-0 bg-white text-[var(--accent)]"
                >
                  <Plus className="h-4 w-4" />
                  Registrar paciente
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      )}

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Brigadas recientes</h3>
          <Link
            href="/dashboard/brigades"
            className="text-xs font-medium text-[var(--accent)]"
          >
            Ver todas
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {others.map((b) => (
            <BrigadeCard
              key={b.id}
              {...b}
            />
          ))}
        </div>
      </section>
    </>
  )
}
