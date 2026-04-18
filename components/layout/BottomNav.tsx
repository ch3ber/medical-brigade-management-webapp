'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const items = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/dashboard/brigades', label: 'Brigadas', icon: Calendar },
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
  { href: '/dashboard/profile', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="bg-brand-gradient mx-auto flex max-w-md items-center justify-between rounded-full px-3 py-2 shadow-[0_20px_50px_-20px_rgb(75_107_251/0.7)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                'flex h-11 items-center justify-center rounded-full transition-all',
                active
                  ? 'gap-2 bg-white px-4 text-[var(--accent)] shadow-md'
                  : 'w-11 text-white/80 hover:text-white',
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={2.2}
              />
              {active && <span className="text-xs font-semibold">{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
