/**
 * Integration test: Full reputation pipeline
 *
 * Tests the complete flow of user reputation management including
 * score changes from moderation actions, breach recording, decay
 * over time, risk level classification, and storage adapter usage.
 */

import type { ReputationScore, BreachRecord } from '../reputation'
import {
  calculateReputationChange,
  calculateDecayedScore,
  isHighRiskUser,
  classifyRiskLevel,
  calculateBreachFrequency,
  generateUserReputationSummary,
  getDefaultReputationOptions,
  getDefaultHighRiskThresholds,
  getDefaultRiskLevelThresholds,
  InMemoryReputationAdapter,
} from '../reputation'

describe('Full Reputation Pipeline Integration', () => {
  let adapter: InMemoryReputationAdapter
  const userId = 'user-integration-1'
  const defaultOptions = getDefaultReputationOptions()
  const highRiskThresholds = getDefaultHighRiskThresholds()
  const riskLevelThresholds = getDefaultRiskLevelThresholds()

  beforeEach(() => {
    adapter = new InMemoryReputationAdapter()
  })

  it('should start a user with neutral reputation', async () => {
    const score = await adapter.getReputationScore(userId)
    expect(score).toBeNull()

    const breaches = await adapter.getUserBreaches(userId)
    expect(breaches).toEqual([])
  })

  it('should accumulate reputation changes from approved content', async () => {
    // Simulate a good user making 5 approved contributions
    let currentScore = 0
    let totalApproved = 0
    const now = new Date().toISOString()

    for (let i = 0; i < 5; i++) {
      const change = calculateReputationChange('approve', defaultOptions)
      currentScore += change
      totalApproved++

      await adapter.saveReputationScore(userId, {
        score: currentScore,
        lastUpdated: now,
        totalApproved,
        totalRejected: 0,
        timesDeactivated: 0,
      })
    }

    expect(currentScore).toBe(5)

    const savedScore = await adapter.getReputationScore(userId)
    expect(savedScore?.score).toBe(5)
    expect(savedScore?.totalApproved).toBe(5)

    // Should not be flagged as high risk
    const isHigh = isHighRiskUser(currentScore, 0, highRiskThresholds)
    expect(isHigh).toBe(false)

    // Risk level should be low
    const riskLevel = classifyRiskLevel(currentScore, 0, riskLevelThresholds)
    expect(riskLevel).toBe('low')
  })

  it('should penalize a user who posts spam', async () => {
    let currentScore = 10 // started good
    let totalRejected = 0
    const now = new Date().toISOString()
    const breaches: BreachRecord[] = []

    // User posts 4 spam items
    for (let i = 0; i < 4; i++) {
      const change = calculateReputationChange('spam', defaultOptions)
      currentScore += change // each spam is -2
      totalRejected++

      // Save score
      await adapter.saveReputationScore(userId, {
        score: currentScore,
        lastUpdated: now,
        totalApproved: 0,
        totalRejected,
        timesDeactivated: 0,
      })

      // Record breach
      const breachId = await adapter.addBreachRecord({
        userId,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        reason: 'Spam content',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: 1000 + i,
      })
      expect(breachId).toBe(String(i + 1))
      breaches.push({
        id: breachId,
        userId,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        reason: 'Spam content',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: 1000 + i,
      })
    }

    // Score should be 10 - 8 = 2
    expect(currentScore).toBe(2)

    const savedScore = await adapter.getReputationScore(userId)
    expect(savedScore?.score).toBe(2)

    // Check risk level - 4 breaches should trigger medium (breaches >= 1)
    const riskLevel = classifyRiskLevel(
      currentScore,
      breaches.length,
      riskLevelThresholds,
    )
    // 4 breaches >= 3 → high
    expect(riskLevel).toBe('high')

    // Check breach frequency
    const freq = calculateBreachFrequency(breaches, 30)
    expect(freq.totalBreaches).toBe(4)
    expect(freq.byReason['Spam content']).toBe(4)
  })

  it('should deactivate a user with severe violations', async () => {
    let currentScore = 5
    let timesDeactivated = 0
    const now = new Date().toISOString()

    // Deactivate action
    const change = calculateReputationChange('deactivate', defaultOptions)
    currentScore += change // -10
    timesDeactivated++

    await adapter.saveReputationScore(userId, {
      score: currentScore,
      lastUpdated: now,
      totalApproved: 1,
      totalRejected: 0,
      timesDeactivated,
    })

    // Record a serious breach
    await adapter.addBreachRecord({
      userId,
      timestamp: now,
      reason: 'Terms of Service violation',
      moderatorId: 'mod-admin',
      contentType: 'post',
      contentId: 5001,
    })

    const breaches = await adapter.getUserBreaches(userId)
    expect(breaches).toHaveLength(1)

    // Score should be -5
    expect(currentScore).toBe(-5)

    const savedScore = await adapter.getReputationScore(userId)
    expect(savedScore?.score).toBe(-5)

    // High risk due to both score and breaches
    const isHigh = isHighRiskUser(
      currentScore,
      breaches.length,
      highRiskThresholds,
    )
    expect(isHigh).toBe(true)
  })

  it('should decay reputation score over time', async () => {
    // Setup a user with good history but long inactivity
    const lastActivity = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const currentDate = new Date().toISOString()

    const initialScore: ReputationScore = {
      score: 20,
      lastUpdated: lastActivity,
      totalApproved: 20,
      totalRejected: 0,
      timesDeactivated: 0,
    }

    await adapter.saveReputationScore(userId, initialScore)

    // Calculate decay after 90 days of inactivity
    const decayedScore = calculateDecayedScore(
      initialScore.score,
      lastActivity,
      currentDate,
      defaultOptions,
    )
    // 90 - 30 = 60 days exceeding, floor(60/7) = 8 periods -> 20 - 8 = 12
    expect(decayedScore).toBe(12)

    // Update score with decay
    await adapter.saveReputationScore(userId, {
      ...initialScore,
      score: decayedScore,
      lastUpdated: currentDate,
    })

    const saved = await adapter.getReputationScore(userId)
    expect(saved?.score).toBe(12)
  })

  it('should generate a full user reputation summary', async () => {
    // Create a user with mixed history
    const now = Date.now()
    const dayMs = 86400000

    const score: ReputationScore = {
      score: -4,
      lastUpdated: new Date(now - dayMs).toISOString(),
      totalApproved: 8,
      totalRejected: 6,
      timesDeactivated: 0,
    }

    await adapter.saveReputationScore(userId, score)

    // Add breaches over time
    const breachRecords: BreachRecord[] = []
    for (let i = 0; i < 4; i++) {
      const id = await adapter.addBreachRecord({
        userId,
        timestamp: new Date(now - i * dayMs).toISOString(),
        reason: i % 2 === 0 ? 'Spam' : 'Abuse',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: 2000 + i,
      })
      breachRecords.push({
        id,
        userId,
        timestamp: new Date(now - i * dayMs).toISOString(),
        reason: i % 2 === 0 ? 'Spam' : 'Abuse',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: 2000 + i,
      })
    }

    const allBreaches = await adapter.getUserBreaches(userId)
    expect(allBreaches).toHaveLength(4)

    // Generate summary
    const summary = generateUserReputationSummary(
      score,
      allBreaches,
      defaultOptions,
      riskLevelThresholds,
      30,
    )

    expect(summary.currentScore).toBe(-4)
    expect(summary.recentBreachCount).toBe(4)
    expect(summary.totalApproved).toBe(8)
    expect(summary.totalRejected).toBe(6)
    expect(summary.timesDeactivated).toBe(0)
    expect(summary.riskLevel).toBe('high') // score <= -2 triggers medium, 4 breaches >= 3 triggers high
    expect(summary.breachFrequency.totalBreaches).toBe(4)
    expect(summary.breachFrequency.byReason).toEqual({
      Spam: 2,
      Abuse: 2,
    })
    expect(summary.lastUpdated).toBe(score.lastUpdated)
  })

  it('should handle multi-user reputation tracking independently', async () => {
    const userA = 'user-a'
    const userB = 'user-b'
    const userC = 'user-c'

    // User A: good user
    await adapter.saveReputationScore(userA, {
      score: 15,
      lastUpdated: new Date().toISOString(),
      totalApproved: 15,
      totalRejected: 0,
      timesDeactivated: 0,
    })

    // User B: spammer
    await adapter.saveReputationScore(userB, {
      score: -8,
      lastUpdated: new Date().toISOString(),
      totalApproved: 1,
      totalRejected: 9,
      timesDeactivated: 2,
    })

    for (let i = 0; i < 5; i++) {
      await adapter.addBreachRecord({
        userId: userB,
        timestamp: new Date().toISOString(),
        reason: 'Spam',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: i,
      })
    }

    // User C: no activity
    // (leave as-is, no score or breaches)

    // Verify independence
    const scoreA = await adapter.getReputationScore(userA)
    const scoreB = await adapter.getReputationScore(userB)
    const scoreC = await adapter.getReputationScore(userC)

    expect(scoreA?.score).toBe(15)
    expect(scoreB?.score).toBe(-8)
    expect(scoreC).toBeNull()

    const breachesB = await adapter.getUserBreaches(userB)
    expect(breachesB).toHaveLength(5)

    const breachesA = await adapter.getUserBreaches(userA)
    expect(breachesA).toEqual([])

    // Generate summaries
    const summaryA = generateUserReputationSummary(
      scoreA,
      breachesA,
      defaultOptions,
      riskLevelThresholds,
    )
    expect(summaryA.riskLevel).toBe('low')

    const summaryB = generateUserReputationSummary(
      scoreB,
      breachesB,
      defaultOptions,
      riskLevelThresholds,
    )
    expect(summaryB.riskLevel).toBe('high') // -8 <= -5 (highRiskScoreThreshold) → high, 5 >= 3 (highBreachThreshold) → high
    // Double-check with direct classifyRiskLevel call
    const level = classifyRiskLevel(-8, 5, riskLevelThresholds)
    expect(level).toBe('high')
    expect(summaryB.riskLevel).toBe('high')

    // Clear old breaches for user B
    await adapter.clearOldBreachRecords(new Date().toISOString())
    const clearedBreaches = await adapter.getUserBreaches(userB)
    expect(clearedBreaches).toHaveLength(0)
  })

  it('should simulate a complete user lifecycle', async () => {
    // Phase 1: User joins and contributes positively
    let score = 0
    const startDate = new Date(Date.now() - 60 * 86400000)

    for (let i = 0; i < 10; i++) {
      score += calculateReputationChange('approve', defaultOptions)
    }
    expect(score).toBe(10)

    // Phase 2: User starts posting spam
    for (let i = 0; i < 3; i++) {
      score += calculateReputationChange('spam', defaultOptions)
      await adapter.addBreachRecord({
        userId,
        timestamp: new Date(startDate.getTime() + i * 86400000).toISOString(),
        reason: 'Spam',
        moderatorId: 'mod-auto',
        contentType: 'comment',
        contentId: 100 + i,
      })
    }
    expect(score).toBe(4) // 10 - 6 = 4

    // Phase 3: Score decays due to inactivity
    const decayed = calculateDecayedScore(
      score,
      new Date(startDate.getTime()).toISOString(),
      new Date().toISOString(),
      defaultOptions,
    )
    // 60 - 30 = 30 days exceeding, floor(30/7) = 4 periods -> 4 - 4 = 0
    expect(decayed).toBe(0)

    // Phase 4: User is deactivated
    score = decayed + calculateReputationChange('deactivate', defaultOptions)
    expect(score).toBe(-10)

    await adapter.addBreachRecord({
      userId,
      timestamp: new Date().toISOString(),
      reason: 'Terms violation',
      moderatorId: 'mod-admin',
      contentType: 'post',
      contentId: 999,
    })

    const breaches = await adapter.getUserBreaches(userId)
    expect(breaches).toHaveLength(4)

    // Final assessment
    const isHigh = isHighRiskUser(score, breaches.length, highRiskThresholds)
    expect(isHigh).toBe(true)

    const level = classifyRiskLevel(score, breaches.length, riskLevelThresholds)
    expect(level).toBe('critical') // score -10 <= -10

    const summary = generateUserReputationSummary(
      {
        score,
        lastUpdated: new Date().toISOString(),
        totalApproved: 10,
        totalRejected: 3,
        timesDeactivated: 1,
      },
      breaches,
      defaultOptions,
      riskLevelThresholds,
    )
    expect(summary.riskLevel).toBe('critical')
    expect(summary.totalApproved).toBe(10)
    expect(summary.totalRejected).toBe(3)
    expect(summary.timesDeactivated).toBe(1)
  })
})
