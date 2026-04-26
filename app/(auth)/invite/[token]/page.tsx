import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { AcceptInviteUseCase } from '@/src/members/application/use-cases/accept-invite'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const repo = new PrismaMemberRepository(prisma)
  const member = await repo.findByInviteToken(token)

  if (!member || !member.isPending()) {
    return (
      <MobileShell>
        <PageHeader
          title="Invitación"
          backHref="/"
        />
        <main className="flex-1 px-6 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-bold">Invitación inválida</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Este enlace expiró o ya fue usado.</p>
          <Link
            href="/login"
            className="mt-8 block"
          >
            <Button
              size="lg"
              variant="soft"
              className="w-full"
            >
              Ir al inicio de sesión
            </Button>
          </Link>
        </main>
      </MobileShell>
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await new AcceptInviteUseCase(repo).execute({ token, profileId: user.id })
    redirect(`/brigades/${member.brigadeId}`)
  }

  const roleLabel = member.role === 'CO_DIRECTOR' ? 'Co-Director' : 'Personal'

  return (
    <MobileShell>
      <PageHeader
        title="Unirse a brigada"
        backHref="/"
      />
      <main className="flex-1 px-6 pt-6 pb-10">
        <Card className="mb-8 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Invitado a una brigada</p>
              <h2 className="text-base font-semibold">{member.email}</h2>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Rol asignado:</span>
            <Badge variant="soft">{roleLabel}</Badge>
          </div>
        </Card>

        <div className="mb-8 space-y-2">
          <h3 className="text-lg font-bold">Inicia sesión para continuar</h3>
          <p className="text-sm text-[var(--muted)]">
            Inicia sesión con tu cuenta para aceptar la invitación automáticamente.
          </p>
        </div>

        <Link href={`/login?redirect=/invite/${token}`}>
          <Button
            size="lg"
            className="w-full"
          >
            Ir al inicio de sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿No tienes cuenta?{' '}
          <Link
            href={`/register?redirect=/invite/${token}`}
            className="font-medium text-[var(--accent)]"
          >
            Regístrate
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
