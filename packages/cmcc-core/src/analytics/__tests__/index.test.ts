import type { ModerationEvent, QueueItem, ActivityLogEntry } from '../index'
import {
  processAnalytics,
  generateHeatmapData,
  calculateSpamRatio,
  generateContentTypeBreakdown,
  generateModeratorPerformance,
  detectAnomalies,
  getEmptyAnalytics,
  filterActivityLog,
  calculateTrend,
  getDateRangeForPeriod,
} from '../index'

describe('Analytics Processing Engine', () => {
  /**
   * Helper: returns a Date relative to now ("N hours ago", "N days ago", etc.)
   * This ensures test events fall inside the lookback windows used by the analytics functions.
   */
  function hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000)
  }
  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  }

  describe('generateHeatmapData', () => {
    it('should create empty heatmap when no events', () => {
      const result = generateHeatmapData([])
      expect(result.data).toEqual(
        Array(7)
          .fill(0)
          .map(() => Array(24).fill(0)),
      )
      expect(result.maxCount).toBe(0)
    })

    it('should count comment creations in heatmap', () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const hour = now.getHours()

      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: now.toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
      ]

      const result = generateHeatmapData(events)
      expect(result.data[dayOfWeek]![hour]).toBe(1)
      expect(result.maxCount).toBe(1)
    })

    it('should ignore non-comment/post creations', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'user',
          action: 'created',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
      ]

      const result = generateHeatmapData(events)
      expect(result.maxCount).toBe(0)
    })

    it('should respect lookback period', () => {
      const oldEvent: ModerationEvent = {
        id: '1',
        timestamp: daysAgo(31).toISOString(), // 31 days ago
        contentType: 'comment',
        action: 'created',
        itemId: 1,
        userId: 1,
        blogId: 1,
      }

      const result = generateHeatmapData([oldEvent], {
        heatmapLookbackDays: 30,
      })
      expect(result.maxCount).toBe(0)
    })
  })

  describe('calculateSpamRatio', () => {
    it('should return zero ratio when no events', () => {
      const result = calculateSpamRatio([])
      expect(result.spamCount).toBe(0)
      expect(result.totalCount).toBe(0)
      expect(result.ratio).toBe(0)
      expect(result.percentage).toBe(0)
    })

    it('should calculate spam ratio correctly', () => {
      const halfHourAgo = hoursAgo(0.5)

      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: halfHourAgo.toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: halfHourAgo.toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 2,
          blogId: 1,
        },
        {
          id: '3',
          timestamp: halfHourAgo.toISOString(),
          contentType: 'comment',
          action: 'trashed',
          itemId: 3,
          userId: 3,
          blogId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(1)
      expect(result.totalCount).toBe(3)
      expect(result.ratio).toBe(1 / 3)
      expect(result.percentage).toBe(33)
    })

    it('should ignore events older than 1 hour', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(2).toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.totalCount).toBe(0)
    })
  })

  describe('generateContentTypeBreakdown', () => {
    it('should return empty array when no items', () => {
      const result = generateContentTypeBreakdown([])
      expect(result).toEqual([])
    })

    it('should break down content types correctly', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'comment',
          originalId: 1,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test comment 1',
          excerpt: 'Excerpt 1',
        },
        {
          id: '2',
          contentType: 'comment',
          originalId: 2,
          status: 'pending',
          spamScore: 0,
          authorId: 2,
          dateGmt: new Date().toISOString(),
          title: 'Test comment 2',
          excerpt: 'Excerpt 2',
        },
        {
          id: '3',
          contentType: 'post',
          originalId: 3,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test post',
          excerpt: 'Excerpt 3',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      expect(result.length).toBe(2)

      // Find comment entry
      const commentEntry = result.find((item) => item.contentType === 'comment')
      expect(commentEntry).toBeDefined()
      expect(commentEntry?.count).toBe(2)
      expect(commentEntry?.percentage).toBe(67) // 2/3 * 100 = 66.67 -> rounded to 67

      // Find post entry
      const postEntry = result.find((item) => item.contentType === 'post')
      expect(postEntry).toBeDefined()
      expect(postEntry?.count).toBe(1)
      expect(postEntry?.percentage).toBe(33) // 1/3 * 100 = 33.33 -> rounded to 33
    })

    it('should sort by count descending', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'comment',
          originalId: 1,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test comment 1',
          excerpt: 'Excerpt 1',
        },
        {
          id: '2',
          contentType: 'post',
          originalId: 2,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test post 1',
          excerpt: 'Excerpt 2',
        },
        {
          id: '3',
          contentType: 'post',
          originalId: 3,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test post 2',
          excerpt: 'Excerpt 3',
        },
        {
          id: '4',
          contentType: 'media',
          originalId: 4,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Test media',
          excerpt: 'Excerpt 4',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      // Should be: post (2), comment (1), media (1)
      expect(result[0]!.contentType).toBe('post')
      expect(result[0]!.count).toBe(2)
      expect(result[1]!.contentType).toBe('comment')
      expect(result[1]!.count).toBe(1)
      expect(result[2]!.contentType).toBe('media')
      expect(result[2]!.count).toBe(1)
    })
  })

  describe('generateModeratorPerformance', () => {
    it('should return empty array when no events', () => {
      const result = generateModeratorPerformance([])
      expect(result).toEqual([])
    })

    it('should calculate moderator performance correctly', () => {
      const threeDaysAgo = daysAgo(3)

      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: threeDaysAgo.toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '2',
          timestamp: threeDaysAgo.toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 2,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '3',
          timestamp: threeDaysAgo.toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 3,
          userId: 3,
          blogId: 1,
          moderatorId: 'mod2',
        },
        {
          id: '4',
          timestamp: threeDaysAgo.toISOString(),
          contentType: 'comment',
          action: 'trashed',
          itemId: 4,
          userId: 4,
          blogId: 1,
          moderatorId: 'mod1',
        },
      ]

      const moderatorNames = {
        mod1: 'Alice Moderator',
        mod2: 'Bob Moderator',
      }

      const result = generateModeratorPerformance(events, moderatorNames)
      expect(result.length).toBe(2)

      // Find mod1 (Alice)
      const mod1Result = result.find((item) => item.moderatorId === 'mod1')
      expect(mod1Result).toBeDefined()
      expect(mod1Result?.moderatorName).toBe('Alice Moderator')
      expect(mod1Result?.approvals).toBe(2)
      expect(mod1Result?.trashes).toBe(1)
      expect(mod1Result?.spamCount).toBe(0)
      expect(mod1Result?.totalActions).toBe(3)

      // Find mod2 (Bob)
      const mod2Result = result.find((item) => item.moderatorId === 'mod2')
      expect(mod2Result).toBeDefined()
      expect(mod2Result?.moderatorName).toBe('Bob Moderator')
      expect(mod2Result?.approvals).toBe(0)
      expect(mod2Result?.trashes).toBe(0)
      expect(mod2Result?.spamCount).toBe(1)
      expect(mod2Result?.totalActions).toBe(1)

      // Should be sorted by total actions descending (mod1 first)
      expect(result[0]!.moderatorId).toBe('mod1')
      expect(result[1]!.moderatorId).toBe('mod2')
    })

    it('should ignore events older than 1 week', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: daysAgo(14).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          blogId: 1,
          moderatorId: 'mod1',
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result.length).toBe(0)
    })

    it('should ignore system actions (no moderatorId)', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          blogId: 1,
          // No moderatorId
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result.length).toBe(0)
    })
  })

  describe('detectAnomalies', () => {
    it('should return empty array when no events', () => {
      const result = detectAnomalies([], [])
      expect(result).toEqual([])
    })

    it('should detect queue volume anomaly', () => {
      const events: ModerationEvent[] = Array(35)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: i,
          userId: i,
          blogId: 1,
        }))

      const result = detectAnomalies(events, [])
      expect(result.length).toBe(1)
      expect(result[0]!.type).toBe('queue_volume')
      expect(result[0]!.value).toBe(35)
      expect(result[0]!.threshold).toBe(30)
      expect(result[0]!.severity).toBe('medium') // 35 < 30*2
    })

    it('should detect high severity queue volume anomaly', () => {
      const events: ModerationEvent[] = Array(70)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: i,
          userId: i,
          blogId: 1,
        }))

      const result = detectAnomalies(events, [])
      expect(result.length).toBe(1)
      expect(result[0]!.severity).toBe('high') // 70 > 30*2
    })

    it('should detect spam ratio anomaly', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 2,
          userId: 2,
          blogId: 1,
        },
        {
          id: '3',
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 3,
          blogId: 1,
        },
      ]

      const result = detectAnomalies(events, [])
      expect(result.length).toBe(1)
      expect(result[0]!.type).toBe('spam_ratio')
      // 2 spammed out of 3 total = 0.667, which exceeds the 0.5 threshold
      expect(result[0]!.value).toBeCloseTo(0.667, 2)
      expect(result[0]!.threshold).toBe(0.5)
    })

    it('should detect moderator activity anomaly', () => {
      const events: ModerationEvent[] = Array(25)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: i,
          userId: i,
          blogId: 1,
          moderatorId: 'mod1',
        }))

      const result = detectAnomalies(events, [])
      expect(result.length).toBe(1)
      expect(result[0]!.type).toBe('moderator_activity')
      expect(result[0]!.value).toBe(25)
      expect(result[0]!.threshold).toBe(20)
    })
  })

  describe('processAnalytics', () => {
    it('should process all analytics components', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: hoursAgo(0.5).toISOString(),
          contentType: 'comment',
          action: 'spammed',
          itemId: 2,
          userId: 2,
          blogId: 1,
        },
        {
          id: '3',
          timestamp: hoursAgo(1.5).toISOString(),
          contentType: 'post',
          action: 'created',
          itemId: 3,
          userId: 1,
          blogId: 1,
        },
      ]

      const queueItems: QueueItem[] = [
        {
          id: '1',
          contentType: 'comment',
          originalId: 1,
          status: 'pending',
          spamScore: 0.8,
          authorId: 1,
          dateGmt: hoursAgo(0.5).toISOString(),
          title: 'Spammy comment',
          excerpt: 'This looks like spam',
        },
        {
          id: '2',
          contentType: 'post',
          originalId: 2,
          status: 'pending',
          spamScore: 0.1,
          authorId: 1,
          dateGmt: hoursAgo(1.5).toISOString(),
          title: 'Legitimate post',
          excerpt: 'This looks fine',
        },
      ]

      const moderatorNames = { mod1: 'Test Moderator' }

      const result = processAnalytics(events, queueItems, moderatorNames)

      // Check heatmap
      expect(result.heatmap.data).toBeDefined()
      expect(result.heatmap.maxCount).toBeGreaterThanOrEqual(0)

      // Check spam ratio
      expect(result.spamRatio.totalCount).toBe(1) // Only 1 moderation action in last hour
      expect(result.spamRatio.spamCount).toBe(1)
      expect(result.spamRatio.ratio).toBe(1)
      expect(result.spamRatio.percentage).toBe(100)

      // Check content type breakdown
      expect(result.contentTypeBreakdown.length).toBe(2)
      expect(
        result.contentTypeBreakdown.find(
          (item) => item.contentType === 'comment',
        )?.count,
      ).toBe(1)
      expect(
        result.contentTypeBreakdown.find((item) => item.contentType === 'post')
          ?.count,
      ).toBe(1)

      // Check moderator performance
      expect(result.moderatorPerformance.length).toBe(0) // No actions in last week

      // Check date range
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })

    it('should return empty analytics when no data', () => {
      const result = processAnalytics([], [])

      expect(result.heatmap.data).toEqual(
        Array(7)
          .fill(0)
          .map(() => Array(24).fill(0)),
      )
      expect(result.heatmap.maxCount).toBe(0)
      expect(result.spamRatio.totalCount).toBe(0)
      expect(result.spamRatio.spamCount).toBe(0)
      expect(result.contentTypeBreakdown).toEqual([])
      expect(result.moderatorPerformance).toEqual([])
      expect(result.anomalyAlerts).toEqual([])
    })
  })

  describe('getEmptyAnalytics', () => {
    it('should return empty analytics structure', () => {
      const result = getEmptyAnalytics()

      expect(result.heatmap.data).toEqual(
        Array(7)
          .fill(0)
          .map(() => Array(24).fill(0)),
      )
      expect(result.heatmap.maxCount).toBe(0)
      expect(result.spamRatio.totalCount).toBe(0)
      expect(result.spamRatio.spamCount).toBe(0)
      expect(result.contentTypeBreakdown).toEqual([])
      expect(result.moderatorPerformance).toEqual([])
      expect(result.anomalyAlerts).toEqual([])
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: Activity Log Filtering
  // --------------------------------------------------------------------------
  describe('filterActivityLog', () => {
    const baseEntries: ActivityLogEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        moderatorId: 'mod1',
        moderatorName: 'Alice',
        action: 'approved',
        contentType: 'comment',
        itemId: 101,
        itemTitle: 'Good comment',
        previousStatus: 'pending',
        newStatus: 'approved',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        moderatorId: 'mod2',
        moderatorName: 'Bob',
        action: 'spammed',
        contentType: 'post',
        itemId: 102,
        itemTitle: 'Spam post',
        previousStatus: 'pending',
        newStatus: 'spam',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        moderatorId: 'mod1',
        moderatorName: 'Alice',
        action: 'rejected',
        contentType: 'comment',
        itemId: 103,
        itemTitle: 'Bad comment',
        previousStatus: 'pending',
        newStatus: 'trash',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        moderatorId: 'mod3',
        moderatorName: 'Charlie',
        action: 'approved',
        contentType: 'media',
        itemId: 104,
        itemTitle: 'Image upload',
      },
    ]

    it('should return all entries when no filter is provided', () => {
      const result = filterActivityLog(baseEntries)
      expect(result.length).toBe(4)
    })

    it('should filter by moderator IDs', () => {
      const result = filterActivityLog(baseEntries, { moderatorIds: ['mod1'] })
      expect(result.length).toBe(2)
      expect(result[0]!.moderatorId).toBe('mod1')
    })

    it('should filter by action types', () => {
      const result = filterActivityLog(baseEntries, { actions: ['spammed'] })
      expect(result.length).toBe(1)
      expect(result[0]!.action).toBe('spammed')
    })

    it('should filter by content types', () => {
      const result = filterActivityLog(baseEntries, {
        contentTypes: ['comment'],
      })
      expect(result.length).toBe(2)
    })

    it('should filter by date range', () => {
      // Use a slightly earlier cutoff to ensure we include the entries
      const cutoff = new Date(Date.now() - 11000000).toISOString() // ~3 hours ago
      const result = filterActivityLog(baseEntries, { dateFrom: cutoff })
      // Should include entries 1, 2, 3 (all within the last 3 hours)
      expect(result.length).toBe(3)
    })

    it('should search by item title', () => {
      const result = filterActivityLog(baseEntries, { search: 'spam' })
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('2')
    })

    it('should search by moderator name', () => {
      const result = filterActivityLog(baseEntries, { search: 'alice' })
      expect(result.length).toBe(2)
    })

    it('should sort results newest first', () => {
      const result = filterActivityLog(baseEntries)
      expect(result[0]!.id).toBe('1') // most recent
      expect(result[3]!.id).toBe('4') // oldest
    })

    it('should respect limit parameter', () => {
      const result = filterActivityLog(baseEntries, { limit: 2 })
      expect(result.length).toBe(2)
    })

    it('should respect offset parameter', () => {
      const result = filterActivityLog(baseEntries, { offset: 2, limit: 10 })
      expect(result.length).toBe(2) // 2 remaining after skipping 2
    })

    it('should return empty array when no entries match', () => {
      const result = filterActivityLog(baseEntries, { search: 'nonexistent' })
      expect(result.length).toBe(0)
    })

    it('should handle empty entries array', () => {
      const result = filterActivityLog([])
      expect(result).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: Trend Calculation
  // --------------------------------------------------------------------------
  describe('calculateTrend', () => {
    const now = Date.now()
    const hourMs = 3600000

    // Create events: 5 in current period, 3 in previous period
    const events: ModerationEvent[] = [
      {
        id: '1',
        timestamp: new Date(now - hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 1,
        userId: 1,
      },
      {
        id: '2',
        timestamp: new Date(now - 2 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 2,
        userId: 1,
      },
      {
        id: '3',
        timestamp: new Date(now - 3 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 3,
        userId: 1,
      },
      {
        id: '4',
        timestamp: new Date(now - 4 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 4,
        userId: 1,
      },
      {
        id: '5',
        timestamp: new Date(now - 5 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 5,
        userId: 1,
      },
      // Previous period (hours 6-10)
      {
        id: '6',
        timestamp: new Date(now - 6 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 6,
        userId: 1,
      },
      {
        id: '7',
        timestamp: new Date(now - 7 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 7,
        userId: 1,
      },
      {
        id: '8',
        timestamp: new Date(now - 8 * hourMs).toISOString(),
        contentType: 'comment',
        action: 'spammed',
        itemId: 8,
        userId: 1,
      },
    ]

    it('should calculate up trend correctly', () => {
      const currentStart = new Date(now - 5 * hourMs).toISOString()
      const trend = calculateTrend(
        events,
        (e) => e.action === 'spammed',
        currentStart,
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(5)
      expect(trend.previousValue).toBe(3)
      expect(trend.change).toBe(2)
      expect(trend.percentageChange).toBeGreaterThan(0)
      expect(trend.direction).toBe('up')
    })

    it('should calculate down trend correctly', () => {
      // Reverse the counts: fewer in current period
      const reversedEvents: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date(now - hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
        },
        {
          id: '2',
          timestamp: new Date(now - 6 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 1,
        },
        {
          id: '3',
          timestamp: new Date(now - 7 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 1,
        },
        {
          id: '4',
          timestamp: new Date(now - 8 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 4,
          userId: 1,
        },
      ]
      const currentStart = new Date(now - 5 * hourMs).toISOString()
      const trend = calculateTrend(
        reversedEvents,
        (e) => e.action === 'approved',
        currentStart,
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(1)
      expect(trend.previousValue).toBe(3)
      expect(trend.change).toBe(-2)
      expect(trend.direction).toBe('down')
    })

    it('should return stable when change is within threshold', () => {
      const stableEvents: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date(now - hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
        },
        {
          id: '2',
          timestamp: new Date(now - 2 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 1,
        },
        {
          id: '3',
          timestamp: new Date(now - 6 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 1,
        },
        {
          id: '4',
          timestamp: new Date(now - 7 * hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 4,
          userId: 1,
        },
      ]
      const currentStart = new Date(now - 5 * hourMs).toISOString()
      const trend = calculateTrend(
        stableEvents,
        (e) => e.action === 'approved',
        currentStart,
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.direction).toBe('stable')
      expect(Math.abs(trend.percentageChange)).toBeLessThanOrEqual(5)
    })

    it('should handle empty events array', () => {
      const trend = calculateTrend([], () => true, new Date().toISOString())
      expect(trend.currentValue).toBe(0)
      expect(trend.previousValue).toBe(0)
      expect(trend.change).toBe(0)
      expect(trend.direction).toBe('stable')
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: Date Range for Period
  // --------------------------------------------------------------------------
  describe('getDateRangeForPeriod', () => {
    it('should return range for today', () => {
      const range = getDateRangeForPeriod('today')
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      const startDate = new Date(range.start)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
    })

    it('should return range for yesterday', () => {
      const range = getDateRangeForPeriod('yesterday')
      const startDate = new Date(range.start)
      const endDate = new Date(range.end)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
      // End should be start of today
      expect(endDate.getTime() - startDate.getTime()).toBe(86400000)
    })

    it('should return range for last 7 days', () => {
      const range = getDateRangeForPeriod('last7days')
      const diff =
        new Date(range.end).getTime() - new Date(range.start).getTime()
      expect(diff).toBeGreaterThanOrEqual(6 * 86400000) // at least 6 days
      expect(diff).toBeLessThanOrEqual(8 * 86400000) // at most 8 days
    })

    it('should return range for last 30 days', () => {
      const range = getDateRangeForPeriod('last30days')
      const diff =
        new Date(range.end).getTime() - new Date(range.start).getTime()
      expect(diff).toBeGreaterThanOrEqual(29 * 86400000)
      expect(diff).toBeLessThanOrEqual(31 * 86400000)
    })

    it('should return range for last 90 days', () => {
      const range = getDateRangeForPeriod('last90days')
      const diff =
        new Date(range.end).getTime() - new Date(range.start).getTime()
      expect(diff).toBeGreaterThanOrEqual(89 * 86400000)
      expect(diff).toBeLessThanOrEqual(91 * 86400000)
    })

    it('should return range for all time', () => {
      const range = getDateRangeForPeriod('all')
      expect(new Date(range.start).getTime()).toBe(0)
    })
  })
})
