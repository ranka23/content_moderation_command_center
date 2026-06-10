/**
 * Activity log service - handles activity log CRUD and filtering.
 */

/**
 * Get activity log entries with pagination and filtering.
 */
function getActivityLogs(db, options = {}) {
  const {
    action,
    moderatorId,
    contentType,
    page = 1,
    limit = 50,
  } = options

  const conditions = []
  const params = []

  if (action) {
    conditions.push('action = ?')
    params.push(action)
  }
  if (moderatorId) {
    conditions.push('moderator_id = ?')
    params.push(moderatorId)
  }
  if (contentType) {
    conditions.push('content_type = ?')
    params.push(contentType)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM activity_logs ${whereClause}`).get(...params)
  const total = countRow.count

  const entries = db.prepare(
    `SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset)

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Log an activity entry.
 */
function logActivity(db, { moderatorId, action, contentType, itemId, itemTitle, previousStatus, newStatus, notes }) {
  db.prepare(
    `INSERT INTO activity_logs (moderator_id, action, content_type, item_id, item_title, previous_status, new_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(moderatorId, action, contentType, itemId, itemTitle || null, previousStatus || null, newStatus || null, notes || null)

  return db.prepare('SELECT * FROM activity_logs WHERE id = last_insert_rowid()').get()
}

module.exports = {
  getActivityLogs,
  logActivity,
}
