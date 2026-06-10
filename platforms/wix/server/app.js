const express = require('express')
const cors = require('cors')
const {
  FirewallService,
  UndoService,
  WebSocketEventBus,
  WebhookService,
  EmailService,
  RetentionService,
  ScheduledReportService,
  SyncReceiver,
  ContentHookService,
} = require('@cmcc/server-core')

const { authMiddleware } = require('./middleware/auth')
const { errorHandler } = require('./middleware/error-handler')

const { registerQueueRoutes } = require('./routes/queue')
const { registerAnalyticsRoutes } = require('./routes/analytics')
const { registerActivityLogRoutes } = require('./routes/activity-log')
const { registerSettingsRoutes } = require('./routes/settings')
const { registerReportsRoutes } = require('./routes/reports')
const { registerReputationRoutes } = require('./routes/reputation')
const { registerCollaborationRoutes } = require('./routes/collaboration')
const { registerPlatformsRoutes } = require('./routes/platforms')
const { registerWebhookRoutes } = require('./routes/webhooks')
const { registerSyncRoutes } = require('./routes/sync')
const { registerNotificationRoutes } = require('./routes/notifications')
const { registerHookRoutes } = require('./routes/hooks')

/**
 * Create the Express application with all CMCC middleware and routes.
 *
 * @param {import('better-sqlite3').Database} [db] - Database instance (for testing injection)
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express()

  // ── Core middleware ──────────────────────────────────────────────────
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/cmcc', authMiddleware)

  // ── Services (shared across routes) ──────────────────────────────────
  const eventBus = new WebSocketEventBus()
  const undoService = new UndoService({ windowMinutes: 5 })
  const firewallService = new FirewallService({ maxLinks: 5 })
  const webhookService = new WebhookService()
  const emailService = new EmailService(
    {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      fromAddress: process.env.SMTP_FROM || 'cmcc@example.com',
    },
    (process.env.NOTIFICATION_EMAILS || '').split(',').filter(Boolean),
  )
  const retentionService = new RetentionService({
    activityLogRetentionDays: parseInt(process.env.RETENTION_LOG_DAYS, 10) || 90,
    archivedItemRetentionDays: parseInt(process.env.RETENTION_ARCHIVE_DAYS, 10) || 365,
    autoPurgeSchedule: (process.env.RETENTION_SCHEDULE || 'weekly'),
  })
  const scheduledReportService = new ScheduledReportService()
  const syncReceiver = new SyncReceiver('wix')
  const contentHookService = new ContentHookService(async (contentType, itemId, authorName, authorEmail, authorIP, content, title) => {
    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO queue_items (id, contentType, itemId, authorName, authorEmail, authorIP, content, title, status, createdAt, updatedAt, metadata, platform)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, '{}', 'wix')
    `).run(id, contentType, itemId, authorName, authorEmail, authorIP, content, title, now, now)
  })

  const services = {
    eventBus,
    undoService,
    firewallService,
    webhookService,
    emailService,
    retentionService,
    scheduledReportService,
    syncReceiver,
    contentHookService,
  }

  // Store services in app.locals for test access
  app.locals.eventBus = eventBus
  app.locals.undoService = undoService
  app.locals.firewallService = firewallService
  app.locals.contentHookService = contentHookService
  app.locals.services = services

  // ── Register routes ──────────────────────────────────────────────────
  const apiRouter = express.Router()

  registerQueueRoutes(apiRouter, db, services)
  registerAnalyticsRoutes(apiRouter, db, services)
  registerActivityLogRoutes(apiRouter, db, services)
  registerSettingsRoutes(apiRouter, db, services)
  registerReportsRoutes(apiRouter, db, services)
  registerReputationRoutes(apiRouter, db, services)
  registerCollaborationRoutes(apiRouter, db, services)
  registerPlatformsRoutes(apiRouter, db, services)
  registerWebhookRoutes(apiRouter, db, services)
  registerSyncRoutes(apiRouter, db, services)
  registerNotificationRoutes(apiRouter, db, services)
  registerHookRoutes(apiRouter, db, services)

  app.use('/api/cmcc', apiRouter)

  // ── Health check ─────────────────────────────────────────────────────
  app.get('/api/cmcc/health', (req, res) => {
    res.json({ status: 'ok', platform: 'wix', timestamp: new Date().toISOString() })
  })

  // ── Error handler ────────────────────────────────────────────────────
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
