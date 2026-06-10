/**
 * Collaboration routes — team management, assignments, and notes
 *
 * Provides endpoints for managing moderation team members,
 * creating and tracking item assignments with due dates and priorities,
 * and fetching team rosters.
 *
 * @module collaboration
 */
const express = require('express')
const { v4: uuidv4 } = require('uuid')

/**
 * Create an Express Router for collaboration endpoints.
 *
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 * @param {object} [services] - Optional @cmcc/server-core services
 * @returns {import('express').Router}
 */
function createCollaborationRouter(db, services = {}) {
  const router = express.Router()

  // ── GET /collaboration/team — List all team members ─────────────────
  router.get('/team', (req, res) => {
    const members = db
      .prepare(
        'SELECT * FROM team_members WHERE active = 1 ORDER BY name ASC',
      )
      .all()
    res.json({ members })
  })

  // ── POST /collaboration/team — Add a team member ────────────────────
  router.post('/team', (req, res) => {
    const { name, email, role, avatarUrl } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const validRoles = ['admin', 'moderator', 'viewer']
    const memberRole = validRoles.includes(role) ? role : 'moderator'

    const member = {
      id: uuidv4(),
      name: name.trim(),
      email: email || '',
      role: memberRole,
      avatar_url: avatarUrl || '',
      active: 1,
      createdAt: new Date().toISOString(),
    }

    db.prepare(
      `INSERT INTO team_members (id, name, email, role, avatar_url, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(member.id, member.name, member.email, member.role, member.avatar_url, member.active, member.createdAt)

    res.status(201).json({ success: true, member })
  })

  // ── PUT /collaboration/team/:id — Update a team member ─────────────
  router.put('/team/:id', (req, res) => {
    const { id } = req.params
    const { name, email, role, avatarUrl, active } = req.body

    const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id)
    if (!existing) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (email !== undefined) updates.email = email
    if (role !== undefined) {
      const validRoles = ['admin', 'moderator', 'viewer']
      updates.role = validRoles.includes(role) ? role : existing.role
    }
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
    if (active !== undefined) updates.active = active ? 1 : 0

    const setClauses = Object.keys(updates)
      .map((k) => `${k} = ?`)
      .join(', ')
    const values = Object.values(updates)

    if (setClauses) {
      db.prepare(`UPDATE team_members SET ${setClauses} WHERE id = ?`).run(
        ...values,
        id,
      )
    }

    const updated = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id)
    res.json({ success: true, member: updated })
  })

  // ── DELETE /collaboration/team/:id — Remove a team member ──────────
  router.delete('/team/:id', (req, res) => {
    const { id } = req.params
    const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id)
    if (!existing) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    // Soft-delete by setting active to 0
    db.prepare('UPDATE team_members SET active = 0 WHERE id = ?').run(id)

    res.json({ success: true })
  })

  // ── GET /collaboration/assignments — List all assignments ──────────
  router.get('/assignments', (req, res) => {
    const { status, assigneeId } = req.query

    const conditions = []
    const params = []

    if (status) {
      conditions.push('a.status = ?')
      params.push(status)
    }
    if (assigneeId) {
      conditions.push('a.assignee_id = ?')
      params.push(assigneeId)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const assignments = db
      .prepare(
        `SELECT a.*, tm.name as assignee_name, tm.email as assignee_email,
                qi.title as item_title, qi.content_type as item_type
         FROM assignments a
         LEFT JOIN team_members tm ON a.assignee_id = tm.id
         LEFT JOIN queue_items qi ON a.item_id = qi.item_id
         ${whereClause}
         ORDER BY a.created_at DESC`,
      )
      .all(...params)

    // Parse priority and due date
    for (const a of assignments) {
      a.dueDate = a.due_date
      a.itemTitle = a.item_title
      a.itemType = a.item_type
      a.assigneeName = a.assignee_name
      a.assigneeEmail = a.assignee_email
    }

    res.json({ assignments })
  })

  // ── POST /collaboration/assignments — Create an assignment ─────────
  router.post('/assignments', (req, res) => {
    const { itemId, assigneeId, assignedBy, priority, dueDate, note } = req.body

    if (!itemId || !assigneeId || !assignedBy) {
      return res
        .status(400)
        .json({ error: 'itemId, assigneeId, and assignedBy are required' })
    }

    const item = db.prepare('SELECT * FROM queue_items WHERE item_id = ?').get(itemId)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(assigneeId)
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent']
    const assignmentPriority = validPriorities.includes(priority) ? priority : 'medium'

    const assignment = {
      id: uuidv4(),
      item_id: itemId,
      assignee_id: assigneeId,
      assigned_by: assignedBy,
      priority: assignmentPriority,
      due_date: dueDate || null,
      note: note || '',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    db.prepare(
      `INSERT INTO assignments (id, item_id, assignee_id, assigned_by, priority, due_date, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      assignment.id,
      assignment.item_id,
      assignment.assignee_id,
      assignment.assigned_by,
      assignment.priority,
      assignment.due_date,
      assignment.note,
      assignment.status,
      assignment.created_at,
      assignment.updated_at,
    )

    // Update the queue_item's assigned_to field
    db.prepare(
      `UPDATE queue_items SET assigned_to = ?, assigned_at = datetime('now'), updated_at = datetime('now') WHERE item_id = ?`,
    ).run(assigneeId, itemId)

    // Log the assignment
    db.prepare(
      `INSERT INTO activity_logs (item_id, action, moderator_id, moderator_name, content_type, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      itemId,
      'assignment',
      assignedBy,
      member.name,
      item.content_type,
      JSON.stringify({ assigneeId, assigneeName: member.name, priority: assignmentPriority, dueDate }),
    )

    // Publish event
    if (services.eventBus) {
      services.eventBus.publishAssignment(
        assignedBy,
        'System',
        `Assigned "${item.title || itemId}" to ${member.name}`,
        itemId,
      )
    }

    res.status(201).json({ success: true, assignment })
  })

  // ── PUT /collaboration/assignments/:id — Update assignment status ──
  router.put('/assignments/:id', (req, res) => {
    const { id } = req.params
    const { status, priority, dueDate, note } = req.body

    const existing = db
      .prepare('SELECT * FROM assignments WHERE id = ?')
      .get(id)
    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    const validStatuses = ['open', 'in_progress', 'completed', 'cancelled']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    const updates = {}
    if (status !== undefined && validStatuses.includes(status))
      updates.status = status
    if (priority !== undefined && validPriorities.includes(priority))
      updates.priority = priority
    if (dueDate !== undefined) updates.due_date = dueDate
    if (note !== undefined) updates.note = note
    updates.updated_at = new Date().toISOString()

    const setClauses = Object.keys(updates)
      .map((k) => `${k} = ?`)
      .join(', ')
    const values = Object.values(updates)

    db.prepare(`UPDATE assignments SET ${setClauses} WHERE id = ?`).run(
      ...values,
      id,
    )

    const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id)
    res.json({ success: true, assignment: updated })
  })

  // ── GET /collaboration/assignments/item/:itemId — Get item assignment ─
  router.get('/assignments/item/:itemId', (req, res) => {
    const { itemId } = req.params

    const assignment = db
      .prepare(
        `SELECT a.*, tm.name as assignee_name, tm.email as assignee_email,
                qi.title as item_title
         FROM assignments a
         LEFT JOIN team_members tm ON a.assignee_id = tm.id
         LEFT JOIN queue_items qi ON a.item_id = qi.item_id
         WHERE a.item_id = ?
         ORDER BY a.created_at DESC
         LIMIT 1`,
      )
      .get(itemId)

    if (!assignment) {
      return res.json({ assignment: null })
    }

    assignment.dueDate = assignment.due_date
    assignment.itemTitle = assignment.item_title
    assignment.assigneeName = assignment.assignee_name
    assignment.assigneeEmail = assignment.assignee_email

    res.json({ assignment })
  })

  return router
}

module.exports = { createCollaborationRouter }
