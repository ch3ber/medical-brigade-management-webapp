import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export function PageHeader({
  title,
  backHref,
  right,
  className,
}: {
  title: string
  backHref?: string
  right?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex items-center justify-between px-5 pt-4 pb-2', className)}>
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="w-11" />
      )}
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex min-w-11 items-center justify-end gap-2">{right ?? <span className="w-11" />}</div>
    </header>
  )
}
