/**
 * Reputation routes: user reputation and trust levels.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 */
function registerReputationRoutes(router, db) {
  /**
   * GET /api/cmcc/reputation/users
   * Returns user reputation list with trust levels.
   */
  router.get('/reputation/users', (req, res) => {
    const users = db.prepare(`
      SELECT authorEmail, authorName,
        COUNT(*) as totalItems,
        SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spamCount,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount,
        AVG(spamScore) as avgSpamScore
      FROM queue_items
      WHERE authorEmail IS NOT NULL AND authorEmail != ''
      GROUP BY authorEmail
      ORDER BY totalItems DESC
    `).all()

    const result = users.map(u => {
      const spamRatio = u.totalItems > 0 ? u.spamCount / u.totalItems : 0
      let trustLevel = 'trusted'
      if (spamRatio > 0.5) trustLevel = 'risky'
      else if (spamRatio > 0.2) trustLevel = 'suspicious'

      return {
        authorEmail: u.authorEmail,
        authorName: u.authorName || 'Unknown',
        totalItems: u.totalItems,
        spamCount: u.spamCount,
        approvedCount: u.approvedCount,
        avgSpamScore: Math.round(u.avgSpamScore || 0),
        spamRatio: Math.round(spamRatio * 100) / 100,
        trustLevel,
      }
    })

    res.json(result)
  })

  /**
   * GET /api/cmcc/reputation/user/:id
   * Returns detailed reputation for a specific user (by email).
   */
  router.get('/reputation/user/:id', (req, res) => {
    const { id } = req.params

    const items = db.prepare(
      'SELECT * FROM queue_items WHERE authorEmail = ? ORDER BY createdAt DESC'
    ).all(id)

    if (items.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const spamCount = items.filter(i => i.status === 'spam').length
    const approvedCount = items.filter(i => i.status === 'approved').length
    const spamRatio = items.length > 0 ? spamCount / items.length : 0
    let trustLevel = 'trusted'
    if (spamRatio > 0.5) trustLevel = 'risky'
    else if (spamRatio > 0.2) trustLevel = 'suspicious'

    res.json({
      authorEmail: id,
      authorName: items[0].authorName || 'Unknown',
      totalItems: items.length,
      spamCount,
      approvedCount,
      avgSpamScore: Math.round(items.reduce((s, i) => s + (i.spamScore || 0), 0) / items.length),
      spamRatio: Math.round(spamRatio * 100) / 100,
      trustLevel,
      items: items.map(i => ({
        id: i.id,
        title: i.title,
        contentType: i.contentType,
        status: i.status,
        spamScore: i.spamScore,
        createdAt: i.createdAt,
        moderatedAt: i.moderatedAt,
      })),
    })
  })
}

module.exports = { registerReputationRoutes }
