'use strict'

const PLUGIN_ID = 'cmcc'

/**
 * CMCC plugin destroy lifecycle hook.
 *
 * Cleans up moderation processes, flushes caches, and clears
 * any scheduled jobs when the plugin is disabled or the server
 * is stopped.
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
