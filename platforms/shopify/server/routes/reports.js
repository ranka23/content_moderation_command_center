/**
 * Reports routes - report generation, CSV export, and scheduled report management.
 */

const express = require('express')
const router = express.Router()
const analyticsService = require('../services/analytics-service')
const reportService = require('../services/report-service')

module.exports = function (services) {
  const { db, scheduledReportService } = services

  // GET /api/cmcc/reports - Get combined reports data (user reputation, moderator perf, platform hubs)
  router.get('/', (req, res) => {
    const reputationService = require('../services/reputation-service')
    const userReputation = reputationService.getUserReputations(db)

    // Compute moderator performance from analytics
    const analytics = analyticsService.getAnalytics(db, 30)
    const moderatorPerformance = (analytics.moderatorPerformance || []).map(
      (m) => ({
        moderator: m.moderator_id,
        actionsTaken: m.action_count,
        accuracyRate: null,
        avgResponseTime: null,
        active: true,
      }),
    )

    const platformHubs = [
      {
        platform: 'shopify',
        status: 'connected',
        itemsQueued: analytics.pendingItems || 0,
        lastSync: new Date().toISOString(),
      },
    ]

    res.json({
      success: true,
      data: {
        userReputation,
        moderatorPerformance,
        platformHubs,
      },
    })
  })

  // POST /api/cmcc/reports/moderation-activity - Generate moderation activity report
  router.post('/moderation-activity', (req, res) => {
    const days = req.body.days || 7
    const report = analyticsService.getModerationActivityReport(db, days)
    res.json({ success: true, data: report })
  })

  // POST /api/cmcc/reports/compliance-audit - Generate compliance audit report
  router.post('/compliance-audit', (req, res) => {
    const days = req.body.days || 30
    const report = analyticsService.getComplianceAuditReport(db, days)
    res.json({ success: true, data: report })
  })

  // POST /api/cmcc/reports/export/csv - Export moderation data as CSV
  router.post('/export/csv', (req, res) => {
    const days = req.body.days || 30
    const activity = analyticsService.getModerationActivityReport(db, days)
    const compliance = analyticsService.getComplianceAuditReport(db, days)

    let csv = 'Moderation Activity Report\n'
    csv += 'Action,Count\n'
    for (const row of activity.summary) {
      csv += `${row.action},${row.count}\n`
    }

    csv += '\nCompliance Audit\n'
    csv += 'Status,Count\n'
    for (const row of compliance.itemsByStatus) {
      csv += `${row.status},${row.count}\n`
    }

    csv += '\nActions Timeline\n'
    csv += 'Date,Action,Count\n'
    for (const row of compliance.actionsTimeline) {
      csv += `${row.date},${row.action},${row.count}\n`
    }

    csv += '\nModerator Activity\n'
    csv += 'Moderator,Action,Count\n'
    for (const row of activity.byModerator) {
      csv += `${row.moderator_id},${row.action},${row.count}\n`
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cmcc-moderation-report-${Date.now()}.csv"`,
    )
    res.send(csv)
  })

  // POST /api/cmcc/reports/scheduled - Schedule a new report
  router.post('/scheduled', async (req, res, next) => {
    try {
      const report = await reportService.createScheduledReport(
        scheduledReportService,
        req.body,
      )
      res.json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  })

  // GET /api/cmcc/reports/scheduled - List scheduled reports
  router.get('/scheduled', async (req, res) => {
    const reports = await reportService.listScheduledReports(
      scheduledReportService,
    )
    res.json({ success: true, data: reports })
  })

  // DELETE /api/cmcc/reports/scheduled/:id - Delete a scheduled report
  router.delete('/scheduled/:id', async (req, res) => {
    const result = await reportService.deleteScheduledReport(
      scheduledReportService,
      req.params.id,
    )
    res.json({ success: result.success, data: result })
  })

  return router
}
