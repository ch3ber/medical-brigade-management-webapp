import Link from 'next/link'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <MobileShell>
      <div className="relative flex flex-1 flex-col">
        <div className="relative flex-1 overflow-hidden">
          <div className="bg-brand-gradient absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]" />
          <div className="relative flex flex-col items-center px-6 pt-16 pb-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <Stethoscope
                className="h-10 w-10 text-white"
                strokeWidth={2}
              />
            </div>
            <h1 className="mt-8 text-3xl font-bold text-balance text-white">Smart Care for Every Brigade</h1>
            <p className="mt-3 max-w-xs text-sm text-balance text-white/80">
              Organize brigades, register patients, and manage real-time queues across every area.
            </p>
          </div>
        </div>

        <div className="-mt-8 rounded-t-[2rem] bg-[var(--background)] px-6 pt-10 pb-10">
          <div className="space-y-3">
            <Link
              href="/login"
              className="block"
            >
              <Button
                size="lg"
                className="w-full"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/dashboard"
              className="block"
            >
              <Button
                size="lg"
                variant="soft"
                className="w-full"
              >
                Continue as staff
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Trusted care made simple with expert teams.
          </p>
        </div>
      </div>
    </MobileShell>
  )
}
