import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', {
  variants: {
    variant: {
      soft: 'bg-[var(--primary-soft)] text-[var(--accent)]',
      primary: 'bg-brand-gradient text-white',
      outline: 'border border-[var(--border)] text-[var(--foreground)] bg-[var(--surface)]',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      danger: 'bg-red-100 text-red-700',
      muted: 'bg-[var(--surface-muted)] text-[var(--muted)]',
    },
  },
  defaultVariants: { variant: 'soft' },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  />
)
