/**
 * Integration test: Full moderation pipeline
 *
 * Tests the complete flow from enqueuing items, running them through
 * firewall evaluation, updating statuses, recording activity logs,
 * and generating analytics.
 */

import type { ModerationEvent, QueueItem, ActivityLogEntry } from '../analytics'
import type { FirewallResult } from '../firewall'
import { QueueManager } from '../queues'
import { evaluateFirewallRules } from '../firewall'
import {
  processAnalytics,
  filterActivityLog,
  calculateTrend,
  detectAnomalies,
} from '../analytics'

function createSampleItem(
  overrides: Partial<QueueItem> = {},
  index: number = 1,
): QueueItem {
  return {
    id: `item-${index}`,
    contentType: 'comment',
    originalId: 1000 + index,
    status: 'pending',
    spamScore: 0,
    authorId: `author-${index}`,
    dateGmt: new Date().toISOString(),
    title: `Test Content ${index}`,
    excerpt: `Excerpt for item ${index}`,
    ...overrides,
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString()
}

describe('Full Moderation Pipeline Integration', () => {
  let queueManager: QueueManager
  let activityLog: ModerationEvent[]

  beforeEach(() => {
    queueManager = new QueueManager()
    activityLog = []
  })

  it('should process a clean item through the full pipeline', () => {
    // Step 1: Enqueue an item
    const item = createSampleItem(
      {
        id: 'clean-1',
        title: 'Legitimate Comment',
        excerpt: 'This is a perfectly normal comment about the article',
      },
      1,
    )
    queueManager.enqueue(item)

    expect(queueManager.getQueue()).toHaveLength(1)

    // Step 2: Evaluate firewall rules (should pass)
    const firewallResult: FirewallResult = evaluateFirewallRules(
      'This is a perfectly normal comment about the article',
      {
        maxLinks: 3,
        blacklistedKeywords: ['spam', 'viagra'],
      },
      {
        authorIP: '192.168.1.1',
        submitTimeDelta: 30,
      },
    )

    expect(firewallResult.triggered).toBe(false)

    // Step 3: Auto-classify based on firewall result
    const classified = queueManager.autoClassify(item, firewallResult)
    expect(classified.status).toBe('pending')

    // Step 4: Record activity
    activityLog.push({
      id: 'event-1',
      timestamp: new Date().toISOString(),
      contentType: 'comment',
      action: 'created',
      itemId: classified.id,
      userId: classified.authorId,
    })

    // Step 5: Process analytics
    const analytics = processAnalytics(activityLog, queueManager.getQueue())
    expect(analytics.contentTypeBreakdown).toHaveLength(1)
    expect(analytics.spamRatio.ratio).toBe(0)
    expect(analytics.dateRange.start).toBeDefined()
    expect(analytics.dateRange.end).toBeDefined()
  })

  it('should process and flag spam content through the pipeline', () => {
    // Step 1: Enqueue spammy items
    const spamItem = createSampleItem(
      {
        id: 'spam-1',
        title: 'Buy cheap viagra now!!!',
        spamScore: 0.9,
      },
      2,
    )
    const cleanItem = createSampleItem(
      {
        id: 'clean-2',
        title: 'Legitimate question about the topic',
        spamScore: 0.05,
      },
      3,
    )

    queueManager.enqueue(spamItem)
    queueManager.enqueue(cleanItem)
    expect(queueManager.getQueue()).toHaveLength(2)

    // Step 2: Evaluate firewall on spam content
    const spamFirewallResult = evaluateFirewallRules(
      'Buy cheap viagra now!!! Click http://spam.com for deals',
      {
        maxLinks: 2,
        blacklistedKeywords: ['viagra', 'cheap'],
      },
      {
        authorIP: '10.0.0.5',
        submitTimeDelta: 1,
      },
    )

    expect(spamFirewallResult.triggered).toBe(true)
    expect(spamFirewallResult.ruleName).toBe('blacklistedKeywords')

    // Step 3: Auto-classify spam item
    const classifiedSpam = queueManager.autoClassify(
      spamItem,
      spamFirewallResult,
    )
    expect(classifiedSpam.status).toBe('spam')

    // Update actual queue item
    queueManager.updateStatus(spamItem.id, 'spam')

    // Step 4: Record moderation events
    activityLog.push(
      {
        id: 'event-2',
        timestamp: hoursAgo(0.5),
        contentType: 'comment',
        action: 'created',
        itemId: spamItem.id,
        userId: spamItem.authorId,
      },
      {
        id: 'event-3',
        timestamp: hoursAgo(0.5),
        contentType: 'comment',
        action: 'created',
        itemId: cleanItem.id,
        userId: cleanItem.authorId,
      },
      {
        id: 'event-4',
        timestamp: hoursAgo(0.25),
        contentType: 'comment',
        action: 'spammed',
        itemId: spamItem.id,
        userId: spamItem.authorId,
        moderatorId: 'mod-bot',
      },
    )

    // Step 5: Generate analytics
    const analytics = processAnalytics(activityLog, queueManager.getQueue())

    expect(analytics.spamRatio.spamCount).toBe(1)
    expect(analytics.spamRatio.totalCount).toBe(1)
    expect(analytics.spamRatio.ratio).toBe(1)

    // Verify date range covers events
    expect(new Date(analytics.dateRange.start).getTime()).toBeLessThanOrEqual(
      new Date(analytics.dateRange.end).getTime(),
    )

    // Step 6: Check queue stats
    const stats = queueManager.getQueueStats()
    expect(stats.pending).toBe(1)
    expect(stats.spam).toBe(1)
  })

  it('should processNext with firewall classification pipeline', () => {
    // Enqueue multiple items
    const items = [
      createSampleItem(
        {
          id: 'pipe-1',
          title: 'First item',
          contentType: 'post',
        },
        10,
      ),
      createSampleItem(
        {
          id: 'pipe-2',
          title: 'Second item',
          contentType: 'comment',
        },
        11,
      ),
      createSampleItem(
        {
          id: 'pipe-3',
          title: 'Third item',
          contentType: 'comment',
        },
        12,
      ),
    ]

    items.forEach((item) => queueManager.enqueue(item))
    expect(queueManager.getQueue()).toHaveLength(3)

    // Process items one by one with firewall check
    const results: Array<{
      item: QueueItem
      firewall: FirewallResult
      classified: QueueItem
    }> = []

    let nextItem = queueManager.dequeue()
    while (nextItem) {
      const firewallResult = evaluateFirewallRules(nextItem.title, {
        maxLinks: 3,
        blacklistedKeywords: [],
      })
      const classified = queueManager.autoClassify(nextItem, firewallResult)
      results.push({ item: nextItem, firewall: firewallResult, classified })
      nextItem = queueManager.dequeue()
    }

    expect(results).toHaveLength(3)
    expect(queueManager.getQueue()).toHaveLength(0)

    // All items should remain pending since no rules triggered
    results.forEach((r) => {
      expect(r.classified.status).toBe('pending')
    })
  })

  it('should handle mixed spam and clean items with analytics', () => {
    // Create a realistic moderation scenario
    const events: ModerationEvent[] = [
      {
        id: 'evt-1',
        timestamp: hoursAgo(0.5),
        contentType: 'comment',
        action: 'created',
        itemId: 1,
        userId: 101,
      },
      {
        id: 'evt-2',
        timestamp: hoursAgo(0.5),
        contentType: 'comment',
        action: 'created',
        itemId: 2,
        userId: 102,
      },
      {
        id: 'evt-3',
        timestamp: hoursAgo(0.4),
        contentType: 'comment',
        action: 'spammed',
        itemId: 1,
        userId: 101,
        moderatorId: 'mod-1',
      },
      {
        id: 'evt-4',
        timestamp: hoursAgo(0.3),
        contentType: 'comment',
        action: 'approved',
        itemId: 2,
        userId: 102,
        moderatorId: 'mod-1',
      },
      {
        id: 'evt-5',
        timestamp: hoursAgo(0.2),
        contentType: 'post',
        action: 'created',
        itemId: 3,
        userId: 103,
      },
    ]

    const queueItems: QueueItem[] = [
      createSampleItem(
        { id: 'q-1', contentType: 'comment', status: 'spam' },
        20,
      ),
      createSampleItem(
        { id: 'q-2', contentType: 'comment', status: 'pending' },
        21,
      ),
      createSampleItem(
        { id: 'q-3', contentType: 'post', status: 'pending' },
        22,
      ),
    ]

    // Process full analytics
    const analytics = processAnalytics(events, queueItems, {
      'mod-1': 'Alice',
    })

    // Check each analytics component
    expect(analytics.heatmap.maxCount).toBeGreaterThanOrEqual(2)
    expect(analytics.spamRatio.spamCount).toBe(1)
    expect(analytics.spamRatio.totalCount).toBe(2)
    expect(analytics.contentTypeBreakdown).toHaveLength(2)
    expect(analytics.moderatorPerformance).toHaveLength(1)
    expect(analytics.moderatorPerformance[0]?.moderatorName).toBe('Alice')

    // Filter activity log
    const spammedEvents = filterActivityLog(
      events as unknown as ActivityLogEntry[],
      {
        actions: ['spammed'],
      },
    )
    expect(spammedEvents).toHaveLength(1)

    // Calculate trends
    const trend = calculateTrend(
      events,
      (e) => e.action === 'spammed',
      hoursAgo(1),
    )
    expect(trend.currentValue).toBe(1)
  })

  it('should detect anomalies during high-volume spam attack', () => {
    const now = Date.now()

    // Simulate a spam attack: 40 items created, 30 spammed in last hour
    const attackEvents: ModerationEvent[] = [
      // Queue volume: 40 created
      ...Array(40)
        .fill(0)
        .map((_, i) => ({
          id: `create-${i}`,
          timestamp: new Date(now - Math.random() * 3600000).toISOString(),
          contentType: 'comment' as const,
          action: 'created' as const,
          itemId: 1000 + i,
          userId: 5000 + i,
        })),
      // Moderation: 30 spammed by mod-1, 10 approved by mod-2
      ...Array(30)
        .fill(0)
        .map((_, i) => ({
          id: `spam-${i}`,
          timestamp: new Date(now - Math.random() * 3600000).toISOString(),
          contentType: 'comment' as const,
          action: 'spammed' as const,
          itemId: 2000 + i,
          userId: 5000 + i,
          moderatorId: 'mod-fast' as const,
        })),
      ...Array(10)
        .fill(0)
        .map((_, i) => ({
          id: `approve-${i}`,
          timestamp: new Date(now - Math.random() * 3600000).toISOString(),
          contentType: 'comment' as const,
          action: 'approved' as const,
          itemId: 3000 + i,
          userId: 6000 + i,
          moderatorId: 'mod-slow' as const,
        })),
    ]

    // Detect anomalies
    const alerts = detectAnomalies(attackEvents, [])

    // Should detect queue volume anomaly
    const queueAlert = alerts.find((a: any) => a.type === 'queue_volume')
    expect(queueAlert).toBeDefined()
    expect(queueAlert?.severity).toBe('medium')
    expect(queueAlert?.value).toBeGreaterThanOrEqual(30)

    // Process full analytics
    const analytics = processAnalytics(attackEvents, [])
    expect(analytics.spamRatio.spamCount).toBe(30)
    expect(analytics.spamRatio.totalCount).toBe(40)
    expect(analytics.anomalyAlerts.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle firewall rules with global action and queue integration', () => {
    // Setup queue with items
    const items = [
      createSampleItem(
        {
          id: 'fw-1',
          title: 'Check out http://spam.com and http://buy.com for deals',
        },
        30,
      ),
      createSampleItem(
        {
          id: 'fw-2',
          title: 'Normal content here',
        },
        31,
      ),
    ]

    items.forEach((item) => queueManager.enqueue(item))

    // Evaluate with global action set to spam
    const result1 = evaluateFirewallRules(
      items[0]?.title ?? '',
      {
        maxLinks: 1,
        globalAction: 'spam',
      },
      {
        authorIP: '192.168.1.1',
        submitTimeDelta: 10,
      },
    )

    expect(result1.triggered).toBe(true)
    expect(result1.action).toBe('spam')
    expect(result1.ruleName).toBe('maxLinks')

    // Auto-classify and update
    const classified1 = queueManager.autoClassify(items[0]!, result1)
    expect(classified1.status).toBe('spam')

    queueManager.updateStatus('fw-1', 'spam')

    // Second item should pass all rules
    const result2 = evaluateFirewallRules(items[1]?.title ?? '', {
      maxLinks: 3,
      blacklistedKeywords: [],
    })

    expect(result2.triggered).toBe(false)
    queueManager.updateStatus('fw-2', 'pending')

    // Verify final queue state
    const stats = queueManager.getQueueStats()
    expect(stats.pending).toBe(1)
    expect(stats.spam).toBe(1)
    expect(stats.total).toBe(2)
  })

  it('should handle trend analysis across pipeline runs', () => {
    const now = Date.now()
    const hourMs = 3600000

    // Simulate two days of moderation data
    const day1Events: ModerationEvent[] = Array(10)
      .fill(0)
      .map((_, i) => ({
        id: `d1-${i}`,
        timestamp: new Date(now - (i + 25) * hourMs).toISOString(),
        contentType: 'comment' as const,
        action: (i < 3 ? 'spammed' : 'approved') as 'spammed' | 'approved',
        itemId: i,
        userId: i,
        moderatorId: 'mod1' as const,
      }))

    const day2Events: ModerationEvent[] = Array(10)
      .fill(0)
      .map((_, i) => ({
        id: `d2-${i}`,
        timestamp: new Date(now - (i + 1) * hourMs).toISOString(),
        contentType: 'comment' as const,
        action: (i < 6 ? 'spammed' : 'approved') as 'spammed' | 'approved',
        itemId: i + 20,
        userId: i + 20,
        moderatorId: 'mod1' as const,
      }))

    const allEvents = [...day1Events, ...day2Events]

    // Process analytics for complete dataset
    const analytics = processAnalytics(allEvents, [])
    expect(analytics.moderatorPerformance).toHaveLength(1)
    expect(analytics.moderatorPerformance[0]?.totalActions).toBe(20)

    // Calculate spam ratio trend
    const spamPredicate = (e: ModerationEvent): boolean =>
      e.action === 'spammed'

    const day1Trend = calculateTrend(
      day1Events,
      spamPredicate,
      new Date(now - 48 * hourMs).toISOString(),
      new Date(now - 24 * hourMs).toISOString(),
      24 * hourMs,
    )

    const day2Trend = calculateTrend(
      day2Events,
      spamPredicate,
      new Date(now - 24 * hourMs).toISOString(),
      new Date(now).toISOString(),
      24 * hourMs,
    )

    // Day 2 should have more spam (6 vs 3)
    expect(day2Trend.currentValue).toBeGreaterThan(day1Trend.currentValue)
    expect(day2Trend.direction).toBe('up')
  })
})
