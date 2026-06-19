import { useState, useCallback } from 'react'
import { filterActivityLog } from '@cmcc/core'

/**
 * Normalize action values to human-readable labels (UX2 fix).
 * Covers both snake_case API values and raw action names.
 */
const ACTION_LABELS = {
  approved: 'Approved',
  rejected: 'Rejected',
  spammed: 'Marked as spam',
  flagged: 'Flagged',
  deferred: 'Deferred',
  marked_as_spam: 'Marked as spam',
  markedasspam: 'Marked as spam',
  trashed: 'Trashed',
  created: 'Created',
  approve: 'Approved',
  reject: 'Rejected',
  spam: 'Marked as spam',
  flag: 'Flagged',
  defer: 'Deferred',
  trash: 'Trashed',
  unapprove: 'Unapproved',
  unspam: 'Unmarked as spam',
  untrash: 'Restored from trash',
  deactivate_user: 'User deactivated',
  activate_user: 'User activated',
}

function normalizeAction(action) {
  if (!action) return 'Unknown action'
  const lower = action.toLowerCase().trim()
  return (
    ACTION_LABELS[lower] ||
    lower.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export function useActivityLog({ apiEndpoint, apiHeaders }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLog = useCallback(async () => {
    if (!apiEndpoint) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiEndpoint}/api/activity`, {
        headers: apiHeaders(),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      const rawItems = Array.isArray(data) ? data : data.entries || []
      // UX2 fix: Normalize action values for human-readable display
      const normalized = rawItems.map((entry) => ({
        ...entry,
        description:
          entry.description ||
          normalizeAction(entry.action) ||
          'Unknown action',
      }))
      setItems(filterActivityLog(normalized, { limit: 50 }))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CMCC] Activity log fetch failed:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, apiHeaders])

  return { items, loading, fetchLog }
}
