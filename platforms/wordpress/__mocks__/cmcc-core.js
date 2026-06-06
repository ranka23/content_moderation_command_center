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
