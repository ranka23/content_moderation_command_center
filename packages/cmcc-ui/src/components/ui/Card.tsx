import React from 'react'
import { cn } from '../../lib/cn'

export interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  action?: React.ReactNode
}

export function Card({
  children,
  className,
  title,
  action,
}: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-sm',
        className,
      )}
    >
      {(title || action) && (
        <div className="tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-3 tw-border-b tw-border-gray-100">
          {title && (
            <h3 className="tw-text-sm tw-font-semibold tw-text-gray-900 tw-m-0">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="tw-p-4">{children}</div>
    </div>
  )
}
