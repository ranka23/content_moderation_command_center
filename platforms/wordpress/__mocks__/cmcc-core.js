export function getEmptyAnalytics() {
  return {
    heatmap: { data: [], maxCount: 0 },
    spamRatio: { spamCount: 0, totalCount: 0, ratio: 0, percentage: 0 },
    contentTypeBreakdown: [],
    moderatorPerformance: [],
    anomalyAlerts: [],
    dateRange: { start: '', end: '' },
  }
}

export function processAnalytics(data, _queueItems, _moderatorNames) {
  // When data is an array of raw events (client-side processing path),
  // return a proper analytics structure rather than the raw array
  if (Array.isArray(data)) {
    return getEmptyAnalytics()
  }
  return data || getEmptyAnalytics()
}

export function filterActivityLog(entries, _filters) {
  if (!entries) return []
  return entries
}

export function getDefaultAnalyticsOptions() {
  return {
    days: 7,
  }
}

export function getDateRangeForPeriod(_period) {
  return { start: '2026-01-01T00:00:00.000Z', end: '2026-06-11T00:00:00.000Z' }
}

export function getDefaultReputationOptions() {
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

export function getDefaultRiskLevelThresholds() {
  return {
    criticalScoreThreshold: -10,
    highRiskScoreThreshold: -5,
    mediumRiskScoreThreshold: -2,
    criticalBreachThreshold: 6,
    highBreachThreshold: 3,
    mediumBreachThreshold: 1,
  }
}

export function classifyRiskLevel(
  reputationScore,
  recentBreachCount,
  thresholds,
) {
  if (
    reputationScore <= thresholds.criticalScoreThreshold ||
    recentBreachCount >= thresholds.criticalBreachThreshold
  ) {
    return 'critical'
  }
  if (
    reputationScore <= thresholds.highRiskScoreThreshold ||
    recentBreachCount >= thresholds.highBreachThreshold
  ) {
    return 'high'
  }
  if (
    reputationScore <= thresholds.mediumRiskScoreThreshold ||
    recentBreachCount >= thresholds.mediumBreachThreshold
  ) {
    return 'medium'
  }
  return 'low'
}

export function generateUserReputationSummary(
  score,
  breaches,
  options,
  riskThresholds,
  _breachLookbackDays,
) {
  const currentScore = score?.score ?? 0
  const recentBreachCount = breaches.length
  const riskLevel = classifyRiskLevel(
    currentScore,
    recentBreachCount,
    riskThresholds,
  )
  return {
    currentScore,
    riskLevel,
    recentBreachCount,
    totalApproved: score?.totalApproved ?? 0,
    totalRejected: score?.totalRejected ?? 0,
    timesDeactivated: score?.timesDeactivated ?? 0,
    lastUpdated: score?.lastUpdated ?? null,
  }
}
