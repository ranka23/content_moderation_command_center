/**
 * CMCC Storyblok Server — Express.js backend for the CMCC moderation app.
 *
 * Provides both a standalone server and an embeddable middleware.
 *
 * Usage as middleware (recommended for production):
 *   const cmccModeration = require('@cmcc/storyblok/server/middleware')
 *   app.use('/api/cmcc', cmccModeration({ db: './cmcc-data.sqlite' }))
 *
 * Usage as standalone server:
 *   node server/index.js
 *
 * Usage in tests:
 *   const app = require('./server').createApp(db, apiKey)
 */

const express = require('express')
const cors = require('cors')

const { getDb } = require('./db')
const { createModerationMiddleware } = require('./middleware')
const { errorHandler, notFoundHandler } = require('./middleware/error-handler')

/**
 * Create and configure the full Express application.
 * Wraps the embeddable middleware with CORS, JSON parsing, and error handlers.
 *
 * @param {import('better-sqlite3').Database} [db] - Database instance (for testing)
 * @param {string} [apiKey] - API key for authentication
 * @param {object} [services] - Optional @cmcc/server-core services
 * @returns {import('express').Application}
 */
function createApp(db, apiKey, services = {}) {
  const app = express()

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
    }),
  )
  app.use(express.json({ limit: '10mb' }))

  // Mount the embeddable moderation middleware
  app.use('/api/cmcc', createModerationMiddleware({ db, apiKey, services }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

/**
 * Start the server on the configured port.
 */
function startServer() {
  const port = parseInt(process.env.PORT, 10) || 3002
  const db = getDb()
  const services = {}

  try {
    const {
      FirewallService,
      WebhookService,
      RetentionService,
      SyncReceiver,
      WebSocketEventBus,
      ContentHookService,
    } = require('@cmcc/server-core')

    services.firewallService = new FirewallService()
    services.emailService = null
    services.webhookService = new WebhookService()
    services.retentionService = new RetentionService()
    services.eventBus = new WebSocketEventBus()
    services.syncReceiver = new SyncReceiver('storyblok')
    services.contentHookService = new ContentHookService(
      async (
        contentType,
        itemId,
        authorName,
        authorEmail,
        authorIP,
        content,
        title,
      ) => {
        const { v4: uuidv4 } = require('uuid')
        db.prepare(
          `INSERT INTO queue_items (item_id, content_type, status, title, content, author_name, author_email, author_ip, spam_score, created_at)
           VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, 0, datetime('now'))`,
        ).run(
          uuidv4(),
          contentType,
          title,
          content,
          authorName,
          authorEmail,
          authorIP,
        )
      },
    )

    if (services.contentHookService) {
      services.contentHookService.registerHook({
        name: 'storyblok-content',
        contentType: 'story',
        description: 'Auto-import Storyblok stories into moderation queue',
        enabled: true,
      })
      services.contentHookService.registerHook({
        name: 'storyblok-comment',
        contentType: 'comment',
        description: 'Auto-import Storyblok comments into moderation queue',
        enabled: true,
      })
    }

    if (services.syncReceiver) {
      services.syncReceiver.onFirewallSync((rules) => {
        if (services.firewallService) {
          services.firewallService.updateConfig({
            maxLinks: rules.max_links,
            blacklistedKeywords: rules.blacklisted_keywords
              ? rules.blacklisted_keywords.split(',').map((s) => s.trim())
              : [],
            blacklistedEmailDomains: rules.blacklisted_email_domains,
          })
        }
      })
    }

    if (services.retentionService) {
      const cron = require('node-cron')
      cron.schedule('0 2 * * *', async () => {
        // eslint-disable-next-line no-console
        console.log('[CMCC] Running scheduled retention purge...')
        await services.retentionService.runScheduledPurge(
          async (cutoffDate) =>
            db
              .prepare('DELETE FROM activity_logs WHERE created_at < ?')
              .run(cutoffDate.toISOString()).changes,
          async (cutoffDate) =>
            db
              .prepare(
                "DELETE FROM queue_items WHERE status IN ('approved', 'rejected', 'spam') AND moderated_at < ?",
              )
              .run(cutoffDate.toISOString()).changes,
        )
      })
    }

    // eslint-disable-next-line no-console
    console.log('[CMCC] @cmcc/server-core services initialized')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[CMCC] @cmcc/server-core not available, running without shared services:',
      err.message,
    )
  }

  const appWithServices = createApp(
    db,
    process.env.API_KEY || 'cmcc-dev-key',
    services,
  )
  const server = appWithServices.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[CMCC] Storyblok server running on port ${port}`)
    // eslint-disable-next-line no-console
    console.log(`[CMCC] API base: http://localhost:${port}/api/cmcc`)
  })

  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('[CMCC] Shutting down...')
    server.close(() => {
      const { closeDb } = require('./db')
      closeDb()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return server
}

if (require.main === module) {
  startServer()
}

module.exports = { createApp, startServer }
