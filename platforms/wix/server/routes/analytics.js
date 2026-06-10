/**
 * Analytics routes: status counts, heatmap, spam ratio, content type breakdown, etc.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerAnalyticsRoutes(router, db, _services) {
  /**
   * GET /api/cmcc/analytics
   * Returns full analytics data including statusCounts, heatmap, spamRatio,
   * contentTypeBreakdown, moderatorPerformance, and anomalyAlerts.
   */
  router.get('/analytics', (req, res) => {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM queue_items').get().count

    // Status counts
    const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM queue_items GROUP BY status').all()
    const statusCounts = {
      pending: 0, approved: 0, rejected: 0, spam: 0, deferred: 0, flagged: 0,
    }
    for (const row of statusRows) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + row.count
    }

    // Spam ratio
    const spamCount = db.prepare("SELECT COUNT(*) as count FROM queue_items WHERE status = 'spam'").get().count
    const spamRatio = {
      spamCount,
      totalCount: totalItems,
      ratio: totalItems > 0 ? spamCount / totalItems : 0,
      percentage: totalItems > 0 ? Math.round((spamCount / totalItems) * 100) : 0,
    }

    // Content type breakdown
    const contentTypeRows = db.prepare('SELECT contentType, COUNT(*) as count FROM queue_items GROUP BY contentType ORDER BY count DESC').all()
    const contentTypeBreakdown = contentTypeRows.map(r => ({ contentType: r.contentType, count: r.count }))

    // Moderator performance
    const modRows = db.prepare(
      'SELECT moderatedBy, COUNT(*) as totalActions FROM queue_items WHERE moderatedBy IS NOT NULL GROUP BY moderatedBy ORDER BY totalActions DESC'
    ).all()
    const moderatorPerformance = modRows.map(r => ({ moderatorId: r.moderatedBy, totalActions: r.totalActions }))

    // Heatmap: actions per day of week and hour
    const logRows = db.prepare(
      "SELECT strftime('%w', createdAt) as dayOfWeek, strftime('%H', createdAt) as hour, COUNT(*) as count FROM activity_logs GROUP BY dayOfWeek, hour"
    ).all()
    const heatmap = {
      data: logRows.map(r => ({
        day: parseInt(r.dayOfWeek, 10),
        hour: parseInt(r.hour, 10),
        count: r.count,
      })),
    }

    // Anomaly alerts (items with high spam score or flags)
    const anomalyRows = db.prepare(
      "SELECT id, title, spamScore, flags FROM queue_items WHERE spamScore > 80 OR flags > 5 ORDER BY spamScore DESC LIMIT 10"
    ).all()
    const anomalyAlerts = anomalyRows.map(r => ({
      itemId: r.id,
      title: r.title,
      reason: r.spamScore > 80 ? `High spam score: ${r.spamScore}` : `Excessive flags: ${r.flags}`,
      severity: r.spamScore > 80 ? 'high' : 'medium',
    }))

    res.json({
      totalItems,
      statusCounts,
      heatmap,
      spamRatio,
      contentTypeBreakdown,
      moderatorPerformance,
      anomalyAlerts,
    })
  })
}

module.exports = { registerAnalyticsRoutes }
