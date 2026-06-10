import React from 'react'
import { SlideOutPanel, ModerationNotes, SkeletonTable } from '@cmcc/ui'

/**
 * @typedef {object} DetailItem
 * @property {string} _id - Item ID
 * @property {string} [title] - Item title
 * @property {string} [status] - Moderation status
 * @property {string} [contentType] - Content type
 * @property {string} [authorName] - Author name
 * @property {string} [createdAt] - Creation timestamp
 */

/**
 * ItemDetailPanel — A slide-out panel showing item history, notes,
 * and assignment controls for a single queue item.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the panel is visible
 * @param {DetailItem|null} props.item - The selected queue item
 * @param {Array} props.history - Activity history for the item
 * @param {boolean} props.historyLoading - Whether history is loading
 * @param {Array} props.notes - Notes for the item
 * @param {boolean} props.notesLoading - Whether notes are loading
 * @param {object|null} props.assignment - Current assignment, if any
 * @param {(content:string, isInternal:boolean, type:string) => void} props.onAddNote - Callback to add a note
 * @param {(assignee:string, dueDate:string, priority:string) => void} props.onAssign - Callback to assign item
 * @param {() => void} props.onClose - Close panel callback
 * @returns {React.ReactElement|null}
 */
export function ItemDetailPanel({
  open,
  item,
  history = [],
  historyLoading = false,
  notes = [],
  notesLoading = false,
  assignment = null,
  onAddNote,
  _onAssign,
  onClose,
}) {
  if (!open || !item) return null

  /** Format a date string for display. */
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  /** Get status class for styling. */
  const statusClass = (status) => {
    const map = {
      pending: 'cmcc-trust-neutral',
      approved: 'cmcc-trust-trusted',
      rejected: 'cmcc-trust-low',
      spam: 'cmcc-trust-low',
      flagged: 'cmcc-trust-neutral',
      deferred: 'cmcc-trust-neutral',
    }
    return map[status] || 'cmcc-trust-neutral'
  }

  return (
    <SlideOutPanel
      open={open}
      onClose={onClose}
      title={item.title || 'Item Details'}
      side="right"
    >
      {/* Item Info */}
      <div className="cmcc-card" style={{ marginBottom: 12 }}>
        <div className="cmcc-card-body">
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
            <strong>ID:</strong> {item._id || 'N/A'}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
            <strong>Type:</strong> {item.contentType || 'N/A'}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
            <strong>Author:</strong> {item.authorName || 'N/A'}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
            <strong>Status:</strong>{' '}
            <span className={`cmcc-trust-badge ${statusClass(item.status)}`}>
              {item.status || 'unknown'}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            <strong>Created:</strong> {formatDate(item.createdAt)}
          </p>
        </div>
      </div>

      {/* Assignment Controls */}
      <div className="cmcc-card" style={{ marginBottom: 12 }}>
        <div className="cmcc-card-body">
          <h4
            style={{
              margin: '0 0 8px',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
            }}
          >
            {'\u{1F3AF}'} Assignment
          </h4>
          {assignment ? (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>
                Assigned to:{' '}
                <strong>
                  {assignment.assigneeId || assignment.teamId || 'Unassigned'}
                </strong>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                Priority: <strong>{assignment.priority || 'normal'}</strong>
                {' | '}Status: <strong>{assignment.status || 'pending'}</strong>
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              Not assigned yet.
            </p>
          )}
        </div>
      </div>

      {/* Activity History */}
      <div className="cmcc-card" style={{ marginBottom: 12 }}>
        <div className="cmcc-card-body">
          <h4
            style={{
              margin: '0 0 8px',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
            }}
          >
            {'\u{1F4CB}'} History
          </h4>
          {historyLoading ? (
            <SkeletonTable rows={3} columns={2} />
          ) : history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              No history recorded yet.
            </p>
          ) : (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {history.map((entry, i) => (
                <li
                  key={entry._id || i}
                  style={{
                    padding: '6px 0',
                    borderBottom:
                      i < history.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: 12,
                    color: '#6b7280',
                  }}
                >
                  <strong>{entry.action || 'action'}</strong>
                  {entry.description && ` \u2014 ${entry.description}`}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {formatDate(entry.createdAt || entry.timestamp)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Collaboration Notes */}
      <div className="cmcc-card">
        <div className="cmcc-card-body">
          <ModerationNotes
            notes={notes}
            onAddNote={onAddNote}
            canAdd={true}
            isLoading={notesLoading}
          />
        </div>
      </div>
    </SlideOutPanel>
  )
}

export default ItemDetailPanel
