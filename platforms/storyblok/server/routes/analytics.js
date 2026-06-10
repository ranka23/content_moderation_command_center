/**
 * Analytics routes
 */
const express = require('express')

function createAnalyticsRouter(db) {
  const router = express.Router()

  // ── GET /analytics — Comprehensive analytics ────────────────────────
  router.get('/', (req, res) => {
    // Total items
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM queue_items').get().count

    // Status counts
    const statusRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM queue_items GROUP BY status',
    ).all()
    const statusCounts = { pending: 0, approved: 0, rejected: 0, spam: 0, flagged: 0, deferred: 0 }
    for (const row of statusRows) {
      if (statusCounts[row.status] !== undefined) {
        statusCounts[row.status] = row.count
      }
    }

    // Content type breakdown
    const contentTypeRows = db.prepare(
      'SELECT content_type, COUNT(*) as count FROM queue_items GROUP BY content_type',
    ).all()
    const contentTypeBreakdown = {}
    for (const row of contentTypeRows) {
      contentTypeBreakdown[row.content_type] = row.count
    }

    // Spam ratio: percentage of items that are spam
    const spamCount = statusCounts.spam || 0
    const spamRatio = totalItems > 0 ? Math.round((spamCount / totalItems) * 100) : 0

    // Moderator performance
    const moderatorRows = db.prepare(`
      SELECT moderator_id, moderator_name, action, COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY moderator_id, action
      ORDER BY moderator_name
    `).all()

    const moderatorMap = {}
    for (const row of moderatorRows) {
      if (!moderatorMap[row.moderator_id]) {
        moderatorMap[row.moderator_id] = {
          moderatorId: row.moderator_id,
          moderatorName: row.moderator_name || row.moderator_id,
          actions: {},
          total: 0,
        }
      }
      moderatorMap[row.moderator_id].actions[row.action] = row.count
      moderatorMap[row.moderator_id].total += row.count
    }
    const moderatorPerformance = Object.values(moderatorMap)

    // Heatmap data (last 30 days)
    const heatmapRows = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all()
    const heatmap = heatmapRows.map((r) => ({ date: r.date, count: r.count }))

    // Anomaly alerts — check for volume spikes
    const lastHourCount = db.prepare(`
      SELECT COUNT(*) as count FROM activity_logs
      WHERE created_at >= datetime('now', '-1 hour')
    `).get().count

    const anomalyAlerts = []
    if (lastHourCount > 100) {
      anomalyAlerts.push({
        type: 'volume_spike',
        severity: 'warning',
        message: `High activity volume detected: ${lastHourCount} actions in the last hour`,
        count: lastHourCount,
      })
    }

    // Spam ratio alert
    if (spamRatio > 50) {
      anomalyAlerts.push({
        type: 'high_spam_ratio',
        severity: spamRatio > 80 ? 'critical' : 'warning',
        message: `Spam ratio is ${spamRatio}%`,
        ratio: spamRatio,
      })
    }

    res.json({
      totalItems,
      statusCounts,
      spamRatio,
      contentTypeBreakdown,
      moderatorPerformance,
      heatmap,
      anomalyAlerts,
    })
  })

  return router
}

module.exports = { createAnalyticsRouter }
