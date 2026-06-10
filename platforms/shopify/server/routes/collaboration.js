/**
 * Collaboration routes - activity feed, notes, and assignments.
 */

const express = require('express')
const router = express.Router()
const collaborationService = require('../services/collaboration-service')

module.exports = function (services) {
  const { db, eventBus } = services

  // GET /api/cmcc/activity-feed - Get activity feed
  router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50
    const events = collaborationService.getActivityFeed(db, limit)
    res.json({ success: true, data: events })
  })

  // GET /api/cmcc/activity-feed/recent - Get recent activity for the feed widget
  router.get('/recent', (req, res) => {
    const limit = parseInt(req.query.limit) || 10
    const events = collaborationService.getActivityFeed(db, limit)
    res.json({ success: true, data: events })
  })

  // GET /api/cmcc/activity-feed/item/:itemId - Get activity for a specific item
  router.get('/item/:itemId', (req, res) => {
    const events = collaborationService.getItemActivity(db, req.params.itemId)
    res.json({ success: true, data: events })
  })

  // POST /api/cmcc/activity-feed/note - Add a note to an item
  router.post('/note', (req, res, next) => {
    try {
      const { itemId, moderatorId, moderatorName, note } = req.body
      if (!itemId || !moderatorId || !note) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: itemId, moderatorId, note',
        })
      }

      const queueService = require('../services/queue-service')
      const result = queueService.addItemNote(
        db,
        itemId,
        moderatorId,
        moderatorName,
        note,
      )

      if (eventBus) {
        eventBus.publishNote(
          moderatorId,
          moderatorName || 'Unknown',
          'Added a note',
          itemId,
        )
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/activity-feed/assign - Assign an item to a moderator
  router.post('/assign', async (req, res, next) => {
    try {
      const { itemId, moderatorId, moderatorName, assignTo } = req.body
      if (!itemId || !assignTo || !moderatorId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: itemId, moderatorId, assignTo',
        })
      }

      const queueService = require('../services/queue-service')
      const result = queueService.assignItem(db, itemId, assignTo, moderatorId)

      if (eventBus) {
        eventBus.publishAssignment(
          moderatorId,
          moderatorName || 'Unknown',
          `Assigned to ${assignTo}`,
          itemId,
        )
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  return router
}
