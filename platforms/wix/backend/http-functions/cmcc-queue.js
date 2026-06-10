/**
 * CMCC Queue — Wix HTTP Functions
 *
 * REST API endpoints for queue management.
 * Mounted at: /api/cmcc/queue/*
 *
 * @see https://dev.wix.com/docs/velo/api-reference/wix-http-functions/about-wix-http-functions
 */

import {
  getQueueItems,
  getQueueItem,
  getNotes,
  addNote,
  getAssignments,
  assignItem,
} from '../cmcc/data'
import { moderateItem, bulkModerateItems } from '../cmcc/moderation'

/**
 * GET /api/cmcc/queue
 * Paginated queue items with optional filters.
 */
export async function get_queue(request) {
  const { query } = request
  const page = parseInt(query.page, 10) || 0
  const pageSize = Math.min(100, parseInt(query.pageSize, 10) || 20)
  const status = query.status
  const contentType = query.contentType
  const search = query.search

  try {
    const result = await getQueueItems({
      page,
      pageSize,
      status,
      contentType,
      search,
    })
    return ok({
      items: result.items,
      pagination: {
        total: result.total,
        page,
        pageSize,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/queue/:id
 * Get a single queue item by ID.
 */
export async function get_queue_id(request) {
  const id = request.path[0]
  try {
    const item = await getQueueItem(id)
    if (!item) return notFound('Queue item not found')
    return ok(item)
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/queue/:id/moderate
 * Moderate a single queue item.
 */
export async function post_moderate(request) {
  const id = request.path[0]
  const { action, moderatorId, moderatorName, reason } = request.body || {}

  try {
    const result = await moderateItem(id, {
      action,
      moderatorId,
      moderatorName,
      reason,
    })
    return ok(result)
  } catch (err) {
    if (err.message.includes('not found')) return notFound(err.message)
    if (err.message.includes('Invalid action')) return badRequest(err.message)
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/queue/bulk
 * Bulk moderate multiple items.
 */
export async function post_bulk(request) {
  const { action, ids, moderatorId, moderatorName } = request.body || {}

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return badRequest('ids must be a non-empty array')
  }

  try {
    const result = await bulkModerateItems(ids, {
      action,
      moderatorId,
      moderatorName,
    })
    return ok(result)
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/queue/:id/history
 * Activity log history for a specific item.
 */
export async function get_history(request) {
  const itemId = request.path[0]
  try {
    const { getActivityLogs } = await import('../cmcc/data')
    const result = await getActivityLogs({ pageSize: 100 })
    const itemLogs = result.entries.filter((e) => e.itemId === itemId)
    return ok(itemLogs)
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/queue/:id/notes
 * Get all notes for a specific queue item.
 */
export async function get_queue_id_notes(request) {
  const itemId = request.path[0]
  try {
    const notes = await getNotes(itemId)
    return ok({ notes })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/queue/:id/notes
 * Add a note to a queue item.
 */
export async function post_queue_id_notes(request) {
  const itemId = request.path[0]
  const { content, authorId, authorName, isInternal, type } = request.body || {}

  if (!content || !content.trim()) {
    return badRequest('Note content is required')
  }

  try {
    const note = await addNote({
      itemId,
      content: content.trim(),
      authorId: authorId || 'system',
      authorName: authorName || 'System',
      isInternal: !!isInternal,
      type: type || 'general',
    })
    return {
      headers: { 'Content-Type': 'application/json' },
      body: { note },
      statusCode: 201,
    }
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * GET /api/cmcc/queue/:id/assignments
 * Get the current assignment for a queue item.
 */
export async function get_queue_id_assignments(request) {
  const itemId = request.path[0]
  try {
    const assignment = await getAssignments(itemId)
    return ok({ assignment })
  } catch (err) {
    return fail(err.message)
  }
}

/**
 * POST /api/cmcc/queue/:id/assign
 * Assign a queue item to a moderator or team.
 */
export async function post_queue_id_assign(request) {
  const itemId = request.path[0]
  const { assigneeId, teamId, assignedById, dueDate, priority } =
    request.body || {}

  try {
    const result = await assignItem({
      itemId,
      assigneeId,
      teamId,
      assignedById: assignedById || 'system',
      dueDate,
      priority: priority || 'normal',
    })
    return ok({ assignment: result })
  } catch (err) {
    return fail(err.message)
  }
}

// ── Response helpers ──────────────────────────────────────────────────

function ok(body) {
  return { headers: { 'Content-Type': 'application/json' }, body }
}

function badRequest(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 400,
  }
}

function notFound(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 404,
  }
}

function fail(error) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: { error },
    statusCode: 500,
  }
}
