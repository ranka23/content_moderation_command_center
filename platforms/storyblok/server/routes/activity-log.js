/**
 * Activity Log routes
 */
const express = require('express')

function createActivityLogRouter(db) {
  const router = express.Router()

  // ── GET /activity-log — Paginated activity log ──────────────────────
  router.get('/', (req, res) => {
    const {
      page = '1',
      perPage = '50',
      moderator,
      action,
      contentType,
      dateFrom,
      dateTo,
    } = req.query

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const perPageNum = Math.min(200, Math.max(1, parseInt(perPage, 10) || 50))
    const offset = (pageNum - 1) * perPageNum

    const conditions = []
    const params = []

    if (moderator) {
      conditions.push('moderator_id = ?')
      params.push(moderator)
    }
    if (action) {
      conditions.push('action = ?')
      params.push(action)
    }
    if (contentType) {
      conditions.push('content_type = ?')
      params.push(contentType)
    }
    if (dateFrom) {
      conditions.push('created_at >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      params.push(dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM activity_logs ${whereClause}`).get(...params)
    const entries = db.prepare(
      `SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, perPageNum, offset)

    // Parse JSON details
    for (const entry of entries) {
      try {
        entry.details = JSON.parse(entry.details || '{}')
      } catch {
        entry.details = {}
      }
    }

    res.json({
      entries,
      total: countRow.total,
      page: pageNum,
      totalPages: Math.ceil(countRow.total / perPageNum) || 0,
    })
  })

  return router
}

module.exports = { createActivityLogRouter }
