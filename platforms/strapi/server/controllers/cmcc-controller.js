'use strict'

const PLUGIN_ID = 'cmcc'

function normalizeAction(action) {
  const map = {
    approved: 'approve',
    marked_spam: 'spam',
    'marked-spam': 'spam',
    flagged: 'flag',
    flag: 'flag',
    deferred: 'defer',
    rejected: 'reject',
  }
  return map[action.toLowerCase()] || action
}

module.exports = ({ strapi }) => ({
  // ── Core Queue Handlers ──────────────────────────────────────────────

  /**
   * GET /cmcc/queue - Get queue items with pagination and filters
   */
  async getQueue(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.getQueue(ctx.query)

      ctx.send({
        data: result.results,
        pagination: result.pagination,
      })
    } catch (err) {
      ctx.badRequest('Failed to fetch queue items', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/queue/:id/moderate - Moderate a single item
   */
  async moderateItem(ctx) {
    try {
      const { id } = ctx.params
      const { action: rawAction } = ctx.request.body

      if (!rawAction) {
        return ctx.badRequest('Action is required')
      }

      const action = normalizeAction(rawAction)
      const validActions = ['approve', 'reject', 'spam', 'defer', 'flag']
      if (!validActions.includes(action)) {
        return ctx.badRequest(
          `Action must be one of: ${validActions.join(', ')}`,
        )
      }

      const moderatorId = ctx.state.user?.id || 'anonymous'

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.moderateItem(id, action, moderatorId)

      ctx.send({
        data: result,
        message: `Item ${action}d successfully`,
      })
    } catch (err) {
      ctx.badRequest('Failed to moderate item', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/queue/bulk - Perform bulk action on items
   */
  async bulkAction(ctx) {
    try {
      const { itemIds, action } = ctx.request.body

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return ctx.badRequest('itemIds must be a non-empty array')
      }

      if (!action) {
        return ctx.badRequest('Action is required')
      }

      const moderatorId = ctx.state.user?.id || 'anonymous'

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.bulkAction(itemIds, action, moderatorId)

      ctx.send({
        data: result,
        message: `Bulk action completed: ${result.succeeded.length} succeeded, ${result.failed.length} failed`,
      })
    } catch (err) {
      ctx.badRequest('Failed to perform bulk action', {
        error: err.message,
      })
    }
  },

  /**
   * GET /cmcc/queue/:id/history - Get history for a specific queue item
   */
  async getItemHistory(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const history = await service.getItemHistory(id)

      ctx.send({ data: history })
    } catch (err) {
      ctx.badRequest('Failed to fetch item history', {
        error: err.message,
      })
    }
  },

  // ── Collaboration Handlers (Section 10.6) ────────────────────────────

  /**
   * GET /cmcc/queue/:id/notes - Get notes for a queue item
   */
  async getNotes(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const notes = await service.getNotes(id)

      ctx.send({ data: notes })
    } catch (err) {
      ctx.badRequest('Failed to fetch notes', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/queue/:id/notes - Add a note to a queue item
   */
  async addNote(ctx) {
    try {
      const { id } = ctx.params
      const { content, isInternal, type } = ctx.request.body

      if (!content) {
        return ctx.badRequest('Note content is required')
      }

      const authorId = ctx.state.user?.id || 'anonymous'
      const authorName = ctx.state.user?.username || 'Anonymous'

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const note = await service.addNote(id, {
        content,
        authorId,
        authorName,
        isInternal: isInternal || false,
        type: type || 'general',
      })

      ctx.send({ data: note, message: 'Note added successfully' })
    } catch (err) {
      ctx.badRequest('Failed to add note', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/queue/:id/assign - Assign a queue item to a moderator/team
   */
  async assignItem(ctx) {
    try {
      const { id } = ctx.params
      const { assigneeId, teamId, dueDate, priority } = ctx.request.body
      const assignedById = ctx.state.user?.id || 'anonymous'

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const assignment = await service.assignItem(id, {
        assigneeId,
        teamId,
        assignedById,
        dueDate,
        priority: priority || 'normal',
      })

      ctx.send({ data: assignment, message: 'Item assigned successfully' })
    } catch (err) {
      ctx.badRequest('Failed to assign item', {
        error: err.message,
      })
    }
  },

  /**
   * GET /cmcc/activity-feed - Get the real-time activity feed
   */
  async getActivityFeed(ctx) {
    try {
      const { limit = 20 } = ctx.query
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const events = await service.getActivityFeed(Number(limit))

      ctx.send({ data: events })
    } catch (err) {
      ctx.badRequest('Failed to fetch activity feed', {
        error: err.message,
      })
    }
  },

  // ── Analytics Handlers ───────────────────────────────────────────────

  /**
   * GET /cmcc/analytics - Get analytics data
   */
  async getAnalytics(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const analytics = await service.getAnalytics()

      ctx.send({ data: analytics })
    } catch (err) {
      ctx.badRequest('Failed to fetch analytics', {
        error: err.message,
      })
    }
  },

  /**
   * GET /cmcc/activity-log - Get activity log
   */
  async getActivityLog(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.getActivityLog(ctx.query)

      ctx.send({
        data: result.results,
        pagination: result.pagination,
      })
    } catch (err) {
      ctx.badRequest('Failed to fetch activity log', {
        error: err.message,
      })
    }
  },

  // ── Reputation Handlers (Section 10.3) ───────────────────────────────

  /**
   * GET /cmcc/reputation/users - Get all user reputation scores
   */
  async getUserReputation(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const users = await service.getUserReputation()

      ctx.send({ data: users })
    } catch (err) {
      ctx.badRequest('Failed to fetch user reputation', {
        error: err.message,
      })
    }
  },

  /**
   * GET /cmcc/reputation/user/:id - Get reputation detail for a specific user
   */
  async getUserReputationDetail(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const detail = await service.getUserReputationDetail(id)

      if (!detail) {
        return ctx.notFound('User not found')
      }

      ctx.send({ data: detail })
    } catch (err) {
      ctx.badRequest('Failed to fetch user reputation detail', {
        error: err.message,
      })
    }
  },

  // ── Reports Handlers (Section 10.4) ──────────────────────────────────

  /**
   * POST /cmcc/reports/moderation-activity - Generate moderation activity report
   */
  async getModerationReport(ctx) {
    try {
      const { startDate, endDate, format } = ctx.request.body
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const report = await service.getModerationReport({
        startDate,
        endDate,
        format: format || 'csv',
      })

      ctx.send({ data: report })
    } catch (err) {
      ctx.badRequest('Failed to generate report', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/reports/compliance-audit - Generate compliance audit report
   */
  async getComplianceAudit(ctx) {
    try {
      const { startDate, endDate } = ctx.request.body
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const report = await service.getComplianceAudit({
        startDate,
        endDate,
      })

      ctx.send({ data: report })
    } catch (err) {
      ctx.badRequest('Failed to generate compliance audit', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/reports/scheduled - Schedule a recurring report
   */
  async scheduleReport(ctx) {
    try {
      const { type, frequency, format, emails } = ctx.request.body

      if (!type || !frequency) {
        return ctx.badRequest('Report type and frequency are required')
      }

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.scheduleReport({
        type,
        frequency,
        format: format || 'csv',
        emails: emails || [],
        createdBy: ctx.state.user?.id || 'anonymous',
      })

      ctx.send({
        data: result,
        message: 'Report scheduled successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to schedule report', {
        error: err.message,
      })
    }
  },

  // ── Multi-Platform Handlers (Section 10.5) ───────────────────────────

  /**
   * GET /cmcc/platforms/status - Get the status of all connected platforms
   */
  async getPlatformStatus(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const status = await service.getPlatformStatus()

      ctx.send({ data: status })
    } catch (err) {
      ctx.badRequest('Failed to fetch platform status', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/platforms/sync-settings - Sync settings across platforms
   */
  async syncPlatformSettings(ctx) {
    try {
      const { targetPlatforms, settings } = ctx.request.body
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.syncSettings({
        targetPlatforms,
        settings,
      })

      ctx.send({
        data: result,
        message: 'Settings synced across platforms',
      })
    } catch (err) {
      ctx.badRequest('Failed to sync settings', {
        error: err.message,
      })
    }
  },

  /**
   * GET /cmcc/unified-queue - Get unified queue across all platforms
   */
  async getUnifiedQueue(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.getUnifiedQueue(ctx.query)

      ctx.send({ data: result })
    } catch (err) {
      ctx.badRequest('Failed to fetch unified queue', {
        error: err.message,
      })
    }
  },

  // ── Settings Handlers ────────────────────────────────────────────────

  /**
   * GET /cmcc/settings - Get plugin settings
   */
  async getSettings(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const settings = await service.getSettings()

      if (!settings) {
        return ctx.send({
          data: strapi.plugin(PLUGIN_ID).config('default'),
        })
      }

      ctx.send({ data: settings })
    } catch (err) {
      ctx.badRequest('Failed to fetch settings', {
        error: err.message,
      })
    }
  },

  /**
   * PUT /cmcc/settings - Update plugin settings
   */
  async updateSettings(ctx) {
    try {
      const { body } = ctx.request

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const updated = await service.updateSettings(body)

      ctx.send({
        data: updated,
        message: 'Settings updated successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to update settings', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/settings/export - Export all settings as JSON
   */
  async exportSettings(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const exported = await service.exportSettings()

      ctx.send({
        data: exported,
        filename: `cmcc-settings-${new Date().toISOString().slice(0, 10)}.json`,
      })
    } catch (err) {
      ctx.badRequest('Failed to export settings', {
        error: err.message,
      })
    }
  },

  /**
   * POST /cmcc/settings/import - Import settings from JSON
   */
  async importSettings(ctx) {
    try {
      const { settings } = ctx.request.body

      if (!settings) {
        return ctx.badRequest('Settings data is required')
      }

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.importSettings(settings)

      ctx.send({
        data: result,
        message: 'Settings imported successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to import settings', {
        error: err.message,
      })
    }
  },

  // ── Firewall Engine ───────────────────────────────────────────────────

  /**
   * POST /cmcc/queue/:id/evaluate - Evaluate an item against firewall rules
   */
  async evaluateItem(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.evaluateItem(id)

      ctx.send({
        data: result,
        message: 'Item evaluated successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to evaluate item', { error: err.message })
    }
  },

  // ── Undo Actions ──────────────────────────────────────────────────────

  /**
   * POST /cmcc/queue/:id/undo - Undo last moderation action
   */
  async undoItem(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.undoItem(id)

      ctx.send({
        data: result,
        message: 'Action undone successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to undo action', { error: err.message })
    }
  },

  /**
   * GET /cmcc/queue/:id/undo-info - Check if undo is available
   */
  async getUndoInfo(ctx) {
    try {
      const { id } = ctx.params
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const info = await service.getUndoInfo(id)

      ctx.send({ data: info })
    } catch (err) {
      ctx.badRequest('Failed to get undo info', { error: err.message })
    }
  },

  // ── Email Notifications ────────────────────────────────────────────────

  /**
   * POST /cmcc/notifications/send - Send a notification
   */
  async sendNotification(ctx) {
    try {
      const { type, data, recipients } = ctx.request.body

      if (!type) {
        return ctx.badRequest('Notification type is required')
      }

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.sendNotification(
        type,
        data || {},
        recipients || [],
      )

      ctx.send({
        data: result,
        message: 'Notification sent successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to send notification', { error: err.message })
    }
  },

  /**
   * GET /cmcc/notifications/settings - Get notification settings
   */
  async getNotificationSettings(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const settings = await service.getNotificationSettings()

      ctx.send({ data: settings })
    } catch (err) {
      ctx.badRequest('Failed to get notification settings', {
        error: err.message,
      })
    }
  },

  // ── Webhook Dispatching ───────────────────────────────────────────────

  /**
   * POST /cmcc/webhooks/test - Test a webhook endpoint
   */
  async testWebhook(ctx) {
    try {
      const { url, headers } = ctx.request.body

      if (!url) {
        return ctx.badRequest('Webhook URL is required')
      }

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.testWebhook(url, headers || {})

      ctx.send({
        data: result,
        message: 'Webhook test completed',
      })
    } catch (err) {
      ctx.badRequest('Failed to test webhook', { error: err.message })
    }
  },

  // ── Content Hooks ─────────────────────────────────────────────────────

  /**
   * GET /cmcc/hooks - List registered content hooks
   */
  async getHooks(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const hooks = service.getHooks()

      ctx.send({ data: hooks })
    } catch (err) {
      ctx.badRequest('Failed to get hooks', { error: err.message })
    }
  },

  /**
   * POST /cmcc/hooks/:name/toggle - Enable/disable a hook
   */
  async toggleHook(ctx) {
    try {
      const { name } = ctx.params
      const { enabled } = ctx.request.body

      if (enabled === undefined) {
        return ctx.badRequest('enabled field is required')
      }

      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      service.toggleHook(name, enabled)

      ctx.send({
        data: { name, enabled },
        message: 'Hook updated successfully',
      })
    } catch (err) {
      ctx.badRequest('Failed to toggle hook', { error: err.message })
    }
  },

  // ── Retention ─────────────────────────────────────────────────────────

  /**
   * POST /cmcc/retention/purge - Manually trigger retention purge
   */
  async purgeRetention(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.purgeRetention()

      ctx.send({
        data: result,
        message: 'Retention purge completed',
      })
    } catch (err) {
      ctx.badRequest('Failed to purge retention', { error: err.message })
    }
  },

  // ── Cross-Platform Sync ───────────────────────────────────────────────

  /**
   * POST /cmcc/platforms/receive-sync - Accept settings sync from hub
   */
  async receivePlatformSync(ctx) {
    try {
      const payload = ctx.request.body
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const result = await service.receivePlatformSync(payload)

      ctx.send({
        data: result,
        message: 'Platform sync received',
      })
    } catch (err) {
      ctx.badRequest('Failed to process platform sync', { error: err.message })
    }
  },

  // ── REST Fallback for Activity Feed Events ────────────────────────────

  /**
   * GET /cmcc/activity-feed/events - REST fallback for real-time events
   */
  async getActivityFeedEvents(ctx) {
    try {
      const { limit = 50 } = ctx.query
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const events = await service.getActivityFeed(Number(limit))

      ctx.send({ data: events })
    } catch (err) {
      ctx.badRequest('Failed to fetch feed events', { error: err.message })
    }
  },
})
