import { useState, useCallback } from 'react'
import { apiFetch } from '../lib/api'

/**
 * Collaboration features hook.
 *
 * Manages item notes, activity feed, item assignments, and item history
 * for the queue detail panel.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Collaboration state + action handlers.
 */
export function useCollaboration({ addToast }) {
  const [detailItem, setDetailItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [itemNotes, setItemNotes] = useState([])
  const [isNotesLoading, setIsNotesLoading] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)

  // ── Fetch Item History ─────────────────────────────────────────────
  const fetchItemHistory = useCallback(async (itemId) => {
    setIsHistoryLoading(true)
    try {
      const data = await apiFetch(`queue/${encodeURIComponent(itemId)}/history`)
      setItemHistory(data.items || [])
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch item history:', err)
      }
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  // ── Fetch Item Notes ───────────────────────────────────────────────
  const fetchItemNotes = useCallback(async (itemId) => {
    setIsNotesLoading(true)
    try {
      const data = await apiFetch(`queue/${encodeURIComponent(itemId)}/notes`)
      setItemNotes(data.notes || [])
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch notes:', err)
      }
    } finally {
      setIsNotesLoading(false)
    }
  }, [])

  // ── Add Note ───────────────────────────────────────────────────────
  const addItemNote = useCallback(
    async (content, isInternal, type) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        const data = await apiFetch(
          `queue/${encodeURIComponent(itemId)}/note`,
          {
            method: 'POST',
            body: JSON.stringify({
              content,
              is_internal: isInternal,
              type,
            }),
          },
        )
        if (data.success) {
          setItemNotes((prev) => [data.note, ...prev])
          addToast('Note added', 'success')
        }
      } catch {
        addToast('Failed to add note', 'error')
      }
    },
    [detailItem, addToast],
  )

  // ── Assign Item ────────────────────────────────────────────────────
  const handleAssignItem = useCallback(
    async (assignee, dueDate, priority) => {
      if (!detailItem) return
      const itemId = detailItem.id || detailItem.originalId
      try {
        const data = await apiFetch(
          `queue/${encodeURIComponent(itemId)}/assign`,
          {
            method: 'POST',
            body: JSON.stringify({
              assignee,
              due_date: dueDate,
              priority,
            }),
          },
        )
        if (data.success) {
          addToast(`Item assigned to ${assignee || 'unassigned'}`, 'success')
        }
      } catch {
        addToast('Failed to assign item', 'error')
      }
    },
    [detailItem, addToast],
  )

  // ── Fetch Activity Feed ────────────────────────────────────────────
  const fetchActivityFeed = useCallback(async () => {
    setIsFeedLoading(true)
    setFeedError(null)
    try {
      const data = await apiFetch('activity-feed?limit=20')
      setActivityFeed(data.events || [])
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch activity feed:', err)
      }
      setFeedError(err?.message || 'Failed to load activity feed')
    } finally {
      setIsFeedLoading(false)
    }
  }, [])

  return {
    detailItem,
    setDetailItem,
    itemHistory,
    isHistoryLoading,
    itemNotes,
    isNotesLoading,
    activityFeed,
    isFeedLoading,
    feedError,
    fetchItemHistory,
    fetchItemNotes,
    addItemNote,
    handleAssignItem,
    fetchActivityFeed,
  }
}
