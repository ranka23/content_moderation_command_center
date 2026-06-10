/**
 * Notification routes - email and notification sending.
 */

const express = require('express')
const router = express.Router()

module.exports = function (services) {
  const { emailService } = services

  // POST /api/cmcc/notifications/send - Send a notification
  router.post('/send', async (req, res, next) => {
    try {
      const { type, data, to } = req.body
      if (!type || !data) {
        return res.status(400).json({ success: false, error: 'Missing required fields: type, data' })
      }

      const result = await emailService.sendNotification(type, data, to)
      res.json({ success: result.success, data: result })
    } catch (err) {
      next(err)
    }
  })

  return router
}
