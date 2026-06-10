/**
 * CMCC Moderation Middleware — Embeddable Express Router
 *
 * Primary entry point for mounting CMCC moderation on an existing server:
 *
 *   const cmccModeration = require('@cmcc/storyblok/server/middleware')
 *   app.use('/api/cmcc', cmccModeration({ db: './cmcc-data.sqlite', apiKey: 'my-key' }))
 */

const express = require('express')
const { getDb } = require('../db')
const { createAuthMiddleware } = require('./auth')

const { createQueueRouter } = require('../routes/queue')
const { createAnalyticsRouter } = require('../routes/analytics')
const { createActivityLogRouter } = require('../routes/activity-log')
const { createSettingsRouter } = require('../routes/settings')
const { createReportsRouter } = require('../routes/reports')
const { createReputationRouter } = require('../routes/reputation')
const { createPlatformsRouter } = require('../routes/platforms')
const { createWebhooksRouter } = require('../routes/webhooks')
const { createSyncRouter } = require('../routes/sync')
const { createNotificationsRouter } = require('../routes/notifications')
const { createHooksRouter } = require('../routes/hooks')
const { createRetentionRouter } = require('../routes/retention')
const { createCollaborationRouter } = require('../routes/collaboration')

/**
 * Create an embeddable Express Router for CMCC moderation.
 *
 * @param {object} [options]
 * @param {string|import('better-sqlite3').Database} [options.db] - Path or instance
 * @param {string} [options.apiKey] - API key for authentication
 * @param {object} [options.services] - Optional @cmcc/server-core services
 * @returns {import('express').Router}
 */
function createModerationMiddleware(options = {}) {
  const db =
    typeof options.db === 'string' ? getDb(options.db) : options.db || getDb()
  const apiKey = options.apiKey || process.env.API_KEY || 'cmcc-dev-key'
  const services = options.services || {}

  const router = express.Router()

  router.use(createAuthMiddleware(apiKey))

  router.use('/queue', createQueueRouter(db, services))
  router.use('/analytics', createAnalyticsRouter(db))
  router.use('/activity-log', createActivityLogRouter(db))
  router.use('/settings', createSettingsRouter(db, services))
  router.use('/reports', createReportsRouter(db))
  router.use('/reputation', createReputationRouter(db))
  router.use('/platforms', createPlatformsRouter(db, services))
  router.use('/webhooks', createWebhooksRouter(db, services))
  router.use('/sync', createSyncRouter(db, services))
  router.use('/notifications', createNotificationsRouter(db, services))
  router.use('/hooks', createHooksRouter(db, services))
  router.use('/retention', createRetentionRouter(db, services))
  router.use('/collaboration', createCollaborationRouter(db, services))

  // Unified queue endpoint
  router.get('/unified-queue', (req, res) => {
    const { page = '1', perPage = '25', status } = req.query
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage, 10) || 25))
    const offset = (pageNum - 1) * perPageNum

    const conditions = []
    const params = []
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const countRow = db
      .prepare('SELECT COUNT(*) as total FROM queue_items ' + where)
      .get(...params)
    const items = db
      .prepare(
        'SELECT * FROM queue_items ' +
          where +
          ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      )
      .all(...params, perPageNum, offset)

    res.json({
      items,
      total: countRow.total,
      page: pageNum,
      totalPages: Math.ceil(countRow.total / perPageNum) || 0,
    })
  })

  // Activity feed (uses activity log data)
  router.get('/activity-feed', (req, res) => {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50)
    const events = db
      .prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?')
      .all(limit)
    const formatted = events.map((e) => ({
      id: 'evt_' + e.id,
      type:
        e.action === 'note'
          ? 'note'
          : e.action === 'assignment'
            ? 'assignment'
            : e.action === 'escalation'
              ? 'escalation'
              : 'action',
      actorId: e.moderator_id,
      actorName: e.moderator_name || 'System',
      description: e.action + ' item ' + e.item_id,
      itemId: e.item_id,
      timestamp: e.created_at,
    }))

    let allEvents = formatted
    if (services.eventBus) {
      const busEvents = services.eventBus.getRecentEvents(limit)
      allEvents = [...busEvents, ...formatted].slice(0, limit)
    }
    res.json({ events: allEvents })
  })

  return router
}

module.exports = { createModerationMiddleware }
