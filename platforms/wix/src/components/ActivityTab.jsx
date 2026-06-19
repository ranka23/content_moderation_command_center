import React from 'react'
import { filterActivityLog } from '@cmcc/core'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit3,
  Flag,
  XCircle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// ActionIcon – small helper component
// ---------------------------------------------------------------------------

function ActionIcon({ action }) {
  switch (action) {
    case 'approved':
      return <CheckCircle size={14} color="#16a34a" />
    case 'rejected':
    case 'trashed':
      return <XCircle size={14} color="#dc2626" />
    case 'spammed':
      return <Clock size={14} color="#f59e0b" />
    case 'flagged':
      return <Flag size={14} color="#f97316" />
    case 'deferred':
      return <Clock size={14} color="#3b82f6" />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// ActivityTab Component
// ---------------------------------------------------------------------------

export function ActivityTab({
  activityEntries,
  activityLoading,
  activityError,
  activityFilters,
  setActivityFilters,
  onRetry,
}) {
  // ---- Render helpers ----

  function renderLoading(message) {
    return <div className="cmcc-loading">{message}</div>
  }

  function renderEmpty(icon, text, sub) {
    return (
      <div className="cmcc-empty">
        <div className="cmcc-empty-icon">{icon}</div>
        <p className="cmcc-empty-text">{text}</p>
        {sub && <p className="cmcc-empty-sub">{sub}</p>}
      </div>
    )
  }

  function renderError(icon, text, detail) {
    return (
      <div className="cmcc-error">
        <div className="cmcc-error-icon">{icon}</div>
        <p className="cmcc-error-text">{text}</p>
        {detail && <p className="cmcc-error-detail">{detail}</p>}
        {onRetry && (
          <button
            className="cmcc-btn-secondary"
            onClick={onRetry}
            style={{ marginTop: 12 }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // ---- Derived state ----

  const filtered = filterActivityLog(activityEntries, activityFilters)
  const hasMore = filtered.length > 50
  const visibleEntries = filtered.slice(0, 50)

  // ---- Render ----

  return (
    <div>
      <div className="cmcc-activity-filters">
        <select
          value={activityFilters.action}
          onChange={(e) =>
            setActivityFilters((prev) => ({
              ...prev,
              action: e.target.value,
            }))
          }
        >
          <option value="">All actions</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="spammed">Spammed</option>
          <option value="flagged">Flagged</option>
          <option value="deferred">Deferred</option>
        </select>
        <select
          value={activityFilters.contentType}
          onChange={(e) =>
            setActivityFilters((prev) => ({
              ...prev,
              contentType: e.target.value,
            }))
          }
        >
          <option value="">All types</option>
          <option value="comment">Comment</option>
          <option value="post">Post</option>
          <option value="user">User</option>
        </select>
        <input
          type="text"
          placeholder="Search entries..."
          value={activityFilters.search}
          onChange={(e) =>
            setActivityFilters((prev) => ({
              ...prev,
              search: e.target.value,
            }))
          }
        />
      </div>

      {activityLoading && renderLoading('Loading activity log...')}

      {activityError &&
        renderError(
          <AlertTriangle size={16} />,
          'Failed to load activity log',
          activityError,
        )}

      {!activityLoading &&
        !activityError &&
        visibleEntries.length === 0 &&
        renderEmpty(
          <Edit3 size={24} />,
          'No activity entries',
          'Moderation actions will appear here.',
        )}

      {!activityLoading && visibleEntries.length > 0 && (
        <ul className="cmcc-activity-list">
          {visibleEntries.map((entry) => (
            <li key={entry.id} className="cmcc-activity-item">
              <span className="cmcc-activity-icon">
                <ActionIcon action={entry.action} />
              </span>
              <div className="cmcc-activity-body">
                <p className="cmcc-activity-action">
                  <strong>
                    {entry.moderatorName || `Mod #${entry.moderatorId}`}
                  </strong>{' '}
                  {entry.action}{' '}
                  <em>
                    {entry.itemTitle || `${entry.contentType} #${entry.itemId}`}
                  </em>
                  {entry.previousStatus &&
                    entry.newStatus &&
                    '(' + entry.previousStatus + ' -> ' + entry.newStatus + ')'}
                </p>
                <p className="cmcc-activity-time">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Showing 50 of {filtered.length} entries
          </span>
        </div>
      )}
    </div>
  )
}
