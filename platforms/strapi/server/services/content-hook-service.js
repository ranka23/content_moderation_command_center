'use strict'

const { ContentHookService: CoreContentHookService } = require('@cmcc/server-core')

const PLUGIN_ID = 'cmcc'

/**
 * Strapi content hook service wrapping @cmcc/server-core ContentHookService.
 * Manages lifecycle hooks that auto-import content into the moderation queue
 * when Strapi content types are created.
 */
module.exports = ({ strapi }) => {
  /**
   * Add an item to the moderation queue via the Strapi entity service.
   */
  async function addToQueueFn(contentType, itemId, authorName, authorEmail, authorIP, content, title) {
    return strapi.entityService.create(`plugin::${PLUGIN_ID}.queue-item`, {
      data: {
        itemId,
        contentType,
        status: 'pending',
        authorId: authorName,
        dateGmt: new Date().toISOString(),
        title: title || '',
        excerpt: content || '',
      },
    })
  }

  const coreService = new CoreContentHookService(addToQueueFn)

  return {
    /**
     * Register default content hooks for common content types.
     */
    initializeDefaultHooks() {
      const defaultHooks = [
        {
          name: 'Comment Hook',
          contentType: 'comment',
          description: 'Auto-import comments into the moderation queue',
          enabled: true,
        },
        {
          name: 'Post Hook',
          contentType: 'post',
          description: 'Auto-import posts into the moderation queue',
          enabled: true,
        },
        {
          name: 'Review Hook',
          contentType: 'review',
          description: 'Auto-import reviews into the moderation queue',
          enabled: true,
        },
      ]

      for (const hook of defaultHooks) {
        coreService.registerHook(hook)
      }
    },

    /**
     * Get all registered hooks.
     */
    getHooks() {
      return coreService.getHooks()
    },

    /**
     * Register a new content hook.
     */
    registerHook(hook) {
      coreService.registerHook(hook)
    },

    /**
     * Enable or disable a hook by name.
     */
    toggleHook(name, enabled) {
      if (enabled) {
        coreService.enableHook(name)
      } else {
        coreService.disableHook(name)
      }
    },

    /**
     * Process incoming content through registered hooks.
     */
    async processContent(contentType, data) {
      return coreService.processContent(contentType, data)
    },

    /**
     * Clear all registered hooks.
     */
    clearHooks() {
      coreService.clearHooks()
    },
  }
}
