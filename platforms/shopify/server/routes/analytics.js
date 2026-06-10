/**
 * Analytics routes - moderation analytics endpoints.
 */

const express = require('express')
const router = express.Router()
const analyticsService = require('../services/analytics-service')

module.exports = function (services) {
  const { db } = services

  // GET /api/cmcc/analytics - Get analytics data
  router.get('/', (req, res) => {
    const days = parseInt(req.query.days) || 7
    const data = analyticsService.getAnalytics(db, days)
    res.json({ success: true, data })
  })

  return router
}
