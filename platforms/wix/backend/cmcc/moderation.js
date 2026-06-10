/**
 * CMCC Wix Velo — Moderation Service
 *
 * Core moderation business logic used by HTTP function modules.
 */

import { getQueueItem, updateQueueItem, logActivity } from './data'

const ACTION_MAP = {
  approve: 'approved',
  reject: 'rejected',
  spam: 'spam',
  defer: 'deferred',
  flag: 'flagged',
}

const VALID_ACTIONS = Object.keys(ACTION_MAP)

/**
 * Moderate a single queue item.
 */
export async function moderateItem(
  itemId,
  { action, moderatorId, moderatorName, reason } = {},
) {
  if (!action || !VALID_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid action. Valid actions: ${VALID_ACTIONS.join(', ')}`,
    )
  }

  const item = await getQueueItem(itemId)
  if (!item) {
    throw new Error('Queue item not found')
  }

  const newStatus = ACTION_MAP[action]
  const now = new Date().toISOString()

  const updated = await updateQueueItem(itemId, {
    status: newStatus,
    moderatedAt: now,
    moderatedBy: moderatorId || 'system',
  })

  await logActivity({
    itemId,
    action: 'moderate',
    actorId: moderatorId || 'system',
    actorName: moderatorName || 'System',
    description: `${moderatorName || 'System'} ${action}d "${item.title || 'untitled'}"`,
    contentType: item.contentType,
    details: JSON.stringify({
      action,
      previousStatus: item.status,
      newStatus,
      reason,
    }),
  })

  return { success: true, item: updated }
}

/**
 * Bulk moderate multiple items.
 */
export async function bulkModerateItems(
  ids,
  { action, moderatorId, moderatorName } = {},
) {
  if (!action || !VALID_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid action. Valid actions: ${VALID_ACTIONS.join(', ')}`,
    )
  }

  const results = []
  for (const id of ids) {
    try {
      await moderateItem(id, { action, moderatorId, moderatorName })
      results.push({ id, success: true, status: ACTION_MAP[action] })
    } catch (err) {
      results.push({ id, success: false, error: err.message })
    }
  }

  return {
    results,
    total: results.length,
    successCount: results.filter((r) => r.success).length,
  }
}

/**
 * Compute analytics from queue data.
 */
export async function computeAnalytics(queueItems, days = 7) {
  const now = new Date()
  const since = new Date(now.getTime() - days * 86400000)

  const moderated = queueItems.filter(
    (i) => i.moderatedAt && new Date(i.moderatedAt) >= since,
  )
  const pending = queueItems.filter((i) => i.status === 'pending')
  const spamCount = queueItems.filter((i) => i.status === 'spam').length
  const approved = queueItems.filter((i) => i.status === 'approved').length
  const rejected = queueItems.filter((i) => i.status === 'rejected').length

  // Moderation activity by moderator and content type
  const breakdown = {}
  for (const item of moderated) {
    const key = `${item.moderatedBy || 'unknown'}|${item.contentType || 'unknown'}`
    if (!breakdown[key]) {
      breakdown[key] = {
        moderator: item.moderatedBy || 'unknown',
        contentType: item.contentType || 'unknown',
        count: 0,
        statuses: {},
      }
    }
    breakdown[key].count++
    breakdown[key].statuses[item.status] =
      (breakdown[key].statuses[item.status] || 0) + 1
  }

  // Spam ratio over time
  const totalItems = queueItems.length
  const spamRatio =
    totalItems > 0 ? ((spamCount / totalItems) * 100).toFixed(1) : 0

  return {
    period: `${days} days`,
    generatedAt: now.toISOString(),
    totalModerated: moderated.length,
    pendingCount: pending.length,
    totalItems,
    spamCount,
    approved,
    rejected,
    spamRatio: parseFloat(spamRatio),
    breakdown: Object.values(breakdown),
  }
}

/**
 * Queue summary counts (for badge indicators).
 */
export async function getQueueCounts() {
  const { getQueueItems } = await import('./data')
  const all = await getQueueItems({ pageSize: 1 })
  const pending = await getQueueItems({ pageSize: 1, status: 'pending' })
  const spam = await getQueueItems({ pageSize: 1, status: 'spam' })
  return {
    total: all.total,
    pending: pending.total,
    spam: spam.total,
  }
}
