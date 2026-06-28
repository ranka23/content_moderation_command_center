import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Pagination } from '../ui/Pagination'
import { useColumnResize } from '../ui/Table'
import { SkeletonTable } from '../common/SkeletonTable'
import { Icon } from '../../lib/icons'

// ─── Types ──────────────────────────────────────────────────────────────────

export type QueueItemStatus =
  | 'pending'
  | 'spam'
  | 'flagged'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'deactivated'

export interface QueueItem {
  id: string
  contentType: string
  originalId: string | number
  status: QueueItemStatus
  spamScore: number
  authorId: string | number
  authorName: string
  dateGmt: string
  title: string
  excerpt: string
  typeIcon: string
  statusLabel: string
  statusColor: string
}

export interface QueueFilters {
  contentType: string
  status: string
  dateRange: string
  search: string
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface QueueTableProps {
  items: QueueItem[]
  onBulkAction: (actionType: string, selectedIds: string[]) => void
  onItemAction: (actionType: string, itemId: string) => void
  filters: QueueFilters
  onFilterChange: (newFilters: Partial<QueueFilters>) => void
  isLoading?: boolean
  totalCount?: number
  /** Called when user wants to read full item content */
  onReadItem?: (item: QueueItem) => void
  /** Called when user clicks a column header to sort */
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  /** Pagination props */
  page?: number
  onPageChange?: (page: number) => void
  perPage?: number
  onPerPageChange?: (perPage: number) => void
  /** Search */
  onSearch?: (query: string) => void
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark'
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_ALIASES: Record<string, QueueItemStatus> = {
  pending: 'pending',
  spam: 'spam',
  flagged: 'flagged',
  approved: 'approved',
  rejected: 'rejected',
  deferred: 'deferred',
  deactivated: 'deactivated',
  // WordPress / platform-specific aliases
  hold: 'pending',
  'in-moderation': 'flagged',
  approve: 'approved',
  publish: 'approved',
  trash: 'rejected',
  'in-trash': 'rejected',
  unapprove: 'pending',
  'pending-review': 'pending',
  // Numeric statuses
  '0': 'pending',
  '1': 'approved',
  '-1': 'rejected',
}

const CONTENT_TYPE_ICONS: Record<string, string> = {
  comment: 'comment',
  post: 'post',
  page: 'page',
  media: 'media',
  user: 'user',
  form_entry: 'form_entry',
  woocommerce_review: 'woocommerce_review',
  bbpress_topic: 'comment',
  bbpress_reply: 'comment',
  buddypress_activity: 'user',
  buddypress_group_post: 'user',
  default: 'page',
}

const STATUS_CONFIG: Record<QueueItemStatus, { label: string; color: string }> =
  {
    pending: { label: 'Pending', color: '#f59e0b' },
    spam: { label: 'Spam', color: '#ef4444' },
    flagged: { label: 'Flagged', color: '#f97316' },
    approved: { label: 'Approved', color: '#22c55e' },
    rejected: { label: 'Rejected', color: '#6b7280' },
    deferred: { label: 'Deferred', color: '#06b6d4' },
    deactivated: { label: 'Deactivated', color: '#374151' },
  }

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

const getContentTypeIcon = (contentType: string): string => {
  const lower = contentType.toLowerCase()
  return CONTENT_TYPE_ICONS[lower] ?? CONTENT_TYPE_ICONS['default'] ?? 'page'
}

const getStatusConfig = (status: string): { label: string; color: string } => {
  const canonical = STATUS_ALIASES[status.toLowerCase()] ?? 'pending'
  return STATUS_CONFIG[canonical] ?? { label: 'Pending', color: '#f59e0b' }
}

// ─── Column definitions ─────────────────────────────────────────────────────

interface ColumnDef {
  key: string
  label: string
  sortable: boolean
  width?: string
  minWidth?: string
  align?: 'left' | 'center' | 'right'
}

const COLUMNS: ColumnDef[] = [
  { key: 'checkbox', label: '', sortable: false, width: '44px' },
  { key: 'contentType', label: 'Type', sortable: true, width: '80px' },
  { key: 'title', label: 'Title / Excerpt', sortable: true },
  { key: 'authorId', label: 'Author', sortable: true, width: '140px' },
  { key: 'dateGmt', label: 'Date', sortable: true, width: '160px' },
  { key: 'status', label: 'Status', sortable: true, width: '110px' },
  { key: 'spamScore', label: 'Spam Score', sortable: true, width: '110px' },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    minWidth: '240px',
    width: '260px',
  },
]

// ─── QueueTable Component ───────────────────────────────────────────────────

export const QueueTable: React.FC<QueueTableProps> = ({
  items,
  onBulkAction,
  onItemAction,
  filters,
  onFilterChange,
  onReadItem,
  onSort,
  sortField,
  sortDirection = 'asc',
  isLoading = false,
  totalCount = 0,
  page = 1,
  onPageChange,
  perPage = 25,
  onPerPageChange,
  onSearch,
  theme = 'light',
}) => {
  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [changedItems, setChangedItems] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState(filters.search || '')

  // Column resize state
  const initialWidths: Record<string, string> = {}
  for (const col of COLUMNS) {
    if (col.width) {
      initialWidths[col.key] = col.width
    }
  }
  const [colWidths, getResizeHandlers] = useColumnResize(initialWidths)
  const headerRefs = useRef<Record<string, HTMLTableCellElement | null>>({})

  // ── Bulk select logic ───────────────────────────────────────────────────
  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [allSelected, items])

  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ── Handle item action with visual feedback ────────────────────────────
  const handleItemAction = useCallback(
    (actionType: string, itemId: string) => {
      onItemAction(actionType, itemId)
      // Add to changed set for visual feedback
      setChangedItems((prev) => new Set(prev).add(itemId))
      // Remove from selection
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      // Clear visual feedback after animation
      setTimeout(() => {
        setChangedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }, 2000)
    },
    [onItemAction],
  )

  // ── Handle bulk action ─────────────────────────────────────────────────
  const [bulkAction, setBulkAction] = useState('')

  const handleBulkActionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setBulkAction(e.target.value)
    },
    [],
  )

  const handleApplyBulkAction = useCallback(() => {
    if (bulkAction && selectedIds.size > 0) {
      onBulkAction(bulkAction, Array.from(selectedIds))
      setBulkAction('')
      setSelectedIds(new Set())
    }
  }, [bulkAction, selectedIds, onBulkAction])

  // ── Refresh ─────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    onPageChange?.(1)
  }, [onPageChange])

  // ── Handle column sort ─────────────────────────────────────────────────
  const handleSort = useCallback(
    (field: string) => {
      if (!onSort) return
      if (sortField === field) {
        onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        onSort(field, 'asc')
      }
    },
    [onSort, sortField, sortDirection],
  )

  // ── Handle search ──────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchInput(value)
    },
    [],
  )

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(searchInput)
      }
    },
    [onSearch, searchInput],
  )

  const handleSearchSubmit = useCallback(() => {
    if (onSearch) {
      onSearch(searchInput)
    }
  }, [onSearch, searchInput])

  // ── Filters ────────────────────────────────────────────────────────────
  const handleFilterChange = useCallback(
    (key: keyof QueueFilters, value: string) => {
      onFilterChange({ [key]: value })
    },
    [onFilterChange],
  )

  // ── Client-side sorting for current page ───────────────────────────────
  const sortedItems = useMemo(() => {
    if (!sortField) return items
    return [...items].sort((a, b) => {
      const aVal = String(a[sortField as keyof QueueItem] ?? '')
      const bVal = String(b[sortField as keyof QueueItem] ?? '')
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [items, sortField, sortDirection])

  // ── Filter status options for dropdown ─────────────────────────────────
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
    })),
  ]

  const contentTypeOptions = useMemo(() => {
    const types = new Set(items.map((i) => i.contentType))
    return [
      { value: 'all', label: 'All Types' },
      ...Array.from(types).map((t) => ({ value: t, label: t })),
    ]
  }, [items])

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`cmcc-queue-table cmcc-theme-${theme}`}>
      {/* ── Toolbar: Search + Filters + Bulk ───────────────────────────── */}
      <div className="cmcc-queue-toolbar">
        <div className="cmcc-queue-toolbar-left">
          {/* Search */}
          <div className="tw-flex tw-items-center tw-gap-2">
            <Input
              type="text"
              id="cmcc-queue-search"
              name="cmcc-queue-search"
              placeholder="Search titles & excerpts..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="tw-w-64"
              aria-label="Search queue items"
            />
            <Button variant="secondary" size="sm" onClick={handleSearchSubmit}>
              <Icon name="search" size={14} className="tw-inline tw-mr-1" />{' '}
              Search
            </Button>
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('')
                  onSearch?.('')
                }}
              >
                <Icon name="close" size={16} />
              </Button>
            )}
          </div>

          {/* Status filter */}
          <Select
            id="cmcc-filter-status"
            name="cmcc-filter-status"
            className="tw-w-36"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={statusOptions}
            aria-label="Filter by status"
          />

          {/* Content type filter */}
          <Select
            id="cmcc-filter-content-type"
            name="cmcc-filter-content-type"
            className="tw-w-40"
            value={filters.contentType}
            onChange={(e) => handleFilterChange('contentType', e.target.value)}
            options={contentTypeOptions}
            aria-label="Filter by content type"
          />

          {/* Date range filter */}
          <Select
            id="cmcc-filter-date-range"
            name="cmcc-filter-date-range"
            className="tw-w-36"
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            aria-label="Filter by date range"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </Select>
        </div>

        <div className="tw-flex tw-items-center tw-gap-2">
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            title="Refresh queue"
            className="tw-text-gray-500"
          >
            <Icon name="refresh" size={16} />
          </Button>
          {/* Bulk actions */}
          <Select
            id="cmcc-bulk-action"
            name="cmcc-bulk-action"
            value={bulkAction}
            onChange={handleBulkActionChange}
            disabled={selectedIds.size === 0}
            className="tw-w-52"
            aria-label="Bulk actions"
          >
            <option value="">
              {selectedIds.size > 0
                ? `Bulk (${selectedIds.size} selected)`
                : 'Bulk Actions'}
            </option>
            <option value="approve-all">
              <>
                <Icon name="approve" size={14} className="tw-inline tw-mr-1" />{' '}
                Approve Selected
              </>
            </option>
            <option value="move-to-trash">
              <>
                <Icon name="reject" size={14} className="tw-inline tw-mr-1" />{' '}
                Reject Selected
              </>
            </option>
            <option value="mark-as-spam">
              <>
                <Icon name="spam" size={14} className="tw-inline tw-mr-1" />{' '}
                Mark Selected as Spam
              </>
            </option>
            <option value="deactivate-users">Deactivate User Accounts</option>
            <option value="export-csv">
              <Icon name="download" size={14} /> Export Selected as CSV
            </option>
          </Select>
          <Button
            variant="default"
            size="sm"
            onClick={handleApplyBulkAction}
            disabled={!bulkAction || selectedIds.size === 0}
          >
            Apply
          </Button>
        </div>
      </div>

      {/* ── Loading Skeleton ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="cmcc-queue-loading-overlay">
          <div className="tw-text-center tw-py-2 tw-text-sm tw-text-gray-500">
            Loading...
          </div>
          <SkeletonTable rows={5} columns={COLUMNS.length} />
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="cmcc-queue-table-wrapper">
        <table
          className="cmcc-queue-table-inner"
          style={{ tableLayout: 'auto', width: '100%' }}
        >
          <thead>
            <tr>
              {/* Checkbox column */}
              <th
                className="cmcc-th-checkbox"
                style={{ width: COLUMNS[0]?.width ?? '40px' }}
              >
                <label className="cmcc-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all items"
                  />
                  <span className="cmcc-checkbox-custom" />
                </label>
              </th>
              {/* Data columns */}
              {COLUMNS.slice(1).map((col) => {
                const colStyle: React.CSSProperties = {
                  width: colWidths[col.key] ?? col.width ?? undefined,
                  minWidth: col.minWidth ?? undefined,
                }
                const width = colWidths[col.key] ?? col.width
                if (width) {
                  colStyle.width = width
                }
                if (col.minWidth) {
                  colStyle.minWidth = col.minWidth
                }
                const handlers = getResizeHandlers(col.key)
                const isSorted = sortField === col.key
                const sortDir = isSorted ? sortDirection : undefined

                return (
                  <th
                    key={col.key}
                    ref={(el) => {
                      headerRefs.current[col.key] = el
                    }}
                    className={`cmcc-th-${col.key} ${col.sortable ? 'cmcc-th-sortable' : ''}`}
                    style={
                      Object.keys(colStyle).length > 0 ? colStyle : undefined
                    }
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="cmcc-th-content">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="cmcc-sort-icons">
                          <span
                            className={
                              isSorted && sortDir === 'asc'
                                ? 'cmcc-sort-active'
                                : ''
                            }
                          >
                            ▲
                          </span>
                          <span
                            className={
                              isSorted && sortDir === 'desc'
                                ? 'cmcc-sort-active'
                                : ''
                            }
                          >
                            ▼
                          </span>
                        </span>
                      )}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="cmcc-col-resize-handle"
                      onMouseDown={handlers.onMouseDown}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && !isLoading && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="cmcc-empty-row">
                  <div className="cmcc-empty-state">
                    <span className="cmcc-empty-icon">
                      <Icon name="queue" size={24} />
                    </span>
                    <p>No items match your filters.</p>
                    <p className="cmcc-empty-hint">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {sortedItems.map((item) => {
              const statusCfg = getStatusConfig(item.status)
              const isChanged = changedItems.has(item.id)
              const isSelected = selectedIds.has(item.id)
              const authorName = item.authorName || String(item.authorId)

              // Determine which action buttons to show
              // Only hide the button that matches the current status;
              // show all other buttons so moderators can re-classify items.
              // If status is 'deactivated', hide all buttons.
              const isDeactivated = item.status === 'deactivated'
              const showApprove = item.status !== 'approved' && !isDeactivated
              const showReject = item.status !== 'rejected' && !isDeactivated
              const showSpam = item.status !== 'spam' && !isDeactivated
              const showDefer = item.status !== 'deferred' && !isDeactivated

              return (
                <tr
                  key={item.id}
                  className={`cmcc-queue-row ${isSelected ? 'cmcc-row-selected' : ''} ${isChanged ? 'cmcc-row-changed' : ''}`}
                >
                  <td className="cmcc-td-checkbox">
                    <label className="cmcc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                      />
                      <span className="cmcc-checkbox-custom" />
                    </label>
                  </td>
                  <td className="cmcc-td-type" title={item.contentType}>
                    <span className="cmcc-type-icon">
                      <Icon
                        name={getContentTypeIcon(item.contentType)}
                        size={16}
                      />
                    </span>
                  </td>
                  <td
                    className="cmcc-td-title"
                    onClick={() => {
                      onReadItem?.(item)
                    }}
                  >
                    <div className="cmcc-item-title">
                      {item.title || 'Untitled'}
                    </div>
                    <div className="cmcc-item-excerpt">
                      {item.excerpt || ''}
                    </div>
                  </td>
                  <td className="cmcc-td-author">
                    <div className="cmcc-author-name">{authorName}</div>
                    <div className="cmcc-author-id">ID: {item.authorId}</div>
                  </td>
                  <td className="cmcc-td-date">
                    {new Date(item.dateGmt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="cmcc-td-status">
                    <Badge
                      variant={
                        item.status === 'spam'
                          ? 'destructive'
                          : item.status === 'pending'
                            ? 'warning'
                            : item.status === 'flagged'
                              ? 'warning'
                              : item.status === 'approved'
                                ? 'success'
                                : 'secondary'
                      }
                    >
                      {statusCfg.label}
                    </Badge>
                  </td>
                  <td className="cmcc-td-score">
                    <div className="cmcc-score-bar-container">
                      <div
                        className="cmcc-score-bar"
                        style={{
                          width: `${Math.min(item.spamScore * 100, 100)}%`,
                          backgroundColor:
                            item.spamScore > 0.7
                              ? '#ef4444'
                              : item.spamScore > 0.4
                                ? '#f97316'
                                : '#22c55e',
                        }}
                      />
                    </div>
                    <span className="cmcc-score-text">
                      {item.spamScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="cmcc-td-actions">
                    <div className="tw-flex tw-items-center tw-gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onReadItem?.(item)
                        }}
                        title="View details"
                        className="tw-text-xs"
                      >
                        <Icon name="view-details" size={16} />
                      </Button>
                      {showApprove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleItemAction('approve', item.id)}
                          title="Approve"
                          className="tw-text-green-600 hover:tw-bg-green-50"
                        >
                          <Icon name="approve" size={16} />
                        </Button>
                      )}
                      {showReject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleItemAction('reject', item.id)}
                          title="Reject"
                          className="tw-text-red-600 hover:tw-bg-red-50"
                        >
                          <Icon name="reject" size={16} />
                        </Button>
                      )}
                      {showSpam && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleItemAction('spam', item.id)}
                          title="Mark as Spam"
                          className="tw-text-amber-600 hover:tw-bg-amber-50"
                        >
                          <Icon name="spam" size={16} />
                        </Button>
                      )}
                      {showDefer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleItemAction('defer', item.id)}
                          title="Defer"
                          className="tw-text-cyan-600 hover:tw-bg-cyan-50"
                        >
                          <Icon name="defer" size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── MUI Table Pagination ──────────────────────────────────── */}
      <div className="cmcc-table-pagination">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => onPageChange?.(p)}
        />

        <div className="cmcc-table-pagination-right">
          <span className="cmcc-pagination-info">
            {totalCount > 0
              ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalCount)} of ${totalCount} items`
              : 'No items'}
          </span>
          <span className="cmcc-pagination-separator">|</span>
          <label className="cmcc-pagination-rows-label">
            Show
            <select
              id="cmcc-per-page"
              name="cmcc-per-page"
              value={String(perPage)}
              onChange={(e) => onPerPageChange?.(Number(e.target.value))}
              className="cmcc-pagination-rows-select"
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
      </div>
    </div>
  )
}

export default QueueTable
