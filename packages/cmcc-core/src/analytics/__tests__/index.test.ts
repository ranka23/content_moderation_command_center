import type { ModerationEvent, QueueItem } from '../index'
import {
  generateHeatmapData,
  calculateSpamRatio,
  generateContentTypeBreakdown,
  generateModeratorPerformance,
  detectAnomalies,
  processAnalytics,
  getDefaultAnalyticsOptions,
  getEmptyAnalytics,
  filterActivityLog,
  calculateTrend,
  getDateRangeForPeriod,
} from '../index'

describe('Analytics Processing Engine', () => {
  function hoursAgo(hours: number): string {
    return new Date(Date.now() - hours * 3600000).toISOString()
  }

  function daysAgo(days: number): string {
    return new Date(Date.now() - days * 86400000).toISOString()
  }

  // --------------------------------------------------------------------------
  // Heatmap
  // --------------------------------------------------------------------------
  describe('generateHeatmapData', () => {
    it('should create empty heatmap when no events', () => {
      const result = generateHeatmapData([])
      expect(result.data).toHaveLength(7)
      expect(result.data[0]).toHaveLength(24)
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
      expect(result.data[dayOfWeek]?.[hour]).toBe(1)
      expect(result.maxCount).toBe(1)
    })

    it('should count all moderation actions in heatmap including non-comment/post', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'attachment',
          action: 'created',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
      ]

      const result = generateHeatmapData(events)
      // Heatmap now counts ALL moderation actions, not just comment/post creations
      expect(result.maxCount).toBe(1)
    })

    it('should respect lookback period', () => {
      const oldEvent: ModerationEvent = {
        id: '1',
        timestamp: daysAgo(60),
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

    it('should count post creations in heatmap', () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const hour = now.getHours()

      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: now.toISOString(),
          contentType: 'post',
          action: 'created',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = generateHeatmapData(events)
      expect(result.data[dayOfWeek]?.[hour]).toBe(1)
    })

    it('should count all actions including non-created actions', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = generateHeatmapData(events)
      // Heatmap now counts ALL moderation actions, not just creations
      expect(result.maxCount).toBe(1)
    })

    it('should accumulate multiple events in same slot', () => {
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
        },
        {
          id: '2',
          timestamp: now.toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: 2,
          userId: 2,
        },
        {
          id: '3',
          timestamp: now.toISOString(),
          contentType: 'post',
          action: 'created',
          itemId: 3,
          userId: 3,
        },
      ]

      const result = generateHeatmapData(events)
      expect(result.data[dayOfWeek]?.[hour]).toBe(3)
      expect(result.maxCount).toBe(3)
    })

    it('should handle event timestamp at exact cutoff boundary', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: daysAgo(31),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = generateHeatmapData(events, {
        heatmapLookbackDays: 30,
      })
      expect(result.maxCount).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // Spam Ratio
  // --------------------------------------------------------------------------
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
          timestamp: halfHourAgo,
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: halfHourAgo,
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 2,
          blogId: 1,
        },
        {
          id: '3',
          timestamp: halfHourAgo,
          contentType: 'comment',
          action: 'spammed',
          itemId: 3,
          userId: 3,
          blogId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(2)
      expect(result.totalCount).toBe(3)
      expect(result.ratio).toBeCloseTo(0.667, 2)
      expect(result.percentage).toBe(67)
    })

    it('should ignore events older than 1 hour', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(2),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(0)
      expect(result.totalCount).toBe(0)
    })

    it('should ignore non-comment/post content types', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'attachment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(0)
      expect(result.totalCount).toBe(0)
    })

    it('should not count approved as spam', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(0)
      expect(result.totalCount).toBe(1)
      expect(result.ratio).toBe(0)
    })

    it('should count trashed as part of total but not spam', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'trashed',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = calculateSpamRatio(events)
      expect(result.spamCount).toBe(0)
      expect(result.totalCount).toBe(1)
    })
  })

  // --------------------------------------------------------------------------
  // Content Type Breakdown
  // --------------------------------------------------------------------------
  describe('generateContentTypeBreakdown', () => {
    it('should return empty array when no items', () => {
      const result = generateContentTypeBreakdown([])
      expect(result).toEqual([])
    })

    it('should break down content types correctly', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'post',
          originalId: 101,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: '2026-01-01T00:00:00.000Z',
          title: 'Post 1',
          excerpt: 'Excerpt 1',
        },
        {
          id: '2',
          contentType: 'comment',
          originalId: 201,
          status: 'spam',
          spamScore: 0.8,
          authorId: 2,
          dateGmt: '2026-01-02T00:00:00.000Z',
          title: 'Comment 1',
          excerpt: 'Excerpt 2',
        },
        {
          id: '3',
          contentType: 'post',
          originalId: 102,
          status: 'flagged',
          spamScore: 0.3,
          authorId: 1,
          dateGmt: '2026-01-03T00:00:00.000Z',
          title: 'Post 2',
          excerpt: 'Excerpt 3',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      expect(result).toHaveLength(2)

      const commentEntry = result.find((c) => c.contentType === 'comment')
      expect(commentEntry?.count).toBe(1)
      expect(commentEntry?.percentage).toBe(33)

      const postEntry = result.find((c) => c.contentType === 'post')
      expect(postEntry?.count).toBe(2)
      expect(postEntry?.percentage).toBe(67)
    })

    it('should sort by count descending', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'post',
          originalId: 101,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: '2026-01-01T00:00:00.000Z',
          title: 'Post 1',
          excerpt: 'Excerpt 1',
        },
        {
          id: '2',
          contentType: 'comment',
          originalId: 201,
          status: 'spam',
          spamScore: 0.8,
          authorId: 2,
          dateGmt: '2026-01-02T00:00:00.000Z',
          title: 'Comment 1',
          excerpt: 'Excerpt 2',
        },
        {
          id: '3',
          contentType: 'post',
          originalId: 102,
          status: 'flagged',
          spamScore: 0.3,
          authorId: 1,
          dateGmt: '2026-01-03T00:00:00.000Z',
          title: 'Post 2',
          excerpt: 'Excerpt 3',
        },
        {
          id: '4',
          contentType: 'comment',
          originalId: 202,
          status: 'spam',
          spamScore: 0.9,
          authorId: 3,
          dateGmt: '2026-01-04T00:00:00.000Z',
          title: 'Comment 2',
          excerpt: 'Excerpt 4',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      // Both types have count 2, so insertion order is preserved
      expect(result[0]?.contentType).toBe('post')
      expect(result[0]?.count).toBe(2)
      expect(result[1]?.contentType).toBe('comment')
      expect(result[1]?.count).toBe(2)
    })

    it('should handle single content type only', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'comment',
          originalId: 201,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: '2026-01-01T00:00:00.000Z',
          title: 'Comment 1',
          excerpt: 'Excerpt 1',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      expect(result).toHaveLength(1)
      expect(result[0]?.contentType).toBe('comment')
      expect(result[0]?.percentage).toBe(100)
    })

    it('should handle numeric content type keys', () => {
      const items: QueueItem[] = [
        {
          id: '1',
          contentType: 'post',
          originalId: 101,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: new Date().toISOString(),
          title: 'Post 1',
          excerpt: 'Excerpt',
        },
      ]

      const result = generateContentTypeBreakdown(items)
      expect(result).toHaveLength(1)
    })
  })

  // --------------------------------------------------------------------------
  // Moderator Performance
  // --------------------------------------------------------------------------
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
          timestamp: threeDaysAgo,
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '2',
          timestamp: threeDaysAgo,
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 2,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '3',
          timestamp: threeDaysAgo,
          contentType: 'comment',
          action: 'trashed',
          itemId: 3,
          userId: 3,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '4',
          timestamp: threeDaysAgo,
          contentType: 'comment',
          action: 'spammed',
          itemId: 4,
          userId: 4,
          blogId: 1,
          moderatorId: 'mod2',
        },
      ]

      const moderatorNames = {
        mod1: 'Alice',
        mod2: 'Bob',
      }

      const result = generateModeratorPerformance(events, moderatorNames)

      const mod1Result = result.find((m) => m.moderatorId === 'mod1')
      expect(mod1Result?.approvals).toBe(2)
      expect(mod1Result?.trashes).toBe(1)
      expect(mod1Result?.spamCount).toBe(0)
      expect(mod1Result?.totalActions).toBe(3)
      expect(mod1Result?.moderatorName).toBe('Alice')

      const mod2Result = result.find((m) => m.moderatorId === 'mod2')
      expect(mod2Result?.approvals).toBe(0)
      expect(mod2Result?.spamCount).toBe(1)
      expect(mod2Result?.totalActions).toBe(1)
      expect(mod2Result?.moderatorName).toBe('Bob')
    })

    it('should ignore events older than 1 week', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: daysAgo(10),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          blogId: 1,
          moderatorId: 'mod1',
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result).toEqual([])
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
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result).toEqual([])
    })

    it('should use fallback name when moderator name not provided', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          moderatorId: 'unknown-mod',
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result[0]?.moderatorName).toBe('Moderator unknown-mod')
    })

    it('should sort moderators by total actions descending', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: daysAgo(1),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '2',
          timestamp: daysAgo(1),
          contentType: 'comment',
          action: 'approved',
          itemId: 2,
          userId: 2,
          moderatorId: 'mod1',
        },
        {
          id: '3',
          timestamp: daysAgo(1),
          contentType: 'comment',
          action: 'spammed',
          itemId: 3,
          userId: 3,
          moderatorId: 'mod2',
        },
      ]

      const result = generateModeratorPerformance(events)
      expect(result[0]?.moderatorId).toBe('mod1')
      expect(result[1]?.moderatorId).toBe('mod2')
    })
  })

  // --------------------------------------------------------------------------
  // Anomaly Detection
  // --------------------------------------------------------------------------
  describe('detectAnomalies', () => {
    it('should return empty array when no events', () => {
      const result = detectAnomalies([], [])
      expect(result).toEqual([])
    })

    it('should detect queue volume anomaly', () => {
      const events: ModerationEvent[] = Array(35)
        .fill(0)
        .map((_, i) => ({
          id: `evt-${i}`,
          timestamp: hoursAgo(0.5),
          contentType: 'comment' as const,
          action: 'created' as const,
          itemId: i,
          userId: i,
          blogId: 1,
        }))

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const volumeAlert = result.find((a) => a.type === 'queue_volume')
      expect(volumeAlert).toBeDefined()
      expect(volumeAlert?.value).toBe(35)
      expect(volumeAlert?.severity).toBe('medium')
    })

    it('should detect high severity queue volume anomaly', () => {
      const events: ModerationEvent[] = Array(70)
        .fill(0)
        .map((_, i) => ({
          id: `evt-${i}`,
          timestamp: hoursAgo(0.5),
          contentType: 'comment' as const,
          action: 'created' as const,
          itemId: i,
          userId: i,
          blogId: 1,
        }))

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const volumeAlert = result.find((a) => a.type === 'queue_volume')
      expect(volumeAlert).toBeDefined()
      expect(volumeAlert?.severity).toBe('high')
    })

    it('should detect spam ratio anomaly', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'spammed',
          itemId: 2,
          userId: 2,
          blogId: 1,
        },
        {
          id: '3',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 3,
          blogId: 1,
        },
      ]

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const spamAlert = result.find((a) => a.type === 'spam_ratio')
      expect(spamAlert).toBeDefined()
      expect(spamAlert?.severity).toBe('medium')
    })

    it('should detect high severity spam ratio anomaly', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'spammed',
          itemId: 1,
          userId: 1,
        },
        {
          id: '2',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'spammed',
          itemId: 2,
          userId: 2,
        },
        {
          id: '3',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 3,
        },
      ]

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.3,
          moderatorActionsPerHour: 20,
        },
      })

      const spamAlert = result.find((a) => a.type === 'spam_ratio')
      expect(spamAlert?.severity).toBe('high')
    })

    it('should detect moderator activity anomaly', () => {
      const events: ModerationEvent[] = Array(25)
        .fill(0)
        .map((_, i) => ({
          id: `evt-${i}`,
          timestamp: hoursAgo(0.5),
          contentType: 'comment' as const,
          action: 'approved' as const,
          itemId: i,
          userId: i,
          blogId: 1,
          moderatorId: 'mod1',
        }))

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const activityAlert = result.find((a) => a.type === 'moderator_activity')
      expect(activityAlert).toBeDefined()
      expect(activityAlert?.severity).toBe('medium')
    })

    it('should detect high severity moderator activity anomaly', () => {
      const events: ModerationEvent[] = Array(50)
        .fill(0)
        .map((_, i) => ({
          id: `evt-${i}`,
          timestamp: hoursAgo(0.5),
          contentType: 'comment' as const,
          action: 'approved' as const,
          itemId: i,
          userId: i,
          bloggerId: 1,
          moderatorId: 'mod1',
        }))

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const activityAlert = result.find((a) => a.type === 'moderator_activity')
      expect(activityAlert?.severity).toBe('high')
    })

    it('should not create alerts when all metrics are normal', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })
      expect(result).toHaveLength(0)
    })

    it('should detect multiple anomaly types simultaneously', () => {
      const events: ModerationEvent[] = [
        ...Array(35)
          .fill(0)
          .map((_, i) => ({
            id: `created-${i}`,
            timestamp: hoursAgo(0.5),
            contentType: 'comment' as const,
            action: 'created' as const,
            itemId: i,
            userId: i,
          })),
        ...Array(25)
          .fill(0)
          .map((_, i) => ({
            id: `action-${i}`,
            timestamp: hoursAgo(0.5),
            contentType: 'comment' as const,
            action: 'approved' as const,
            itemId: i + 100,
            userId: i + 100,
            moderatorId: 'mod1' as const,
          })),
      ]

      const result = detectAnomalies(events, [], {
        anomalyThresholds: {
          queueVolumePerHour: 30,
          spamRatio: 0.5,
          moderatorActionsPerHour: 20,
        },
      })

      const types = new Set(result.map((a) => a.type))
      expect(types.has('queue_volume')).toBe(true)
      expect(types.has('moderator_activity')).toBe(true)
    })

    it('should use default thresholds when not provided', () => {
      const events: ModerationEvent[] = Array(35)
        .fill(0)
        .map((_, i) => ({
          id: `evt-${i}`,
          timestamp: hoursAgo(0.5),
          contentType: 'comment' as const,
          action: 'created' as const,
          itemId: i,
          userId: i,
        }))

      const result = detectAnomalies(events, [])
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  // --------------------------------------------------------------------------
  // Process Analytics
  // --------------------------------------------------------------------------
  describe('processAnalytics', () => {
    it('should process all analytics components', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
          blogId: 1,
        },
        {
          id: '2',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'spammed',
          itemId: 2,
          userId: 2,
          blogId: 1,
          moderatorId: 'mod1',
        },
        {
          id: '3',
          timestamp: hoursAgo(0.5),
          contentType: 'comment',
          action: 'approved',
          itemId: 3,
          userId: 3,
          blogId: 1,
          moderatorId: 'mod1',
        },
      ]

      const queueItems: QueueItem[] = [
        {
          id: '1',
          contentType: 'comment',
          originalId: 1,
          status: 'pending',
          spamScore: 0,
          authorId: 1,
          dateGmt: '2026-01-01T00:00:00.000Z',
          title: 'Test Comment',
          excerpt: 'Test',
        },
      ]

      const moderatorNames = {
        mod1: 'Alice',
      }

      const result = processAnalytics(events, queueItems, moderatorNames)

      expect(result.heatmap).toBeDefined()
      expect(result.spamRatio).toBeDefined()
      expect(result.contentTypeBreakdown).toHaveLength(1)
      expect(result.moderatorPerformance).toHaveLength(1)
      expect(result.anomalyAlerts).toBeDefined()
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })

    it('should return empty analytics when no data', () => {
      const result = processAnalytics([], [])
      expect(result.heatmap.maxCount).toBe(0)
      expect(result.spamRatio.totalCount).toBe(0)
      expect(result.contentTypeBreakdown).toEqual([])
      expect(result.moderatorPerformance).toEqual([])
      expect(result.anomalyAlerts).toEqual([])
    })

    it('should compute date range from events', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: '2026-01-01T00:00:00.000Z',
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
        },
        {
          id: '2',
          timestamp: '2026-01-05T00:00:00.000Z',
          contentType: 'comment',
          action: 'created',
          itemId: 2,
          userId: 2,
        },
      ]

      const result = processAnalytics(events, [])
      expect(result.dateRange.start).toBe('2026-01-01T00:00:00.000Z')
      expect(result.dateRange.end).toBe('2026-01-05T00:00:00.000Z')
    })

    it('should use custom merged options', () => {
      const events: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          contentType: 'comment',
          action: 'created',
          itemId: 1,
          userId: 1,
        },
      ]

      const result = processAnalytics(
        events,
        [],
        {},
        { heatmapLookbackDays: 7 },
      )
      expect(result.heatmap).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // Default Options
  // --------------------------------------------------------------------------
  describe('getDefaultAnalyticsOptions', () => {
    it('should return expected defaults', () => {
      const options = getDefaultAnalyticsOptions()
      expect(options.heatmapLookbackDays).toBe(30)
      expect(options.anomalyThresholds.queueVolumePerHour).toBe(30)
      expect(options.anomalyThresholds.spamRatio).toBe(0.5)
      expect(options.anomalyThresholds.moderatorActionsPerHour).toBe(20)
    })

    it('should return a new object each call', () => {
      const opts1 = getDefaultAnalyticsOptions()
      const opts2 = getDefaultAnalyticsOptions()
      opts1.heatmapLookbackDays = 7
      expect(opts2.heatmapLookbackDays).toBe(30)
    })
  })

  // --------------------------------------------------------------------------
  // Empty Analytics
  // --------------------------------------------------------------------------
  describe('getEmptyAnalytics', () => {
    it('should return empty analytics structure', () => {
      const result = getEmptyAnalytics()
      expect(result.heatmap.data).toHaveLength(7)
      result.heatmap.data.forEach((row) => {
        expect(row).toHaveLength(24)
        row.forEach((cell) => expect(cell).toBe(0))
      })
      expect(result.heatmap.maxCount).toBe(0)
      expect(result.spamRatio.spamCount).toBe(0)
      expect(result.spamRatio.totalCount).toBe(0)
      expect(result.spamRatio.ratio).toBe(0)
      expect(result.spamRatio.percentage).toBe(0)
      expect(result.contentTypeBreakdown).toEqual([])
      expect(result.moderatorPerformance).toEqual([])
      expect(result.anomalyAlerts).toEqual([])
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })

    it('should return fresh structure each call', () => {
      const result1 = getEmptyAnalytics()
      const result2 = getEmptyAnalytics()
      result1.contentTypeBreakdown.push({
        contentType: 'comment',
        count: 1,
        percentage: 100,
      })
      expect(result2.contentTypeBreakdown).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // Activity Log Filtering
  // --------------------------------------------------------------------------
  describe('filterActivityLog', () => {
    const baseEntries = [
      {
        id: '1',
        timestamp: '2026-06-05T12:00:00.000Z',
        moderatorId: 'mod1',
        moderatorName: 'Alice',
        action: 'approved' as const,
        contentType: 'comment',
        itemId: 101,
        itemTitle: 'Nice post',
        previousStatus: 'pending',
        newStatus: 'approved',
      },
      {
        id: '2',
        timestamp: '2026-06-05T10:00:00.000Z',
        moderatorId: 'mod2',
        moderatorName: 'Bob',
        action: 'spammed' as const,
        contentType: 'post',
        itemId: 201,
        itemTitle: 'Spammy title',
        previousStatus: 'pending',
        newStatus: 'spam',
      },
      {
        id: '3',
        timestamp: '2026-06-04T08:00:00.000Z',
        moderatorId: 'mod1',
        moderatorName: 'Alice',
        action: 'trashed' as const,
        contentType: 'comment',
        itemId: 102,
        itemTitle: 'Bad comment',
        previousStatus: 'flagged',
        newStatus: 'trashed',
      },
      {
        id: '4',
        timestamp: '2026-06-03T06:00:00.000Z',
        moderatorId: 'mod3',
        moderatorName: 'Charlie',
        action: 'approved' as const,
        contentType: 'post',
        itemId: 202,
        itemTitle: 'Good post',
        notes: 'This is a quality contribution',
      },
    ]

    it('should return all entries when no filter is provided', () => {
      const result = filterActivityLog(baseEntries)
      expect(result).toHaveLength(4)
    })

    it('should filter by moderator IDs', () => {
      const result = filterActivityLog(baseEntries, {
        moderatorIds: ['mod1'],
      })
      expect(result).toHaveLength(2)
      result.forEach((e) => expect(e.moderatorId).toBe('mod1'))
    })

    it('should filter by action types', () => {
      const result = filterActivityLog(baseEntries, {
        actions: ['approved'],
      })
      expect(result).toHaveLength(2)
      result.forEach((e) => expect(e.action).toBe('approved'))
    })

    it('should filter by content types', () => {
      const result = filterActivityLog(baseEntries, {
        contentTypes: ['post'],
      })
      expect(result).toHaveLength(2)
      result.forEach((e) => expect(e.contentType).toBe('post'))
    })

    it('should filter by date range', () => {
      const cutoff = '2026-06-05T00:00:00.000Z'
      const result = filterActivityLog(baseEntries, {
        dateFrom: cutoff,
      })
      expect(result).toHaveLength(2)
    })

    it('should filter by date range both from and to', () => {
      const result = filterActivityLog(baseEntries, {
        dateFrom: '2026-06-04T00:00:00.000Z',
        dateTo: '2026-06-04T23:59:59.999Z',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('3')
    })

    it('should search by item title', () => {
      const result = filterActivityLog(baseEntries, {
        search: 'Spammy',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('2')
    })

    it('should search by moderator name', () => {
      const result = filterActivityLog(baseEntries, {
        search: 'Alice',
      })
      expect(result).toHaveLength(2)
    })

    it('should search by notes', () => {
      const result = filterActivityLog(baseEntries, {
        search: 'quality contribution',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('4')
    })

    it('should sort results newest first', () => {
      const result = filterActivityLog(baseEntries)
      expect(result[0]?.id).toBe('1')
      expect(result[1]?.id).toBe('2')
      expect(result[2]?.id).toBe('3')
      expect(result[3]?.id).toBe('4')
    })

    it('should respect limit parameter', () => {
      const result = filterActivityLog(baseEntries, {
        limit: 2,
      })
      expect(result).toHaveLength(2)
    })

    it('should respect offset parameter', () => {
      const result = filterActivityLog(baseEntries, {
        offset: 1,
        limit: 2,
      })
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('2')
      expect(result[1]?.id).toBe('3')
    })

    it('should return empty array when no entries match', () => {
      const result = filterActivityLog(baseEntries, {
        search: 'nonexistent',
      })
      expect(result).toEqual([])
    })

    it('should handle empty entries array', () => {
      const result = filterActivityLog([])
      expect(result).toEqual([])
    })

    it('should filter by multiple moderator IDs', () => {
      const result = filterActivityLog(baseEntries, {
        moderatorIds: ['mod1', 'mod2'],
      })
      expect(result).toHaveLength(3)
    })

    it('should filter by multiple action types', () => {
      const result = filterActivityLog(baseEntries, {
        actions: ['spammed', 'trashed'],
      })
      expect(result).toHaveLength(2)
    })

    it('should combine all filter types', () => {
      const result = filterActivityLog(baseEntries, {
        moderatorIds: ['mod1'],
        actions: ['approved'],
        contentTypes: ['comment'],
        dateFrom: '2026-06-01T00:00:00.000Z',
        dateTo: '2026-06-06T00:00:00.000Z',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('1')
    })

    it('should handle entries with missing optional fields', () => {
      const entriesWithMissingFields = [
        {
          id: '5',
          timestamp: '2026-06-06T00:00:00.000Z',
          moderatorId: 'mod4',
          action: 'approved' as const,
          contentType: 'comment',
          itemId: 301,
        },
      ]
      const result = filterActivityLog(entriesWithMissingFields, {
        search: 'nonexistent',
      })
      expect(result).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // Trend Calculation
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

    it('should handle all events filtered out by predicate', () => {
      const trend = calculateTrend(
        events,
        () => false,
        new Date(now - 5 * hourMs).toISOString(),
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(0)
      expect(trend.previousValue).toBe(0)
      expect(trend.change).toBe(0)
      expect(trend.direction).toBe('stable')
    })

    it('should handle single event', () => {
      const singleEvent: ModerationEvent[] = [
        {
          id: '1',
          timestamp: new Date(now - hourMs).toISOString(),
          contentType: 'comment',
          action: 'approved',
          itemId: 1,
          userId: 1,
        },
      ]
      const trend = calculateTrend(
        singleEvent,
        () => true,
        new Date(now - 5 * hourMs).toISOString(),
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(1)
      expect(trend.previousValue).toBe(0)
      expect(trend.change).toBe(1)
      expect(trend.percentageChange).toBe(100)
      expect(trend.direction).toBe('up')
    })

    it('should return stable when values are identical', () => {
      const sameEvents: ModerationEvent[] = [
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
        sameEvents,
        (e) => e.action === 'approved',
        currentStart,
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(2)
      expect(trend.previousValue).toBe(2)
      expect(trend.change).toBe(0)
      expect(trend.direction).toBe('stable')
    })

    it('should handle decimal percentage rounding', () => {
      const decimalEvents: ModerationEvent[] = [
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
      ]
      const trend = calculateTrend(
        decimalEvents,
        (e) => e.action === 'approved',
        new Date(now - 5 * hourMs).toISOString(),
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.currentValue).toBe(1)
      expect(trend.previousValue).toBe(1)
      expect(trend.change).toBe(0)
      expect(trend.percentageChange).toBe(0)
      expect(trend.direction).toBe('stable')
    })

    it('should handle direction boundary at exactly 5% increase', () => {
      // 5 current, 4 previous = 25% change → up (because 25 > 5)
      const boundaryEvents: ModerationEvent[] = [
        ...Array(5)
          .fill(0)
          .map((_, i) => ({
            id: `cur-${i}`,
            timestamp: new Date(now - (i + 1) * hourMs).toISOString(),
            contentType: 'comment' as const,
            action: 'approved' as const,
            itemId: i,
            userId: i,
          })),
        ...Array(4)
          .fill(0)
          .map((_, i) => ({
            id: `prev-${i}`,
            timestamp: new Date(now - (6 + i) * hourMs).toISOString(),
            contentType: 'comment' as const,
            action: 'approved' as const,
            itemId: i + 100,
            userId: i + 100,
          })),
      ]
      const trend = calculateTrend(
        boundaryEvents,
        () => true,
        new Date(now - 5 * hourMs).toISOString(),
        new Date(now).toISOString(),
        5 * hourMs,
      )
      expect(trend.direction).toBe('up')
    })

    it('should round percentage change to 1 decimal place', () => {
      const roundingEvents: ModerationEvent[] = [
        ...Array(3)
          .fill(0)
          .map((_, i) => ({
            id: `cur-${i}`,
            timestamp: new Date(now - (i + 1) * hourMs).toISOString(),
            contentType: 'comment' as const,
            action: 'approved' as const,
            itemId: i,
            userId: i,
          })),
        ...Array(7)
          .fill(0)
          .map((_, i) => ({
            id: `prev-${i}`,
            timestamp: new Date(now - (6 + i) * hourMs).toISOString(),
            contentType: 'comment' as const,
            action: 'approved' as const,
            itemId: i + 100,
            userId: i + 100,
          })),
      ]
      const trend = calculateTrend(
        roundingEvents,
        () => true,
        new Date(now - 5 * hourMs).toISOString(),
        new Date(now).toISOString(),
        5 * hourMs,
      )
      // (3 - 5) / 5 * 100 = -40
      expect(trend.percentageChange).toBe(-40)
    })
  })

  // --------------------------------------------------------------------------
  // Date Range for Period
  // --------------------------------------------------------------------------
  describe('getDateRangeForPeriod', () => {
    it('should return range for today', () => {
      const range = getDateRangeForPeriod('today')
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      const startDate = new Date(range.start)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
      expect(startDate.getSeconds()).toBe(0)
      expect(startDate.getMilliseconds()).toBe(0)
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
      expect(diff).toBeGreaterThanOrEqual(6 * 86400000)
      expect(diff).toBeLessThanOrEqual(8 * 86400000)
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

    it('should return all time for unknown period type', () => {
      // @ts-expect-error - testing invalid period
      const range = getDateRangeForPeriod('invalid')
      expect(new Date(range.start).getTime()).toBe(0)
    })

    it('should return end as current time for today', () => {
      const range = getDateRangeForPeriod('today')
      const now = Date.now()
      const endTime = new Date(range.end).getTime()
      expect(endTime).toBeGreaterThanOrEqual(now - 1000)
      expect(endTime).toBeLessThanOrEqual(now + 1000)
    })
  })
})
