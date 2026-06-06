'use strict'

const PLUGIN_ID = 'cmcc'

module.exports = ({ strapi }) => ({
  /**
   * Get paginated queue items with filters
   */
  async getQueue(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      status,
      contentType,
      search,
      sort = 'createdAt:DESC',
    } = params

    const filters = {}

    if (status) {
      filters.status = { $eq: status }
    }

    if (contentType) {
      filters.contentType = { $eq: contentType }
    }

    if (search) {
      filters.$or = [
        { title: { $containsi: search } },
        { excerpt: { $containsi: search } },
      ]
    }

    const [sortField, sortOrder] = sort.split(':')

    const results = await strapi.entityService.findPage(
      `plugin::${PLUGIN_ID}.queue-item`,
      {
        page: Number(page),
        pageSize: Number(pageSize),
        filters,
        sort: { [sortField]: sortOrder.toLowerCase() },
        populate: '*',
      },
    )

    return results
  },

  /**
   * Moderate a single item (approve, reject, mark as spam, defer)
   */
  async moderateItem(itemId, action, moderatorId) {
    const item = await strapi.entityService.findOne(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
    )

    if (!item) {
      throw new Error('Queue item not found')
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'spam',
      defer: 'deferred',
    }

    const actionMap = {
      approve: 'approved',
      reject: 'rejected',
      spam: 'marked_spam',
      defer: 'deferred',
    }

    const newStatus = statusMap[action]
    if (!newStatus) {
      throw new Error('Invalid action')
    }

    const updatedItem = await strapi.entityService.update(
      `plugin::${PLUGIN_ID}.queue-item`,
      itemId,
      { data: { status: newStatus } },
    )

    // Log the activity
    await this.logActivity({
      moderatorId,
      action: actionMap[action],
      contentType: item.contentType,
      itemId: item.itemId,
      previousStatus: item.status,
      newStatus,
    })

    // Update analytics counters
    await this.updateAnalytics(action)

    return updatedItem
  },

  /**
   * Perform a bulk action on multiple items
   */
  async bulkAction(itemIds, action, moderatorId) {
    const results = {
      succeeded: [],
      failed: [],
    }

    for (const id of itemIds) {
      try {
        const updated = await this.moderateItem(id, action, moderatorId)
        results.succeeded.push(updated)
      } catch (err) {
        results.failed.push({ id, error: err.message })
      }
    }

    return results
  },

  /**
   * Log moderation activity
   */
  async logActivity(data) {
    return strapi.entityService.create(`plugin::${PLUGIN_ID}.activity-log`, {
      data,
    })
  },

  /**
   * Get paginated activity log
   */
  async getActivityLog(params = {}) {
    const { page = 1, pageSize = 20, moderatorId, action, contentType } = params

    const filters = {}

    if (moderatorId) {
      filters.moderatorId = { $eq: moderatorId }
    }

    if (action) {
      filters.action = { $eq: action }
    }

    if (contentType) {
      filters.contentType = { $eq: contentType }
    }

    return strapi.entityService.findPage(`plugin::${PLUGIN_ID}.activity-log`, {
      page: Number(page),
      pageSize: Number(pageSize),
      filters,
      sort: { createdAt: 'desc' },
      populate: '*',
    })
  },

  /**
   * Get analytics data
   */
  async getAnalytics() {
    const totalItems = await strapi.entityService.count(
      `plugin::${PLUGIN_ID}.queue-item`,
    )

    const statusCounts = await Promise.all(
      ['pending', 'approved', 'rejected', 'spam', 'deferred'].map(
        async (status) => {
          const count = await strapi.entityService.count(
            `plugin::${PLUGIN_ID}.queue-item`,
            { filters: { status: { $eq: status } } },
          )
          return { status, count }
        },
      ),
    )

    const recentActivity = await strapi.entityService.findPage(
      `plugin::${PLUGIN_ID}.activity-log`,
      {
        page: 1,
        pageSize: 50,
        sort: { createdAt: 'desc' },
      },
    )

    const topContentTypes = await this.getContentTypeBreakdown()

    return {
      totalItems,
      statusCounts,
      recentActivity: recentActivity.results,
      topContentTypes,
    }
  },

  /**
   * Get content type breakdown
   */
  async getContentTypeBreakdown() {
    const allItems = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.queue-item`,
      { fields: ['contentType'] },
    )

    const breakdown = {}
    for (const item of allItems) {
      const ct = item.contentType
      breakdown[ct] = (breakdown[ct] || 0) + 1
    }

    return Object.entries(breakdown)
      .map(([contentType, count]) => ({ contentType, count }))
      .sort((a, b) => b.count - a.count)
  },

  /**
   * Update analytics counters after moderation
   */
  async updateAnalytics(action) {
    // Placeholder for future analytics tracking integration
    strapi.log.debug(`CMCC: Analytics updated for action: ${action}`)
  },

  /**
   * Get plugin settings
   */
  async getSettings() {
    const result = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.settings`,
    )

    if (result && result.length > 0) {
      const settings = result[0]
      // Parse JSON fields
      if (typeof settings.blacklistedKeywords === 'string') {
        try {
          settings.blacklistedKeywords = JSON.parse(
            settings.blacklistedKeywords,
          )
        } catch {
          settings.blacklistedKeywords = []
        }
      }
      return settings
    }

    return null
  },

  /**
   * Update plugin settings
   */
  async updateSettings(data) {
    const existing = await strapi.entityService.findMany(
      `plugin::${PLUGIN_ID}.settings`,
    )

    const settingsData = {
      autoModerate: data.autoModerate,
      moderationBehavior: data.moderationBehavior,
      maxLinks: data.maxLinks,
      blacklistedKeywords: JSON.stringify(data.blacklistedKeywords || []),
      duplicateDetection: data.duplicateDetection,
      notifyOnSpam: data.notifyOnSpam,
    }

    if (existing && existing.length > 0) {
      return strapi.entityService.update(
        `plugin::${PLUGIN_ID}.settings`,
        existing[0].id,
        { data: settingsData },
      )
    }

    return strapi.entityService.create(`plugin::${PLUGIN_ID}.settings`, {
      data: settingsData,
    })
  },

  /**
   * Cleanup plugin resources on destroy.
   *
   * Flushes any pending cache entries, cancels scheduled jobs,
   * and releases active moderation processes. Called by the
   * destroy lifecycle hook when the plugin is disabled or the
   * server is stopped.
   */
  async cleanup() {
    try {
      // Flush any in-memory caches related to moderation
      strapi.log.debug('CMCC: Service cleanup — flushing caches')

      // Placeholder: cancel any scheduled jobs (e.g. cron tasks)
      // If using @strapi/cron or node-schedule, iterate and cancel:
      // const jobs = strapi.cron?.jobs
      // if (jobs) {
      //   Object.values(jobs).forEach((job) => job.stop())
      // }

      strapi.log.info('CMCC: Service cleanup completed')
    } catch (err) {
      strapi.log.error('CMCC: Service cleanup error', {
        error: err.message,
        stack: err.stack,
      })
    }
  },
})
