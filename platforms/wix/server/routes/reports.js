const { v4: uuidv4 } = require('uuid')

/**
 * Reports routes: moderation activity, compliance audit, scheduled reports.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerReportsRoutes(router, db, _services) {
  /**
   * POST /api/cmcc/reports/moderation-activity
   * Generate moderation activity report.
   */
  router.post('/reports/moderation-activity', (req, res) => {
    const days = parseInt(req.body.days, 10) || 7
    const since = new Date()
    since.setDate(since.getDate() - days)

    const moderated = db
      .prepare(
        'SELECT * FROM queue_items WHERE moderatedAt IS NOT NULL AND moderatedAt >= ?',
      )
      .all(since.toISOString())

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

    res.json({
      report: {
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
        totalModerated: moderated.length,
        breakdown: Object.values(breakdown),
      },
    })
  })

  /**
   * POST /api/cmcc/reports/compliance-audit
   * Generate compliance audit report.
   */
  router.post('/reports/compliance-audit', (req, res) => {
    const days = parseInt(req.body.days, 10) || 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const totalActions = db
      .prepare(
        'SELECT COUNT(*) as count FROM activity_logs WHERE createdAt >= ?',
      )
      .get(sinceStr).count

    const actionBreakdown = db
      .prepare(
        'SELECT action, COUNT(*) as count FROM activity_logs WHERE createdAt >= ? GROUP BY action',
      )
      .all(sinceStr)

    const moderatorActions = db
      .prepare(
        'SELECT actorName, action, COUNT(*) as count FROM activity_logs WHERE createdAt >= ? AND actorName IS NOT NULL GROUP BY actorName, action',
      )
      .all(sinceStr)

    res.json({
      report: {
        period: `${days} days`,
        generatedAt: new Date().toISOString(),
        totalActions,
        actionBreakdown,
        moderatorActions,
      },
    })
  })

  /**
   * POST /api/cmcc/reports/scheduled
   * Schedule a recurring report.
   */
  router.post('/reports/scheduled', (req, res) => {
    const { type, frequency, format, emails, createdBy } = req.body

    if (!type || !frequency || !emails || !createdBy) {
      return res.status(400).json({
        error: 'Missing required fields: type, frequency, emails, createdBy',
      })
    }
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res
        .status(400)
        .json({ error: 'frequency must be daily, weekly, or monthly' })
    }
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails must be a non-empty array' })
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(
      `
      INSERT INTO scheduled_reports (id, type, frequency, format, emails, createdBy, createdAt, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `,
    ).run(
      id,
      type,
      frequency,
      format || 'csv',
      JSON.stringify(emails),
      createdBy,
      now,
    )

    const report = db
      .prepare('SELECT * FROM scheduled_reports WHERE id = ?')
      .get(id)

    res.status(201).json({
      report: {
        ...report,
        emails: JSON.parse(report.emails),
        active: !!report.active,
      },
    })
  })

  /**
   * GET /api/cmcc/reports/scheduled
   * List all scheduled reports.
   */
  router.get('/reports/scheduled', (req, res) => {
    const reports = db
      .prepare('SELECT * FROM scheduled_reports ORDER BY createdAt DESC')
      .all()
    res.json(
      reports.map((r) => ({
        ...r,
        emails: JSON.parse(r.emails),
        active: !!r.active,
      })),
    )
  })

  /**
   * DELETE /api/cmcc/reports/scheduled/:id
   * Delete a scheduled report.
   */
  router.delete('/reports/scheduled/:id', (req, res) => {
    const { id } = req.params
    const report = db
      .prepare('SELECT * FROM scheduled_reports WHERE id = ?')
      .get(id)
    if (!report) {
      return res.status(404).json({ error: 'Scheduled report not found' })
    }
    db.prepare('DELETE FROM scheduled_reports WHERE id = ?').run(id)
    res.json({ success: true })
  })
}

module.exports = { registerReportsRoutes }
