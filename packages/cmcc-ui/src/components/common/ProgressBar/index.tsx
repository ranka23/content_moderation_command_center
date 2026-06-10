import { cn } from '../../../lib/cn'

export interface ProgressBarProps {
  /** Current value (0-100 or absolute) */
  value: number
  /** Maximum value (default: 100) */
  max?: number
  /** Optional label text */
  label?: string
  /** Show percentage text */
  showPercentage?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  /** Whether the progress is indeterminate (animated) */
  indeterminate?: boolean
  className?: string
}

/**
 * ProgressBar component for showing operation progress.
 * Supports determinate and indeterminate modes, multiple sizes and colors.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  className,
}: ProgressBarProps): React.ReactElement {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeClasses: Record<string, string> = {
    sm: 'tw-h-1.5',
    md: 'tw-h-2.5',
    lg: 'tw-h-4',
  }

  const variantClasses: Record<string, string> = {
    default: 'tw-bg-primary-500',
    success: 'tw-bg-green-500',
    warning: 'tw-bg-amber-500',
    danger: 'tw-bg-red-500',
    info: 'tw-bg-blue-500',
  }

  return (
    <div className={cn('tw-w-full', className)}>
      {(label || showPercentage) && (
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-1">
          {label && (
            <span className="tw-text-xs tw-font-medium tw-text-gray-600">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="tw-text-xs tw-font-medium tw-text-gray-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'tw-w-full tw-bg-gray-200 tw-rounded-full tw-overflow-hidden',
          sizeClasses[size],
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'tw-rounded-full tw-transition-all tw-duration-500 tw-ease-out',
            sizeClasses[size],
            variantClasses[variant],
            indeterminate && 'tw-animate-progress-indeterminate',
          )}
          style={indeterminate ? { width: '50%' } : { width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
