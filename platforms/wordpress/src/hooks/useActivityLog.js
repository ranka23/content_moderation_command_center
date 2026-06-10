import { useState, useCallback, useEffect } from 'react'
import { startTransition } from 'react'
import { apiFetch } from '../lib/api'

/**
 * Normalize activity log action strings from API to human-readable labels.
 */
const ACTION_LABELS = {
  approve: 'approved',
  unapprove: 'unapproved',
  spam: 'marked as spam',
  unspam: 'unmarked as spam',
  delete: 'deleted',
  trash: 'moved to trash',
  untrash: 'restored from trash',
  reject: 'rejected',
  defer: 'deferred',
  flag: 'flagged',
  'deactivate-user': 'user deactivated',
  'reactivate-user': 'user reactivated',
}

/**
 * Normalize an action string to a human-readable label.
 */
function normalizeAction(action) {
  if (!action) return 'Unknown action'
  const lower = action.toLowerCase().trim()
  return ACTION_LABELS[lower] || lower
}

/**
 * Activity log hook.
 *
 * Manages activity log state, pagination, and fetch operations.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Activity log state + fetch function.
 */
export function useActivityLog({ addToast }) {
  const [activityLog, setActivityLog] = useState([])
  const [logPage, setLogPage] = useState(1)
  const [logPerPage, setLogPerPage] = useState(25)
  const [logTotal, setLogTotal] = useState(0)
  const [isLogLoading, setIsLogLoading] = useState(false)

  // ── Fetch Activity Log ─────────────────────────────────────────────
  const fetchActivityLog = useCallback(
    async (page = 1) => {
      setIsLogLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(logPerPage),
        })
        const data = await apiFetch('activity-log?' + params.toString())

        // U6 Fix: Map moderator ID to display name using available user info
        const currentUserDisplay = window.cmccData?.userDisplay || 'Unknown'
        const currentUserId = window.cmccData?.userId || ''
        const mappedItems = (data.items || []).map((entry) => ({
          ...entry,
          moderator_name:
            entry.moderator_name ||
            (String(entry.moderator_id) === String(currentUserId)
              ? currentUserDisplay
              : `Moderator #${entry.moderator_id}`),
          // B3 Fix: Normalize action to human-readable label
          action_display: normalizeAction(entry.action || entry.description),
          description:
            entry.description ||
            normalizeAction(entry.action) ||
            'Unknown action',
        }))
        setActivityLog(mappedItems)
        setLogTotal(data.total || 0)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch activity log:', err)
        addToast('Failed to fetch activity log', 'error')
      } finally {
        setIsLogLoading(false)
      }
    },
    [logPerPage, addToast],
  )

  // Load on mount
  useEffect(() => {
    startTransition(() => {
      fetchActivityLog(logPage)
    })
  }, [])

  return {
    activityLog,
    logPage,
    setLogPage,
    logPerPage,
    setLogPerPage,
    logTotal,
    isLogLoading,
    fetchActivityLog,
  }
}
