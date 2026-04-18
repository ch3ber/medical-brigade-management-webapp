import { cn } from '@/shared/lib/cn'

export const Separator = ({
  className,
  orientation = 'horizontal',
}: {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}) => (
  <div
    className={cn(
      'bg-[var(--border)]',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
  />
)
