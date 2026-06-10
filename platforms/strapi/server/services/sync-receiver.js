'use strict'

const { SyncReceiver: CoreSyncReceiver } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi sync receiver wrapping @cmcc/server-core SyncReceiver.
 * Handles cross-platform settings sync from WordPress hub.
 */
module.exports = ({ strapi }) => {
  const coreService = new CoreSyncReceiver('Strapi')

  // Wire up callbacks to update local settings
  coreService.onFirewallSync(async (rules) => {
    try {
      const cmccService = strapi.plugin(PLUGIN_ID).service('cmccService')
      const updates = {}

      if (rules.max_links !== undefined) updates.maxLinks = rules.max_links
      if (rules.blacklisted_keywords !== undefined) {
        updates.blacklistedKeywords = rules.blacklisted_keywords
      }
      if (rules.global_action !== undefined) {
        updates.moderationBehavior = rules.global_action
      }

      if (Object.keys(updates).length > 0) {
        await cmccService.updateSettings(updates)
      }

      strapi.log.info('CMCC: Firewall rules synced from hub')
    } catch (err) {
      strapi.log.error('CMCC: Failed to apply firewall sync: ' + err.message)
    }
  })

  coreService.onSettingsSync(async (settings) => {
    try {
      const cmccService = strapi.plugin(PLUGIN_ID).service('cmccService')
      await cmccService.updateSettings(settings)
      strapi.log.info('CMCC: Auto-moderation settings synced from hub')
    } catch (err) {
      strapi.log.error('CMCC: Failed to apply settings sync: ' + err.message)
    }
  })

  return {
    /**
     * Receive and process a sync payload.
     */
    async receiveSync(payload) {
      return coreService.receiveSync(payload)
    },

    /**
     * Get the last received sync payload.
     */
    getLastSyncPayload() {
      return coreService.getLastSyncPayload()
    },
  }
}
