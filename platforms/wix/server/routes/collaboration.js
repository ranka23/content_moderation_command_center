const { v4: uuidv4 } = require('uuid')

/**
 * Collaboration routes: notes, assignment, activity feed.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerCollaborationRoutes(router, db, services) {
  const eventBus = services.eventBus

  /**
   * GET /api/cmcc/queue/:id/notes
   * Get all notes for a queue item.
   */
  router.get('/queue/:id/notes', (req, res) => {
    const { id } = req.params
    const notes = db.prepare(
      'SELECT * FROM queue_notes WHERE itemId = ? ORDER BY createdAt ASC'
    ).all(id)
    res.json(notes)
  })

  /**
   * POST /api/cmcc/queue/:id/notes
   * Add a note to a queue item.
   */
  router.post('/queue/:id/notes', (req, res) => {
    const { id } = req.params
    const { authorName, content } = req.body

    const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' })
    }

    const noteId = uuidv4()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO queue_notes (id, itemId, authorName, content, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(noteId, id, authorName || 'Anonymous', content, now)

    const note = db.prepare('SELECT * FROM queue_notes WHERE id = ?').get(noteId)

    eventBus.publishNote(authorName || 'Anonymous', authorName || 'Anonymous',
      `Added note on "${item.title || 'untitled'}"`, id)

    res.status(201).json({ note })
  })

  /**
   * POST /api/cmcc/queue/:id/assign
   * Assign a queue item to a moderator.
   */
  router.post('/queue/:id/assign', (req, res) => {
    const { id } = req.params
    const { assignTo, assignedBy } = req.body

    if (!assignTo) {
      return res.status(400).json({ error: 'assignTo is required' })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    const now = new Date().toISOString()
    db.prepare('UPDATE queue_items SET assignedTo = ?, assignedAt = ?, updatedAt = ? WHERE id = ?')
      .run(assignTo, now, now, id)

    const updated = db.prepare('SELECT * FROM queue_items WHERE id = ?').get(id)

    // Log assignment
    const logId = uuidv4()
    db.prepare('INSERT INTO activity_logs (id, itemId, action, actorId, actorName, description, contentType, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(logId, id, 'assignment', assignedBy || 'system', assignedBy || 'System',
        `${assignedBy || 'System'} assigned "${item.title || 'untitled'}" to ${assignTo}`,
        item.contentType, JSON.stringify({ assignedTo: assignTo }), now)

    eventBus.publishAssignment(assignedBy || 'system', assignedBy || 'System',
      `Assigned "${item.title || 'untitled'}" to ${assignTo}`, id)

    res.json({ success: true, item: { ...updated, metadata: tryParseJSON(updated.metadata) } })
  })

  /**
   * GET /api/cmcc/activity-feed
   * Returns recent activity feed events from the event bus.
   */
  router.get('/activity-feed', (req, res) => {
    const events = eventBus.getRecentEvents(50)
    res.json(events)
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

module.exports = { registerCollaborationRoutes }
