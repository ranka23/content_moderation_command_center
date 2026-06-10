import React from 'react'

export interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({
  className = '',
}: SkeletonCardProps): React.ReactElement {
  return (
    <div
      className={`tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-p-6 ${className}`}
      role="status"
      aria-label="Loading card content"
    >
      <div className="tw-flex tw-items-center tw-gap-4 tw-mb-4">
        <div className="tw-w-12 tw-h-12 tw-bg-gray-200 tw-rounded-full tw-animate-pulse" />
        <div className="tw-flex-1">
          <div className="tw-h-4 tw-bg-gray-200 tw-rounded tw-w-1/3 tw-animate-pulse tw-mb-2" />
          <div className="tw-h-3 tw-bg-gray-200 tw-rounded tw-w-1/2 tw-animate-pulse" />
        </div>
      </div>
      <div className="tw-space-y-3">
        <div className="tw-h-3 tw-bg-gray-200 tw-rounded tw-animate-pulse" />
        <div className="tw-h-3 tw-bg-gray-200 tw-rounded tw-w-5/6 tw-animate-pulse" />
        <div className="tw-h-3 tw-bg-gray-200 tw-rounded tw-w-2/3 tw-animate-pulse" />
      </div>
    </div>
  )
}

export default SkeletonCard
