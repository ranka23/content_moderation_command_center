/**
 * CMCC Shopify Backend Server
 *
 * Enhanced Express server with SQLite database, routes, services,
 * and integration with @cmcc/server-core services.
 *
 * Usage (production):
 *   const { createApp } = require('./server')
 *   const app = createApp()
 *   app.listen(PORT)
 *
 * Usage (testing):
 *   const { setupApp } = require('./server')
 *   const { app, db } = setupApp()
 */

const express = require('express')

// @cmcc/server-core services (mocked in test via jest config)
const {
  FirewallService,
  getDefaultFirewallConfig,
  EmailService,
  WebhookService,
  RetentionService,
  getDefaultRetentionConfig,
  UndoService,
  ScheduledReportService,
  SyncReceiver,
  WebSocketEventBus,
  ContentHookService,
} = require('@cmcc/server-core')

// Middleware
const { authMiddleware } = require('./middleware/auth')
const { errorHandler } = require('./middleware/error-handler')

// Route factories
const createQueueRoutes = require('./routes/queue')
const createAnalyticsRoutes = require('./routes/analytics')
const createActivityLogRoutes = require('./routes/activity-log')
const createSettingsRoutes = require('./routes/settings')
const createReportsRoutes = require('./routes/reports')
const createReputationRoutes = require('./routes/reputation')
const createCollaborationRoutes = require('./routes/collaboration')
const createPlatformsRoutes = require('./routes/platforms')
const createWebhookRoutes = require('./routes/webhooks')
const createSyncRoutes = require('./routes/sync')
const createNotificationRoutes = require('./routes/notifications')
const createRetentionRoutes = require('./routes/retention')
const createHooksRoutes = require('./routes/hooks')

/**
 * Initialize all services with the given database instance.
 */
function initServices(db) {
  const firewallService = new FirewallService(getDefaultFirewallConfig())
  const emailService = new EmailService(
    {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      fromAddress: process.env.SMTP_FROM || 'cmcc@example.com',
    },
    (process.env.NOTIFICATION_EMAILS || '').split(',').filter(Boolean),
  )
  const webhookService = new WebhookService()
  const retentionService = new RetentionService(getDefaultRetentionConfig())
  const undoService = new UndoService()
  const scheduledReportService = new ScheduledReportService()
  const syncReceiver = new SyncReceiver('shopify')
  const eventBus = new WebSocketEventBus()
  const contentHookService = new ContentHookService(
    async (
      contentType,
      itemId,
      authorName,
      authorEmail,
      authorIP,
      content,
      title,
    ) => {
      db.prepare(
        `INSERT INTO queue_items (item_id, content_type, status, author_name, author_email, author_ip, title, excerpt)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
      ).run(
        itemId,
        contentType,
        authorName,
        authorEmail,
        authorIP,
        title,
        content,
      )
    },
  )

  return {
    db,
    firewallService,
    emailService,
    webhookService,
    retentionService,
    undoService,
    scheduledReportService,
    syncReceiver,
    eventBus,
    contentHookService,
  }
}

/**
 * Create and configure the Express app with all routes and middleware.
 * Does NOT call app.listen() — caller controls that.
 */
function createAppWithServices(services) {
  const app = express()

  // Body parsing
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // CORS / security headers for Shopify embedding
  app.use((_req, res, next) => {
    res.set('X-Frame-Options', 'ALLOWALL')
    res.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;",
    )
    next()
  })

  // Auth middleware for /api/cmcc routes
  app.use('/api/cmcc', authMiddleware)

  // ── API Routes ──────────────────────────────────────────────────────────
  app.use('/api/cmcc/queue', createQueueRoutes(services))
  app.use('/api/cmcc/analytics', createAnalyticsRoutes(services))
  app.use('/api/cmcc/activity-log', createActivityLogRoutes(services))
  app.use('/api/cmcc/settings', createSettingsRoutes(services))
  app.use('/api/cmcc/reports', createReportsRoutes(services))
  app.use('/api/cmcc/reputation', createReputationRoutes(services))
  app.use('/api/cmcc/activity-feed', createCollaborationRoutes(services))
  app.use('/api/cmcc/platforms', createPlatformsRoutes(services))
  app.use('/api/cmcc/webhooks', createWebhookRoutes(services))
  app.use('/api/cmcc/unified-queue', createSyncRoutes(services))
  app.use('/api/cmcc/notifications', createNotificationRoutes(services))
  app.use('/api/cmcc/notify', createRetentionRoutes(services))
  app.use('/api/cmcc/hooks', createHooksRoutes(services))

  // ── Error Handler ───────────────────────────────────────────────────────
  app.use(errorHandler)

  return app
}

/**
 * Create a fully-configured app for production use.
 * Initializes the database from the db module.
 */
function createApp() {
  const { initDb } = require('./db')
  const db = initDb()
  const services = initServices(db)
  return createAppWithServices(services)
}

/**
 * Setup the app for testing.
 */
function setupApp() {
  const { getDb, initDb } = require('./db')
  let db
  try {
    db = getDb()
  } catch {
    db = initDb()
  }
  const services = initServices(db)
  const app = createAppWithServices(services)
  return { app, db, ...services }
}

module.exports = { createApp, setupApp }
