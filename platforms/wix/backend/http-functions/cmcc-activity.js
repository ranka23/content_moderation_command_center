/**
 * CMCC Activity Log — Wix HTTP Functions
 *
 * REST API endpoints for activity log and activity feed.
 * Mounted at: /api/cmcc/activity-log/*
 */

import { getActivityLogs } from '../cmcc/data'

/**
 * GET /api/cmcc/activity-log
 * Returns paginated activity logs with optional filters.
 */
export async function get_activity_log(request) {
  const page = parseInt(request.query.page, 10) || 0
  const pageSize = Math.min(100, parseInt(request.query.pageSize, 10) || 20)
  const action = request.query.action
  const contentType = request.query.contentType
  const search = request.query.search

  try {
    const result = await getActivityLogs({ page, pageSize, action, contentType, search })
    return ok({
      entries: result.entries,
      pagination: { total: result.total, page, pageSize, totalPages: result.totalPages },
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/activity-feed
 * Returns recent activity feed events.
 */
export async function get_activity_feed(request) {
  const limit = Math.min(100, parseInt(request.query.limit, 10) || 50)

  try {
    const result = await getActivityLogs({ pageSize: limit })
    const events = result.entries.map((e) => ({
      id: `evt_${e._id}`,
      type: e.action === 'note' ? 'note' : e.action === 'assignment' ? 'assignment' : e.action === 'escalation' ? 'escalation' : 'action',
      actorId: e.actorId,
      actorName: e.actorName || 'System',
      description: e.description || `${e.action} item ${e.itemId}`,
      itemId: e.itemId,
      timestamp: e.createdAt,
    }))
    return ok({ events })
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
