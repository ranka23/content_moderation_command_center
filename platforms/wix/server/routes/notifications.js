/**
 * Notifications routes: send email notifications.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerNotificationRoutes(router, db, services) {
  const emailService = services.emailService

  /**
   * POST /api/cmcc/notifications/send
   * Send an email notification for a moderation event.
   */
  router.post('/notifications/send', async (req, res) => {
    const { type, itemId, recipients, ...extra } = req.body

    if (!type || !itemId) {
      return res.status(400).json({ error: 'type and itemId are required' })
    }

    const item = db
      .prepare('SELECT * FROM queue_items WHERE id = ?')
      .get(itemId)
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' })
    }

    const data = {
      title: item.title,
      content_type: item.contentType,
      status: item.status,
      spam_score: item.spamScore,
      ...extra,
    }

    try {
      const result = await emailService.sendNotification(type, data, recipients)
      res.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      })
    } catch (err) {
      res.json({ success: false, error: err.message })
    }
  })

  /**
   * POST /api/cmcc/notify/purge
   * Trigger retention purge.
   */
  router.post('/notify/purge', async (req, res) => {
    const { type } = req.body

    if (!type || !['activity_logs', 'archived_items'].includes(type)) {
      return res
        .status(400)
        .json({ error: 'type must be "activity_logs" or "archived_items"' })
    }

    const retentionService = services.retentionService

    try {
      if (type === 'activity_logs') {
        const result = await retentionService.purgeOldActivityLogs(
          async (cutoffDate) => {
            const info = db
              .prepare('DELETE FROM activity_logs WHERE createdAt < ?')
              .run(cutoffDate.toISOString())
            return info.changes
          },
        )
        res.json({ success: true, purged: result })
      } else {
        const result = await retentionService.purgeOldArchivedItems(
          async (cutoffDate) => {
            const info = db
              .prepare(
                "DELETE FROM queue_items WHERE status IN ('spam', 'rejected') AND createdAt < ?",
              )
              .run(cutoffDate.toISOString())
            return info.changes
          },
        )
        res.json({ success: true, purged: result })
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
}

module.exports = { registerNotificationRoutes }
