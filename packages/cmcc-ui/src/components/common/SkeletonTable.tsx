import React from 'react'

export interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 6,
  className = '',
}: SkeletonTableProps): React.ReactElement {
  return (
    <div className={className} role="status" aria-label="Loading table data">
      <table className="tw-w-full tw-border-collapse">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, ci) => (
              <th key={ci} className="tw-p-3">
                <div className="tw-h-4 tw-bg-gray-200 tw-rounded tw-animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri}>
              {Array.from({ length: columns }).map((_, ci) => (
                <td key={ci} className="tw-p-3">
                  <div
                    className={`tw-h-4 tw-bg-gray-200 tw-rounded tw-animate-pulse ${
                      ci === 0 ? 'tw-w-3/4' : 'tw-w-full'
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SkeletonTable
