import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { BrigadeCard } from '@/src/brigades/infrastructure/components/BrigadeCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'

export default async function BrigadeListPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigades = await new ListBrigadesUseCase(new PrismaBrigadeRepository(prisma)).execute({
    userId: user.id,
  })

  return (
    <>
      <PageHeader
        title="Brigadas"
        backHref="/dashboard"
        right={
          <Link
            href="/dashboard/brigades/new"
            className="bg-brand-gradient inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_10px_30px_-10px_rgb(75_107_251/0.6)]"
            aria-label="Nueva brigada"
          >
            <Plus className="h-4 w-4" />
          </Link>
        }
      />
      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              placeholder="Buscar brigadas"
              className="pl-11"
            />
          </div>
          <button
            className="bg-brand-gradient inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
            aria-label="Filtrar"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5">
        {['Todas', 'Activas', 'Borrador', 'Cerradas'].map((label, i) => (
          <button
            key={label}
            className={
              'shrink-0 rounded-full px-4 py-2 text-xs font-medium ' +
              (i === 0
                ? 'bg-brand-gradient text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-5 pt-5">
        {brigades.map((b) => (
          <BrigadeCard
            key={b.id}
            id={b.id}
            name={b.name}
            location={b.location}
            date={b.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            status={b.status}
            patientsCount={b.patientsCount}
            areasCount={b.areasCount}
          />
        ))}
        {brigades.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">
            No tienes brigadas todavía.{' '}
            <Link
              href="/dashboard/brigades/new"
              className="font-medium text-[var(--accent)]"
            >
              Crea una
            </Link>
          </p>
        )}
      </div>
    </>
  )
}
