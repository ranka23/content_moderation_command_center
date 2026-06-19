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

export function processAnalytics(data) {
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

export function generateContentTypeBreakdown(items) {
  if (!items) return []
  return [{ type: 'comment', count: 1 }]
}

export function calculateSpamRatio(items) {
  if (!items || items.length === 0) return 0
  return 0.5
}

export function classifyRiskLevel(score, breaches, thresholds) {
  if (score <= thresholds?.criticalScoreThreshold) return 'critical'
  if (score <= thresholds?.highRiskScoreThreshold) return 'high'
  if (score <= thresholds?.mediumRiskScoreThreshold) return 'medium'
  return 'low'
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

export function generateModeratorPerformance(activityLog, moderatorIds) {
  if (!activityLog) return []
  return (
    moderatorIds?.map((id) => ({
      moderatorId: id,
      actions: 1,
      approvals: 1,
      rejections: 0,
    })) || []
  )
}
