import React from 'react'
import { cn } from '../../lib/cn'

const badgeVariants: Record<string, string> = {
  default: 'tw-bg-primary-100 tw-text-primary-800',
  secondary: 'tw-bg-gray-100 tw-text-gray-800',
  destructive: 'tw-bg-red-100 tw-text-red-800',
  warning: 'tw-bg-amber-100 tw-text-amber-800',
  success: 'tw-bg-green-100 tw-text-green-800',
  info: 'tw-bg-blue-100 tw-text-blue-800',
  outline: 'tw-border tw-border-gray-300 tw-text-gray-700',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium',
        badgeVariants[variant] ?? badgeVariants['default'],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
