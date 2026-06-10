import { useState, useCallback, useEffect, useMemo } from 'react'
import { startTransition } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { getEmptyAnalytics } from '@cmcc/core'
import { apiFetch } from '../lib/api'

/**
 * Analytics data hook.
 *
 * Manages analytics state (queue stats, heatmap, charts, breakdowns),
 * the analytics date range, and the fetch operation.
 *
 * @param {object} options
 * @param {Function} options.addToast - Toast notification dispatcher.
 * @returns {object} Analytics state + fetch function.
 */
export function useAnalytics({ addToast }) {
  const [analyticsData, setAnalyticsData] = useState(getEmptyAnalytics())

  // Date range for analytics (default: last 7 days)
  const [analyticsDateRange, setAnalyticsDateRange] = useState(() => ({
    from: subDays(startOfDay(new Date()), 6),
    to: endOfDay(new Date()),
  }))

  // Queue stats summary (set from analytics endpoint)
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    spam: 0,
    flagged: 0,
    total: 0,
  })

  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  // ── Fetch Analytics ────────────────────────────────────────────────
  const fetchAnalytics = useCallback(
    async (dateRange) => {
      setIsAnalyticsLoading(true)
      try {
        const params = new URLSearchParams()
        if (dateRange?.from) {
          params.set('start_date', dateRange.from.toISOString())
        }
        if (dateRange?.to) {
          params.set('end_date', dateRange.to.toISOString())
        }
        const queryString = params.toString()
        const data = await apiFetch(
          'analytics' + (queryString ? '?' + queryString : ''),
        )

        setQueueStats(
          data.queue_stats || {
            pending: 0,
            spam: 0,
            flagged: 0,
            total: 0,
          },
        )

        // U9 Fix: Use real activity_heatmap data from PHP API
        const activityHeatmap = data.activity_heatmap || null
        const heatmapData =
          activityHeatmap?.data &&
          Array.isArray(activityHeatmap.data) &&
          activityHeatmap.data.length === 7
            ? activityHeatmap
            : {
                data: Array(7)
                  .fill(0)
                  .map(() => Array(24).fill(0)),
                maxCount: 0,
              }

        setAnalyticsData({
          heatmap: heatmapData,
          spamRatio: data.spam_ratio || {
            spamCount: 0,
            totalCount: 0,
            ratio: 0,
            percentage: 0,
          },
          contentTypeBreakdown: data.content_type_breakdown || [],
          moderatorPerformance: data.moderator_performance || [],
          anomalyAlerts: data.anomaly_alerts || [],
          dateRange: {
            start: data.activity_summary?.start || '',
            end: data.activity_summary?.end || '',
          },
          activitySummary: data.activity_summary || null,
          statusDistribution: data.status_distribution || null,
          moderationVolume: data.moderation_volume || null,
          spamContentTypes: data.spam_content_types || null,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch analytics:', err)
        addToast('Failed to fetch analytics data', 'error')
      } finally {
        setIsAnalyticsLoading(false)
      }
    },
    [addToast],
  )

  // ── Derive spam ratio data ─────────────────────────────────────────
  const spamRatioData = useMemo(
    () =>
      analyticsData?.spamRatio || {
        spamCount: 0,
        totalCount: 0,
        ratio: 0,
        percentage: 0,
      },
    [analyticsData],
  )

  // ── Content type breakdown list ────────────────────────────────────
  const ctbList = useMemo(
    () => analyticsData?.contentTypeBreakdown || [],
    [analyticsData],
  )

  // ── Fetch on mount ─────────────────────────────────────────────────
  useEffect(() => {
    startTransition(() => {
      fetchAnalytics(analyticsDateRange)
    })
  }, [])

  return {
    analyticsData,
    analyticsDateRange,
    setAnalyticsDateRange,
    isAnalyticsLoading,
    fetchAnalytics,
    queueStats,
    spamRatioData,
    ctbList,
  }
}
