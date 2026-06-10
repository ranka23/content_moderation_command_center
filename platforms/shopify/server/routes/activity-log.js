/**
 * Activity log routes - activity log browsing and filtering.
 */

const express = require('express')
const router = express.Router()
const activityLogService = require('../services/activity-log-service')

module.exports = function (services) {
  const { db } = services

  // GET /api/cmcc/activity-log - Get activity log entries
  router.get('/', (req, res) => {
    const { action, moderatorId, contentType, page, limit } = req.query
    const result = activityLogService.getActivityLogs(db, {
      action,
      moderatorId,
      contentType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    })
    res.json({ success: true, data: result })
  })

  // GET /api/cmcc/activity-feed - Get activity feed
  router.get('/feed', (req, res) => {
    const collaborationService = require('../services/collaboration-service')
    const limit = parseInt(req.query.limit) || 50
    const events = collaborationService.getActivityFeed(db, limit)
    res.json({ success: true, data: events })
  })

  return router
}
