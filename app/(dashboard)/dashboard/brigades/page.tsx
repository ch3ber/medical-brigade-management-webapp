import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { BrigadeCard } from '@/src/brigades/infrastructure/components/BrigadeCard'
import { mockBrigades } from '@/shared/lib/mock-data'

export default function BrigadeListPage() {
  return (
    <>
      <PageHeader
        title="Brigades"
        backHref="/dashboard"
        right={
          <Link
            href="/dashboard/brigades/new"
            className="bg-brand-gradient inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_10px_30px_-10px_rgb(75_107_251/0.6)]"
            aria-label="New brigade"
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
              placeholder="Search brigades"
              className="pl-11"
            />
          </div>
          <button
            className="bg-brand-gradient inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
            aria-label="Filter"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5">
        {(['All', 'Active', 'Draft', 'Closed'] as const).map((label, i) => (
          <button
            key={label}
            className={
              'shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ' +
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
        {mockBrigades.map((b) => (
          <BrigadeCard
            key={b.id}
            {...b}
          />
        ))}
      </div>
    </>
  )
}
