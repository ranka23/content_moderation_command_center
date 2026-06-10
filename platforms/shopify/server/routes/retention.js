/**
 * Retention routes - data retention and purge triggers.
 */

const express = require('express')
const router = express.Router()

module.exports = function (services) {
  const { db, retentionService } = services

  // POST /api/cmcc/notify/purge - Trigger retention purge
  router.post('/purge', async (req, res, next) => {
    try {
      const result = await retentionService.runScheduledPurge(
        async (cutoffDate) => {
          const cutoff = cutoffDate.toISOString().slice(0, 19).replace('T', ' ')
          const info = db.prepare(
            'DELETE FROM activity_logs WHERE created_at < ?'
          ).run(cutoff)
          return info.changes
        },
        async (cutoffDate) => {
          const cutoff = cutoffDate.toISOString().slice(0, 19).replace('T', ' ')
          const info = db.prepare(
            "DELETE FROM queue_items WHERE status IN ('approved', 'rejected', 'spam') AND updated_at < ?"
          ).run(cutoff)
          return info.changes
        },
      )
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  return router
}
