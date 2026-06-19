import React from 'react'
import { Icon } from '../../lib/icons'

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon = 'empty',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-px-4 tw-text-center ${className}`}
    >
      {icon && (
        <div className="tw-text-4xl tw-mb-4" aria-hidden="true">
          <Icon
            name={
              icon === 'queue'
                ? 'queue'
                : icon === 'activity'
                  ? 'activity-log'
                  : icon === 'users'
                    ? 'user'
                    : icon
            }
            size={32}
          />
        </div>
      )}
      <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-1">
        {title}
      </h3>
      {description && (
        <p className="tw-text-sm tw-text-gray-500 tw-max-w-sm tw-mb-4">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
