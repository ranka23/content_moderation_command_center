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

    it('should use custom options correctly', () => {
      const customOptions = {
        approvedItemScore: 5,
        rejectedItemScore: -5,
        deactivationScore: -20,
        decayEnabled: true,
        decayRatePerPeriod: 2,
        decayPeriodDays: 14,
        inactivityThresholdDays: 60,
      }
      expect(calculateReputationChange('approve', customOptions)).toBe(5)
      expect(calculateReputationChange('reject', customOptions)).toBe(-5)
      expect(calculateReputationChange('deactivate', customOptions)).toBe(-20)
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

    it('should apply multiple decay periods', () => {
      const now = Date.now()
      const lastActivityDate = new Date(
        now - 100 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        20,
        lastActivityDate,
        currentDate,
        options,
      )
      // 100 days - 30 threshold = 70 exceeding, floor(70/7) = 10 periods -> 20 - 10 = 10
      expect(score).toBe(10)
    })

    it('should not decay below zero for positive scores', () => {
      const now = Date.now()
      const lastActivityDate = new Date(
        now - 365 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        5,
        lastActivityDate,
        currentDate,
        options,
      )
      // Should floor at 0, not go negative
      expect(score).toBe(0)
    })

    it('should not decay above zero for negative scores', () => {
      const now = Date.now()
      const lastActivityDate = new Date(
        now - 365 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        -5,
        lastActivityDate,
        currentDate,
        options,
      )
      // Should floor at 0, not go positive
      expect(score).toBe(0)
    })

    it('should decay with fractional period alignment', () => {
      const now = Date.now()
      // 44 days ago: 44 - 30 = 14 days exceeding, floor(14/7) = 2 periods
      const lastActivityDate = new Date(
        now - 44 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const currentDate = new Date(now).toISOString()

      const score = calculateDecayedScore(
        10,
        lastActivityDate,
        currentDate,
        options,
      )
      // 44 - 30 = 14, floor(14/7) = 2 -> 10 - 2 = 8
      expect(score).toBe(8)
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

    it('should flag user at exact threshold boundary', () => {
      expect(isHighRiskUser(-5, 3, thresholds)).toBe(true)
    })

    it('should not flag user just above threshold for score', () => {
      expect(isHighRiskUser(-4, 2, thresholds)).toBe(false)
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

    it('should return a new object each call', () => {
      const opts1 = getDefaultReputationOptions()
      const opts2 = getDefaultReputationOptions()
      opts1.approvedItemScore = 10
      expect(opts2.approvedItemScore).toBe(1)
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
      expect(classifyRiskLevel(-1, 3, thresholds)).toBe('high')
    })

    it('should return "medium" for scores below medium risk threshold', () => {
      expect(classifyRiskLevel(-3, 0, thresholds)).toBe('medium')
    })

    it('should return "medium" for some breaches below high threshold', () => {
      expect(classifyRiskLevel(0, 2, thresholds)).toBe('medium')
    })

    it('should return "low" for good scores and few breaches', () => {
      expect(classifyRiskLevel(5, 0, thresholds)).toBe('low')
    })

    it('should return "low" for borderline medium but not triggered', () => {
      expect(classifyRiskLevel(-1, 0, thresholds)).toBe('low')
    })

    it('should treat critical score override even when breaches are zero', () => {
      expect(classifyRiskLevel(-10, 0, thresholds)).toBe('critical')
    })

    it('should treat critical breaches override even when score is good', () => {
      expect(classifyRiskLevel(0, 6, thresholds)).toBe('critical')
    })

    it('should return default thresholds when not provided', () => {
      const level = classifyRiskLevel(-5, 1)
      expect(level).toBe('high')
    })

    it('should return "critical" with critical breaches and good score', () => {
      expect(classifyRiskLevel(10, 10, thresholds)).toBe('critical')
    })

    it('should return "medium" for exactly medium threshold score', () => {
      expect(classifyRiskLevel(-2, 0, thresholds)).toBe('medium')
    })

    it('should return "medium" for exactly medium breach threshold', () => {
      expect(classifyRiskLevel(0, 1, thresholds)).toBe('medium')
    })

    it('should use custom thresholds correctly', () => {
      const customThresholds = {
        criticalScoreThreshold: -20,
        highRiskScoreThreshold: -10,
        mediumRiskScoreThreshold: -5,
        criticalBreachThreshold: 10,
        highBreachThreshold: 5,
        mediumBreachThreshold: 2,
      }
      expect(classifyRiskLevel(-15, 0, customThresholds)).toBe('high')
      expect(classifyRiskLevel(0, 3, customThresholds)).toBe('medium')
    })
  })

  describe('calculateBreachFrequency', () => {
    const userId = 'user1'
    const baseTime = '2026-01-15T00:00:00.000Z'

    function makeBreach(overrides: Partial<BreachRecord> = {}): BreachRecord {
      return {
        id: 'breach-1',
        userId,
        timestamp: baseTime,
        reason: 'spam',
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 101,
        ...overrides,
      }
    }

    it('should return zero frequency for empty breaches', () => {
      const freq = calculateBreachFrequency([], 30)
      expect(freq.totalBreaches).toBe(0)
      expect(freq.breachesPerDay).toBe(0)
      expect(freq.periodDays).toBe(30)
      expect(freq.byReason).toEqual({})
    })

    it('should calculate breaches per day correctly', () => {
      const breaches = [
        makeBreach({ id: '1' }),
        makeBreach({ id: '2' }),
        makeBreach({ id: '3' }),
        makeBreach({ id: '4' }),
        makeBreach({ id: '5' }),
        makeBreach({ id: '6' }),
      ]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.totalBreaches).toBe(6)
      expect(freq.breachesPerDay).toBe(0.2)
    })

    it('should handle single breach', () => {
      const breaches = [makeBreach({ id: '1' })]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.totalBreaches).toBe(1)
      expect(freq.breachesPerDay).toBeCloseTo(0.0333, 3)
    })

    it('should handle period of 0 days gracefully', () => {
      const breaches = [makeBreach({ id: '1' })]
      const freq = calculateBreachFrequency(breaches, 0)
      expect(freq.totalBreaches).toBe(1)
      expect(freq.breachesPerDay).toBe(0) // No division by zero
    })

    it('should group breaches by reason', () => {
      const breaches = [
        makeBreach({ id: '1', reason: 'spam' }),
        makeBreach({ id: '2', reason: 'spam' }),
        makeBreach({ id: '3', reason: 'abuse' }),
        makeBreach({ id: '4', reason: 'spam' }),
      ]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.byReason).toEqual({
        spam: 3,
        abuse: 1,
      })
    })

    it('should handle multiple breaches with same reason only', () => {
      const breaches = [
        makeBreach({ id: '1', reason: 'spam' }),
        makeBreach({ id: '2', reason: 'spam' }),
        makeBreach({ id: '3', reason: 'spam' }),
      ]
      const freq = calculateBreachFrequency(breaches, 30)
      expect(freq.byReason).toEqual({ spam: 3 })
    })

    it('should use default period of 30 days', () => {
      const breaches = [makeBreach({ id: '1' })]
      const freq = calculateBreachFrequency(breaches)
      expect(freq.periodDays).toBe(30)
    })
  })

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
      expect(summary.currentScore).toBe(0)
      expect(summary.riskLevel).toBe('low')
      expect(summary.recentBreachCount).toBe(0)
      expect(summary.totalApproved).toBe(0)
      expect(summary.totalRejected).toBe(0)
      expect(summary.timesDeactivated).toBe(0)
      expect(summary.lastUpdated).toBeNull()
      expect(summary.breachFrequency.totalBreaches).toBe(0)
    })

    it('should generate correct summary for a user with history', () => {
      const score: ReputationScore = {
        score: -6,
        lastUpdated: '2026-01-15T00:00:00.000Z',
        totalApproved: 10,
        totalRejected: 3,
        timesDeactivated: 1,
      }

      const now = Date.now()
      const dayMs = 86400000

      const breaches: BreachRecord[] = [
        {
          id: '1',
          userId: 'user1',
          timestamp: new Date(now - dayMs).toISOString(),
          reason: 'spam',
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: 101,
        },
        {
          id: '2',
          userId: 'user1',
          timestamp: new Date(now - 2 * dayMs).toISOString(),
          reason: 'abuse',
          moderatorId: 'mod2',
          contentType: 'comment',
          contentId: 102,
        },
        {
          id: '3',
          userId: 'user1',
          timestamp: new Date(now - 3 * dayMs).toISOString(),
          reason: 'spam',
          moderatorId: 'mod1',
          contentType: 'post',
          contentId: 201,
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
      expect(summary.totalApproved).toBe(10)
      expect(summary.totalRejected).toBe(3)
      expect(summary.timesDeactivated).toBe(1)
      expect(summary.lastUpdated).toBe('2026-01-15T00:00:00.000Z')
      expect(summary.breachFrequency.totalBreaches).toBe(3)
    })

    it('should use default options when not provided', () => {
      const summary = generateUserReputationSummary(null, [])
      expect(summary.currentScore).toBe(0)
      expect(summary.riskLevel).toBe('low')
    })

    it('should use custom breach lookback days', () => {
      const score: ReputationScore = {
        score: 5,
        lastUpdated: '2026-01-15T00:00:00.000Z',
        totalApproved: 20,
        totalRejected: 1,
        timesDeactivated: 0,
      }
      const breaches = [
        {
          id: '1',
          userId: 'user1',
          timestamp: '2026-01-10T00:00:00.000Z',
          reason: 'spam',
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: 101,
        },
      ]
      const summary = generateUserReputationSummary(
        score,
        breaches,
        options,
        thresholds,
        7,
      )
      expect(summary.breachFrequency.periodDays).toBe(7)
    })

    it('should use null score values when no data', () => {
      const summary = generateUserReputationSummary(null, [])
      expect(summary.currentScore).toBe(0)
      expect(summary.totalApproved).toBe(0)
      expect(summary.totalRejected).toBe(0)
      expect(summary.timesDeactivated).toBe(0)
      expect(summary.lastUpdated).toBeNull()
    })
  })

  describe('getDefaultRiskLevelThresholds', () => {
    it('should return expected defaults', () => {
      const thresholds = getDefaultRiskLevelThresholds()
      expect(thresholds.criticalScoreThreshold).toBe(-10)
      expect(thresholds.highRiskScoreThreshold).toBe(-5)
      expect(thresholds.mediumRiskScoreThreshold).toBe(-2)
      expect(thresholds.criticalBreachThreshold).toBe(6)
      expect(thresholds.highBreachThreshold).toBe(3)
      expect(thresholds.mediumBreachThreshold).toBe(1)
    })

    it('should return a new object each call', () => {
      const t1 = getDefaultRiskLevelThresholds()
      const t2 = getDefaultRiskLevelThresholds()
      t1.criticalScoreThreshold = -50
      expect(t2.criticalScoreThreshold).toBe(-10)
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
        lastUpdated: '2026-01-15T00:00:00.000Z',
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
      const breach1 = {
        userId: 'user1',
        timestamp: '2026-01-15T00:00:00.000Z',
        reason: 'spam',
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 101,
      }
      const breach2 = {
        userId: 'user1',
        timestamp: '2026-01-16T00:00:00.000Z',
        reason: 'abuse',
        moderatorId: 'mod2',
        contentType: 'post',
        contentId: 201,
      }

      const id1 = await adapter.addBreachRecord(breach1)
      expect(id1).toBe('1')

      const id2 = await adapter.addBreachRecord(breach2)
      expect(id2).toBe('2')

      const breaches = await adapter.getUserBreaches('user1')
      expect(breaches).toHaveLength(2)
      expect(breaches[0]?.reason).toBe('spam')
      expect(breaches[1]?.reason).toBe('abuse')
    })

    it('should respect limit parameter in getUserBreaches', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.addBreachRecord({
          userId: 'user1',
          timestamp: `2026-01-${10 + i}T00:00:00.000Z`,
          reason: 'spam',
          moderatorId: 'mod1',
          contentType: 'comment',
          contentId: 100 + i,
        })
      }

      const limited = await adapter.getUserBreaches('user1', 3)
      expect(limited).toHaveLength(3)
    })

    it('should clear old breach records', async () => {
      const oldDate = '2025-12-01T00:00:00.000Z'
      const recentDate = '2026-01-15T00:00:00.000Z'

      await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: oldDate,
        reason: 'old spam',
        moderatorId: 'mod1',
        contentType: 'comment',
        contentId: 101,
      })
      await adapter.addBreachRecord({
        userId: 'user1',
        timestamp: recentDate,
        reason: 'recent spam',
        moderatorId: 'mod2',
        contentType: 'post',
        contentId: 201,
      })

      const cutoff = '2026-01-01T00:00:00.000Z'
      await adapter.clearOldBreachRecords(cutoff)

      const breaches = await adapter.getUserBreaches('user1')
      expect(breaches).toHaveLength(1)
      expect(breaches[0]?.reason).toBe('recent spam')
    })

    it('should update existing reputation score', async () => {
      const score1: ReputationScore = {
        score: 5,
        lastUpdated: '2026-01-01T00:00:00.000Z',
        totalApproved: 5,
        totalRejected: 0,
        timesDeactivated: 0,
      }
      await adapter.saveReputationScore('user1', score1)

      const score2: ReputationScore = {
        score: 3,
        lastUpdated: '2026-01-15T00:00:00.000Z',
        totalApproved: 6,
        totalRejected: 1,
        timesDeactivated: 0,
      }
      await adapter.saveReputationScore('user1', score2)

      const retrieved = await adapter.getReputationScore('user1')
      expect(retrieved?.score).toBe(3)
      expect(retrieved?.totalApproved).toBe(6)
    })

    it('should independently track multiple users', async () => {
      const scoreA: ReputationScore = {
        score: 10,
        lastUpdated: '2026-01-15T00:00:00.000Z',
        totalApproved: 10,
        totalRejected: 0,
        timesDeactivated: 0,
      }
      const scoreB: ReputationScore = {
        score: -5,
        lastUpdated: '2026-01-14T00:00:00.000Z',
        totalApproved: 2,
        totalRejected: 5,
        timesDeactivated: 1,
      }

      await adapter.saveReputationScore('userA', scoreA)
      await adapter.saveReputationScore('userB', scoreB)

      const retrievedA = await adapter.getReputationScore('userA')
      const retrievedB = await adapter.getReputationScore('userB')
      expect(retrievedA?.score).toBe(10)
      expect(retrievedB?.score).toBe(-5)
    })

    it('should handle numeric user IDs', async () => {
      const score: ReputationScore = {
        score: 5,
        lastUpdated: '2026-01-15T00:00:00.000Z',
        totalApproved: 10,
        totalRejected: 2,
        timesDeactivated: 0,
      }
      await adapter.saveReputationScore(123, score)
      const retrieved = await adapter.getReputationScore(123)
      expect(retrieved?.score).toBe(5)
    })

    it('should return empty array for user with no breaches', async () => {
      const breaches = await adapter.getUserBreaches('nonexistent')
      expect(breaches).toEqual([])
    })

    it('should handle clearing breaches when none exist', async () => {
      await expect(
        adapter.clearOldBreachRecords('2026-01-01T00:00:00.000Z'),
      ).resolves.toBeUndefined()
    })
  })
})
