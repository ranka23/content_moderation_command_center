const { WebhookService } = require('@cmcc/server-core')

/**
 * Webhook routes: test webhook URL.
 *
 * @param {import('express').Router} router
 * @param {import('better-sqlite3').Database} db
 * @param {object} services
 */
function registerWebhookRoutes(router, db, services) {
  const webhookService = services.webhookService

  /**
   * POST /api/cmcc/webhooks/test
   * Test a webhook URL with a sample payload.
   */
  router.post('/webhooks/test', async (req, res) => {
    const { url, event } = req.body

    if (!url) {
      return res.status(400).json({ error: 'url is required' })
    }

    const payload = WebhookService.buildPayload(event || 'test', {
      test: true,
      message: 'This is a test webhook from CMCC Wix server',
      timestamp: new Date().toISOString(),
    })

    const result = await webhookService.dispatch(url, payload)

    res.json({ result })
  })
}

module.exports = { registerWebhookRoutes }
