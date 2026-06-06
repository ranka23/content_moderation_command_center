import type { ReputationScore, BreachRecord } from '../index'
import {
  calculateReputationChange,
  calculateDecayedScore,
  isHighRiskUser,
  getDefaultReputationOptions,
  getDefaultHighRiskThresholds,
  classifyRiskLevel,
  calculateBreachFrequency,
  generateUserReputationSummary,
  getDefaultRiskLevelThresholds,
  InMemoryReputationAdapter,
} from '../index'

describe('Reputation System', () => {
  describe('calculateReputationChange', () => {
    const options = getDefaultReputationOptions()

    it('should return positive score for approve', () => {
      expect(calculateReputationChange('approve', options)).toBe(1)
    })

    it('should return negative score for reject', () => {
      expect(calculateReputationChange('reject', options)).toBe(-2)
    })

    it('should return negative score for spam', () => {
      expect(calculateReputationChange('spam', options)).toBe(-2)
    })

    it('should return deactivation score for deactivate', () => {
      expect(calculateReputationChange('deactivate', options)).toBe(-10)
    })

    it('should return 0 for unknown action', () => {
      // @ts-expect-error - testing invalid action
      expect(calculateReputationChange('unknown', options)).toBe(0)
    })
  })

  describe('calculateDecayedScore', () => {
    const options = {
      decayEnabled: true,
      decayRatePerPeriod: 1,
      decayPeriodDays: 7,
      inactivityThresholdDays: 30,
    }

    it('should not decay if within inactivity threshold', () => {
      const lastActivity = new Date()
      lastActivity.setDate(lastActivity.getDate() - 15)
      const currentDate = new Date()

      const score = calculateDecayedScore(
        10,
        lastActivity.toISOString(),
        currentDate.toISOString(),
        options,
      )
      expect(score).toBe(10)
    })

    it('should decay positive score after inactivity threshold', () => {
      // Use precise time offset to avoid Math.ceil rounding up due to test timing
      const now = Date.now()
      const lastActivityDate = new Date(
        now - 45 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        10,
        lastActivityDate,
        currentDate,
        options,
      )
      // 45 days - 30 threshold = 15 exceeding, floor(15/7) = 2 periods -> 10 - 2 = 8
      expect(score).toBe(8)
    })

    it('should decay negative score toward zero', () => {
      const now = Date.now()
      const lastActivityDate = new Date(
        now - 45 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        -10,
        lastActivityDate,
        currentDate,
        options,
      )
      // 45 days - 30 threshold = 15 exceeding, floor(15/7) = 2 periods -> -10 + 2 = -8
      expect(score).toBe(-8)
    })

    it('should not decay zero score', () => {
      const lastActivity = new Date()
      lastActivity.setDate(lastActivity.getDate() - 50)
      const currentDate = new Date()

      const score = calculateDecayedScore(
        0,
        lastActivity.toISOString(),
        currentDate.toISOString(),
        options,
      )
      expect(score).toBe(0)
    })

    it('should not decay if decay is disabled', () => {
      const optionsWithDecayDisabled = { ...options, decayEnabled: false }
      const lastActivity = new Date()
      lastActivity.setDate(lastActivity.getDate() - 50)
      const currentDate = new Date()

      const score = calculateDecayedScore(
        10,
        lastActivity.toISOString(),
        currentDate.toISOString(),
        optionsWithDecayDisabled,
      )
      expect(score).toBe(10)
    })

    it('should handle boundary conditions exactly', () => {
      const lastActivity = new Date()
      lastActivity.setDate(lastActivity.getDate() - 30)
      const currentDate = new Date()

      const score = calculateDecayedScore(
        10,
        lastActivity.toISOString(),
        currentDate.toISOString(),
        options,
      )
      expect(score).toBe(10) // no decay at exactly threshold
    })
  })

  describe('isHighRiskUser', () => {
    const thresholds = getDefaultHighRiskThresholds()

    it('should flag user with reputation below threshold', () => {
      expect(isHighRiskUser(-6, 0, thresholds)).toBe(true)
    })

    it('should flag user with enough recent breaches', () => {
      expect(isHighRiskUser(0, 3, thresholds)).toBe(true)
    })

    it('should not flag user with good reputation and few breaches', () => {
      expect(isHighRiskUser(5, 2, thresholds)).toBe(false)
    })

    it('should flag user if both conditions are met', () => {
      expect(isHighRiskUser(-6, 3, thresholds)).toBe(true)
    })
  })

  describe('getDefaultReputationOptions', () => {
    it('should return expected defaults', () => {
      const options = getDefaultReputationOptions()
      expect(options.approvedItemScore).toBe(1)
      expect(options.rejectedItemScore).toBe(-2)
      expect(options.deactivationScore).toBe(-10)
      expect(options.decayRatePerPeriod).toBe(1)
      expect(options.decayPeriodDays).toBe(7)
      expect(options.inactivityThresholdDays).toBe(30)
    })
  })

  describe('getDefaultHighRiskThresholds', () => {
    it('should return expected defaults', () => {
      const thresholds = getDefaultHighRiskThresholds()
      expect(thresholds.highRiskThreshold).toBe(-5)
      expect(thresholds.recentBreachThreshold).toBe(3)
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: Risk Level Classification
  // --------------------------------------------------------------------------
  describe('classifyRiskLevel', () => {
    const thresholds = getDefaultRiskLevelThresholds()

    it('should return "critical" for very low scores with many breaches', () => {
      expect(classifyRiskLevel(-10, 5, thresholds)).toBe('critical')
    })

    it('should return "high" for scores below highRiskThreshold', () => {
      expect(classifyRiskLevel(-6, 1, thresholds)).toBe('high')
    })

    it('should return "high" for breach count above recentBreachThreshold', () => {
      expect(classifyRiskLevel(0, 3, thresholds)).toBe('high')
    })

    it('should return "medium" for scores below medium risk threshold', () => {
      expect(classifyRiskLevel(-2, 0, thresholds)).toBe('medium')
    })

    it('should return "medium" for some breaches below high threshold', () => {
      expect(classifyRiskLevel(0, 1, thresholds)).toBe('medium')
    })

    it('should return "low" for good scores and few breaches', () => {
      expect(classifyRiskLevel(5, 0, thresholds)).toBe('low')
    })

    it('should return "low" for borderline medium but not triggered', () => {
      expect(classifyRiskLevel(0, 0, thresholds)).toBe('low')
    })

    it('should treat critical score override even when breaches are zero', () => {
      // Score <= criticalScoreThreshold triggers critical regardless of breaches
      expect(classifyRiskLevel(-15, 0, thresholds)).toBe('critical')
    })

    it('should treat critical breaches override even when score is good', () => {
      expect(classifyRiskLevel(5, 8, thresholds)).toBe('critical')
    })

    it('should return default thresholds when not provided', () => {
      const level = classifyRiskLevel(-10, 5)
      expect(level).toBe('critical')
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: Breach Frequency Calculation
  // --------------------------------------------------------------------------
  describe('calculateBreachFrequency', () => {
    const userId = 'user1'
    const baseTime = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    function makeBreach(
      daysAgo: number,
      reason: string = 'Spam',
    ): BreachRecord {
      return {
        id: String(Math.random()),
        userId,
        timestamp: new Date(baseTime - daysAgo * dayMs).toISOString(),
        reason,
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 1,
      }
    }

    it('should return zero frequency for empty breaches', () => {
      const freq = calculateBreachFrequency([], 30)
      expect(freq.breachesPerDay).toBe(0)
      expect(freq.totalBreaches).toBe(0)
      expect(freq.periodDays).toBe(30)
    })

    it('should calculate breaches per day correctly', () => {
      const breaches = [
        makeBreach(1),
        makeBreach(2),
        makeBreach(3),
        makeBreach(4),
        makeBreach(5),
      ]
      const freq = calculateBreachFrequency(breaches, 10)
      expect(freq.totalBreaches).toBe(5)
      expect(freq.breachesPerDay).toBeCloseTo(0.5, 1) // 5 breaches / 10 days
      expect(freq.periodDays).toBe(10)
    })

    it('should handle single breach', () => {
      const breaches = [makeBreach(1)]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.totalBreaches).toBe(1)
      expect(freq.breachesPerDay).toBeCloseTo(0.033, 2)
    })

    it('should handle period of 0 days gracefully', () => {
      const breaches = [makeBreach(0)]
      const freq = calculateBreachFrequency(breaches, 0)
      expect(freq.totalBreaches).toBe(1)
      expect(freq.breachesPerDay).toBe(0) // prevent division by zero
    })

    it('should group breaches by reason', () => {
      const breaches = [
        makeBreach(1, 'Spam'),
        makeBreach(2, 'Spam'),
        makeBreach(3, 'Abuse'),
        makeBreach(4, 'Off-topic'),
      ]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.byReason['Spam']).toBe(2)
      expect(freq.byReason['Abuse']).toBe(1)
      expect(freq.byReason['Off-topic']).toBe(1)
    })
  })

  // --------------------------------------------------------------------------
  // v1 Enhancement: User Reputation Summary
  // --------------------------------------------------------------------------
  describe('generateUserReputationSummary', () => {
    const options = getDefaultReputationOptions()
    const thresholds = getDefaultRiskLevelThresholds()

    it('should generate a comprehensive summary for a user with no history', () => {
      const summary = generateUserReputationSummary(
        null,
        [],
        options,
        thresholds,
      )
      expect(summary.riskLevel).toBe('low')
      expect(summary.currentScore).toBe(0)
      expect(summary.recentBreachCount).toBe(0)
      expect(summary.breachFrequency.breachesPerDay).toBe(0)
    })

    it('should generate correct summary for a user with history', () => {
      const score: ReputationScore = {
        score: -6,
        lastUpdated: new Date().toISOString(),
        totalApproved: 5,
        totalRejected: 8,
        timesDeactivated: 1,
      }

      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      const breaches: BreachRecord[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(now - 1 * dayMs).toISOString(),
          reason: 'Spam',
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: 1,
        },
        {
          id: '2',
          userId: 'user1',
          timestamp: new Date(now - 2 * dayMs).toISOString(),
          reason: 'Spam',
          moderatorId: 'mod2',
          contentType: 'post',
          contentId: 2,
        },
        {
          id: '3',
          userId: 'user1',
          timestamp: new Date(now - 3 * dayMs).toISOString(),
          reason: 'Abuse',
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: 3,
        },
      ]

      const summary = generateUserReputationSummary(
        score,
        breaches,
        options,
        thresholds,
      )
      expect(summary.currentScore).toBe(-6)
      expect(summary.riskLevel).toBe('high')
      expect(summary.recentBreachCount).toBe(3)
      expect(summary.breachFrequency.breachesPerDay).toBeGreaterThan(0)
      expect(summary.totalApproved).toBe(5)
      expect(summary.totalRejected).toBe(8)
      expect(summary.timesDeactivated).toBe(1)
    })

    it('should use default options when not provided', () => {
      const summary = generateUserReputationSummary(null, [])
      expect(summary.riskLevel).toBe('low')
      expect(summary.currentScore).toBe(0)
    })
  })

  describe('getDefaultRiskLevelThresholds', () => {
    it('should return expected defaults', () => {
      const thresholds = getDefaultRiskLevelThresholds()
      expect(thresholds.highRiskScoreThreshold).toBe(-5)
      expect(thresholds.mediumRiskScoreThreshold).toBe(-2)
      expect(thresholds.criticalScoreThreshold).toBe(-10)
      expect(thresholds.highBreachThreshold).toBe(3)
      expect(thresholds.mediumBreachThreshold).toBe(1)
      expect(thresholds.criticalBreachThreshold).toBe(6)
    })
  })

  describe('InMemoryReputationAdapter', () => {
    let adapter: InMemoryReputationAdapter

    beforeEach(() => {
      adapter = new InMemoryReputationAdapter()
    })

    it('should initially return null for user score', async () => {
      const score = await adapter.getReputationScore('user1')
      expect(score).toBeNull()
    })

    it('should save and retrieve user score', async () => {
      const score: ReputationScore = {
        score: 5,
        lastUpdated: new Date().toISOString(),
        totalApproved: 10,
        totalRejected: 2,
        timesDeactivated: 0,
      }

      await adapter.saveReputationScore('user1', score)
      const retrieved = await adapter.getReputationScore('user1')
      expect(retrieved).toEqual(score)
    })

    it('should initially return empty array for breaches', async () => {
      const breaches = await adapter.getUserBreaches('user1')
      expect(breaches).toEqual([])
    })

    it('should add and retrieve breach records', async () => {
      const breach1 = await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: new Date().toISOString(),
        reason: 'Spam content',
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 123,
      })

      const breach2 = await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: new Date().toISOString(),
        reason: 'Inappropriate language',
        moderatorId: 'mod2',
        contentType: 'post',
        contentId: 456,
      })

      const breaches = await adapter.getUserBreaches('user1')
      expect(breaches.length).toBe(2)
      expect(breaches[0]!.id).toBe(breach1)
      expect(breaches[1]!.id).toBe(breach2)
      expect(breaches[0]!.reason).toBe('Spam content')
      expect(breaches[1]!.reason).toBe('Inappropriate language')
    })

    it('should respect limit parameter in getUserBreaches', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.addBreachRecord({
          userId: 'user1',
          timestamp: new Date().toISOString(),
          reason: `Breach ${i}`,
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: i,
        })
      }

      const limited = await adapter.getUserBreaches('user1', 3)
      expect(limited.length).toBe(3)
    })

    it('should clear old breach records', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100)
      const recentDate = new Date()

      await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: oldDate.toISOString(),
        reason: 'Old breach',
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 1,
      })

      await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: recentDate.toISOString(),
        reason: 'Recent breach',
        moderatorId: 'mod2',
        contentType: 'comment',
        contentId: 2,
      })

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 50)
      await adapter.clearOldBreachRecords(cutoff.toISOString())

      const breaches = await adapter.getUserBreaches('user1')
      expect(breaches.length).toBe(1)
      expect(breaches[0]!.reason).toBe('Recent breach')
    })

    it('should update existing reputation score', async () => {
      const score1: ReputationScore = {
        score: 5,
        lastUpdated: new Date().toISOString(),
        totalApproved: 10,
        totalRejected: 2,
        timesDeactivated: 0,
      }
      await adapter.saveReputationScore('user1', score1)

      const score2: ReputationScore = {
        score: 3,
        lastUpdated: new Date().toISOString(),
        totalApproved: 12,
        totalRejected: 4,
        timesDeactivated: 0,
      }
      await adapter.saveReputationScore('user1', score2)

      const retrieved = await adapter.getReputationScore('user1')
      expect(retrieved!.score).toBe(3)
      expect(retrieved!.totalApproved).toBe(12)
    })

    it('should independently track multiple users', async () => {
      const scoreA: ReputationScore = {
        score: 10,
        lastUpdated: new Date().toISOString(),
        totalApproved: 20,
        totalRejected: 0,
        timesDeactivated: 0,
      }
      const scoreB: ReputationScore = {
        score: -5,
        lastUpdated: new Date().toISOString(),
        totalApproved: 2,
        totalRejected: 5,
        timesDeactivated: 1,
      }

      await adapter.saveReputationScore('userA', scoreA)
      await adapter.saveReputationScore('userB', scoreB)

      const retrievedA = await adapter.getReputationScore('userA')
      const retrievedB = await adapter.getReputationScore('userB')
      expect(retrievedA!.score).toBe(10)
      expect(retrievedB!.score).toBe(-5)
    })
  })
})
