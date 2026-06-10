/**
 * CMCC Analytics — Wix HTTP Functions
 *
 * REST API endpoints for analytics data.
 * Mounted at: /api/cmcc/analytics/*
 */

import { getQueueItems, getActivityLogs } from '../cmcc/data'
import { computeAnalytics } from '../cmcc/moderation'

/**
 * GET /api/cmcc/analytics
 * Returns analytics data including queue stats and moderation activity.
 */
export async function get_analytics(request) {
  const days = parseInt(request.query.days, 10) || 7

  try {
    const queueResult = await getQueueItems({ pageSize: 1000 })
    const logResult = await getActivityLogs({ pageSize: 500 })

    const analytics = await computeAnalytics(queueResult.items, days)

    return ok({
      queueStats: {
        pending: queueResult.items.filter((i) => i.status === 'pending').length,
        approved: queueResult.items.filter((i) => i.status === 'approved').length,
        rejected: queueResult.items.filter((i) => i.status === 'rejected').length,
        spam: queueResult.items.filter((i) => i.status === 'spam').length,
        flagged: queueResult.items.filter((i) => i.status === 'flagged').length,
        total: queueResult.total,
      },
      moderationActivity: analytics,
      recentActivity: logResult.entries.slice(0, 20),
    })
  } catch (err) {
    return fail(err.message)
  }
}

function ok(body) {
  return { headers: { 'Content-Type': 'application/json' }, body }
}

function fail(error) {
  return { headers: { 'Content-Type': 'application/json' }, body: { error }, statusCode: 500 }
}
