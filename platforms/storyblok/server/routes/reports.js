/**
 * Reports routes — moderation activity, compliance audit, scheduled reports
 */
const express = require('express')
const { v4: uuidv4 } = require('uuid')

function createReportsRouter(db) {
  const router = express.Router()

  // ── POST /reports/moderation-activity ───────────────────────────────
  router.post('/moderation-activity', (req, res) => {
    const { dateFrom, dateTo } = req.body

    const conditions = []
    const params = []
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Action breakdown
    const actionBreakdownRows = db
      .prepare(
        `SELECT action, COUNT(*) as count FROM activity_logs ${whereClause} GROUP BY action ORDER BY count DESC`,
      )
      .all(...params)
    const actionBreakdown = {}
    for (const row of actionBreakdownRows) {
      actionBreakdown[row.action] = row.count
    }

    // Moderator breakdown
    const moderatorRows = db
      .prepare(
        `SELECT moderator_name, COUNT(*) as count FROM activity_logs ${whereClause} GROUP BY moderator_name ORDER BY count DESC`,
      )
      .all(...params)
    const byModerator = moderatorRows.map((r) => ({
      moderator: r.moderator_name || 'Unknown',
      count: r.count,
    }))

    // Total actions
    const totalActions = Object.values(actionBreakdown).reduce(
      (sum, c) => sum + c,
      0,
    )

    const report = {
      type: 'moderation_activity',
      generatedAt: new Date().toISOString(),
      dateRange: { from: dateFrom || 'all', to: dateTo || 'all' },
      totalActions,
      actionBreakdown,
      byModerator,
    }

    res.json({ report })
  })

  // ── POST /reports/compliance-audit ──────────────────────────────────
  router.post('/compliance-audit', (req, res) => {
    const { dateFrom, dateTo } = req.body

    const conditions = []
    const params = []
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Total items in period
    const totalItems = db
      .prepare(`SELECT COUNT(*) as count FROM queue_items ${whereClause}`)
      .get(...params).count

    // Status distribution
    const statusRows = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM queue_items ${whereClause} GROUP BY status`,
      )
      .all(...params)
    const statusDistribution = {}
    for (const row of statusRows) {
      statusDistribution[row.status] = row.count
    }

    // Items with high spam scores
    const highSpamItems = db
      .prepare(
        `SELECT item_id, title, spam_score, status, author_name, created_at
       FROM queue_items ${whereClause} AND spam_score >= 70
       ORDER BY spam_score DESC LIMIT 50`,
      )
      .all(...params)

    // Untouched/pending items older than 7 days
    const stalePending = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM queue_items
      WHERE status = 'pending' AND created_at < datetime('now', '-7 days')
    `,
      )
      .get().count

    const report = {
      type: 'compliance_audit',
      generatedAt: new Date().toISOString(),
      dateRange: { from: dateFrom || 'all', to: dateTo || 'all' },
      totalItems,
      statusDistribution,
      highSpamItems: highSpamItems.length,
      stalePendingItems: stalePending,
      flaggedItems: statusDistribution.flagged || 0,
      spamItems: statusDistribution.spam || 0,
    }

    res.json({ report })
  })

  // ── POST /reports/scheduled — Schedule a report ─────────────────────
  router.post('/scheduled', (req, res) => {
    const { type, frequency, format, emails, createdBy } = req.body

    if (!type || !frequency || !emails || !createdBy) {
      return res.status(400).json({
        error: 'type, frequency, emails, and createdBy are required',
      })
    }

    const validTypes = [
      'moderation_activity',
      'compliance_audit',
      'moderator_performance',
    ]
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      })
    }

    const validFrequencies = ['daily', 'weekly', 'monthly']
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
      })
    }

    const report = {
      id: uuidv4(),
      type,
      frequency,
      format: format || 'csv',
      emails: Array.isArray(emails) ? emails : [emails],
      createdBy,
      createdAt: new Date().toISOString(),
      active: true,
    }

    db.prepare(
      `
      INSERT INTO scheduled_reports (id, type, frequency, format, emails, created_by, created_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      report.id,
      report.type,
      report.frequency,
      report.format,
      JSON.stringify(report.emails),
      report.createdBy,
      report.createdAt,
      report.active ? 1 : 0,
    )

    res.json({ success: true, report })
  })

  // ── GET /reports/scheduled — List scheduled reports ────────────────
  router.get('/scheduled', (req, res) => {
    const reports = db
      .prepare('SELECT * FROM scheduled_reports ORDER BY created_at DESC')
      .all()

    for (const r of reports) {
      try {
        r.emails = JSON.parse(r.emails || '[]')
      } catch {
        r.emails = []
      }
      r.active = !!r.active
    }

    res.json({ reports })
  })

  // ── POST /reports/moderation-activity/csv — CSV export ────────────
  router.post('/moderation-activity/csv', (req, res) => {
    const { dateFrom, dateTo } = req.body

    const conditions = []
    const params = []
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db
      .prepare(
        `SELECT id, item_id, action, moderator_id, moderator_name, content_type, created_at
       FROM activity_logs ${whereClause} ORDER BY created_at DESC`,
      )
      .all(...params)

    const header =
      'ID,Item ID,Action,Moderator ID,Moderator Name,Content Type,Timestamp\n'
    const csv =
      header +
      rows
        .map(
          (r) =>
            `${r.id},${r.item_id},${r.action},${r.moderator_id || ''},${r.moderator_name || ''},${r.content_type || ''},${r.created_at}`,
        )
        .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="moderation-activity-${dateFrom || 'all'}-${dateTo || 'all'}.csv"`,
    )
    res.send(csv)
  })

  // ── POST /reports/compliance-audit/csv — CSV export ─────────────────
  router.post('/compliance-audit/csv', (req, res) => {
    const { dateFrom, dateTo } = req.body

    const conditions = []
    const params = []
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db
      .prepare(
        `SELECT item_id, title, content_type, status, spam_score, author_name, author_email, created_at, moderated_at, assigned_to
       FROM queue_items ${whereClause} ORDER BY created_at DESC`,
      )
      .all(...params)

    const header =
      'Item ID,Title,Content Type,Status,Spam Score,Author,Email,Created,Moderated,Assigned To\n'
    const csv =
      header +
      rows
        .map(
          (r) =>
            `${r.item_id},"${(r.title || '').replace(/"/g, '""')}",${r.content_type || ''},${r.status},${r.spam_score || 0},"${(r.author_name || '').replace(/"/g, '""')}",${r.author_email || ''},${r.created_at},${r.moderated_at || ''},${r.assigned_to || ''}`,
        )
        .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="compliance-audit-${dateFrom || 'all'}-${dateTo || 'all'}.csv"`,
    )
    res.send(csv)
  })

  // ── DELETE /reports/scheduled/:id — Delete scheduled report ───────
  router.delete('/scheduled/:id', (req, res) => {
    const { id } = req.params
    const existing = db
      .prepare('SELECT * FROM scheduled_reports WHERE id = ?')
      .get(id)
    if (!existing) {
      return res.status(404).json({ error: 'Scheduled report not found' })
    }

    db.prepare('DELETE FROM scheduled_reports WHERE id = ?').run(id)

    res.json({ success: true })
  })

  return router
}

module.exports = { createReportsRouter }
