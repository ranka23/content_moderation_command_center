'use strict'

const PLUGIN_ID = 'cmcc'

/**
 * CMCC plugin destroy lifecycle hook.
 *
 * Cleans up moderation processes, flushes caches, closes WebSocket
 * connections, and clears any scheduled jobs when the plugin is
 * disabled or the server is stopped.
 */
module.exports = async ({ strapi }) => {
  strapi.log.info('CMCC: Destroy started — cleaning up resources')

  try {
    // Cleanup active moderation processes via the service layer
    const queueService = strapi.plugin(PLUGIN_ID).service('cmccService')

    if (queueService && typeof queueService.cleanup === 'function') {
      await queueService.cleanup()
      strapi.log.info('CMCC: Service cleanup completed')
    }

    // Close WebSocket server if running
    if (strapi.cmccWebSocketServer) {
      strapi.cmccWebSocketServer.close(() => {
        strapi.log.info('CMCC: WebSocket server closed')
      })
    }

    // Clean up scheduled report service snapshots
    if (strapi.cmccScheduledReportService) {
      delete strapi.cmccScheduledReportService
    }

    // Clean up event bus
    if (strapi.cmccEventBus) {
      delete strapi.cmccEventBus
    }

    // Flush any pending cache entries
    if (strapi.cache && typeof strapi.cache.del === 'function') {
      await strapi.cache.del(`plugin::${PLUGIN_ID}:*`)
      strapi.log.debug('CMCC: Plugin cache flushed')
    }
  } catch (err) {
    strapi.log.error('CMCC: Error during destroy cleanup', {
      error: err.message,
      stack: err.stack,
    })
  }

  strapi.log.info('CMCC: Plugin destroyed')
}
