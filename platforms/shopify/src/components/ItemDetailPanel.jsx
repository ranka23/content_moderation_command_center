/**
 * ItemDetailPanel - Slide-out panel showing item history, notes, and assignment controls.
 */

import React, { useState, useEffect, useCallback, startTransition } from 'react'
import {
  Card,
  Button,
  TextField,
  Spinner,
  Badge,
  Banner,
} from '@shopify/polaris'

const API_BASE = '/api/cmcc'

/**
 * @param {Object} props
 * @param {Object|null} props.item - The queue item to show details for
 * @param {Function} props.onClose - Callback when panel is closed
 */
export default function ItemDetailPanel({ item, onClose }) {
  const [history, setHistory] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const itemId = item?.id

  const fetchDetails = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    setError(null)
    try {
      const [histRes, notesRes] = await Promise.all([
        fetch(`${API_BASE}/queue/${itemId}/history`),
        fetch(`${API_BASE}/queue/${itemId}/notes`),
      ])
      if (histRes.ok) {
        const histData = await histRes.json()
        setHistory(histData.data || [])
      }
      if (notesRes.ok) {
        const notesData = await notesRes.json()
        setNotes(notesData.data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    startTransition(() => {
      fetchDetails()
    })
  }, [fetchDetails])

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`${API_BASE}/queue/${itemId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: 'current-user',
          moderatorName: 'Current Moderator',
          note: noteText.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      const data = await res.json()
      setNotes((prev) => [data.data, ...prev])
      setNoteText('')
      setToastMessage('Note added')
    } catch (err) {
      setToastMessage(err.message)
    } finally {
      setSavingNote(false)
    }
  }

  async function handleAssign() {
    if (!assignTo) return
    setAssigning(true)
    try {
      const res = await fetch(`${API_BASE}/queue/${itemId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: 'current-user',
          moderatorName: 'Current Moderator',
          assignTo,
        }),
      })
      if (!res.ok) throw new Error('Failed to assign')
      setToastMessage(`Assigned to ${assignTo}`)
    } catch (err) {
      setToastMessage(err.message)
    } finally {
      setAssigning(false)
    }
  }

  const statusBadge = (status) => {
    const mapping = {
      pending: 'warning',
      approved: 'success',
      rejected: 'critical',
      spam: 'critical',
      flagged: 'attention',
    }
    return <Badge status={mapping[status] || 'info'}>{status}</Badge>
  }

  return (
    <div className="cmcc-detail-panel-overlay" onClick={onClose}>
      <div className="cmcc-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmcc-detail-panel-header">
          <h2>Item Details</h2>
          <Button plain onClick={onClose}>
            ✕
          </Button>
        </div>

        {toastMessage && (
          <div className="cmcc-detail-toast">
            <Banner status="info" onDismiss={() => setToastMessage(null)}>
              <p>{toastMessage}</p>
            </Banner>
          </div>
        )}

        <div className="cmcc-detail-panel-body">
          {/* Item info */}
          {item && (
            <Card sectioned>
              <div className="cmcc-detail-info">
                <div className="cmcc-detail-field">
                  <span className="cmcc-detail-label">ID</span>
                  <span>{item.item_id || item.id}</span>
                </div>
                <div className="cmcc-detail-field">
                  <span className="cmcc-detail-label">Type</span>
                  <span>{item.contentType || item.content_type}</span>
                </div>
                <div className="cmcc-detail-field">
                  <span className="cmcc-detail-label">Status</span>
                  {statusBadge(item.status)}
                </div>
                <div className="cmcc-detail-field">
                  <span className="cmcc-detail-label">Author</span>
                  <span>{item.author_name || item.author || '-'}</span>
                </div>
                <div className="cmcc-detail-field">
                  <span className="cmcc-detail-label">Assigned To</span>
                  <span>{item.assigned_to || 'Unassigned'}</span>
                </div>
                {item.title && (
                  <div className="cmcc-detail-field">
                    <span className="cmcc-detail-label">Title</span>
                    <span>{item.title}</span>
                  </div>
                )}
                {item.excerpt && (
                  <div className="cmcc-detail-field">
                    <span className="cmcc-detail-label">Content</span>
                    <span className="cmcc-detail-excerpt">{item.excerpt}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Assignment control */}
          <Card sectioned title="Assignment">
            <div className="cmcc-detail-assign-row">
              <TextField
                label="Moderator ID"
                value={assignTo}
                onChange={setAssignTo}
                autoComplete="off"
                placeholder="e.g. moderator-2"
              />
              <div className="cmcc-detail-assign-btn">
                <Button
                  primary
                  onClick={handleAssign}
                  loading={assigning}
                  disabled={!assignTo || assigning}
                >
                  Assign
                </Button>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card sectioned title="Notes">
            <div className="cmcc-detail-notes-form">
              <TextField
                label="Add a note"
                value={noteText}
                onChange={setNoteText}
                multiline={3}
                autoComplete="off"
                placeholder="Enter your note..."
              />
              <div className="cmcc-detail-notes-actions">
                <Button
                  primary
                  onClick={handleAddNote}
                  loading={savingNote}
                  disabled={!noteText.trim() || savingNote}
                >
                  Add Note
                </Button>
              </div>
            </div>
            {notes.length > 0 ? (
              <div className="cmcc-detail-notes-list">
                {notes.map((note) => (
                  <div key={note.id} className="cmcc-detail-note-item">
                    <div className="cmcc-detail-note-header">
                      <strong>
                        {note.moderator_name || note.moderator_id}
                      </strong>
                      <span className="cmcc-detail-note-date">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="cmcc-detail-note-text">{note.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              !loading && (
                <p style={{ color: '#6d7175', fontSize: '0.875rem' }}>
                  No notes yet
                </p>
              )
            )}
          </Card>

          {/* History */}
          <Card sectioned title="Moderation History">
            {loading ? (
              <Spinner accessibilityLabel="Loading history" size="small" />
            ) : error ? (
              <Banner status="critical">
                <p>{error}</p>
              </Banner>
            ) : history.length > 0 ? (
              <div className="cmcc-detail-history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="cmcc-detail-history-item">
                    <div className="cmcc-detail-history-header">
                      <Badge>{entry.action}</Badge>
                      <span className="cmcc-detail-history-moderator">
                        {entry.moderator_id}
                      </span>
                    </div>
                    <div className="cmcc-detail-history-meta">
                      <span>
                        {entry.previous_status} → {entry.new_status}
                      </span>
                      <span className="cmcc-detail-history-date">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="cmcc-detail-history-notes">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6d7175', fontSize: '0.875rem' }}>
                No history recorded
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
