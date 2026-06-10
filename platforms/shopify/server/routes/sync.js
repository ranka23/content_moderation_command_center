/**
 * Sync routes - additional cross-platform sync endpoints.
 */

const express = require('express')
const router = express.Router()
module.exports = function (services) {
  const { db } = services

  // GET /api/cmcc/unified-queue - Get unified queue from all platforms (placeholder)
  router.get('/unified-queue', (req, res) => {
    const queueService = require('../services/queue-service')
    const { status, contentType, page, limit } = req.query
    const result = queueService.getQueueItems(db, {
      status,
      contentType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    })
    res.json({ success: true, data: result })
  })

  return router
}
