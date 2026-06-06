import React from 'react'

// Define the types for our queue item
export interface QueueItem {
  id: string
  contentType: string
  originalId: string | number
  status: 'pending' | 'spam' | 'flagged'
  spamScore: number
  authorId: string | number
  dateGmt: string // ISO date string
  title: string
  excerpt: string
  // Additional fields for UI
  typeIcon: string // emoji or icon name
  statusLabel: string
  statusColor: string
}

// Define the props for our QueueTable component
export interface QueueTableProps {
  items: QueueItem[]
  onBulkAction: (actionType: string, selectedIds: string[]) => void
  onItemAction: (actionType: string, itemId: string) => void
  filters: {
    contentType: string
    status: string
    dateRange: string
    search: string
  }
  onFilterChange: (
    newFilters: Partial<{
      contentType: string
      status: string
      dateRange: string
      search: string
    }>,
  ) => void
  isLoading?: boolean
  totalCount?: number
  // Theme context would be used here, but for simplicity we'll pass theme as prop
  // In a real implementation, we'd use React Context for theme
  theme?: Record<string, unknown>
}

// Content type icons mapping
const CONTENT_TYPE_ICONS: Record<string, string> = {
  comment: '💬',
  post: '📝',
  page: '📄',
  media: '🖼️',
  user: '👤',
  form_entry: '📋',
  woocommerce_review: '🛒',
  bbpress_topic: '💬',
  bbpress_reply: '💬',
  buddypress_activity: '👥',
  buddypress_group_post: '👥',
  default: '📄',
}

// Status labels and colors
const STATUS_CONFIG: Record<
  'pending' | 'spam' | 'flagged',
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: '#ffc107' }, // yellow
  spam: { label: 'Spam', color: '#dc3545' }, // red
  flagged: { label: 'Flagged', color: '#fd7e14' }, // orange
}

// Helper to get content type icon
const getContentTypeIcon = (contentType: string): string => {
  const lowerContentType = contentType.toLowerCase()
  if (lowerContentType in CONTENT_TYPE_ICONS) {
    return (
      CONTENT_TYPE_ICONS[lowerContentType] ??
      CONTENT_TYPE_ICONS['default'] ??
      '📄'
    )
  }
  return CONTENT_TYPE_ICONS['default'] ?? '📄'
}

// Helper to get status config
const getStatusConfig = (status: string): { label: string; color: string } => {
  const lowerStatus = status.toLowerCase() as 'pending' | 'spam' | 'flagged'
  if (lowerStatus in STATUS_CONFIG) {
    return (
      STATUS_CONFIG[lowerStatus] ??
      STATUS_CONFIG['pending'] ?? { label: 'Pending', color: '#ffc107' }
    )
  }
  return STATUS_CONFIG['pending'] ?? { label: 'Pending', color: '#ffc107' }
}

export const QueueTable: React.FC<QueueTableProps> = ({
  items,
  onBulkAction,
  onItemAction,
  filters,
  onFilterChange: _onFilterChange,
  isLoading = false,
  totalCount = 0,
  theme: _theme = {},
}) => {
  // Handle bulk action change
  const handleBulkActionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const actionType = e.target.value
    if (actionType) {
      // In a real implementation, we'd get selected IDs from state
      // For now, we'll just call the action with empty array - this would be handled by parent
      onBulkAction(actionType, [])
      // Reset dropdown after action
      e.target.value = ''
    }
  }

  // Handle item action
  const handleItemAction = (actionType: string, itemId: string): void => {
    onItemAction(actionType, itemId)
  }

  // Get filtered and sorted items (in a real app, this would be done by parent or with useMemo)
  const filteredItems = items.filter((item: QueueItem): boolean => {
    const matchesContentType =
      filters.contentType === 'all' ||
      item.contentType.toLowerCase() === filters.contentType.toLowerCase()

    const matchesStatus =
      filters.status === 'all' ||
      item.status.toLowerCase() === filters.status.toLowerCase()

    // Simplified date range and search - would be more complex in reality
    const matchesDateRange = true // Placeholder
    const matchesSearch =
      !filters.search ||
      item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(filters.search.toLowerCase())

    return (
      matchesContentType && matchesStatus && matchesDateRange && matchesSearch
    )
  })

  return (
    <div className="cmcc-queue-table">
      {/* Table Header */}
      <div className="cmcc-queue-header">
        <div className="cmcc-queue-filters">
          {/* In a real implementation, these would be actual filter controls */}
          <span>Content Type: {filters.contentType}</span>
          <span>Status: {filters.status}</span>
          <span>Search: {filters.search}</span>
        </div>
        <div className="cmcc-queue-bulk-actions">
          <select onChange={handleBulkActionChange}>
            <option value="">Bulk Actions</option>
            <option value="approve-all">Approve All</option>
            <option value="move-to-trash">Move to Trash</option>
            <option value="mark-as-spam">Mark as Spam</option>
            <option value="deactivate-users">Deactivate User Accounts</option>
            <option value="export-csv">Export to CSV</option>
          </select>
          <button
            onClick={() => {
              /* Apply would be handled by onChange in this simple version */
            }}
          >
            Apply
          </button>
          <button
            onClick={() => {
              /* Refresh handler */
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="cmcc-queue-loading">Loading queue items...</div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && totalCount === 0 && (
        <div className="cmcc-queue-empty">
          No items match your filters. Try adjusting your criteria.
        </div>
      )}

      {/* Table */}
      {!isLoading && filteredItems.length > 0 && (
        <table className="cmcc-queue-table-inner">
          <thead>
            <tr>
              <th className="cmcc-queue-col-checkbox">
                <input type="checkbox" />
              </th>
              <th className="cmcc-queue-col-type">Type</th>
              <th className="cmcc-queue-col-title">Title / Excerpt</th>
              <th className="cmcc-queue-col-author">Author</th>
              <th className="cmcc-queue-col-date">Date</th>
              <th className="cmcc-queue-col-status">Status</th>
              <th className="cmcc-queue-col-spam-score">Spam Score</th>
              <th className="cmcc-queue-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item: QueueItem) => (
              <tr key={item.id} className="cmcc-queue-row">
                <td className="cmcc-queue-col-checkbox">
                  <input type="checkbox" />
                </td>
                <td className="cmcc-queue-col-type">
                  <span>{getContentTypeIcon(item.contentType)}</span>
                </td>
                <td className="cmcc-queue-col-title">
                  <div className="cmcc-queue-title">{item.title}</div>
                  <div className="cmcc-queue-excerpt">{item.excerpt}</div>
                </td>
                <td className="cmcc-queue-col-author">
                  {/* In a real implementation, we'd show avatar and name */}
                  <span>Author {item.authorId}</span>
                </td>
                <td className="cmcc-queue-col-date">
                  <span>{new Date(item.dateGmt).toLocaleString()}</span>
                </td>
                <td className="cmcc-queue-col-status">
                  <span
                    style={{
                      backgroundColor: getStatusConfig(item.status).color,
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '0.8em',
                    }}
                  >
                    {getStatusConfig(item.status).label}
                  </span>
                </td>
                <td className="cmcc-queue-col-spam-score">
                  <span>{item.spamScore.toFixed(1)}</span>
                </td>
                <td className="cmcc-queue-col-actions">
                  <div className="cmcc-queue-action-group">
                    <button
                      onClick={() => handleItemAction('approve', item.id)}
                      className="cmcc-queue-action-btn approve"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleItemAction('reject', item.id)}
                      className="cmcc-queue-action-btn reject"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleItemAction('spam', item.id)}
                      className="cmcc-queue-action-btn spam"
                    >
                      Spam
                    </button>
                    <button
                      onClick={() => handleItemAction('defer', item.id)}
                      className="cmcc-queue-action-btn defer"
                    >
                      Defer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination would go here in a full implementation */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="cmcc-queue-pagination">
          <span>
            Showing {filteredItems.length} of {totalCount} items
          </span>
          {/* Previous/Next buttons would go here */}
        </div>
      )}
    </div>
  )
}

// Default export
export default QueueTable
