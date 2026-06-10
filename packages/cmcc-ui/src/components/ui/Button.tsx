import React from 'react'
import { cn } from '../../lib/cn'

const variants: Record<string, string> = {
  default:
    'tw-bg-primary-600 tw-text-white hover:tw-bg-primary-700 tw-border tw-border-transparent',
  destructive:
    'tw-bg-red-600 tw-text-white hover:tw-bg-red-700 tw-border tw-border-transparent',
  outline:
    'tw-bg-white tw-text-gray-900 hover:tw-bg-gray-100 tw-border tw-border-gray-300',
  secondary:
    'tw-bg-gray-100 tw-text-gray-900 hover:tw-bg-gray-200 tw-border tw-border-transparent',
  ghost:
    'tw-bg-transparent tw-text-gray-900 hover:tw-bg-gray-100 tw-border tw-border-transparent',
  link: 'tw-bg-transparent tw-text-primary-600 tw-underline-offset-4 hover:tw-underline tw-border-none tw-p-0 tw-h-auto',
}

const sizes: Record<string, string> = {
  default: 'tw-h-10 tw-px-4 tw-py-2',
  sm: 'tw-h-9 tw-rounded-md tw-px-3 tw-text-xs',
  lg: 'tw-h-11 tw-rounded-md tw-px-8',
  icon: 'tw-h-10 tw-w-10',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        className={cn(
          'tw-inline-flex tw-items-center tw-justify-center tw-whitespace-nowrap',
          'tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors',
          'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-blue-500 focus-visible:tw-ring-offset-2',
          'disabled:tw-pointer-events-none disabled:tw-opacity-50',
          variants[variant] ?? variants['default'],
          sizes[size] ?? sizes['default'],
          className,
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="tw-opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="tw-opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span aria-hidden="true">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
