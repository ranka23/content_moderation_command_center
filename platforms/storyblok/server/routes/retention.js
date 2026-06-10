/**
 * Retention routes — data retention and purge
 */
const express = require('express')

function createRetentionRouter(db, services = {}) {
  const router = express.Router()

  // ── POST /retention/purge — Manually trigger retention purge ────────
  router.post('/purge', async (req, res) => {
    let activityLogPurged = { success: false, error: 'No retention service configured' }

    if (services.retentionService) {
      try {
        activityLogPurged = await services.retentionService.purgeOldActivityLogs(
          async (cutoffDate) => {
            const result = db.prepare(
              'DELETE FROM activity_logs WHERE created_at < ?',
            ).run(cutoffDate.toISOString())
            return result.changes
          },
        )
      } catch (err) {
        activityLogPurged = {
          success: false,
          error: err.message || 'Purge failed',
        }
      }
    } else {
      // Manual purge based on settings
      const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'activityLogRetentionDays'").get()
      const retentionDays = settingsRow ? parseInt(settingsRow.value, 10) || 90 : 90

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      const cutoffStr = cutoffDate.toISOString()

      const result = db.prepare('DELETE FROM activity_logs WHERE created_at < ?').run(cutoffStr)

      activityLogPurged = {
        success: true,
        deletedCount: result.changes,
      }
    }

    res.json({
      activityLogPurged,
      timestamp: new Date().toISOString(),
    })
  })

  return router
}

module.exports = { createRetentionRouter }
