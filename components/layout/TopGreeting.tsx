import { Bell, Search } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { Avatar } from '@/components/ui/avatar'

export function TopGreeting({ name, subtitle = 'How are you today?' }: { name: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between px-5 pt-4">
      <div className="flex items-center gap-3">
        <Avatar
          initials={name.slice(0, 1).toUpperCase()}
          size="md"
        />
        <div>
          <p className="flex items-center gap-1 text-lg font-semibold">
            Hello {name} <span aria-hidden>👋</span>
          </p>
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <IconButton aria-label="Search">
          <Search className="h-4 w-4" />
        </IconButton>
        <IconButton
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--danger)]" />
        </IconButton>
      </div>
    </header>
  )
}
