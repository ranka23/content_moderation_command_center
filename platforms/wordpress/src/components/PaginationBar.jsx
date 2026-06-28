import React from 'react'
import { Pagination } from '@cmcc/ui'

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

/**
 * Pagination bar with per-page selector and page navigation.
 * 2026 refined design with consistent spacing and modern select styling.
 */
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
    <div className="cmcc-pagination-bar">
      <div className="cmcc-pagination-left">
        <span className="cmcc-pagination-info">
          {total > 0
            ? `${start}\u2013${end} of ${total} ${label}`
            : `No ${label}`}
        </span>
        <span className="cmcc-pagination-separator">|</span>
        <label className="cmcc-per-page-label">
          Show
          <select
            id="cmcc-per-page-select"
            name="cmcc-per-page-select"
            value={String(perPage)}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="cmcc-per-page-select"
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
