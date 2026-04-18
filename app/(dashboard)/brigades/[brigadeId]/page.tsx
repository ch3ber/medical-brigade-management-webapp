import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Heart, Share2, MapPin, Calendar, Users, Plus, UserPlus, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrigadeStatusBadge } from '@/src/brigades/infrastructure/components/BrigadeStatusBadge'
import { AreaCard } from '@/src/areas/infrastructure/components/AreaCard'
import { mockBrigades, mockAreas } from '@/shared/lib/mock-data'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function BrigadeDetailPage({ params }: Props) {
  const { brigadeId } = await params
  const brigade = mockBrigades.find((b) => b.id === brigadeId)
  if (!brigade) notFound()
  const areas = mockAreas.filter((a) => a.brigadeId === brigadeId)

  return (
    <>
      <PageHeader
        title="Brigade"
        backHref="/dashboard/brigades"
        right={
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]"
              aria-label="Favorite"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <section className="px-5 pt-2">
        <Card className="relative overflow-hidden border-0 p-0 text-white">
          <div className="bg-brand-gradient absolute inset-0" />
          <div className="relative p-6">
            <BrigadeStatusBadge status={brigade.status} />
            <h1 className="mt-3 text-2xl font-bold">{brigade.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {brigade.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {brigade.date}
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-4">
        <StatTile
          label="Patients"
          value={brigade.patientsCount}
        />
        <StatTile
          label="Areas"
          value={brigade.areasCount}
        />
        <StatTile
          label="Waiting"
          value={areas.reduce((acc, a) => acc + a.waitingCount, 0)}
        />
      </section>

      <section className="flex gap-2 px-5 pt-5">
        <Link
          href={`/dashboard/brigades/${brigadeId}/patients/new`}
          className="flex-1"
        >
          <Button
            size="md"
            className="w-full"
          >
            <UserPlus className="h-4 w-4" />
            Register
          </Button>
        </Link>
        <Link href={`/dashboard/brigades/${brigadeId}/settings`}>
          <Button
            size="md"
            variant="secondary"
            className="w-12 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Areas</h3>
          <Link
            href={`/dashboard/brigades/${brigadeId}/settings`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {areas.map((a) => (
            <AreaCard
              key={a.id}
              {...a}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="inline-flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
        <Users className="h-3 w-3" />
        {label}
      </p>
    </div>
  )
}
