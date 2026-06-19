import React, { useEffect, startTransition } from 'react'
import { Button, Table, SkeletonTable, EmptyState, Pagination } from '@cmcc/ui'
import { RefreshCw } from 'lucide-react'

const LOG_PER_PAGE_OPTIONS = [10, 25, 50, 100]

/**
 * Activity log tab page.
 * Renders a paginated table of moderation actions with per-page controls
 * and a refresh button.
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
      {/* Header with Refresh */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
        <h2 className="tw-text-lg tw-font-semibold tw-m-0">Activity Log</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchActivityLog(logPage)}
        >
          <RefreshCw size={14} className="tw-inline tw-mr-1" /> Refresh
        </Button>
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
        data={logEntries}
        rowKey={(row) => row.id}
      />

      {/* Pagination */}
      <div className="tw-flex tw-items-center tw-justify-between tw-py-4 tw-px-2">
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-text-sm tw-text-gray-500">
            {logTotal > 0
              ? `${(logPage - 1) * logPerPage + 1}\u2013${Math.min(logPage * logPerPage, logTotal)} of ${logTotal} items`
              : 'No items'}
          </span>
          <span className="tw-text-gray-300">|</span>
          <label className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-gray-500">
            Show
            <select
              value={String(logPerPage)}
              onChange={(e) => {
                setLogPerPage(Number(e.target.value))
                setLogPage(1)
              }}
              className="tw-w-16 tw-h-8 tw-text-xs tw-border tw-border-gray-300 tw-rounded tw-px-1"
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
