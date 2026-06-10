const { v4: uuidv4 } = require('uuid')

/**
 * Queue routes: CRUD, moderation, undo, firewall evaluation.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerQueueRoutes(router, db, services) {
  const undoService = services.undoService
  const eventBus = services.eventBus

  // Valid moderation actions mapped to target statuses
  const ACTION_MAP = {
    approve: 'approved',
    reject: 'rejected',
    spam: 'spam',
    defer: 'deferred',
    flag: 'flagged',
    'deactivate-users': 'spam',
  }

  /**
   * GET /api/cmcc/queue
   * Paginated queue with filters: status, contentType, search, dateRange, page, pageSize
   */
  router.get('/queue', (req, res) => {
    const { status, contentType, search, dateRange } = req.query
    const page = Math.max(0, parseInt(req.query.page, 10) || 0)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize, 10) || 20),
    )

    const where = ['1=1']
    const params = []

    if (status) {
      where.push('status = ?')
      params.push(status)
    }
    if (contentType) {
      where.push('contentType = ?')
      params.push(contentType)
    }
    if (search) {
      where.push('(title LIKE ? OR authorName LIKE ? OR content LIKE ?)')
      const like = `%${search}%`
      params.push(like, like, like)
    }
    if (dateRange) {
      const parts = dateRange.split(',')
      if (parts.length === 2) {
        where.push('createdAt >= ? AND createdAt <= ?')
        params.push(parts[0], parts[1])
      }
    }

    const whereClause = where.join(' AND ')

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM queue_items WHERE ${whereClause}`)
      .get(...params)
    const total = countRow.total

    const items = db
      .prepare(
        `SELECT * FROM queue_items WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, page * pageSize)

    const parsed = items.map((item) => ({
      ...item,
      metadata: tryParseJSON(item.metadata),
    }))

    res.json({
      items: parsed,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  })

  /**
   * POST /api/cmcc/queue/:id/moderate
   * Moderate a single queue item.
   */
  router.post('/queue/:id/moderate', (req, res) => {
    const { id } = req.params
    const { action, moderatorId, moderatorName, reason } = req.body

    const validActions = Object.keys(ACTION_MAP)
    if (!action || !validActions.includes(action)) {
      return res
        .status(400)
        .json({
          error: `Invalid action. Valid actions: ${validActions.join(', ')}`,
        })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    // Save snapshot for undo before modifying
    undoService.saveSnapshot(id, {
      status: item.status,
      assignedTo: item.assignedTo,
      spamScore: item.spamScore,
      flags: item.flags,
    })

    const newStatus = ACTION_MAP[action]
    const now = new Date().toISOString()

    db.prepare(
      `
      UPDATE queue_items SET status = ?, moderatedAt = ?, moderatedBy = ?, updatedAt = ?
      WHERE id = ?
    `,
    ).run(newStatus, now, moderatorId || 'system', now, id)

    const updated = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)

    // Log the activity
    const logId = uuidv4()
    const details = JSON.stringify({
      action,
      previousStatus: item.status,
      newStatus,
      reason,
    })
    db.prepare(
      `
      INSERT INTO activity_logs (id, itemId, action, actorId, actorName, description, contentType, details, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      logId,
      id,
      'moderate',
      moderatorId || 'system',
      moderatorName || 'System',
      `${moderatorName || 'System'} ${action}d "${item.title || 'untitled'}"`,
      item.contentType,
      details,
      now,
    )

    // Publish to event bus
    eventBus.publishAction(
      moderatorId || 'system',
      moderatorName || 'System',
      `${action} "${item.title || 'untitled'}"`,
      id,
      item.title,
    )

    res.json({
      success: true,
      item: { ...updated, metadata: tryParseJSON(updated.metadata) },
    })
  })

  /**
   * POST /api/cmcc/queue/bulk
   * Bulk moderate items.
   */
  router.post('/queue/bulk', (req, res) => {
    const { action, ids, moderatorId, moderatorName } = req.body
    const validActions = Object.keys(ACTION_MAP)

    if (!action || !validActions.includes(action)) {
      return res
        .status(400)
        .json({
          error: `Invalid action. Valid actions: ${validActions.join(', ')}`,
        })
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' })
    }

    const results = ids.map((itemId) => {
      const item = db
        .prepare('SELECT * FROM queue_items WHERE id = ?')
        .get(itemId)
      if (!item) return { id: itemId, success: false, error: 'Not found' }

      undoService.saveSnapshot(itemId, { status: item.status })

      const newStatus = ACTION_MAP[action]
      const now = new Date().toISOString()

      db.prepare(
        'UPDATE queue_items SET status = ?, moderatedAt = ?, moderatedBy = ?, updatedAt = ? WHERE id = ?',
      ).run(newStatus, now, moderatorId || 'system', now, itemId)

      const logId = uuidv4()
      db.prepare(
        'INSERT INTO activity_logs (id, itemId, action, actorId, actorName, description, contentType, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        logId,
        itemId,
        'moderate',
        moderatorId || 'system',
        moderatorName || 'System',
        `${moderatorName || 'System'} bulk ${action}d "${item.title || 'untitled'}"`,
        item.contentType,
        JSON.stringify({ action, bulk: true }),
        now,
      )

      eventBus.publishAction(
        moderatorId || 'system',
        moderatorName || 'System',
        `bulk ${action} "${item.title || 'untitled'}"`,
        itemId,
        item.title,
      )

      return { id: itemId, success: true, status: newStatus }
    })

    res.json({
      results,
      total: results.length,
      successCount: results.filter((r) => r.success).length,
    })
  })

  /**
   * GET /api/cmcc/queue/:id/history
   * Activity log timeline for a specific item.
   */
  router.get('/queue/:id/history', (req, res) => {
    const { id } = req.params
    const logs = db
      .prepare(
        'SELECT * FROM activity_logs WHERE itemId = ? ORDER BY createdAt DESC',
      )
      .all(id)
    res.json(logs.map((l) => ({ ...l, details: tryParseJSON(l.details) })))
  })

  /**
   * POST /api/cmcc/queue/:id/undo
   * Undo the last moderation action within 5-minute window.
   */
  router.post('/queue/:id/undo', (req, res) => {
    const { id } = req.params
    const { moderatorId, moderatorName } = req.body

    const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    undoService
      .undo(id, async (snapshotState) => {
        db.prepare(
          'UPDATE queue_items SET status = ?, updatedAt = ? WHERE id = ?',
        ).run(snapshotState.status || 'pending', new Date().toISOString(), id)

        const logId = uuidv4()
        const now = new Date().toISOString()
        db.prepare(
          'INSERT INTO activity_logs (id, itemId, action, actorId, actorName, description, contentType, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          logId,
          id,
          'undo',
          moderatorId || 'system',
          moderatorName || 'System',
          `${moderatorName || 'System'} undid action on "${item.title || 'untitled'}"`,
          item.contentType,
          JSON.stringify({ restoredStatus: snapshotState.status }),
          now,
        )

        eventBus.publishAction(
          moderatorId || 'system',
          moderatorName || 'System',
          `undo on "${item.title || 'untitled'}"`,
          id,
          item.title,
        )

        return { success: true }
      })
      .then((result) => {
        if (result.success) {
          const updated = db
            .prepare('SELECT * FROM queue_items WHERE id = ?')
            .get(id)
          return res.json({
            success: true,
            item: { ...updated, metadata: tryParseJSON(updated.metadata) },
          })
        }
        return res.json(result)
      })
  })

  /**
   * GET /api/cmcc/queue/:id/undo-info
   * Check if undo is available and remaining time.
   */
  router.get('/queue/:id/undo-info', async (req, res) => {
    const { id } = req.params
    const info = await undoService.getUndoInfo(id)
    if (!info) {
      return res.json({
        available: false,
        remainingSeconds: 0,
        currentStatus: 'unknown',
      })
    }
    res.json(info)
  })

  /**
   * POST /api/cmcc/queue/:id/evaluate
   * Evaluate content through the firewall engine.
   */
  router.post('/queue/:id/evaluate', async (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    try {
      const evaluation = await services.firewallService.evaluateContent({
        content: item.content || '',
        authorIP: item.authorIP || undefined,
        authorEmail: item.authorEmail || undefined,
        contentId: id,
      })

      res.json({ evaluation })
    } catch (err) {
      res.status(500).json({ error: 'Evaluation failed', message: err.message })
    }
  })
}

function tryParseJSON(str) {
  if (!str) return {}
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

module.exports = { registerQueueRoutes }
