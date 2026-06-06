'use strict'

const PLUGIN_ID = 'cmcc'

module.exports = async ({ strapi }) => {
  strapi.log.info('CMCC: Bootstrap started')

  // Initialize default settings from config
  const config = strapi.plugin(PLUGIN_ID).config('default')
  const settingsService = strapi.plugin(PLUGIN_ID).service('cmccService')

  try {
    // Check if settings already exist
    const existingSettings = await settingsService.getSettings()

    if (!existingSettings) {
      // Create default settings entry
      const settingsData = {
        autoModerate: config.autoModerate,
        moderationBehavior: config.moderationBehavior,
        maxLinks: config.maxLinks,
        blacklistedKeywords: JSON.stringify(config.blacklistedKeywords),
        duplicateDetection: config.duplicateDetection,
        notifyOnSpam: config.notifyOnSpam,
      }

      await strapi
        .query(`plugin::${PLUGIN_ID}.settings`)
        .create({ data: settingsData })

      strapi.log.info('CMCC: Default settings initialized')
    }

    // Verify content types are available
    const queueContentType =
      strapi.contentTypes[`plugin::${PLUGIN_ID}.queue-item`]
    const logContentType =
      strapi.contentTypes[`plugin::${PLUGIN_ID}.activity-log`]

    if (queueContentType && logContentType) {
      strapi.log.info('CMCC: Content types ready')
    }

    strapi.log.info('CMCC: Bootstrap completed')
  } catch (err) {
    strapi.log.error('CMCC: Bootstrap error', err)
  }
}
