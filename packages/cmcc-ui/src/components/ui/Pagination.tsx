import { cn } from '../../lib/cn'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps): React.ReactElement | null {
  if (totalPages <= 1) return null

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)

      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const btnBase =
    'tw-inline-flex tw-items-center tw-justify-center tw-h-8 tw-w-8 tw-rounded-md tw-text-sm tw-transition-colors'
  const btnActive = 'tw-bg-primary-600 tw-text-white'
  const btnInactive =
    'tw-text-gray-600 hover:tw-bg-gray-100 tw-border tw-border-gray-200'

  return (
    <div
      className={cn(
        'tw-flex tw-items-center tw-justify-center tw-gap-1 tw-py-4 tw-flex-wrap',
        className,
      )}
    >
      <button
        className={`${btnBase} ${btnInactive}`}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        title="Previous page"
      >
        ‹
      </button>

      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="tw-px-1 tw-text-gray-400">
            …
          </span>
        ) : (
          <button
            key={page}
            className={`${btnBase} ${currentPage === page ? btnActive : btnInactive}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ),
      )}

      <button
        className={`${btnBase} ${btnInactive}`}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        title="Next page"
      >
        ›
      </button>
    </div>
  )
}
