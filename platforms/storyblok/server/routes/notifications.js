/**
 * Notifications routes
 */
const express = require('express')

function createNotificationsRouter(db, services = {}) {
  const router = express.Router()

  // ── POST /notifications/send ─────────────────────────────────────────
  router.post('/send', async (req, res) => {
    const { type, to, data } = req.body

    if (!type || !data) {
      return res.status(400).json({ error: 'type and data are required' })
    }

    let result = { success: false, error: 'No email service configured' }

    if (services.emailService) {
      try {
        result = await services.emailService.sendNotification(type, data, to)
      } catch (err) {
        result = {
          success: false,
          error: err.message || 'Email send failed',
        }
      }
    }

    res.json(result)
  })

  return router
}

module.exports = { createNotificationsRouter }
