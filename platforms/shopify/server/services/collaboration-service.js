/**
 * Collaboration service - handles notes, assignments, and activity feed.
 */

/**
 * Get activity feed events.
 * @param {import('better-sqlite3').Database} db
 * @param {number} limit
 * @returns {Array}
 */
function getActivityFeed(db, limit = 50) {
  // Combine activity logs and notes into a single feed
  const activityEvents = db
    .prepare(
      `SELECT 'action' as event_type, id, moderator_id as actor_id, action as event_action,
              content_type, item_id, item_title, created_at, NULL as note_text
       FROM activity_logs
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit)

  const noteEvents = db
    .prepare(
      `SELECT 'note' as event_type, id, moderator_id as actor_id, 'note' as event_action,
              NULL as content_type, item_id, NULL as item_title, created_at, note as note_text
       FROM item_notes
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit)

  // Merge and sort by created_at descending
  const merged = [...activityEvents, ...noteEvents].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  return merged.slice(0, limit)
}

/**
 * Get activity for a specific item.
 * @param {import('better-sqlite3').Database} db
 * @param {string|number} itemId
 * @returns {Array}
 */
function getItemActivity(db, itemId) {
  const logs = db
    .prepare(
      `SELECT 'action' as event_type, id, moderator_id as actor_id, action as event_action,
              content_type, item_id, item_title, created_at, NULL as note_text
       FROM activity_logs
       WHERE item_id = ?
       ORDER BY created_at DESC`,
    )
    .all(itemId)

  const notes = db
    .prepare(
      `SELECT 'note' as event_type, id, moderator_id as actor_id, 'note' as event_action,
              NULL as content_type, item_id, NULL as item_title, created_at, note as note_text
       FROM item_notes
       WHERE item_id = ?
       ORDER BY created_at DESC`,
    )
    .all(itemId)

  return [...logs, ...notes].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )
}

module.exports = {
  getActivityFeed,
  getItemActivity,
}
