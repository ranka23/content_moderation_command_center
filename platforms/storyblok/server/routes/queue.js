/**
 * Queue routes — CRUD + moderation endpoints
 */
const express = require('express')
const { v4: uuidv4 } = require('uuid')

// Track undo snapshots in-memory
const undoSnapshots = new Map()

const VALID_ACTIONS = ['approve', 'reject', 'spam', 'defer', 'flag', 'deactivate-users']
const STATUS_MAP = {
  approve: 'approved',
  reject: 'rejected',
  spam: 'spam',
  defer: 'deferred',
  flag: 'flagged',
}

function createQueueRouter(db, services = {}) {
  const router = express.Router()

  // ── GET /queue — Paginated queue ────────────────────────────────────
  router.get('/', (req, res) => {
    const {
      page = '1',
      perPage = '25',
      status,
      contentType,
      search,
      dateFrom,
      dateTo,
      platform,
    } = req.query

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage, 10) || 25))
    const offset = (pageNum - 1) * perPageNum

    // Build query
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
      conditions.push('(title LIKE ? OR author_name LIKE ? OR content LIKE ?)')
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }
    if (platform) {
      conditions.push('platform = ?')
      params.push(platform)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM queue_items ${whereClause}`).get(...params)
    const total = countRow.total

    // Get items
    const items = db.prepare(
      `SELECT * FROM queue_items ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, perPageNum, offset)

    res.json({
      items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / perPageNum) || 0,
    })
  })

  // ── POST /queue/:id/moderate — Moderate an item ─────────────────────
  router.post('/:id/moderate', (req, res) => {
    const { id } = req.params
    const { action, moderatorId, moderatorName, reason } = req.body

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    // Save snapshot for undo (before state change)
    if (action !== 'deactivate-users') {
      const snapshot = {
        id: uuidv4(),
        itemId: id,
        state: {
          status: item.status,
          spam_score: item.spam_score,
          assigned_to: item.assigned_to,
          moderated_at: item.moderated_at,
        },
        timestamp: new Date().toISOString(),
      }
      undoSnapshots.set(id, snapshot)
    }

    // Track deactivation
    let userDeactivated = false

    if (action === 'deactivate-users') {
      db.prepare(`
        UPDATE queue_items
        SET status = 'rejected', moderated_at = datetime('now'), updated_at = datetime('now')
        WHERE item_id = ?
      `).run(id)
      userDeactivated = true
    } else {
      const newStatus = STATUS_MAP[action]
      db.prepare(`
        UPDATE queue_items
        SET status = ?, moderated_at = datetime('now'), updated_at = datetime('now')
        WHERE item_id = ?
      `).run(newStatus, id)
    }

    // Create activity log entry
    db.prepare(`
      INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      action,
      moderatorId || '',
      moderatorName || '',
      item.content_type,
      JSON.stringify({ reason: reason || '', previousStatus: item.status }),
    )

    // Publish WebSocket event if bus available
    if (services.eventBus) {
      services.eventBus.publishAction(
        moderatorId || 'system',
        moderatorName || 'System',
        `${action} item "${item.title || id}"`,
        id,
        item.title,
      )
    }

    // Dispatch webhook if configured
    if (services.webhookService) {
      const webhooks = db.prepare('SELECT * FROM webhook_configs WHERE active = 1').all()
      for (const wh of webhooks) {
        const events = JSON.parse(wh.events || '[]')
        if (events.includes('moderation') || events.includes('*')) {
          const payload = {
            event: 'moderation',
            data: {
              itemId: id,
              action,
              contentType: item.content_type,
              title: item.title,
              moderatorId,
            },
          }
          services.webhookService.dispatch(wh.url, payload).catch(() => {})
        }
      }
    }

    // Send email notification if configured
    if (services.emailService) {
      const settings = getSettings(db)
      if (settings.emailAlerts) {
        services.emailService.sendNotification(action === 'spam' ? 'auto_moderated' : 'new_item', {
          title: item.title,
          content_type: item.content_type,
          status: action,
        }).catch(() => {})
      }
    }

    const updatedItem = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)

    res.json({
      success: true,
      item: updatedItem,
      userDeactivated,
    })
  })

  // ── POST /queue/bulk — Bulk actions ──────────────────────────────────
  router.post('/bulk', (req, res) => {
    const { action, ids, moderatorId, moderatorName } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' })
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      })
    }

    const newStatus = STATUS_MAP[action] || action
    const updateStmt = db.prepare(`
      UPDATE queue_items SET status = ?, moderated_at = datetime('now'), updated_at = datetime('now')
      WHERE item_id = ?
    `)
    const logStmt = db.prepare(`
      INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    const moderated = []
    const transaction = db.transaction(() => {
      for (const itemId of ids) {
        const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(itemId)
        if (item) {
          updateStmt.run(newStatus, itemId)
          logStmt.run(itemId, action, moderatorId || '', moderatorName || '', item.content_type, '{}')
          moderated.push(itemId)
        }
      }
    })
    transaction()

    res.json({
      success: true,
      moderated: moderated.length,
      total: ids.length,
    })
  })

  // ── GET /queue/:id/history — Item history timeline ──────────────────
  router.get('/:id/history', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const history = db.prepare(
      'SELECT * FROM activity_logs WHERE item_id = ? ORDER BY created_at DESC',
    ).all(id)

    res.json({ item, history })
  })

  // ── POST /queue/:id/undo — Undo last action ─────────────────────────
  router.post('/:id/undo', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const snapshot = undoSnapshots.get(id)
    if (!snapshot) {
      return res.json({
        success: false,
        error: 'No undo snapshot available. Either the action was already undone or no action was taken.',
      })
    }

    // Check 5-minute window
    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = 5 * 60 * 1000
    if (elapsed > windowMs) {
      undoSnapshots.delete(id)
      return res.json({
        success: false,
        error: 'Undo window expired (5 minutes).',
      })
    }

    // Restore previous state
    const prevState = snapshot.state
    db.prepare(`
      UPDATE queue_items SET status = ?, spam_score = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(prevState.status, prevState.spam_score, id)

    // Log the undo
    db.prepare(`
      INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, 'undo', '', 'System', item.content_type,
      JSON.stringify({ restoredStatus: prevState.status }))

    undoSnapshots.delete(id)

    const restoredItem = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)

    res.json({
      success: true,
      item: restoredItem,
      restoredStatus: prevState.status,
    })
  })

  // ── GET /queue/:id/undo-info — Check undo availability ──────────────
  router.get('/:id/undo-info', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const snapshot = undoSnapshots.get(id)
    if (!snapshot) {
      return res.json({
        available: false,
        remainingSeconds: 0,
        currentStatus: item.status,
      })
    }

    const elapsed = Date.now() - new Date(snapshot.timestamp).getTime()
    const windowMs = 5 * 60 * 1000
    const remaining = windowMs - elapsed

    res.json({
      available: remaining > 0,
      remainingSeconds: Math.max(0, Math.floor(remaining / 1000)),
      currentStatus: item.status,
    })
  })

  // ── POST /queue/:id/evaluate — Firewall evaluation ──────────────────
  router.post('/:id/evaluate', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    let evaluation = null

    if (services.firewallService) {
      const context = {
        content: item.content || '',
        authorIP: item.author_ip || '',
        authorEmail: item.author_email || '',
        contentId: item.item_id,
      }

      services.firewallService.evaluateContent(context).then((result) => {
        evaluation = result
      }).catch(() => {
        evaluation = { triggered: false, evaluatedAt: new Date().toISOString(), action: 'flag', reason: 'Evaluation error' }
      })
    }

    // Return immediately with a deferred evaluation indicator
    res.json({
      itemId: id,
      evaluation: evaluation || { triggered: false, evaluatedAt: new Date().toISOString(), action: 'none', reason: 'Firewall service not configured' },
    })
  })

  // ── GET /queue/:id/notes — Get notes ────────────────────────────────
  router.get('/:id/notes', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    let notes = []
    try {
      notes = JSON.parse(item.notes || '[]')
    } catch {
      notes = []
    }

    res.json({ itemId: id, notes })
  })

  // ── POST /queue/:id/notes — Add a note ──────────────────────────────
  router.post('/:id/notes', (req, res) => {
    const { id } = req.params
    const { moderatorId, moderatorName, note } = req.body

    if (!note || !moderatorId) {
      return res.status(400).json({ error: 'note and moderatorId are required' })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    let notes = []
    try {
      notes = JSON.parse(item.notes || '[]')
    } catch {
      notes = []
    }

    const newNote = {
      id: uuidv4(),
      moderatorId: moderatorId,
      moderatorName: moderatorName || '',
      text: note,
      createdAt: new Date().toISOString(),
    }

    notes.push(newNote)

    db.prepare('UPDATE queue_items SET notes = ?, updated_at = datetime(\'now\') WHERE item_id = ?')
      .run(JSON.stringify(notes), id)

    // Log the note as activity
    db.prepare(`
      INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, 'note', moderatorId, moderatorName || '', item.content_type,
      JSON.stringify({ note }))

    // Publish event
    if (services.eventBus) {
      services.eventBus.publishNote(
        moderatorId,
        moderatorName || 'Moderator',
        `Added note: ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}`,
        id,
      )
    }

    res.json({ success: true, note: newNote })
  })

  // ── POST /queue/:id/assign — Assign item to moderator ──────────────
  router.post('/:id/assign', (req, res) => {
    const { id } = req.params
    const { moderatorId, moderatorName, assigneeId, assigneeName } = req.body

    if (!assigneeId) {
      return res.status(400).json({ error: 'assigneeId is required' })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    db.prepare(`
      UPDATE queue_items SET assigned_to = ?, assigned_at = datetime('now'), updated_at = datetime('now')
      WHERE item_id = ?
    `).run(assigneeId, id)

    // Log the assignment
    db.prepare(`
      INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, 'assignment', moderatorId || '', moderatorName || '', item.content_type,
      JSON.stringify({ assigneeId, assigneeName }))

    // Publish event
    if (services.eventBus) {
      services.eventBus.publishAssignment(
        moderatorId || 'system',
        moderatorName || 'System',
        `Assigned "${item.title || id}" to ${assigneeName || assigneeId}`,
        id,
      )
    }

    const updatedItem = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(id)

    res.json({ success: true, item: updatedItem })
  })

  return router
}

/**
 * Helper: get all settings as a flat object
 */
function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const row of rows) {
    // Try to parse as JSON number/boolean
    const val = row.value
    if (val === 'true') settings[row.key] = true
    else if (val === 'false') settings[row.key] = false
    else if (/^-?\d+\.?\d*$/.test(val)) settings[row.key] = parseFloat(val)
    else settings[row.key] = val
  }
  return settings
}

module.exports = { createQueueRouter, VALID_ACTIONS, STATUS_MAP }
