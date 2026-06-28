import { useState, useCallback, useEffect } from 'react'
import { startTransition } from 'react'
import { filterActivityLog } from '@cmcc/core'
import { apiFetch } from '../lib/api'
import { normalizeAction } from '../constants/actionLabels'

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
    async (page = 1, dateRange) => {
      setIsLogLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(logPerPage),
        })
        if (dateRange?.from) {
          params.set('start_date', dateRange.from.toISOString())
        }
        if (dateRange?.to) {
          params.set('end_date', dateRange.to.toISOString())
        }
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

        // Apply client-side filtering/truncation using @cmcc/core filterActivityLog
        const filtered = filterActivityLog(mappedItems, {})
        setActivityLog(filtered)
        setLogTotal(data.total || 0)
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch activity log:', err)
        }
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
