/**
 * CMCC Wix Velo — Data Layer
 *
 * Shared data access layer using Wix Data API.
 * All queue items, activity logs, settings, etc. are stored in Wix Data collections.
 *
 * Required Wix Data collections (create these in your Wix Dashboard):
 *   - cmcc_queue_items
 *   - cmcc_activity_logs
 *   - cmcc_settings
 *   - cmcc_scheduled_reports
 *   - cmcc_webhook_configs
 *   - cmcc_content_hooks
 *   - cmcc_notes
 *   - cmcc_assignments
 */

import wixData from 'wix-data'

export const COLLECTIONS = {
  QUEUE: 'cmcc_queue_items',
  ACTIVITY_LOG: 'cmcc_activity_logs',
  SETTINGS: 'cmcc_settings',
  SCHEDULED_REPORTS: 'cmcc_scheduled_reports',
  WEBHOOK_CONFIGS: 'cmcc_webhook_configs',
  CONTENT_HOOKS: 'cmcc_content_hooks',
  NOTES: 'cmcc_notes',
  ASSIGNMENTS: 'cmcc_assignments',
}

// ── Queue Items ─────────────────────────────────────────────────────────

export async function getQueueItems({
  page = 0,
  pageSize = 20,
  status,
  contentType,
  search,
} = {}) {
  const query = wixData.query(COLLECTIONS.QUEUE)
  if (status) query = query.eq('status', status)
  if (contentType) query = query.eq('contentType', contentType)
  if (search) {
    query = query.or(
      wixData.query().contains('title', search),
      wixData.query().contains('authorName', search),
      wixData.query().contains('content', search),
    )
  }
  query = query.descending('createdAt')
  query = query.skip(page * pageSize).limit(pageSize)

  const results = await query.find()
  return {
    items: results.items,
    total: results.totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(results.totalCount / pageSize) || 0,
  }
}

export async function getQueueItem(id) {
  return wixData.get(COLLECTIONS.QUEUE, id)
}

export async function createQueueItem(data) {
  return wixData.insert(COLLECTIONS.QUEUE, {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    platform: 'wix',
  })
}

export async function updateQueueItem(id, data) {
  return wixData.update(COLLECTIONS.QUEUE, id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function bulkUpdateQueueItem(ids, data) {
  const results = []
  for (const id of ids) {
    try {
      const result = await updateQueueItem(id, data)
      results.push({ id, success: true, result })
    } catch (err) {
      results.push({ id, success: false, error: err.message })
    }
  }
  return results
}

// ── Activity Logs ───────────────────────────────────────────────────────

export async function getActivityLogs({
  page = 0,
  pageSize = 20,
  action,
  contentType,
  search,
} = {}) {
  let query = wixData.query(COLLECTIONS.ACTIVITY_LOG)
  if (action) query = query.eq('action', action)
  if (contentType) query = query.eq('contentType', contentType)
  if (search) {
    query = query.or(
      wixData.query().contains('description', search),
      wixData.query().contains('actorName', search),
    )
  }
  query = query.descending('createdAt')
  query = query.skip(page * pageSize).limit(pageSize)

  const results = await query.find()
  return {
    entries: results.items,
    total: results.totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(results.totalCount / pageSize) || 0,
  }
}

export async function logActivity(data) {
  return wixData.insert(COLLECTIONS.ACTIVITY_LOG, {
    ...data,
    id: undefined, // let Wix auto-generate
    createdAt: new Date().toISOString(),
  })
}

// ── Settings ────────────────────────────────────────────────────────────

export async function getSettings() {
  const results = await wixData.query(COLLECTIONS.SETTINGS).find()
  const settings = {}
  for (const item of results.items) {
    settings[item.key] = item.value
  }
  return settings
}

export async function updateSetting(key, value) {
  // Upsert: try to find existing, update or insert
  const existing = await wixData
    .query(COLLECTIONS.SETTINGS)
    .eq('key', key)
    .find()
  if (existing.items.length > 0) {
    return wixData.update(COLLECTIONS.SETTINGS, existing.items[0]._id, {
      value: String(value),
      updatedAt: new Date().toISOString(),
    })
  }
  return wixData.insert(COLLECTIONS.SETTINGS, {
    key,
    value: String(value),
    updatedAt: new Date().toISOString(),
  })
}

// ── Scheduled Reports ───────────────────────────────────────────────────

export async function getScheduledReports() {
  const results = await wixData
    .query(COLLECTIONS.SCHEDULED_REPORTS)
    .descending('createdAt')
    .find()
  return results.items
}

export async function createScheduledReport(data) {
  return wixData.insert(COLLECTIONS.SCHEDULED_REPORTS, {
    ...data,
    active: true,
    createdAt: new Date().toISOString(),
  })
}

export async function deleteScheduledReport(id) {
  return wixData.remove(COLLECTIONS.SCHEDULED_REPORTS, id)
}

// ── Webhook Configs ─────────────────────────────────────────────────────

export async function getWebhookConfigs() {
  const results = await wixData.query(COLLECTIONS.WEBHOOK_CONFIGS).find()
  return results.items
}

export async function createWebhookConfig(data) {
  return wixData.insert(COLLECTIONS.WEBHOOK_CONFIGS, {
    ...data,
    createdAt: new Date().toISOString(),
  })
}

export async function deleteWebhookConfig(id) {
  return wixData.remove(COLLECTIONS.WEBHOOK_CONFIGS, id)
}

// ── Content Hooks ───────────────────────────────────────────────────────

export async function getContentHooks() {
  const results = await wixData.query(COLLECTIONS.CONTENT_HOOKS).find()
  return results.items
}

export async function upsertContentHook(data) {
  const existing = await wixData
    .query(COLLECTIONS.CONTENT_HOOKS)
    .eq('name', data.name)
    .find()
  if (existing.items.length > 0) {
    return wixData.update(
      COLLECTIONS.CONTENT_HOOKS,
      existing.items[0]._id,
      data,
    )
  }
  return wixData.insert(COLLECTIONS.CONTENT_HOOKS, data)
}

// ── Notes ────────────────────────────────────────────────────────────────

/**
 * Get notes for a specific queue item.
 *
 * @param {string} itemId - The queue item ID.
 * @returns {Promise<Array>} Array of note objects.
 */
export async function getNotes(itemId) {
  const results = await wixData
    .query(COLLECTIONS.NOTES)
    .eq('itemId', itemId)
    .descending('createdAt')
    .find()
  return results.items
}

/**
 * Add a note to a queue item.
 *
 * @param {object} data - Note data (itemId, authorId, authorName, content, isInternal, type).
 * @returns {Promise<object>} The created note.
 */
export async function addNote(data) {
  return wixData.insert(COLLECTIONS.NOTES, {
    ...data,
    id: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

// ── Assignments ───────────────────────────────────────────────────────────

/**
 * Get the current assignment for a queue item.
 *
 * @param {string} itemId - The queue item ID.
 * @returns {Promise<object|null>} The assignment object or null.
 */
export async function getAssignments(itemId) {
  const results = await wixData
    .query(COLLECTIONS.ASSIGNMENTS)
    .eq('itemId', itemId)
    .descending('createdAt')
    .limit(1)
    .find()
  return results.items.length > 0 ? results.items[0] : null
}

/**
 * Assign a queue item to a moderator or team.
 *
 * @param {object} data - Assignment data (itemId, assigneeId, teamId, assignedById, dueDate, priority).
 * @returns {Promise<object>} The created/updated assignment.
 */
export async function assignItem(data) {
  // Check if there's an existing active assignment
  const existing = await wixData
    .query(COLLECTIONS.ASSIGNMENTS)
    .eq('itemId', data.itemId)
    .eq('status', 'pending')
    .limit(1)
    .find()

  if (existing.items.length > 0) {
    return wixData.update(COLLECTIONS.ASSIGNMENTS, existing.items[0]._id, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  }

  return wixData.insert(COLLECTIONS.ASSIGNMENTS, {
    ...data,
    id: undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}
