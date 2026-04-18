import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-gradient text-white shadow-[0_10px_30px_-10px_rgb(75_107_251/0.6)] hover:brightness-105',
        secondary:
          'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-muted)]',
        soft: 'bg-[var(--primary-soft)] text-[var(--accent)] hover:bg-[var(--primary-soft)]/80',
        ghost: 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
        destructive:
          'bg-[var(--danger)] text-white hover:brightness-110 shadow-[0_10px_30px_-10px_rgb(239_68_68/0.6)]',
        icon: 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-muted)]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-6 text-base',
        icon: 'h-10 w-10 p-0',
        iconLg: 'h-14 w-14 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
