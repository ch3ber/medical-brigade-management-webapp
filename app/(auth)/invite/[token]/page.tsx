import Link from 'next/link'
import { ArrowRight, Lock, User, Stethoscope } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const invite = {
    brigadeName: 'Brigada San Miguel',
    role: 'STAFF' as const,
    invitedBy: 'Eber Alejo',
    valid: true,
  }

  if (!invite.valid) {
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
              <p className="text-xs text-[var(--muted)]">Invitado por {invite.invitedBy}</p>
              <h2 className="text-base font-semibold">{invite.brigadeName}</h2>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Rol asignado:</span>
            <Badge variant="soft">{invite.role === 'STAFF' ? 'Personal' : 'Director'}</Badge>
          </div>
        </Card>

        <div className="mb-8 space-y-2">
          <h3 className="text-lg font-bold">Crea tu cuenta</h3>
          <p className="text-sm text-[var(--muted)]">Completa el registro para unirte a la brigada.</p>
        </div>

        <form
          className="space-y-4"
          action="#"
        >
          <input
            type="hidden"
            name="token"
            value={token}
          />

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Nombre completo</span>
            <div className="relative mt-1">
              <User className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                required
                placeholder="María López"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Confirmar contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                required
                placeholder="Repite la contraseña"
                className="pl-11"
              />
            </div>
          </label>

          <Button
            size="lg"
            className="mt-4 w-full"
            type="submit"
          >
            Unirse a la brigada
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)]"
          >
            Ingresar
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
