import { useState, useCallback, useEffect } from 'react'
import { startTransition } from 'react'
import { apiFetch } from '../lib/api'
import {
  generateUserReputationSummary,
  classifyRiskLevel,
  getDefaultRiskLevelThresholds,
  getDefaultReputationOptions,
} from '@cmcc/core'

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
      const data = await apiFetch(
        'reputation-raw?page=' +
          reputationPage +
          '&per_page=' +
          reputationPerPage,
      )
      const rawUsers = data.data || []

      const thresholds = getDefaultRiskLevelThresholds()
      const options = getDefaultReputationOptions()

      // Process each raw user through the core reputation system
      const processed = rawUsers.map((u) => {
        const score = {
          score:
            u.approvedCount * options.approvedItemScore +
            u.rejectedCount * options.rejectedItemScore +
            u.spamCount * options.rejectedItemScore,
          lastUpdated: u.lastSeen || new Date().toISOString(),
          totalApproved: u.approvedCount || 0,
          totalRejected: u.rejectedCount || 0,
          timesDeactivated: 0,
        }
        const summary = generateUserReputationSummary(
          score,
          [],
          options,
          thresholds,
        )
        const riskLevel = classifyRiskLevel(
          summary.currentScore,
          summary.recentBreachCount,
          thresholds,
        )
        const spamRatio = u.totalItems > 0 ? u.spamCount / u.totalItems : 0
        return {
          authorId: u.authorId,
          totalItems: u.totalItems,
          spamCount: u.spamCount,
          approvedCount: u.approvedCount,
          flaggedCount: u.flaggedCount,
          rejectedCount: u.rejectedCount,
          lastSeen: u.lastSeen,
          reputationScore: summary.currentScore,
          riskLevel,
          spamRatio,
        }
      })

      setReputationUsers(processed)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user reputation:', err)
    } finally {
      setIsReputationLoading(false)
    }
  }, [reputationPage, reputationPerPage])

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
