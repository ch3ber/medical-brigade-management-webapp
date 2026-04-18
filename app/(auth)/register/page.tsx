import Link from 'next/link'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  return (
    <MobileShell>
      <PageHeader
        title="Create account"
        backHref="/login"
      />
      <main className="flex-1 px-6 pt-6 pb-10">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Join your brigade</h2>
          <p className="text-sm text-[var(--muted)]">Create an account to start managing your brigade.</p>
        </div>

        <form className="mt-10 space-y-4">
          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Full name</span>
            <div className="relative mt-1">
              <User className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                required
                placeholder="Maria Lopez"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Email</span>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="email"
                required
                placeholder="you@brigade.org"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Password</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                required
                placeholder="At least 8 characters"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Confirm password</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                required
                placeholder="Repeat password"
                className="pl-11"
              />
            </div>
          </label>

          <Button
            size="lg"
            className="mt-4 w-full"
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)]"
          >
            Sign in
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
