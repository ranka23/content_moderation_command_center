import { useState, useCallback, useEffect } from 'react'
import { startTransition } from 'react'
import { apiFetch } from '../lib/api'

/**
 * Reports hook.
 *
 * Manages user reputation data (with pagination), moderator performance
 * pagination, and activity feed state.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Reports state + fetch functions.
 */
export function useReports({ addToast: _addToast }) {
  // ── User Reputation ────────────────────────────────────────────────
  const [reputationUsers, setReputationUsers] = useState([])
  const [isReputationLoading, setIsReputationLoading] = useState(false)
  const [reputationPage, setReputationPage] = useState(1)
  const [reputationPerPage, setReputationPerPage] = useState(25)

  // ── Activity Feed ──────────────────────────────────────────────────
  const [activityFeed, setActivityFeed] = useState([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)

  // ── Fetch User Reputation ──────────────────────────────────────────
  const fetchUserReputation = useCallback(async () => {
    setIsReputationLoading(true)
    try {
      const data = await apiFetch('users/reputation')
      setReputationUsers(data.users || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user reputation:', err)
    } finally {
      setIsReputationLoading(false)
    }
  }, [])

  // ── Fetch Activity Feed ────────────────────────────────────────────
  const fetchActivityFeed = useCallback(async () => {
    setIsFeedLoading(true)
    setFeedError(null)
    try {
      const data = await apiFetch('activity-feed?limit=20')
      setActivityFeed(data.events || [])
    } catch {
      setFeedError('Failed to load activity feed')
    } finally {
      setIsFeedLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    startTransition(() => {
      fetchUserReputation()
      fetchActivityFeed()
    })
  }, [])

  return {
    reputationUsers,
    isReputationLoading,
    fetchUserReputation,
    reputationPage,
    setReputationPage,
    reputationPerPage,
    setReputationPerPage,
    activityFeed,
    isFeedLoading,
    feedError,
    fetchActivityFeed,
  }
}
