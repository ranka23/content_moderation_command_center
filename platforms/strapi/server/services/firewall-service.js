'use strict'

const { FirewallService: CoreFirewallService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi firewall service wrapping @cmcc/server-core FirewallService.
 * Provides content evaluation against firewall rules with Strapi
 * entity service integration for persistence.
 */
module.exports = ({ strapi }) => {
  // Initialize from settings
  let config
  try {
    config = strapi.plugin(PLUGIN_ID).config('default') || {}
  } catch {
    config = {}
  }

  const firewallConfig = {
    maxLinks: config.maxLinks || 5,
    blacklistedKeywords: Array.isArray(config.blacklistedKeywords)
      ? config.blacklistedKeywords
      : [],
    enableDuplicateDetection: config.duplicateDetection !== false,
    globalAction: config.moderationBehavior || 'flag',
  }

  const coreService = new CoreFirewallService(firewallConfig)

  return {
    /**
     * Evaluate a queue item against firewall rules.
     * Updates the item's spamScore and potentially changes its status.
     */
    async evaluate(itemId) {
      const item = await strapi.entityService.findOne(
        `plugin::${PLUGIN_ID}.queue-item`,
        itemId,
      )

      if (!item) {
        throw new Error('Queue item not found')
      }

      const content = [item.title, item.excerpt].filter(Boolean).join(' ')

      const result = await coreService.evaluateContent({
        content,
        authorIP: item.authorIP,
        authorEmail: item.authorEmail,
        contentId: item.itemId,
      })

      // Derive a spam score from the firewall evaluation result.
      // FirewallResult does not include a spamScore field, so we compute
      // one based on the action taken: spam → 0.9, discard → 0.8, flag → 0.6.
      let derivedScore = item.spamScore || 0
      if (result.triggered && result.action) {
        const scoreMap = {
          spam: 0.9,
          discard: 0.8,
          flag: 0.6,
        }
        derivedScore = Math.max(derivedScore, scoreMap[result.action] ?? 0)
      }
      await strapi.entityService.update(
        `plugin::${PLUGIN_ID}.queue-item`,
        itemId,
        {
          data: {
            spamScore: derivedScore,
          },
        },
      )

      // If triggered, also log the activity
      if (result.triggered) {
        const actionMap = {
          spam: 'marked_spam',
          flag: 'flag',
          discard: 'rejected',
        }

        const cmccService = strapi.plugin(PLUGIN_ID).service('cmccService')
        await cmccService.logActivity({
          moderatorId: 'auto-firewall',
          action: actionMap[result.action] || 'flag',
          contentType: item.contentType,
          itemId: item.itemId,
          previousStatus: item.status,
          newStatus: result.action === 'discard' ? 'rejected' : 'flagged',
        })

        cmccService.addFeedEvent({
          type: 'action',
          actorId: 'auto-firewall',
          actorName: 'Firewall Engine',
          description: `Firewall ${result.action === 'discard' ? 'rejected' : 'flagged'} item "${item.title || item.itemId}" — ${result.reason}`,
          itemId: item.itemId,
          itemTitle: item.title,
        })
      }

      return result
    },

    /**
     * Get the current firewall configuration.
     */
    getConfig() {
      return coreService.getConfig()
    },

    /**
     * Update the firewall configuration at runtime.
     */
    updateConfig(partial) {
      coreService.updateConfig(partial)
    },

    /**
     * Get firewall rule hit statistics.
     */
    getStats() {
      return coreService.getStats()
    },

    /**
     * Reset firewall statistics.
     */
    resetStats() {
      coreService.resetStats()
    },
  }
}
