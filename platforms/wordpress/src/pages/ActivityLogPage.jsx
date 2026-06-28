import React, {
  useEffect,
  startTransition,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { Button, Table, SkeletonTable, EmptyState, Pagination } from '@cmcc/ui'
import { RefreshCw, Calendar } from 'lucide-react'
import { DateRangePicker } from '../components/DateRangePicker'

const LOG_PER_PAGE_OPTIONS = [10, 25, 50, 100]

/**
 * Activity log tab page.
 * Renders a paginated table of moderation actions with per-page controls,
 * date range filtering, and a refresh button. Consistent with Settings tab.
 */
export default function ActivityLogPage({ activityLog }) {
  const {
    activityLog: logEntries,
    logPage,
    setLogPage,
    logPerPage,
    setLogPerPage,
    logTotal,
    isLogLoading,
    fetchActivityLog,
  } = activityLog

  // ── Date range filter ────────────────────────────────────────────────
  const [logDateRange, setLogDateRange] = useState(null)
  const handleLogRangeChange = useCallback(
    (range) => {
      setLogDateRange(range)
      setLogPage(1)
      fetchActivityLog(1, range)
    },
    [fetchActivityLog, setLogPage],
  )

  // ── Sort state ──────────────────────────────────────────────────────
  const [logSortField, setLogSortField] = useState(null)
  const [logSortDir, setLogSortDir] = useState('asc')

  const handleLogSort = (field) => {
    if (logSortField === field) {
      setLogSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setLogSortField(field)
      setLogSortDir('asc')
    }
  }

  // ── Sort log entries locally ────────────────────────────────────────
  const sortedLogEntries = useMemo(() => {
    if (!logSortField) return logEntries
    return [...logEntries].sort((a, b) => {
      const aVal = a[logSortField]
      const bVal = b[logSortField]
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
          numeric: true,
        })
      }
      return logSortDir === 'asc' ? cmp : -cmp
    })
  }, [logEntries, logSortField, logSortDir])

  // Reload on per-page change
  useEffect(() => {
    startTransition(() => {
      fetchActivityLog(logPage)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPerPage])

  // ── Action badges ──────────────────────────────────────────────────
  const actionLabels = {
    approve: 'Approved',
    reject: 'Rejected',
    spam: 'Marked as Spam',
    defer: 'Deferred',
    flag: 'Flagged',
    'deactivate-users': 'Deactivated User',
    marked_as_spam: 'Marked as Spam',
    trashed: 'Trashed',
    deleted: 'Deleted',
    unapprove: 'Unapproved',
    untrash: 'Restored from trash',
    'activate-user': 'User Activated',
    'deactivate-user': 'User Deactivated',
  }
  const actionColors = {
    approve: 'tw-text-green-600 tw-bg-green-50',
    reject: 'tw-text-red-600 tw-bg-red-50',
    spam: 'tw-text-amber-600 tw-bg-amber-50',
    defer: 'tw-text-cyan-600 tw-bg-cyan-50',
    flag: 'tw-text-orange-600 tw-bg-orange-50',
    'deactivate-users': 'tw-text-red-700 tw-bg-red-50',
    marked_as_spam: 'tw-text-amber-600 tw-bg-amber-50',
    trashed: 'tw-text-red-600 tw-bg-red-50',
    deleted: 'tw-text-red-600 tw-bg-red-50',
    unapprove: 'tw-text-gray-600 tw-bg-gray-100',
    untrash: 'tw-text-green-600 tw-bg-green-50',
    'activate-user': 'tw-text-green-600 tw-bg-green-50',
    'deactivate-user': 'tw-text-red-700 tw-bg-red-50',
  }

  // ── Loading state (initial) ────────────────────────────────────────
  if (isLogLoading && logEntries.length === 0) {
    return (
      <div className="cmcc-tab-panel" role="tabpanel">
        <SkeletonTable rows={4} columns={7} />
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!isLogLoading && logEntries.length === 0) {
    return (
      <div className="cmcc-tab-panel" role="tabpanel">
        <EmptyState
          icon="activity"
          title="No activity recorded yet"
          description="Moderation actions will appear here as they happen."
        />
      </div>
    )
  }

  return (
    <div className="cmcc-tab-panel" role="tabpanel">
      {/* Header with Refresh + Date Range */}
      <div className="cmcc-page-header">
        <h2>Activity Log</h2>
        <div className="tw-flex tw-items-center tw-gap-3">
          <DateRangePicker
            value={logDateRange}
            onChange={handleLogRangeChange}
          />
          {logDateRange && (
            <button
              className="cmcc-text-btn cmcc-text-btn-sm"
              onClick={() => {
                setLogDateRange(null)
                setLogPage(1)
                fetchActivityLog(1)
              }}
              title="Clear date filter"
            >
              × Clear
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivityLog(logPage)}
          >
            <RefreshCw size={14} className="tw-inline tw-mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={[
          {
            key: 'timestamp',
            label: 'Date',
            sortable: true,
            align: 'left',
            cell: (row) => new Date(row.timestamp).toLocaleString(),
          },
          {
            key: 'moderator',
            label: 'Moderator',
            sortable: true,
            align: 'left',
            cell: (row) => (
              <span className="tw-font-medium">
                {row.moderator_name ||
                  row.moderator_display_name ||
                  `User #${row.moderator_id}`}
              </span>
            ),
          },
          {
            key: 'action',
            label: 'Action',
            sortable: true,
            align: 'center',
            cell: (row) => {
              // UX2 fix: prefer pre-normalized action_display from the hook,
              // fall back to local mapping or raw value
              const actionKey = row.action
              const display =
                row.action_display || actionLabels[actionKey] || actionKey
              const color =
                actionColors[actionKey] || 'tw-text-gray-600 tw-bg-gray-100'
              return (
                <span
                  className={`tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium ${color}`}
                >
                  {display}
                </span>
              )
            },
          },
          {
            key: 'content_type',
            label: 'Type',
            sortable: true,
            align: 'right',
          },
          {
            key: 'item',
            label: 'Item',
            sortable: true,
            align: 'left',
            cell: (row) => row.item_title || row.item_id,
          },
          {
            key: 'previous_status',
            label: 'Previous Status',
            sortable: true,
            align: 'right',
          },
          {
            key: 'new_status',
            label: 'New Status',
            sortable: true,
            align: 'right',
          },
          {
            key: 'notes',
            label: 'Notes',
            sortable: false,
            align: 'left',
            cell: (row) => row.notes || '-',
          },
        ]}
        data={sortedLogEntries}
        sortConfig={
          logSortField
            ? { field: logSortField, direction: logSortDir }
            : undefined
        }
        onSort={handleLogSort}
        rowKey={(row) => row.id}
      />

      {/* MUI Table Pagination */}
      <div className="cmcc-table-pagination">
        <div className="cmcc-table-pagination-left">
          <span className="cmcc-pagination-info">
            {logTotal > 0
              ? `${(logPage - 1) * logPerPage + 1}–${Math.min(logPage * logPerPage, logTotal)} of ${logTotal} items`
              : 'No items'}
          </span>
          <span className="cmcc-pagination-separator">|</span>
          <label className="cmcc-pagination-rows-label">
            Show
            <select
              id="cmcc-log-per-page"
              name="cmcc-log-per-page"
              className="cmcc-pagination-rows-select"
              value={String(logPerPage)}
              onChange={(e) => {
                setLogPerPage(Number(e.target.value))
                setLogPage(1)
              }}
            >
              {LOG_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            per page
          </label>
        </div>
        {logTotal > logPerPage && (
          <Pagination
            currentPage={logPage}
            totalPages={Math.ceil(logTotal / logPerPage)}
            onPageChange={(p) => setLogPage(p)}
          />
        )}
      </div>
    </div>
  )
}
