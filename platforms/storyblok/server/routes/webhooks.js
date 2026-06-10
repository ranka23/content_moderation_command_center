/**
 * Webhook routes
 */
const express = require('express')

function createWebhooksRouter(db, services = {}) {
  const router = express.Router()

  // ── POST /webhooks/test — Test a webhook URL ────────────────────────
  router.post('/test', async (req, res) => {
    const { url, event } = req.body

    if (!url) {
      return res.status(400).json({ error: 'url is required' })
    }

    let result = { success: false, url, error: 'No webhook service configured' }

    if (services.webhookService) {
      try {
        result = await services.webhookService.dispatch(url, {
          event: event || 'test',
          data: { message: 'This is a test webhook from CMCC Storyblok' },
        })
      } catch (err) {
        result = {
          success: false,
          url,
          error: err.message || 'Webhook dispatch failed',
        }
      }
    }

    res.json({ result })
  })

  return router
}

module.exports = { createWebhooksRouter }
