/**
 * Analytics service - computes moderation analytics from the database.
 */

/**
 * Get analytics data for the given number of days.
 */
function getAnalytics(db, days = 7) {
  const dateFilter = `WHERE created_at >= datetime('now', '-${days} days')`

  // Queue status breakdown
  const queueBreakdown = db.prepare(
    `SELECT status, COUNT(*) as count FROM queue_items ${dateFilter} GROUP BY status`
  ).all()

  // Content type breakdown
  const contentTypeBreakdown = db.prepare(
    `SELECT content_type, COUNT(*) as count FROM queue_items ${dateFilter} GROUP BY content_type`
  ).all()

  // Moderator performance
  const moderatorPerformance = db.prepare(
    `SELECT moderator_id, COUNT(*) as action_count FROM activity_logs ${dateFilter} GROUP BY moderator_id ORDER BY action_count DESC`
  ).all()

  // Total items
  const totalItems = db.prepare(
    `SELECT COUNT(*) as count FROM queue_items ${dateFilter}`
  ).get()

  // Pending items
  const pendingItems = db.prepare(
    `SELECT COUNT(*) as count FROM queue_items WHERE status = 'pending' AND created_at >= datetime('now', '-${days} days')`
  ).get()

  // Spam count
  const spamCount = db.prepare(
    `SELECT COUNT(*) as count FROM queue_items WHERE status = 'spam' AND created_at >= datetime('now', '-${days} days')`
  ).get()

  // Approved count
  const approvedCount = db.prepare(
    `SELECT COUNT(*) as count FROM activity_logs WHERE action = 'approve' ${dateFilter.replace('WHERE', 'AND')}`
  ).get()

  return {
    queueBreakdown,
    contentTypeBreakdown,
    moderatorPerformance,
    totalItems: totalItems.count,
    pendingItems: pendingItems.count,
    spamCount: spamCount.count,
    approvedCount: approvedCount.count,
    dateRange: {
      start: new Date(Date.now() - days * 86400000).toISOString(),
      end: new Date().toISOString(),
    },
  }
}

/**
 * Get moderation activity report data.
 */
function getModerationActivityReport(db, days = 7) {
  const dateFilter = `created_at >= datetime('now', '-${days} days')`

  const summary = db.prepare(
    `SELECT action, COUNT(*) as count FROM activity_logs WHERE ${dateFilter} GROUP BY action`
  ).all()

  const byModerator = db.prepare(
    `SELECT moderator_id, action, COUNT(*) as count FROM activity_logs WHERE ${dateFilter} GROUP BY moderator_id, action`
  ).all()

  const byContentType = db.prepare(
    `SELECT al.content_type, al.action, COUNT(*) as count
     FROM activity_logs al WHERE ${dateFilter}
     GROUP BY al.content_type, al.action`
  ).all()

  return {
    generatedAt: new Date().toISOString(),
    days,
    summary,
    byModerator,
    byContentType,
  }
}

/**
 * Get compliance audit report data.
 */
function getComplianceAuditReport(db, days = 30) {
  const dateFilter = `created_at >= datetime('now', '-${days} days')`

  const itemsByStatus = db.prepare(
    `SELECT status, COUNT(*) as count FROM queue_items WHERE ${dateFilter} GROUP BY status`
  ).all()

  const unmoderatedOld = db.prepare(
    `SELECT COUNT(*) as count FROM queue_items WHERE status = 'pending' AND created_at < datetime('now', '-${Math.max(days - 7, 1)} days')`
  ).get()

  const actionsTimeline = db.prepare(
    `SELECT date(created_at) as date, action, COUNT(*) as count
     FROM activity_logs WHERE ${dateFilter}
     GROUP BY date(created_at), action ORDER BY date`
  ).all()

  return {
    generatedAt: new Date().toISOString(),
    days,
    itemsByStatus,
    unmoderatedOldItems: unmoderatedOld.count,
    actionsTimeline,
  }
}

module.exports = {
  getAnalytics,
  getModerationActivityReport,
  getComplianceAuditReport,
}
