import { cn } from '@/shared/lib/cn'

export function MobileShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('app-shell flex flex-col', className)}>{children}</div>
}

export function ShellContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn('flex-1 overflow-y-auto px-5 pt-4 pb-28', className)}>{children}</main>
}
