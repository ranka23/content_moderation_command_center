/**
 * CMCC User Reputation System
 *
 * This module handles user reputation scoring, decay, and breach tracking.
 * Designed to be platform-agnostic with platform-specific adapters for storage.
 */

export interface ReputationScoreOptions {
  approvedItemScore: number
  rejectedItemScore: number
  deactivationScore: number
  decayEnabled: boolean
  decayRatePerPeriod: number
  decayPeriodDays: number
  inactivityThresholdDays: number
}

export interface ReputationScore {
  score: number
  lastUpdated: string // ISO date string
  totalApproved: number
  totalRejected: number
  timesDeactivated: number
}

export interface BreachRecord {
  id: string
  userId: string | number
  timestamp: string // ISO date string
  reason: string
  moderatorId: string | number
  contentType: string
  contentId: string | number
}

export interface ReputationOptions {
  approvedItemScore: number
  rejectedItemScore: number
  deactivationScore: number
  decayEnabled: boolean
  decayRatePerPeriod: number
  decayPeriodDays: number
  inactivityThresholdDays: number
}

/**
 * Calculate reputation score change based on moderation action
 *
 * @param action - The moderation action performed ('approve', 'reject', 'spam', 'deactivate')
 * @param options - Reputation options defining score values for each action
 * @returns The score change to apply (positive for approve, negative for reject/spam/deactivate)
 *
 * Example:
 *   const change = calculateReputationChange('approve', {
 *     approvedItemScore: 1,
 *     rejectedItemScore: -2,
 *     deactivationScore: -10,
 *     decayEnabled: true,
 *     decayRatePerPeriod: 1,
 *     decayPeriodDays: 7,
 *     inactivityThresholdDays: 30
 *   });
 *   // change = 1
 */
export function calculateReputationChange(
  action: 'approve' | 'reject' | 'spam' | 'deactivate',
  options: ReputationOptions,
): number {
  switch (action) {
    case 'approve':
      return options.approvedItemScore
    case 'reject':
    case 'spam':
      return options.rejectedItemScore
    case 'deactivate':
      return options.deactivationScore
    default:
      return 0
  }
}

/**
 * Calculate decayed reputation score based on inactivity
 *
 * @param currentScore - The current reputation score
 * @param lastActivityDate - ISO date string of last activity
 * @param currentDate - ISO date string of current date
 * @param options - Options controlling decay behavior
 * @returns The decayed reputation score
 *
 * Example:
 *   const score = calculateDecayedScore(10, '2023-01-01T00:00:00Z', '2023-02-01T00:00:00Z', {
 *     decayEnabled: true,
 *     decayRatePerPeriod: 1,
 *     decayPeriodDays: 7,
 *     inactivityThresholdDays: 30
 *   });
 */
export function calculateDecayedScore(
  currentScore: number,
  lastActivityDate: string,
  currentDate: string,
  options: Pick<
    ReputationOptions,
    | 'decayEnabled'
    | 'decayRatePerPeriod'
    | 'decayPeriodDays'
    | 'inactivityThresholdDays'
  >,
): number {
  if (!options.decayEnabled) {
    return currentScore
  }

  const lastActivity = new Date(lastActivityDate)
  const now = new Date(currentDate)

  // Calculate days since last activity
  const timeDiff = now.getTime() - lastActivity.getTime()
  const daysSinceActivity = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

  // No decay if within inactivity threshold
  if (daysSinceActivity <= options.inactivityThresholdDays) {
    return currentScore
  }

  // Calculate decay periods elapsed
  const daysExceedingThreshold =
    daysSinceActivity - options.inactivityThresholdDays
  const decayPeriodsElapsed = Math.floor(
    daysExceedingThreshold / options.decayPeriodDays,
  )

  if (decayPeriodsElapsed <= 0) {
    return currentScore
  }

  // Apply decay (score moves toward 0)
  const decayAmount = decayPeriodsElapsed * options.decayRatePerPeriod

  if (currentScore > 0) {
    // Positive score decays downward
    return Math.max(0, currentScore - decayAmount)
  } else if (currentScore < 0) {
    // Negative score decays upward (toward zero)
    return Math.min(0, currentScore + decayAmount)
  } else {
    // Score is already zero
    return 0
  }
}

/**
 * Determine if user should be flagged as high risk based on reputation
 *
 * @param reputationScore - The user's current reputation score
 * @param recentBreachCount - Number of breaches in recent period
 * @param options - Thresholds for determining high risk
 * @returns True if user should be flagged as high risk
 *
 * Example:
 *   const isHigh = isHighRiskUser(-6, 2, {
 *     highRiskThreshold: -5,
 *     recentBreachThreshold: 3
 *   });
 *   // isHigh = true (score below threshold)
 */
export function isHighRiskUser(
  reputationScore: number,
  recentBreachCount: number,
  options: {
    highRiskThreshold: number
    recentBreachThreshold: number
  },
): boolean {
  return (
    reputationScore <= options.highRiskThreshold ||
    recentBreachCount >= options.recentBreachThreshold
  )
}

/**
 * Get default reputation options
 *
 * @returns Object with default values for all reputation options
 *
 * These defaults represent a reasonable starting point for most communities.
 * Site administrators should adjust these based on their specific needs.
 *
 * Example:
 *   const defaults = getDefaultReputationOptions();
 *   // Returns { approvedItemScore: 1, rejectedItemScore: -2, ... }
 */
export function getDefaultReputationOptions(): ReputationOptions {
  return {
    approvedItemScore: 1,
    rejectedItemScore: -2,
    deactivationScore: -10,
    decayEnabled: true,
    decayRatePerPeriod: 1,
    decayPeriodDays: 7,
    inactivityThresholdDays: 30,
  }
}

/**
 * Get default high-risk thresholds
 *
 * @returns Object with default thresholds for flagging high-risk users
 *
 * Example:
 *   const thresholds = getDefaultHighRiskThresholds();
 *   // Returns { highRiskThreshold: -5, recentBreachThreshold: 3 }
 */
export function getDefaultHighRiskThresholds(): {
  highRiskThreshold: number
  recentBreachThreshold: number
} {
  return {
    highRiskThreshold: -5,
    recentBreachThreshold: 3,
  }
}

// --------------------------------------------------------------------------
// v1 Enhancement: Risk Level Classification
// --------------------------------------------------------------------------

/**
 * Risk level categories for user reputation.
 * - 'low': Good standing user with minimal or no violations
 * - 'medium': Some violations, warrants closer attention
 * - 'high': Significant violations, should be flagged for moderator review
 * - 'critical': Extreme violations, may require immediate action
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/**
 * Threshold configuration for risk level classification.
 * Score thresholds are upper bounds (inclusive).
 * Breach thresholds are lower bounds (inclusive).
 */
export interface RiskLevelThresholds {
  /** Score at or below this triggers critical risk */
  criticalScoreThreshold: number
  /** Score at or below this triggers high risk */
  highRiskScoreThreshold: number
  /** Score at or below this triggers medium risk */
  mediumRiskScoreThreshold: number
  /** Breach count at or above this triggers critical risk */
  criticalBreachThreshold: number
  /** Breach count at or above this triggers high risk */
  highBreachThreshold: number
  /** Breach count at or above this triggers medium risk */
  mediumBreachThreshold: number
}

/**
 * Get default risk level thresholds.
 *
 * These defaults provide a reasonable risk classification for most communities:
 * - Low: score > -2 and breaches < 1
 * - Medium: score <= -2 or breaches >= 1
 * - High: score <= -5 or breaches >= 3
 * - Critical: score <= -10 or breaches >= 6
 *
 * @returns Default RiskLevelThresholds configuration
 *
 * Example:
 *   const thresholds = getDefaultRiskLevelThresholds();
 *   // => { criticalScoreThreshold: -10, highRiskScoreThreshold: -5, ... }
 */
export function getDefaultRiskLevelThresholds(): RiskLevelThresholds {
  return {
    criticalScoreThreshold: -10,
    highRiskScoreThreshold: -5,
    mediumRiskScoreThreshold: -2,
    criticalBreachThreshold: 6,
    highBreachThreshold: 3,
    mediumBreachThreshold: 1,
  }
}

/**
 * Classify a user's risk level based on their reputation score and recent breach count.
 *
 * Classification logic:
 * 1. If score <= criticalScoreThreshold OR breaches >= criticalBreachThreshold -> 'critical'
 * 2. If score <= highRiskScoreThreshold OR breaches >= highBreachThreshold -> 'high'
 * 3. If score <= mediumRiskScoreThreshold OR breaches >= mediumBreachThreshold -> 'medium'
 * 4. Otherwise -> 'low'
 *
 * Critical overrides all other levels.
 *
 * @param reputationScore - The user's current reputation score
 * @param recentBreachCount - Number of breaches in the recent period
 * @param thresholds - Risk level thresholds (defaults used if not provided)
 * @returns The classified RiskLevel
 *
 * Example:
 *   const level = classifyRiskLevel(-6, 2, getDefaultRiskLevelThresholds());
 *   // => 'high' (score <= -5)
 */
export function classifyRiskLevel(
  reputationScore: number,
  recentBreachCount: number,
  thresholds: RiskLevelThresholds = getDefaultRiskLevelThresholds(),
): RiskLevel {
  // Check critical first (highest priority)
  if (
    reputationScore <= thresholds.criticalScoreThreshold ||
    recentBreachCount >= thresholds.criticalBreachThreshold
  ) {
    return 'critical'
  }

  // Check high
  if (
    reputationScore <= thresholds.highRiskScoreThreshold ||
    recentBreachCount >= thresholds.highBreachThreshold
  ) {
    return 'high'
  }

  // Check medium
  if (
    reputationScore <= thresholds.mediumRiskScoreThreshold ||
    recentBreachCount >= thresholds.mediumBreachThreshold
  ) {
    return 'medium'
  }

  // Default: low risk
  return 'low'
}

// --------------------------------------------------------------------------
// v1 Enhancement: Breach Frequency Analysis
// --------------------------------------------------------------------------

/**
 * Result of a breach frequency calculation.
 */
export interface BreachFrequency {
  /** Total number of breaches in the period */
  totalBreaches: number
  /** Breaches per day (total / periodDays) */
  breachesPerDay: number
  /** The time period analyzed (in days) */
  periodDays: number
  /** Breaches grouped by reason category */
  byReason: Record<string, number>
}

/**
 * Calculate breach frequency from a list of breach records.
 *
 * @param breaches - Array of breach records to analyze
 * @param periodDays - The time period to consider (in days)
 * @returns BreachFrequency with rate and breakdown
 *
 * Example:
 *   const freq = calculateBreachFrequency(breaches, 30);
 *   // => { totalBreaches: 5, breachesPerDay: 0.167, periodDays: 30, byReason: {...} }
 */
export function calculateBreachFrequency(
  breaches: BreachRecord[],
  periodDays: number = 30,
): BreachFrequency {
  const totalBreaches = breaches.length

  // Group by reason
  const byReason: Record<string, number> = {}
  for (const breach of breaches) {
    byReason[breach.reason] = (byReason[breach.reason] || 0) + 1
  }

  // Calculate breaches per day (prevent division by zero)
  const breachesPerDay = periodDays > 0 ? totalBreaches / periodDays : 0

  return {
    totalBreaches,
    breachesPerDay,
    periodDays,
    byReason,
  }
}

// --------------------------------------------------------------------------
// v1 Enhancement: User Reputation Summary
// --------------------------------------------------------------------------

/**
 * Comprehensive summary of a user's reputation status.
 */
export interface UserReputationSummary {
  /** Current reputation score (0 if no data) */
  currentScore: number
  /** The classified risk level */
  riskLevel: RiskLevel
  /** Number of recent breaches (within configured period) */
  recentBreachCount: number
  /** Breach frequency analysis */
  breachFrequency: BreachFrequency
  /** Total approved items */
  totalApproved: number
  /** Total rejected/spam items */
  totalRejected: number
  /** Number of times the user has been deactivated */
  timesDeactivated: number
  /** ISO date string of last reputation update */
  lastUpdated: string | null
}

/**
 * Generate a comprehensive reputation summary for a user.
 *
 * Combines score, breaches, risk level, and frequency analysis into
 * a single summary object for display on user profiles or moderation panels.
 *
 * @param score - The user's ReputationScore (null if no history)
 * @param breaches - Array of breach records for the user
 * @param options - Reputation options (defaults used if not provided)
 * @param riskThresholds - Risk level thresholds (defaults used if not provided)
 * @param breachLookbackDays - Days to look back for breach frequency (default: 30)
 * @returns A UserReputationSummary object
 *
 * Example:
 *   const summary = generateUserReputationSummary(score, breaches);
 *   // => { currentScore: -6, riskLevel: 'high', recentBreachCount: 3, ... }
 */
export function generateUserReputationSummary(
  score: ReputationScore | null,
  breaches: BreachRecord[],
  _options: ReputationOptions = getDefaultReputationOptions(),
  riskThresholds: RiskLevelThresholds = getDefaultRiskLevelThresholds(),
  breachLookbackDays: number = 30,
): UserReputationSummary {
  const currentScore = score?.score ?? 0
  const recentBreachCount = breaches.length
  const riskLevel = classifyRiskLevel(
    currentScore,
    recentBreachCount,
    riskThresholds,
  )
  const breachFrequency = calculateBreachFrequency(breaches, breachLookbackDays)

  return {
    currentScore,
    riskLevel,
    recentBreachCount,
    breachFrequency,
    totalApproved: score?.totalApproved ?? 0,
    totalRejected: score?.totalRejected ?? 0,
    timesDeactivated: score?.timesDeactivated ?? 0,
    lastUpdated: score?.lastUpdated ?? null,
  }
}

/**
 * Storage adapter interface for platform-specific implementations
 */
export interface ReputationStorageAdapter {
  /**
   * Get user reputation score
   *
   * @param userId - The user's ID
   * @returns Promise resolving to the user's reputation score or null if not found
   */
  getReputationScore(userId: string | number): Promise<ReputationScore | null>

  /**
   * Save user reputation score
   *
   * @param userId - The user's ID
   * @param score - The reputation score to save
   * @returns Promise that resolves when save is complete
   */
  saveReputationScore(
    userId: string | number,
    score: ReputationScore,
  ): Promise<void>

  /**
   * Get user breach records
   *
   * @param userId - The user's ID
   * @param limit - Optional maximum number of records to return
   * @returns Promise resolving to array of breach records for the user
   */
  getUserBreaches(
    userId: string | number,
    limit?: number,
  ): Promise<BreachRecord[]>

  /**
   * Add a breach record
   *
   * @param breach - The breach record to add (without ID)
   * @returns Promise resolving to the ID of the created breach record
   */
  addBreachRecord(breach: Omit<BreachRecord, 'id'>): Promise<string> // returns breach ID

  /**
   * Clear old breach records (based on retention policy)
   *
   * @param beforeDate - ISO date string; records older than this will be removed
   * @returns Promise that resolves when cleanup is complete
   */
  clearOldBreachRecords(beforeDate: string): Promise<void>
}

// In-memory adapter for testing/demo purposes
export class InMemoryReputationAdapter implements ReputationStorageAdapter {
  private scores: Map<string, ReputationScore> = new Map()
  private breaches: Map<string, BreachRecord[]> = new Map()
  private breachIdCounter = 1

  async getReputationScore(
    userId: string | number,
  ): Promise<ReputationScore | null> {
    const key = String(userId)
    return this.scores.get(key) || null
  }

  async saveReputationScore(
    userId: string | number,
    score: ReputationScore,
  ): Promise<void> {
    const key = String(userId)
    this.scores.set(key, score)
  }

  async getUserBreaches(
    userId: string | number,
    limit: number = 100,
  ): Promise<BreachRecord[]> {
    const key = String(userId)
    const userBreaches = this.breaches.get(key) || []
    return limit ? userBreaches.slice(0, limit) : userBreaches
  }

  async addBreachRecord(breach: Omit<BreachRecord, 'id'>): Promise<string> {
    const key = String(breach.userId)
    const newBreach: BreachRecord = {
      ...breach,
      id: String(this.breachIdCounter++),
    }

    if (!this.breaches.has(key)) {
      this.breaches.set(key, [])
    }

    const existingBreaches = this.breaches.get(key)
    if (existingBreaches) {
      existingBreaches.push(newBreach)
    }
    return newBreach.id
  }

  async clearOldBreachRecords(beforeDate: string): Promise<void> {
    const cutoff = new Date(beforeDate)

    for (const [userId, breaches] of this.breaches.entries()) {
      const filtered = breaches.filter((b) => new Date(b.timestamp) >= cutoff)
      this.breaches.set(userId, filtered)
    }
  }
}
