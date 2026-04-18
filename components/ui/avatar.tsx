import * as React from 'react'
import { cn } from '@/shared/lib/cn'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
}

export const Avatar = ({ initials, size = 'md', className, children, ...props }: AvatarProps) => (
  <div
    className={cn(
      'bg-brand-gradient inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
      sizeMap[size],
      className,
    )}
    {...props}
  >
    {children ?? initials}
  </div>
)
