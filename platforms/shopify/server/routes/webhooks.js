/**
 * Webhook routes - outbound webhook testing and inbound webhook receiving.
 */

const express = require('express')
const router = express.Router()
const { WebhookService } = require('@cmcc/server-core')

module.exports = function (services) {
  const { db } = services
  const webhookService = new WebhookService()

  // POST /api/cmcc/webhooks/test - Test a webhook dispatch
  router.post('/test', async (req, res, next) => {
    try {
      const { url, event, data } = req.body
      if (!url) {
        return res.status(400).json({ success: false, error: 'Missing required field: url' })
      }

      const payload = WebhookService.buildPayload(event || 'test.event', data || {})
      const result = await webhookService.dispatch(url, payload)
      res.json({ success: result.success, data: result })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/webhooks/shopify - Receive Shopify webhook
  router.post('/shopify', (req, res) => {
    const topic = req.headers['x-shopify-topic'] || 'unknown'
    const shopDomain = req.headers['x-shopify-shop-domain'] || 'unknown'

    // Log the incoming webhook
    console.log(`[Shopify Webhook] Topic: ${topic}, Shop: ${shopDomain}`)

    // Store the webhook event
    db.prepare(
      `INSERT INTO activity_logs (moderator_id, action, content_type, item_id, notes)
       VALUES (?, ?, ?, ?, ?)`
    ).run('shopify-system', `webhook:${topic}`, 'webhook', shopDomain, JSON.stringify(req.body).slice(0, 500))

    res.status(200).json({ received: true })
  })

  return router
}
