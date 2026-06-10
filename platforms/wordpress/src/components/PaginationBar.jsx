import React from 'react'
import { Pagination } from '@cmcc/ui'

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function PaginationBar({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  label = 'items',
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="tw-flex tw-items-center tw-justify-between tw-py-4 tw-px-2">
      <div className="tw-flex tw-items-center tw-gap-2">
        <span className="tw-text-sm tw-text-gray-500">
          {total > 0
            ? `${start}\u2013${end} of ${total} ${label}`
            : `No ${label}`}
        </span>
        <span className="tw-text-gray-300">|</span>
        <label className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-gray-500">
          Show
          <select
            value={String(perPage)}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="tw-w-16 tw-h-8 tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-1"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          per page
        </label>
      </div>
      {total > perPage && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default PaginationBar
