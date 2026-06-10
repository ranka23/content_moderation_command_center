/**
 * Activity log routes: paginated audit trail with filters.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 */
function registerActivityLogRoutes(router, db) {
  /**
   * GET /api/cmcc/activity-log
   * Returns paginated activity logs with optional filters.
   */
  router.get('/activity-log', (req, res) => {
    const { action, contentType, search } = req.query
    const page = Math.max(0, parseInt(req.query.page, 10) || 0)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const where = ['1=1']
    const params = []

    if (action) {
      where.push('action = ?')
      params.push(action)
    }
    if (contentType) {
      where.push('contentType = ?')
      params.push(contentType)
    }
    if (search) {
      where.push('(description LIKE ? OR actorName LIKE ?)')
      const like = `%${search}%`
      params.push(like, like)
    }

    const whereClause = where.join(' AND ')

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM activity_logs WHERE ${whereClause}`).get(...params)
    const total = countRow.total

    const entries = db.prepare(
      `SELECT * FROM activity_logs WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, page * pageSize)

    const parsed = entries.map(e => ({
      ...e,
      details: tryParseJSON(e.details),
    }))

    res.json({
      entries: parsed,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    })
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

module.exports = { registerActivityLogRoutes }
