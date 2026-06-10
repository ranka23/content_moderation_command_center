'use strict'

const {
  RetentionService: CoreRetentionService,
  getDefaultRetentionConfig,
} = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi retention service wrapping @cmcc/server-core RetentionService.
 * Manages auto-purging of old activity logs and archived items.
 */
module.exports = ({ strapi }) => {
  const coreService = new CoreRetentionService(getDefaultRetentionConfig())

  return {
    /**
     * Purge old activity logs.
     */
    async purgeOldActivityLogs() {
      return coreService.purgeOldActivityLogs(async (cutoffDate) => {
        const items = await strapi.entityService.findMany(
          `plugin::${PLUGIN_ID}.activity-log`,
          {
            fields: ['id'],
            filters: { createdAt: { $lt: cutoffDate.toISOString() } },
          },
        )
        let count = 0
        for (const item of items || []) {
          await strapi.entityService.delete(
            `plugin::${PLUGIN_ID}.activity-log`,
            item.id,
          )
          count++
        }
        return count
      })
    },

    /**
     * Purge old archived items (items with status 'archived' or older than retention).
     */
    async purgeOldArchivedItems() {
      return coreService.purgeOldArchivedItems(async (cutoffDate) => {
        const items = await strapi.entityService.findMany(
          `plugin::${PLUGIN_ID}.queue-item`,
          {
            fields: ['id'],
            filters: {
              $or: [
                { status: { $eq: 'archived' } },
                { createdAt: { $lt: cutoffDate.toISOString() } },
              ],
            },
          },
        )
        let count = 0
        for (const item of items || []) {
          await strapi.entityService.delete(
            `plugin::${PLUGIN_ID}.queue-item`,
            item.id,
          )
          count++
        }
        return count
      })
    },

    /**
     * Run a full scheduled purge.
     */
    async runScheduledPurge() {
      return coreService.runScheduledPurge(
        async (_d) => {
          const result = await this.purgeOldActivityLogs()
          return result.deletedCount || 0
        },
        async (_d) => {
          const result = await this.purgeOldArchivedItems()
          return result.deletedCount || 0
        },
      )
    },

    /**
     * Get the current retention configuration.
     */
    getConfig() {
      return coreService.getConfig()
    },
  }
}
