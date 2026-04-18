import * as React from 'react'
import { cn } from '@/shared/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 text-sm transition placeholder:text-[var(--muted)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/30 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
