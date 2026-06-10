/**
 * CMCC Analytics Processing Engine
 *
 * This module processes moderation events to generate insights for the dashboard:
 * - Heatmap data (pending/spam items by day/hour)
 * - Spam ratio calculations
 * - Content type breakdowns
 * - Moderator performance metrics
 * - Anomaly detection
 */

// --------------------------------------------------------------------------
// Type Definitions
// --------------------------------------------------------------------------

/**
 * Represents a single moderation event (e.g., create, approve, spam, trash).
 */
export interface ModerationEvent {
  id: string | number
  timestamp: string // ISO date string
  contentType: string
  action: string
  itemId: string | number
  userId: string | number
  blogId?: string | number
  moderatorId?: string | number
}

/**
 * Represents a queue item awaiting moderation.
 */
export interface QueueItem {
  id: string
  contentType: string
  originalId: string | number
  /**
   * Item moderation status.
   * Core analytics only tracks pending/spam/flagged,
   * but the union allows additional statuses used by
   * platform-specific implementations.
   */
  status:
    | 'pending'
    | 'spam'
    | 'flagged'
    | 'approved'
    | 'rejected'
    | 'deferred'
    | 'deactivated'
  spamScore: number
  authorId: string | number
  dateGmt: string // ISO date string
  title: string
  excerpt: string
}

/**
 * Configuration options for analytics processing.
 */
export interface AnalyticsOptions {
  heatmapLookbackDays: number
  anomalyThresholds: {
    queueVolumePerHour: number
    spamRatio: number
    moderatorActionsPerHour: number
  }
}

/**
 * Heatmap data structure: 7 (days) x 24 (hours) grid with a max count.
 */
export interface HeatmapData {
  data: number[][]
  maxCount: number
}

/**
 * Spam ratio calculation result.
 */
export interface SpamRatioData {
  spamCount: number
  totalCount: number
  ratio: number
  percentage: number
}

/**
 * Breakdown of queue items by content type.
 */
export interface ContentTypeBreakdown {
  contentType: string
  count: number
  percentage: number
}

/**
 * Moderator performance metrics for the past week.
 */
export interface ModeratorPerformance {
  moderatorId: string | number
  moderatorName: string
  approvals: number
  trashes: number
  spamCount: number
  totalActions: number
}

/**
 * Anomaly alert raised by the detection engine.
 */
export interface AnomalyAlert {
  id: string
  type: 'queue_volume' | 'spam_ratio' | 'moderator_activity'
  severity: 'low' | 'medium' | 'high'
  description: string
  timestamp: string
  value: number
  threshold: number
}

/**
 * Complete analytics result returned by processAnalytics.
 */
export interface ProcessedAnalytics {
  heatmap: HeatmapData
  spamRatio: SpamRatioData
  contentTypeBreakdown: ContentTypeBreakdown[]
  moderatorPerformance: ModeratorPerformance[]
  anomalyAlerts: AnomalyAlert[]
  dateRange: {
    start: string
    end: string
  }
}

// --------------------------------------------------------------------------
// Analytics Functions
// --------------------------------------------------------------------------

/**
 * Process events to generate heatmap data
 */
export function generateHeatmapData(
  events: ModerationEvent[],
  options: Pick<AnalyticsOptions, 'heatmapLookbackDays'> = {
    heatmapLookbackDays: 30,
  },
): HeatmapData {
  const { heatmapLookbackDays = 30 } = options

  // Initialize 7x24 grid (days x hours) with zeros
  const data: number[][] = Array(7)
    .fill(0)
    .map(() => Array(24).fill(0))

  const now = new Date()
  const cutoffTime = now.getTime() - heatmapLookbackDays * 24 * 60 * 60 * 1000

  let maxCount = 0

  // Process events
  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime()

    // Skip events outside lookback window
    if (eventTime < cutoffTime) continue

    // Count ALL moderation actions for heatmap (not just 'created')
    // Moderation actions: approve, reject, spam, defer, flag, created, trashed, etc.
    const eventDate = new Date(event.timestamp)
    const dayOfWeek = eventDate.getDay() // 0-6 (Sun-Sat)
    const hour = eventDate.getHours() // 0-23

    // Safe access: dayOfWeek is 0-6, hour is 0-23, array is 7x24
    const dayRow = data[dayOfWeek]
    if (dayRow !== undefined) {
      const currentValue = dayRow[hour]
      if (currentValue !== undefined) {
        dayRow[hour] = currentValue + 1
        maxCount = Math.max(maxCount, currentValue + 1)
      }
    }
  }

  return {
    data,
    maxCount,
  }
}

/**
 * Calculate spam ratio from recent events
 */
export function calculateSpamRatio(
  events: ModerationEvent[],
  _options: Pick<AnalyticsOptions, 'anomalyThresholds'> = {
    anomalyThresholds: {
      queueVolumePerHour: 30,
      spamRatio: 0.5,
      moderatorActionsPerHour: 20,
    },
  },
): SpamRatioData {
  const now = new Date()
  const oneHourAgo = now.getTime() - 60 * 60 * 1000

  let spamCount = 0
  let totalCount = 0

  // Count events from the last hour
  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime()

    // Skip events older than 1 hour
    if (eventTime < oneHourAgo) continue

    // Count moderation actions on comments/posts
    if (event.contentType === 'comment' || event.contentType === 'post') {
      if (event.action === 'spammed') {
        spamCount++
      }
      if (
        event.action === 'approved' ||
        event.action === 'spammed' ||
        event.action === 'trashed'
      ) {
        totalCount++
      }
    }
  }

  const ratio = totalCount > 0 ? spamCount / totalCount : 0

  return {
    spamCount,
    totalCount,
    ratio,
    percentage: Math.round(ratio * 100),
  }
}

/**
 * Generate content type breakdown from queue items
 */
export function generateContentTypeBreakdown(
  items: QueueItem[],
): ContentTypeBreakdown[] {
  const counts: Record<string, number> = {}

  // Count items by content type
  for (const item of items) {
    counts[item.contentType] = (counts[item.contentType] || 0) + 1
  }

  // Convert to array and calculate percentages
  const totalItems = items.length
  const breakdown: ContentTypeBreakdown[] = []

  for (const [contentType, count] of Object.entries(counts)) {
    breakdown.push({
      contentType,
      count,
      percentage: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
    })
  }

  // Sort by count descending
  breakdown.sort((a, b) => b.count - a.count)

  return breakdown
}

/**
 * Generate moderator performance metrics
 */
export function generateModeratorPerformance(
  events: ModerationEvent[],
  moderatorNames: Record<string | number, string> = {},
): ModeratorPerformance[] {
  const now = new Date()
  const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000

  const stats: Record<
    string | number,
    {
      approvals: number
      trashes: number
      spamCount: number
    }
  > = {}

  // Process events from the last week
  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime()

    // Skip events older than 1 week
    if (eventTime < oneWeekAgo) continue

    // Skip if no moderator ID (system actions)
    if (!event.moderatorId) continue

    // Initialize moderator stats if needed (use local ref for type safety)
    const modId = event.moderatorId
    if (!stats[modId]) {
      stats[modId] = {
        approvals: 0,
        trashes: 0,
        spamCount: 0,
      }
    }

    const modStats = stats[modId]
    // modStats will always exist here since we just initialized it if needed
    if (modStats) {
      // Count actions
      if (event.action === 'approved') {
        modStats.approvals++
      } else if (event.action === 'trashed') {
        modStats.trashes++
      } else if (event.action === 'spammed') {
        modStats.spamCount++
      }
    }
  }

  // Convert to array format
  const performance: ModeratorPerformance[] = []

  for (const [moderatorId, counts] of Object.entries(stats)) {
    const totalActions = counts.approvals + counts.trashes + counts.spamCount

    performance.push({
      moderatorId,
      moderatorName: moderatorNames[moderatorId] || `Moderator ${moderatorId}`,
      approvals: counts.approvals,
      trashes: counts.trashes,
      spamCount: counts.spamCount,
      totalActions,
    })
  }

  // Sort by total actions descending
  performance.sort((a, b) => b.totalActions - a.totalActions)

  return performance
}

/**
 * Detect anomalies in moderation data
 */
export function detectAnomalies(
  events: ModerationEvent[],
  _queueItems: QueueItem[],
  options: Pick<AnalyticsOptions, 'anomalyThresholds'> = {
    anomalyThresholds: {
      queueVolumePerHour: 30,
      spamRatio: 0.5,
      moderatorActionsPerHour: 20,
    },
  },
): AnomalyAlert[] {
  const {
    anomalyThresholds = {
      queueVolumePerHour: 30,
      spamRatio: 0.5,
      moderatorActionsPerHour: 20,
    },
  } = options
  const queueVolumeThreshold = anomalyThresholds.queueVolumePerHour
  const spamRatioThreshold = anomalyThresholds.spamRatio
  const moderatorActivityThreshold = anomalyThresholds.moderatorActionsPerHour

  const alerts: AnomalyAlert[] = []
  const now = new Date()
  const oneHourAgo = now.getTime() - 60 * 60 * 1000

  // 1. Check queue volume anomaly (pending/spam items created in last hour)
  let recentCreations = 0
  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime()

    if (
      eventTime >= oneHourAgo &&
      event.action === 'created' &&
      (event.contentType === 'comment' || event.contentType === 'post')
    ) {
      recentCreations++
    }
  }

  if (recentCreations > queueVolumeThreshold) {
    alerts.push({
      id: `queue_volume_${Date.now()}`,
      type: 'queue_volume',
      severity: recentCreations > queueVolumeThreshold * 2 ? 'high' : 'medium',
      description: `Unusually high queue volume: ${recentCreations} items created in the last hour`,
      timestamp: now.toISOString(),
      value: recentCreations,
      threshold: queueVolumeThreshold,
    })
  }

  // 2. Check spam ratio anomaly
  const spamRatioData = calculateSpamRatio(events, {
    anomalyThresholds: anomalyThresholds,
  })
  if (spamRatioData.ratio > spamRatioThreshold) {
    alerts.push({
      id: `spam_ratio_${Date.now()}`,
      type: 'spam_ratio',
      severity:
        spamRatioData.ratio > spamRatioThreshold * 1.5 ? 'high' : 'medium',
      description: `High spam ratio detected: ${spamRatioData.percentage}% of moderated items were spam`,
      timestamp: now.toISOString(),
      value: spamRatioData.ratio,
      threshold: spamRatioThreshold,
    })
  }

  // 3. Check moderator activity anomaly
  const moderatorActivity: Record<string | number, number> = {}

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime()

    if (eventTime >= oneHourAgo && event.moderatorId) {
      moderatorActivity[event.moderatorId] =
        (moderatorActivity[event.moderatorId] || 0) + 1
    }
  }

  for (const [moderatorId, count] of Object.entries(moderatorActivity)) {
    if (count > moderatorActivityThreshold) {
      alerts.push({
        id: `moderator_activity_${moderatorId}_${Date.now()}`,
        type: 'moderator_activity',
        severity: count > moderatorActivityThreshold * 2 ? 'high' : 'medium',
        description: `High moderator activity: ${count} actions in the last hour`,
        timestamp: now.toISOString(),
        value: count,
        threshold: moderatorActivityThreshold,
      })
    }
  }

  return alerts
}

/**
 * Main analytics processing function
 */
export function processAnalytics(
  events: ModerationEvent[],
  queueItems: QueueItem[],
  moderatorNames: Record<string | number, string> = {},
  options: Partial<AnalyticsOptions> = {},
): ProcessedAnalytics {
  const mergedOptions = {
    ...getDefaultAnalyticsOptions(),
    ...options,
  }

  const heatmap = generateHeatmapData(events, mergedOptions)
  const spamRatio = calculateSpamRatio(events, mergedOptions)
  const contentTypeBreakdown = generateContentTypeBreakdown(queueItems)
  const moderatorPerformance = generateModeratorPerformance(
    events,
    moderatorNames,
  )
  const anomalyAlerts = detectAnomalies(events, queueItems, mergedOptions)

  // Calculate date range from events
  let startDate: string = new Date().toISOString()
  let endDate: string = new Date().toISOString()

  if (events.length > 0) {
    const timestamps = events.map((e) => new Date(e.timestamp))
    const minTime = new Date(Math.min(...timestamps.map((t) => t.getTime())))
    const maxTime = new Date(Math.max(...timestamps.map((t) => t.getTime())))

    startDate = minTime.toISOString()
    endDate = maxTime.toISOString()
  }

  return {
    heatmap,
    spamRatio,
    contentTypeBreakdown,
    moderatorPerformance,
    anomalyAlerts,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  }
}

/**
 * Get default analytics options
 */
export function getDefaultAnalyticsOptions(): AnalyticsOptions {
  return {
    heatmapLookbackDays: 30,
    anomalyThresholds: {
      queueVolumePerHour: 30,
      spamRatio: 0.5, // 50%
      moderatorActionsPerHour: 20,
    },
  }
}

/**
 * Get empty analytics state for initial loading
 */
export function getEmptyAnalytics(): ProcessedAnalytics {
  return {
    heatmap: {
      data: Array(7)
        .fill(0)
        .map(() => Array(24).fill(0)),
      maxCount: 0,
    },
    spamRatio: {
      spamCount: 0,
      totalCount: 0,
      ratio: 0,
      percentage: 0,
    },
    contentTypeBreakdown: [],
    moderatorPerformance: [],
    anomalyAlerts: [],
    dateRange: {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    },
  }
}

// --------------------------------------------------------------------------
// v1 Enhancement: Activity Log Processing
// --------------------------------------------------------------------------

/**
 * Represents a single entry in the moderation activity log.
 * Tracks who did what to which item, with before/after state.
 */
export interface ActivityLogEntry {
  id: string
  timestamp: string // ISO date string
  moderatorId: string | number
  moderatorName?: string
  action:
    | 'approved'
    | 'rejected'
    | 'spammed'
    | 'trashed'
    | 'flagged'
    | 'deactivated'
    | 'deferred'
  contentType: string
  itemId: string | number
  itemTitle?: string
  previousStatus?: string
  newStatus?: string
  notes?: string
}

/**
 * Filter criteria for querying activity log entries.
 * All fields are optional; only provided fields are used for filtering.
 */
export interface ActivityLogFilter {
  /** Filter by specific moderator ID(s) */
  moderatorIds?: (string | number)[]
  /** Filter by specific action type(s) */
  actions?: ActivityLogEntry['action'][]
  /** Filter by content type(s) */
  contentTypes?: string[]
  /** Start of date range (inclusive) */
  dateFrom?: string
  /** End of date range (inclusive) */
  dateTo?: string
  /** Search text in item title, moderator name, or notes */
  search?: string
  /** Maximum number of results to return */
  limit?: number
  /** Number of results to skip (for pagination) */
  offset?: number
}

/**
 * Filter activity log entries based on provided criteria.
 *
 * @param entries - Full array of activity log entries
 * @param filter - Filter criteria (only provided fields are applied)
 * @returns Filtered, sorted (newest first), and paginated entries
 *
 * Example:
 *   const recentSpam = filterActivityLog(allEntries, {
 *     actions: ['spammed'],
 *     dateFrom: daysAgo(7).toISOString(),
 *     limit: 25
 *   });
 */
export function filterActivityLog(
  entries: ActivityLogEntry[],
  filter: ActivityLogFilter = {},
): ActivityLogEntry[] {
  let filtered = entries

  // Filter by moderator IDs
  const moderatorIds = filter.moderatorIds
  if (moderatorIds && moderatorIds.length > 0) {
    filtered = filtered.filter((e) => moderatorIds.includes(e.moderatorId))
  }

  // Filter by action types
  const actions = filter.actions
  if (actions && actions.length > 0) {
    filtered = filtered.filter((e) => actions.includes(e.action))
  }

  // Filter by content types
  const contentTypes = filter.contentTypes
  if (contentTypes && contentTypes.length > 0) {
    filtered = filtered.filter((e) => contentTypes.includes(e.contentType))
  }

  // Filter by date range
  if (filter.dateFrom) {
    const fromTime = new Date(filter.dateFrom).getTime()
    filtered = filtered.filter(
      (e) => new Date(e.timestamp).getTime() >= fromTime,
    )
  }
  if (filter.dateTo) {
    const toTime = new Date(filter.dateTo).getTime()
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= toTime)
  }

  // Search text
  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    filtered = filtered.filter(
      (e) =>
        (e.itemTitle && e.itemTitle.toLowerCase().includes(searchLower)) ||
        (e.moderatorName &&
          e.moderatorName.toLowerCase().includes(searchLower)) ||
        (e.notes && e.notes.toLowerCase().includes(searchLower)),
    )
  }

  // Sort newest first (descending by timestamp)
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  // Apply pagination
  const offset = filter.offset ?? 0
  const limit = filter.limit ?? filtered.length
  return filtered.slice(offset, offset + limit)
}

// --------------------------------------------------------------------------
// v1 Enhancement: Trend Analysis
// --------------------------------------------------------------------------

/**
 * Result of comparing two time periods for trend analysis.
 */
export interface TrendData {
  /** Value for the current period */
  currentValue: number
  /** Value for the previous period */
  previousValue: number
  /** Absolute change (current - previous) */
  change: number
  /** Percentage change from previous to current */
  percentageChange: number
  /** Direction of the trend */
  direction: 'up' | 'down' | 'stable'
}

/**
 * Calculate trend by comparing event counts in two time periods.
 *
 * @param events - All moderation events
 * @param predicate - Function to determine which events to count
 * @param currentPeriodStart - Start of the current period
 * @param currentPeriodEnd - End of the current period (default: now)
 * @param previousPeriodDuration - Duration of the previous period in ms (default: same as current)
 * @returns TrendData comparing the two periods
 *
 * Example:
 *   const trend = calculateTrend(events,
 *     e => e.action === 'spammed',
 *     hoursAgo(24).toISOString()
 *   );
 *   // => { currentValue: 15, previousValue: 8, change: 7, percentageChange: 87.5, direction: 'up' }
 */
export function calculateTrend(
  events: ModerationEvent[],
  predicate: (event: ModerationEvent) => boolean,
  currentPeriodStart: string,
  currentPeriodEnd: string = new Date().toISOString(),
  previousPeriodDuration?: number,
): TrendData {
  const currentStart = new Date(currentPeriodStart).getTime()
  const currentEnd = new Date(currentPeriodEnd).getTime()

  // If not specified, previous period duration = current period duration
  const periodDuration = previousPeriodDuration ?? currentEnd - currentStart
  const previousStart = currentStart - periodDuration
  const previousEnd = currentStart

  let currentValue = 0
  let previousValue = 0

  for (const event of events) {
    if (!predicate(event)) continue

    const eventTime = new Date(event.timestamp).getTime()

    if (eventTime >= currentStart && eventTime <= currentEnd) {
      currentValue++
    } else if (eventTime >= previousStart && eventTime < previousEnd) {
      previousValue++
    }
  }

  const change = currentValue - previousValue
  const percentageChange =
    previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : currentValue > 0
        ? 100
        : 0 // If no previous, treat as 100% increase if current > 0

  let direction: 'up' | 'down' | 'stable'
  if (percentageChange > 5) {
    direction = 'up'
  } else if (percentageChange < -5) {
    direction = 'down'
  } else {
    direction = 'stable'
  }

  return {
    currentValue,
    previousValue,
    change,
    percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal
    direction,
  }
}

/**
 * Get a date range object for common time periods.
 * Useful for analytics and activity log date range pickers.
 *
 * @param period - Named period or custom date range
 * @returns Object with start and end ISO date strings
 *
 * Example:
 *   const range = getDateRangeForPeriod('last7days');
 *   // => { start: '2026-05-30T...', end: '2026-06-06T...' }
 */
export function getDateRangeForPeriod(
  period:
    | 'today'
    | 'yesterday'
    | 'last7days'
    | 'last30days'
    | 'last90days'
    | 'all',
): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()
  let start: Date

  switch (period) {
    case 'today': {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'yesterday': {
      start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const yesterdayEnd = new Date(start)
      yesterdayEnd.setDate(yesterdayEnd.getDate() + 1)
      return { start: start.toISOString(), end: yesterdayEnd.toISOString() }
    }
    case 'last7days': {
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      break
    }
    case 'last30days': {
      start = new Date(now)
      start.setDate(start.getDate() - 30)
      break
    }
    case 'last90days': {
      start = new Date(now)
      start.setDate(start.getDate() - 90)
      break
    }
    case 'all':
    default: {
      start = new Date(0) // Unix epoch
      break
    }
  }

  return { start: start.toISOString(), end }
}
