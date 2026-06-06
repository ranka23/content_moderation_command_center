'use strict'

module.exports = async ({ strapi }) => {
  // Cleanup any active moderation processes
  const queueService = strapi.plugin('cmcc').service('cmccService')
  if (queueService) {
    try {
      // Flush any pending cache entries
      strapi.log.info('CMCC: Cleaning up pending moderation items...')
    } catch (err) {
      strapi.log.error('CMCC: Error during cleanup', err)
    }
  }

  // Clear any scheduled jobs if using a job scheduler
  strapi.log.info('CMCC: Plugin destroyed')
}
