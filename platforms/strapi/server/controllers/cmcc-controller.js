'use strict'

const PLUGIN_ID = 'cmcc'

module.exports = ({ strapi }) => ({
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
      const { action } = ctx.request.body

      if (!action) {
        return ctx.badRequest('Action is required')
      }

      const validActions = ['approve', 'reject', 'spam', 'defer']
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

  /**
   * GET /cmcc/settings - Get plugin settings
   */
  async getSettings(ctx) {
    try {
      const service = strapi.plugin(PLUGIN_ID).service('cmccService')
      const settings = await service.getSettings()

      if (!settings) {
        // Return defaults if no settings exist yet
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
})
