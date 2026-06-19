'use strict'

const store = require('./cmcc-service-store')
const { PLUGIN_ID, notesStore, assignmentStore, activityFeedEvents } = store

/**
 * Core queue operations, moderation, notes, assignments, and activity feed.
 */
module.exports = ({ strapi, assignmentManager, conflictDetector }) => {
  /**
   * Get paginated queue items with filters
   */
  async function getQueue(params) {
    const p = params || {}
    const {
      page = 1,
      pageSize = 20,
      status,
      contentType,
      search,
      sort = 'createdAt:DESC',
    } = p
    const filters = {}

    if (status) filters.status = { $eq: status }
    if (contentType) filters.contentType = { $eq: contentType }
    if (search) {
      filters.$or = [
        { title: { $containsi: search } },
        { excerpt: { $containsi: search } },
      ]
    }

    const [sortField, sortOrder] = sort.split(':')
    return strapi.entityService.findPage(`plugin::${PLUGIN_ID}.queue-item`, {
      page: Number(page),
      pageSize: Number(pageSize),
      filters,
      sort: { [sortField]: sortOrder.toLowerCase() },
      populate: '*',
    })
  }

  /**
   * Moderate a single item (approve, reject, mark as spam, defer)
   */
  async function moderateItem(itemId, action, moderatorId) {
    const item = await strapi.entityService.findOne(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
    )
    if (!item) throw new Error('Queue item not found')

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
      defer: 'deferred',
    }
    const actionMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
      defer: 'deferred',
    }
    const newStatus = statusMap[action]
    if (!newStatus) throw new Error('Invalid action')

    const updatedItem = await strapi.entityService.update(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
      { data: { status: newStatus } },
    )

    if (conflictDetector) {
      const conflict = conflictDetector.recordAction(
        String(itemId),
        String(moderatorId),
        action,
      )
      if (conflict) {
        strapi.log.warn(
          `[CMCC] Moderation conflict detected on item #${itemId}: ` +
            `${conflict.firstModeratorId} (${conflict.firstAction}) vs ` +
            `${conflict.secondModeratorId} (${conflict.secondAction})`,
        )
      }
    }

    if (assignmentManager) assignmentManager.completeAssignment(String(itemId))

    await logActivity({
      moderatorId,
      action: actionMap[action],
      contentType: item.contentType,
      itemId: item.itemId,
      previousStatus: item.status,
      newStatus,
    })
    addFeedEvent({
      type: 'action',
      actorId: moderatorId,
      actorName: `Moderator #${moderatorId}`,
      description: `${actionMap[action]} item "${item.title || item.itemId}"`,
      itemId: item.itemId,
      itemTitle: item.title,
    })

    return updatedItem
  }

  /**
   * Perform a bulk action on multiple items
   */
  async function bulkAction(itemIds, action, moderatorId) {
    const results = { succeeded: [], failed: [] }
    for (const id of itemIds) {
      try {
        results.succeeded.push(await moderateItem(id, action, moderatorId))
      } catch (err) {
        results.failed.push({ id, error: err.message })
      }
    }
    return results
  }

  /**
   * Get history for a specific queue item
   */
  async function getItemHistory(itemId) {
    const entries = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.activity-log`,
      {
        filters: { itemId: { $eq: itemId } },
        sort: { createdAt: 'desc' },
        populate: '*',
      },
    )
    return entries || []
  }

  /**
   * Get notes for a queue item
   */
  async function getNotes(itemId) {
    return notesStore[itemId] || []
  }

  /**
   * Add a note to a queue item
   */
  async function addNote(
    itemId,
    { content, authorId, authorName, isInternal, type },
  ) {
    if (!notesStore[itemId]) notesStore[itemId] = []
    const note = {
      id: store.getNextNoteId(),
      itemId,
      authorId,
      authorName,
      content,
      isInternal,
      type: type || 'general',
      createdAt: new Date().toISOString(),
    }
    notesStore[itemId].unshift(note)
    addFeedEvent({
      type: 'note',
      actorId: authorId,
      actorName: authorName,
      description: `Added a note on item #${itemId}`,
      itemId,
      itemTitle: '',
    })
    return note
  }

  /**
   * Assign a queue item to a moderator or team
   */
  async function assignItem(
    itemId,
    { assigneeId, teamId, assignedById, dueDate, priority },
  ) {
    const assignment = {
      itemId,
      assigneeId,
      teamId,
      assignedById,
      assignedAt: new Date().toISOString(),
      dueDate,
      priority: priority || 'normal',
      status: 'pending',
    }
    assignmentStore[itemId] = assignment
    if (assignmentManager) assignmentManager.assignItem(assignment)
    addFeedEvent({
      type: 'assignment',
      actorId: assignedById,
      actorName: `Moderator #${assignedById}`,
      description: `Assigned item #${itemId} to ${assigneeId || teamId || 'unassigned'}`,
      itemId,
      itemTitle: '',
    })
    return assignment
  }

  /**
   * Add an event to the activity feed
   */
  function addFeedEvent({
    type,
    actorId,
    actorName,
    description,
    itemId,
    itemTitle,
  }) {
    activityFeedEvents.unshift({
      id: store.getNextFeedEventId(),
      type: type || 'action',
      actorId,
      actorName,
      description,
      itemId,
      itemTitle: itemTitle || '',
      timestamp: new Date().toISOString(),
    })
    if (activityFeedEvents.length > 200) activityFeedEvents.length = 200
  }

  /**
   * Get the most recent activity feed events
   */
  async function getActivityFeed(limit) {
    return activityFeedEvents.slice(0, limit !== undefined ? limit : 20)
  }

  /**
   * Log moderation activity
   */
  async function logActivity(data) {
    return strapi.entityService.create(`plugin::${PLUGIN_ID}.activity-log`, {
      data,
    })
  }

  return {
    getQueue,
    moderateItem,
    bulkAction,
    getItemHistory,
    getNotes,
    addNote,
    assignItem,
    addFeedEvent,
    getActivityFeed,
    logActivity,
  }
}
