import { Card } from '@/components/ui/card'

export interface PublicAreaDashboardProps {
  areaName: string
  prefix: string
  currentLabel?: string
  upcoming: string[]
}

export function PublicAreaDashboard({ areaName, prefix, currentLabel, upcoming }: PublicAreaDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-sm font-medium tracking-widest text-white/80 uppercase">Area</p>
        <h1 className="mt-1 text-4xl font-extrabold text-white">{areaName}</h1>
        <p className="mt-1 text-sm text-white/70">Prefix · {prefix}</p>
      </header>

      <Card className="relative overflow-hidden border-0 p-0">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
        <div className="relative p-10 text-center">
          <p className="text-xs tracking-widest text-white/70 uppercase">Now serving</p>
          <p className="mt-4 text-[5rem] leading-none font-extrabold text-white sm:text-[7rem]">
            {currentLabel ?? '—'}
          </p>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-sm tracking-widest text-white/80 uppercase">Up next</h2>
        <div className="flex flex-wrap gap-2">
          {upcoming.length === 0 ? (
            <span className="text-sm text-white/60">No one in queue.</span>
          ) : (
            upcoming.map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/15 px-4 py-2 font-semibold text-white backdrop-blur"
              >
                {label}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
