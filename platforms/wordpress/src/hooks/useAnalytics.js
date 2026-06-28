import { useState, useCallback, useEffect, useMemo } from 'react'
import { startTransition } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { processAnalytics, getEmptyAnalytics } from '@cmcc/core'
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
        // Try client-side processing first using raw endpoints
        try {
          const params = new URLSearchParams()
          if (dateRange?.from) {
            params.set('start_date', dateRange.from.toISOString())
          }
          if (dateRange?.to) {
            params.set('end_date', dateRange.to.toISOString())
          }
          const queryString = params.toString()

          // 1. Fetch raw events from the new raw-events endpoint
          const rawEvents = await apiFetch(
            'raw-events' + (queryString ? '?' + queryString : ''),
          )

          // 2. Fetch queue items
          const queueData = await apiFetch('queue?per_page=100')
          const queueItems = queueData.items || queueData.data || []

          // 3. Build moderator names map from available data
          const moderatorNames = {}
          if (window.cmccData?.userId) {
            moderatorNames[window.cmccData.userId] =
              window.cmccData?.userDisplay || 'Current User'
          }

          // 4. Process analytics client-side
          const processed = processAnalytics(
            rawEvents,
            queueItems,
            moderatorNames,
          )

          // 5. Compute queueStats from queue items
          const pending = queueItems.filter(
            (i) => i.status === 'pending',
          ).length
          const spam = queueItems.filter((i) => i.status === 'spam').length
          const flagged = queueItems.filter(
            (i) => i.status === 'flagged',
          ).length

          setQueueStats({
            pending,
            spam,
            flagged,
            total: queueItems.length,
          })

          // 6. Compute missing chart fields from queue items + rawEvents
          // statusDistribution: group queue items by status
          const statusLabels = [
            'pending',
            'spam',
            'flagged',
            'approved',
            'rejected',
            'deferred',
          ]
          const statusValues = statusLabels.map(
            (s) => queueItems.filter((i) => i.status === s).length,
          )
          const statusColors = [
            '#f59e0b',
            '#ef4444',
            '#f97316',
            '#22c55e',
            '#6b7280',
            '#06b6d4',
          ]
          const statusDistribution = {
            labels: statusLabels,
            values: statusValues,
            colors: statusColors,
          }

          // moderationVolume: group events by day across date range
          const modLabels = []
          const modApproved = []
          const modRejected = []
          const modSpam = []
          const modFlagged = []
          const modDeferred = []
          if (Array.isArray(rawEvents) && rawEvents.length > 0) {
            const dayMap = {}
            const events = rawEvents
            events.forEach((evt) => {
              const ts = evt.timestamp || evt.created_at || ''
              const day = ts ? ts.substring(0, 10) : 'unknown'
              if (!dayMap[day]) {
                dayMap[day] = {
                  approved: 0,
                  rejected: 0,
                  spam: 0,
                  flagged: 0,
                  deferred: 0,
                }
              }
              const action = (evt.action || '').toLowerCase()
              if (action === 'approved' || action === 'approve')
                dayMap[day].approved++
              else if (action === 'rejected' || action === 'reject')
                dayMap[day].rejected++
              else if (
                action === 'spam' ||
                action === 'marked_as_spam' ||
                action === 'spammed'
              )
                dayMap[day].spam++
              else if (action === 'flagged' || action === 'flag')
                dayMap[day].flagged++
              else if (action === 'deferred' || action === 'defer')
                dayMap[day].deferred++
            })
            const sortedDays = Object.keys(dayMap).sort()
            sortedDays.forEach((day) => {
              modLabels.push(day)
              modApproved.push(dayMap[day].approved)
              modRejected.push(dayMap[day].rejected)
              modSpam.push(dayMap[day].spam)
              modFlagged.push(dayMap[day].flagged)
              modDeferred.push(dayMap[day].deferred)
            })
          }
          const moderationVolume = {
            labels: modLabels,
            approved: modApproved,
            rejected: modRejected,
            spam: modSpam,
            flagged: modFlagged,
            deferred: modDeferred,
          }

          // spamContentTypes: top spam content types from queue items
          const spamItems = queueItems.filter((i) => i.status === 'spam')
          const spamTypeCounts = {}
          spamItems.forEach((i) => {
            const ct = i.content_type || i.contentType || 'unknown'
            spamTypeCounts[ct] = (spamTypeCounts[ct] || 0) + 1
          })
          const spamTypes = Object.keys(spamTypeCounts)
            .sort((a, b) => spamTypeCounts[b] - spamTypeCounts[a])
            .slice(0, 5)
          const spamContentTypeColors = [
            '#ef4444',
            '#f97316',
            '#f59e0b',
            '#eab308',
            '#a855f7',
          ]
          const spamContentTypes = {
            labels: spamTypes,
            values: spamTypes.map((t) => spamTypeCounts[t]),
            colors: spamContentTypeColors.slice(0, spamTypes.length),
          }

          // 7. Compute spam ratio from queue items (not events-only like processAnalytics does)
          const totalCount = queueItems.length
          const spamCount = queueItems.filter((i) => i.status === 'spam').length
          const queueSpamRatio = {
            spamCount,
            totalCount,
            ratio: totalCount > 0 ? spamCount / totalCount : 0,
            percentage:
              totalCount > 0
                ? Math.round((spamCount / totalCount) * 100 * 10) / 10
                : 0,
          }

          // 8. Build contentTypeBreakdown with per-status counts from queue items
          // (processAnalytics uses item.contentType which doesn't match API's content_type field)
          const ctCounts = {}
          queueItems.forEach((i) => {
            const ct = i.content_type || i.contentType || 'unknown'
            if (!ctCounts[ct]) {
              ctCounts[ct] = {
                contentType: ct,
                count: 0,
                percentage: 0,
                approved: 0,
                pending: 0,
                spam: 0,
                flagged: 0,
                rejected: 0,
                deferred: 0,
              }
            }
            ctCounts[ct].count++
            const s = i.status || 'unknown'
            if (s in ctCounts[ct]) ctCounts[ct][s]++
          })
          const totalQ = queueItems.length
          const enrichedBreakdown = Object.values(ctCounts)
            .map((row) => {
              const totalOfType = row.count
              const statuses = [
                'approved',
                'pending',
                'spam',
                'flagged',
                'rejected',
                'deferred',
              ]
              const r = {
                ...row,
                percentage:
                  totalQ > 0 ? Math.round((row.count / totalQ) * 100) : 0,
              }
              statuses.forEach((s) => {
                r[`${s}_pct`] =
                  totalOfType > 0
                    ? Math.round(((r[s] || 0) / totalOfType) * 100)
                    : 0
              })
              return r
            })
            .sort((a, b) => b.count - a.count)

          // Merge computed fields into processed analytics data
          setAnalyticsData({
            ...processed,
            statusDistribution,
            moderationVolume,
            spamContentTypes,
            spamRatio: queueSpamRatio,
            contentTypeBreakdown: enrichedBreakdown,
          })
          return // Success with client-side processing
        } catch {
          // Fallback: old server-side analytics endpoint
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
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch analytics:', err)
        }
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
