import * as React from 'react'
import { cn } from '@/shared/lib/cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'default' | 'soft' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const toneMap = {
  default:
    'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-muted)]',
  soft: 'bg-[var(--primary-soft)] text-[var(--accent)] hover:bg-[var(--primary-soft)]/80',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110',
}

const sizeMap = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]/30 focus-visible:outline-none active:scale-95',
        toneMap[tone],
        sizeMap[size],
        className,
      )}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'
