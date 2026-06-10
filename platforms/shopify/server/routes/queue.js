/**
 * Queue routes - CRUD and moderation for queue items.
 */

const express = require('express')
const router = express.Router()
const { WebhookService } = require('@cmcc/server-core')
const queueService = require('../services/queue-service')

module.exports = function (services) {
  const {
    db,
    undoService,
    firewallService,
    emailService,
    webhookService,
    eventBus,
  } = services

  // GET /api/cmcc/queue - Get paginated queue
  router.get('/', (req, res) => {
    const { status, contentType, page, limit, search } = req.query
    const result = queueService.getQueueItems(db, {
      status,
      contentType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
    })
    res.json({ success: true, data: result })
  })

  // GET /api/cmcc/queue/unified - Get unified queue (same as queue for now)
  router.get('/unified', (req, res) => {
    const { status, contentType, page, limit, search } = req.query
    const result = queueService.getQueueItems(db, {
      status,
      contentType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
    })
    res.json({ success: true, data: result })
  })

  // POST /api/cmcc/queue/:id/moderate - Moderate a single item
  router.post('/:id/moderate', async (req, res, next) => {
    try {
      const { action, moderatorId, moderatorName, notes } = req.body
      if (!action || !moderatorId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: action, moderatorId',
        })
      }

      const updated = queueService.moderateItem(
        db,
        req.params.id,
        action,
        moderatorId,
        moderatorName || 'Unknown',
        notes,
        undoService,
      )

      // Send notifications via services
      if (emailService) {
        emailService
          .sendNotification('auto_moderated', {
            title: updated.title,
            content_type: updated.content_type,
            status: updated.status,
          })
          .catch(() => {})
      }

      if (webhookService) {
        webhookService
          .dispatch(
            process.env.WEBHOOK_URL || 'http://localhost:9090/webhook',
            WebhookService.buildPayload('moderation.action', {
              itemId: updated.item_id,
              action,
              status: updated.status,
            }),
          )
          .catch(() => {})
      }

      // Publish event
      if (eventBus) {
        eventBus.publishAction(
          moderatorId,
          moderatorName || 'Unknown',
          `${action}d item`,
          updated.item_id,
          updated.title,
        )
      }

      res.json({ success: true, data: updated })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/queue/bulk - Bulk moderation
  router.post('/bulk', async (req, res, next) => {
    try {
      const { action, ids, moderatorId, moderatorName } = req.body
      if (!action || !ids || !moderatorId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: action, ids, moderatorId',
        })
      }

      const result = queueService.bulkModerate(
        db,
        ids,
        action,
        moderatorId,
        moderatorName || 'Unknown',
        undoService,
      )

      if (eventBus) {
        eventBus.publishAction(
          moderatorId,
          moderatorName || 'Unknown',
          `Bulk ${action} (${result.moderated} items)`,
        )
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  // GET /api/cmcc/queue/:id/history - Get item moderation history
  router.get('/:id/history', (req, res, next) => {
    try {
      const history = queueService.getItemHistory(db, req.params.id)
      res.json({ success: true, data: history })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/queue/:id/undo - Undo last moderation action
  router.post('/:id/undo', async (req, res, next) => {
    try {
      const { moderatorId } = req.body
      if (!moderatorId) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing moderatorId' })
      }

      const item = queueService.getQueueItem(db, req.params.id)
      const result = await undoService.undo(String(item.id), async (state) => {
        db.prepare(
          "UPDATE queue_items SET status = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(state.status, item.id)
        return { success: true }
      })

      if (result.success) {
        // Log the undo action
        db.prepare(
          `INSERT INTO activity_logs (moderator_id, action, content_type, item_id, item_title, previous_status, new_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          moderatorId,
          'undo',
          item.content_type,
          item.item_id,
          item.title,
          item.status,
          result.restoredState.status,
        )

        if (eventBus) {
          eventBus.publishAction(
            moderatorId,
            'Unknown',
            `Undid moderation on item`,
            item.item_id,
            item.title,
          )
        }
      }

      res.json({ success: result.success, data: result })
    } catch (err) {
      next(err)
    }
  })

  // GET /api/cmcc/queue/:id/undo-info - Check undo availability
  router.get('/:id/undo-info', async (req, res, next) => {
    try {
      const item = queueService.getQueueItem(db, req.params.id)
      const info = await undoService.getUndoInfo(String(item.id))
      res.json({
        success: true,
        data: info || {
          available: false,
          remainingSeconds: 0,
          currentStatus: item.status,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/queue/:id/evaluate - Firewall evaluation
  router.post('/:id/evaluate', async (req, res, next) => {
    try {
      const item = queueService.getQueueItem(db, req.params.id)
      const evaluation = await firewallService.evaluateContent({
        content: item.excerpt || item.title || '',
        authorIP: item.author_ip,
        authorEmail: item.author_email,
        contentId: item.item_id,
      })

      res.json({ success: true, evaluation })
    } catch (err) {
      next(err)
    }
  })

  // GET /api/cmcc/queue/:id/notes - Get item notes
  router.get('/:id/notes', (req, res, next) => {
    try {
      const notes = queueService.getItemNotes(db, req.params.id)
      res.json({ success: true, data: notes })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/queue/:id/notes - Add a note
  router.post('/:id/notes', async (req, res, next) => {
    try {
      const { moderatorId, moderatorName, note } = req.body
      if (!note || !moderatorId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: moderatorId, note',
        })
      }

      const result = queueService.addItemNote(
        db,
        req.params.id,
        moderatorId,
        moderatorName,
        note,
      )

      if (eventBus) {
        eventBus.publishNote(
          moderatorId,
          moderatorName || 'Unknown',
          'Added a note',
          req.params.id,
        )
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  // POST /api/cmcc/queue/:id/assign - Assign item to a moderator
  router.post('/:id/assign', async (req, res, next) => {
    try {
      const { moderatorId, moderatorName, assignTo } = req.body
      if (!assignTo || !moderatorId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: moderatorId, assignTo',
        })
      }

      const result = queueService.assignItem(
        db,
        req.params.id,
        assignTo,
        moderatorId,
      )

      if (eventBus) {
        eventBus.publishAssignment(
          moderatorId,
          moderatorName || 'Unknown',
          `Assigned to ${assignTo}`,
          req.params.id,
        )
      }

      // Notify the assignee
      if (emailService) {
        emailService
          .sendNotification('assignment', {
            title: result.title,
            assigned_by: moderatorName || moderatorId,
          })
          .catch(() => {})
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  return router
}
