import Link from 'next/link'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction } from '../actions'

const MESSAGE_MAP: Record<string, string> = {
  email_confirmation_required: 'Revisa tu correo para confirmar tu cuenta',
}

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, message } = await searchParams
  const infoMessage = message ? (MESSAGE_MAP[message] ?? null) : null

  return (
    <MobileShell>
      <PageHeader
        title="Iniciar sesión"
        backHref="/"
      />
      <main className="flex-1 px-6 pt-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
          <p className="text-sm text-[var(--muted)]">Ingresa para gestionar tu brigada.</p>
        </div>

        {infoMessage && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 px-4 py-3 text-sm text-green-700">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          action={loginAction}
          className="mt-10 space-y-4"
        >
          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Correo electrónico</span>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="email"
                name="email"
                required
                placeholder="tu@brigada.org"
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
                name="password"
                required
                placeholder="••••••••"
                className="pl-11"
              />
            </div>
          </label>

          <div className="text-right">
            <Link
              href="#"
              className="text-xs font-medium text-[var(--accent)]"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            size="lg"
            className="mt-2 w-full"
            type="submit"
          >
            Ingresar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿Necesitas acceso?{' '}
          <Link
            href="/register"
            className="font-medium text-[var(--accent)]"
          >
            Solicitar invitación
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
