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

export function getQueueBadgeCount(queueItems, status) {
  if (!queueItems) return 0
  return queueItems.filter((item) => item.status === status).length
}

export function calculateUserSpamRatio(userReputation) {
  if (!userReputation) return 0
  const total =
    (userReputation.totalApproved || 0) + (userReputation.totalRejected || 0)
  if (total === 0) return 0
  return (userReputation.totalRejected || 0) / total
}
