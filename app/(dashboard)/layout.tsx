import { MobileShell } from '@/components/layout/MobileShell'
import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto pb-28">{children}</div>
      <div className="absolute inset-x-0 bottom-0">
        <BottomNav />
      </div>
    </MobileShell>
  )
}
