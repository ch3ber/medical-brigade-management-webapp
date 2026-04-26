import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, Shield, HelpCircle, LogOut, ChevronRight, Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { logoutAction } from '@/app/(auth)/actions'

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Admin',
  BRIGADE_DIRECTOR: 'Director',
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  const fullName = profile?.fullName ?? user.email ?? 'Usuario'
  const email = user.email ?? ''
  const roleLabel = ROLE_LABEL[profile?.role ?? ''] ?? 'Director'
  const initials = fullName[0]?.toUpperCase() ?? 'U'

  const menuSections = [
    {
      title: 'Cuenta',
      items: [{ icon: Mail, label: 'Email', value: email }],
    },
    {
      title: 'Preferencias',
      items: [
        { icon: Bell, label: 'Notificaciones', href: '#' },
        { icon: Shield, label: 'Privacidad', href: '#' },
      ],
    },
    {
      title: 'Soporte',
      items: [{ icon: HelpCircle, label: 'Ayuda y runbooks', href: '#' }],
    },
  ]

  return (
    <>
      <PageHeader title="Perfil" />

      <div className="space-y-5 px-5 pt-4 pb-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar
            initials={initials}
            size="lg"
            className="h-20 w-20 text-2xl"
          />
          <div className="text-center">
            <h2 className="text-lg font-bold">{fullName}</h2>
            <p className="text-sm text-[var(--muted)]">{email}</p>
          </div>
          <Badge variant="primary">{roleLabel}</Badge>
        </div>

        {menuSections.map(({ title, items }) => (
          <Card key={title}>
            <CardContent className="px-0 py-2">
              <p className="px-5 pt-3 pb-1 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                {title}
              </p>
              {items.map((item, i) => {
                const Icon = item.icon
                const isLast = i === items.length - 1
                return (
                  <div key={item.label}>
                    {'href' in item ? (
                      <Link
                        href={item.href as string}
                        className="flex items-center gap-3 px-5 py-3 transition hover:bg-[var(--surface-muted)]"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--accent)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--accent)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        <span className="max-w-[160px] truncate text-xs text-[var(--muted)]">
                          {'value' in item ? item.value : ''}
                        </span>
                      </div>
                    )}
                    {!isLast && <Separator />}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-5 py-3 text-red-600 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </>
  )
}
