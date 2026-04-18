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
        title="Crear cuenta"
        backHref="/login"
      />
      <main className="flex-1 px-6 pt-6 pb-10">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Únete a tu brigada</h2>
          <p className="text-sm text-[var(--muted)]">Crea una cuenta para gestionar tu brigada.</p>
        </div>

        <form className="mt-10 space-y-4">
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
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Correo electrónico</span>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="email"
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
          >
            Crear cuenta
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
