/**
 * Queue service - handles queue item CRUD and moderation operations.
 */

const VALID_ACTIONS = ['approve', 'reject', 'spam', 'defer', 'flag', 'deactivate-users']

/**
 * Get paginated queue items with filtering.
 */
function getQueueItems(db, options = {}) {
  const {
    status,
    contentType,
    page = 1,
    limit = 50,
    search,
  } = options

  const conditions = []
  const params = []

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }
  if (contentType) {
    conditions.push('content_type = ?')
    params.push(contentType)
  }
  if (search) {
    conditions.push('(title LIKE ? OR excerpt LIKE ? OR author_name LIKE ?)')
    const searchParam = `%${search}%`
    params.push(searchParam, searchParam, searchParam)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM queue_items ${whereClause}`).get(...params)
  const total = countRow.count

  const items = db.prepare(
    `SELECT * FROM queue_items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset)

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Moderate a single queue item.
 */
function moderateItem(db, itemId, action, moderatorId, moderatorName, notes, undoService) {
  if (!VALID_ACTIONS.includes(action)) {
    const err = new Error(`Invalid action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}`)
    err.statusCode = 400
    throw err
  }

  const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(itemId)
  if (!item) {
    const err = new Error('Queue item not found')
    err.statusCode = 404
    throw err
  }

  const statusMap = {
    approve: 'approved',
    reject: 'rejected',
    spam: 'spam',
    defer: 'deferred',
    flag: 'flagged',
    'deactivate-users': 'deactivated',
  }

  const newStatus = statusMap[action]
  const previousStatus = item.status

  // Save snapshot for undo
  if (undoService) {
    undoService.saveSnapshot(String(item.id), {
      status: item.status,
      spam_score: item.spam_score,
      item_id: item.item_id,
    }).catch(() => {})
  }

  // Update the item status
  db.prepare(
    'UPDATE queue_items SET status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(newStatus, itemId)

  // Log the activity
  db.prepare(
    `INSERT INTO activity_logs (moderator_id, action, content_type, item_id, item_title, previous_status, new_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(moderatorId, action, item.content_type, item.item_id, item.title, previousStatus, newStatus, notes || null)

  const updated = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(itemId)
  return updated
}

/**
 * Bulk moderate multiple items.
 */
function bulkModerate(db, ids, action, moderatorId, moderatorName, undoService) {
  if (!VALID_ACTIONS.includes(action)) {
    const err = new Error(`Invalid action: ${action}`)
    err.statusCode = 400
    throw err
  }

  let moderated = 0
  const results = []

  for (const id of ids) {
    try {
      const updated = moderateItem(db, id, action, moderatorId, moderatorName, null, undoService)
      moderated++
      results.push(updated)
    } catch (e) {
      // Skip items that don't exist
      if (e.statusCode !== 404) throw e
    }
  }

  return { moderated, results }
}

/**
 * Get moderation history for an item.
 */
function getItemHistory(db, itemId) {
  const item = db.prepare('SELECT item_id FROM queue_items WHERE id = ?').get(itemId)
  if (!item) {
    const err = new Error('Queue item not found')
    err.statusCode = 404
    throw err
  }

  return db.prepare(
    'SELECT * FROM activity_logs WHERE item_id = ? ORDER BY created_at DESC'
  ).all(item.item_id)
}

/**
 * Get notes for a queue item.
 */
function getItemNotes(db, itemId) {
  return db.prepare(
    'SELECT * FROM item_notes WHERE item_id = ? ORDER BY created_at DESC'
  ).all(itemId)
}

/**
 * Add a note to a queue item.
 */
function addItemNote(db, itemId, moderatorId, moderatorName, note) {
  db.prepare(
    'INSERT INTO item_notes (item_id, moderator_id, moderator_name, note) VALUES (?, ?, ?, ?)'
  ).run(itemId, moderatorId, moderatorName || null, note)

  return db.prepare(
    'SELECT * FROM item_notes WHERE id = last_insert_rowid()'
  ).get()
}

/**
 * Assign a queue item to a moderator.
 */
function assignItem(db, itemId, assignTo, assignedBy) {
  const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(itemId)
  if (!item) {
    const err = new Error('Queue item not found')
    err.statusCode = 404
    throw err
  }

  db.prepare('UPDATE queue_items SET assigned_to = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(assignTo, itemId)

  db.prepare(
    'INSERT INTO item_assignments (item_id, assigned_to, assigned_by) VALUES (?, ?, ?)'
  ).run(itemId, assignTo, assignedBy)

  return db.prepare('SELECT * FROM queue_items WHERE id = ?').get(itemId)
}

/**
 * Get a single queue item by ID.
 */
function getQueueItem(db, itemId) {
  const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(itemId)
  if (!item) {
    const err = new Error('Queue item not found')
    err.statusCode = 404
    throw err
  }
  return item
}

module.exports = {
  getQueueItems,
  moderateItem,
  bulkModerate,
  getItemHistory,
  getItemNotes,
  addItemNote,
  assignItem,
  getQueueItem,
  VALID_ACTIONS,
}
